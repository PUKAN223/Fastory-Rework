import BaseRouter from "../../class/BaseRouter";
import { prisma } from "../../db/client";
import { z } from "zod";
import { requireStorePermission, getAuthSession } from "../auth/permissions";
import { GoogleGenAI } from "@google/genai";
import { geminiTools, executeTool, ACTION_REQUIRED_TOOLS } from "./tools";

const storeRateLimit = new Map<number, { count: number; resetAt: number }>();

class AIRoutes extends BaseRouter {
  public override getRouter() {
    const router = super.getRouter();

    router.guard({ beforeHandle: requireStorePermission() }, (app) =>
      app.post("/chat", async (req) => {
        const storeId = Number((req as any).params.storeId);
        
        const schema = z.object({
          message: z.string().min(1),
          history: z.array(z.object({
            role: z.enum(["user", "assistant"]),
            content: z.string()
          })).optional()
        });

        const parsed = schema.safeParse(req.body);
        if (!parsed.success) {
          req.set.status = 400;
          return { success: false, message: "Invalid message body" };
        }

        const userMessage = parsed.data.message.trim();
        const history = parsed.data.history || [];

        // Extract real authenticated user ID or store owner ID
        const session = getAuthSession((req as any).headers?.authorization);
        const store = await prisma.stores.findUnique({ where: { id: storeId } });
        const userId = session?.user?.id || store?.owner_id;

        if (!userId) {
          req.set.status = 401;
          return { success: false, message: "Unauthorized user" };
        }

        // Retrieve permissions
        let userPermissions: Record<string, boolean> = {};
        let userRole = "ผู้ใช้";

        if (store?.owner_id === userId) {
          userPermissions = { "*": true };
          userRole = "เจ้าของร้าน";
        } else {
          const membership = await prisma.store_members.findUnique({
            where: {
              store_id_user_id: { store_id: storeId, user_id: userId },
            }
          });
          if (membership) {
            userPermissions = (membership.permissions ?? {}) as Record<string, boolean>;
            userRole = membership.job_title || "พนักงาน";
          }
        }

        // Save User Message to DB
        try {
          await prisma.ai_chat_messages.create({
            data: { store_id: storeId, user_id: userId, role: "user", content: userMessage },
          });
        } catch (dbErr) {
          console.error("Failed to save user chat message:", dbErr);
        }

        // Check for API Key
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
          return { 
            success: false, 
            message: "ระบบ AI ยังไม่พร้อมใช้งาน (Missing GEMINI_API_KEY) กรุณาตั้งค่า API Key ใน Backend" 
          };
        }

        try {
          const ai = new GoogleGenAI({ apiKey });
          const store = await prisma.stores.findUnique({ where: { id: storeId } });
          const storeName = store?.name || "ไม่ทราบชื่อร้าน";

          const systemInstruction = `คุณคือ Fastory AI, ผู้ช่วยอัจฉริยะสำหรับระบบจัดการหน้าร้าน (POS) และคลังสินค้าชื่อ Fastory
คุณคอยช่วยเหลือเจ้าของร้านในการวิเคราะห์ยอดขาย, สต็อกสินค้า และให้คำแนะนำทางธุรกิจ
ร้านค้าปัจจุบันที่คุณกำลังดูแลอยู่คือ "${storeName}" (Store ID: ${storeId})

กฎการตอบคำถาม:
1. ให้ตอบเป็นภาษาไทยอย่างเป็นธรรมชาติ สุภาพ กระชับ และเป็นมืออาชีพ เข้าประเด็นทันที ห้ามใช้คำพูดเกริ่นนำหรือคำลงท้ายฟุ่มเฟือยแบบ AI Slop (เช่น "ยินดีต้อนรับครับ!", "ยินดีเป็นอย่างยิ่งที่จะช่วยเหลือ!", "แน่นอนครับท่านผู้เจริญ!", "ผมเป็นระบบอัจฉริยะ...") ให้สรุปข้อมูลตรงไปตรงมา
2. หากต้องการข้อมูลยอดขายหรือสต็อก ให้เรียกใช้เครื่องมือ (Tools) ที่มีให้เสมอ ห้ามแต่งข้อมูลขึ้นมาเองเด็ดขาด
3. หากผู้ใช้ต้องการอัปเดตข้อมูล แก้ไขชื่อ หรือเปลี่ยนราคาของสินค้าหลายชิ้นพร้อมกัน (เช่น ให้แปลเป็นภาษาไทยหลายชิ้น) ให้เรียกใช้เครื่องมือ bulkUpdateProducts พร้อมกันในครั้งเดียวเสมอ ห้ามเรียก updateProduct ทีละชิ้นเด็ดขาด
4. การย้ายหมวดหมู่สินค้า หรือเปลี่ยนหมวดหมู่สินค้า (เช่น ย้ายสินค้าไปหมวด "ขนม" หรือ "เครื่องดื่ม") สามารถทำได้ทันทีโดยใช้เครื่องมือ updateProduct หรือ bulkUpdateProducts โดยใส่ categoryName (เช่น categoryName: "ขนม") หรือ categoryId ได้เลย ห้ามบอกผู้ใช้ว่าย้ายหมวดหมู่ไม่ได้เด็ดขาด หากหมวดหมู่นั้นยังไม่มีในระบบ ระบบจะสร้างหมวดหมู่ใหม่ให้โดยอัตโนมัติ
5. คุณสามารถค้นหาสินค้าได้ทั้งจาก "ชื่อสินค้า" และ "รหัสสินค้า (SKU)" ผ่านเครื่องมือ searchProducts, searchProductByName หรือ searchProductBySku ได้อย่างเต็มรูปแบบ
6. เพื่อความสวยงาม คุณสามารถสร้างรูปแบบ ChatCard เป็น XML tag ดังนี้ (พิมพ์ลงไปในข้อความได้เลย):
- สำหรับสินค้า: <ProductCard name="ชื่อสินค้า" price="ราคา" stock="จำนวนสต็อก" sku="SKU" />
- สำหรับสรุปยอดขาย: <SalesCard title="หัวข้อ" revenue="รายได้รวม" count="จำนวนออเดอร์" />
- สำหรับบิลล่าสุด: <OrderCard orderNumber="เลขบิล" total="ยอดรวม" paymentMethod="ช่องทางชำระเงิน" />
- สำหรับตารางข้อมูล (เช่น รายการสินค้า สต็อก ประวัติสต็อก ยอดขาย): คุณสามารถใช้ตาราง Markdown ปกติ (| คอลัมน์ 1 | คอลัมน์ 2 |) หรือใช้ <TableCard title="หัวข้อตาราง" headers='["คอลัมน์ 1", "คอลัมน์ 2"]' rows='[["แถว 1", "แถว 2"], ["แถว 3", "แถว 4"]]' pageSize="5" /> (ระบบฝั่งหน้าจอจะรองรับ Pagination ค้นหา และจัดเรียงให้อัตโนมัติ หากมีข้อมูลหลายแถว)
- สำหรับแผนภูมิ/กราฟ (เช่น แนวโน้มยอดขาย ยอดขายตามหมวดหมู่ เปรียบเทียบสินค้า): ให้ใช้ <ChartCard type="bar|line|pie|area" title="หัวข้อกราฟ" data='[{"name":"หมวด A","sales":100},{"name":"หมวด B","sales":200}]' xKey="name" dataKeys='["sales"]' labels='["ยอดขาย (บาท)"]' />
คุณสามารถพิมพ์ข้อความอธิบายปกติประกอบกับข้อมูลเหล่านี้ได้
5. สำคัญมาก: คุณมีจำนวนการเรียกใช้จำกัด กรุณาเรียก Tool พร้อมๆ กันในครั้งเดียวหากเป็นไปได้ เพื่อไม่ให้เปลือง Quota
6. ที่ท้ายคำตอบทุกครั้ง (บรรทัดสุดท้าย) ให้สร้างคำแนะนำคำถามถัดไปที่น่าสนใจ 2-3 ข้อ เพื่อให้ผู้ใช้กดถามต่อได้สะดวก โดยใส่ในรูปแบบ: [SUGGESTIONS: "คำถามแนะนำ 1", "คำถามแนะนำ 2", "คำถามแนะนำ 3"]`;

          // Clean history of old unconfirmed action placeholders
          const cleanHistory = history.filter((h) =>
            !h.content.includes("ระบบต้องการการยืนยันดำเนินการจากคุณ") &&
            !h.content.includes("AI ขออนุญาตดำเนินการ")
          );

          // Format history for Gemini SDK
          const chatContents: any[] = cleanHistory.map(h => ({
            role: h.role === "assistant" ? "model" : "user",
            parts: [{ text: h.content }]
          }));

          // Add current user message
          chatContents.push({
            role: "user",
            parts: [{ text: userMessage }]
          });

          return new Response(
            new ReadableStream({
              async start(controller) {
                const encoder = new TextEncoder();
                const sendEvent = (event: string, data: any) => {
                  const safeJson = JSON.stringify(data, (_, v) => (typeof v === "bigint" ? v.toString() : v));
                  controller.enqueue(encoder.encode(`event: ${event}\ndata: ${safeJson}\n\n`));
                };

                let fullAssistantReply = "";

                try {
                  let isDone = false;
                  let turns = 0;
                  const MAX_TURNS = 3;

                  while (!isDone && turns < MAX_TURNS) {
                    turns++;
                    const stream = await ai.models.generateContentStream({
                      model: "gemini-3.1-flash-lite",
                      contents: chatContents,
                      config: {
                        systemInstruction,
                        temperature: 0.7,
                        tools: geminiTools,
                      },
                    });

                    let hasTools = false;
                    const currentFunctionCalls: any[] = [];
                    const allModelParts: any[] = [];

                    for await (const chunk of stream) {
                      const parts = chunk.candidates?.[0]?.content?.parts || [];
                      if (parts.length > 0) {
                        allModelParts.push(...parts);
                      }

                      for (const part of parts) {
                        if (part.functionCall) {
                          hasTools = true;
                          currentFunctionCalls.push(part.functionCall);
                        } else if (part.text && !hasTools) {
                          fullAssistantReply += part.text;
                          sendEvent("text_chunk", { text: part.text });
                        }
                      }
                    }

                    if (hasTools && currentFunctionCalls.length > 0) {
                      // Append model's full generated parts to conversation history
                      chatContents.push({
                        role: "model",
                        parts: allModelParts
                      });

                      // Check if any tool requires user action confirmation
                      const actionRequiredCall = currentFunctionCalls.find(call => call.name && ACTION_REQUIRED_TOOLS.has(call.name));

                      if (actionRequiredCall) {
                        sendEvent("action_required", {
                          toolName: actionRequiredCall.name,
                          args: actionRequiredCall.args,
                          storeId,
                        });
                        isDone = true;
                      } else {
                        const functionResponses = [];
                        for (const call of currentFunctionCalls) {
                          if (!call.name) continue;
                          
                          sendEvent("tool_call", { name: call.name });

                          const result = await executeTool(call.name, call.args, userPermissions, userRole);
                          functionResponses.push({
                            functionResponse: {
                              name: call.name,
                              response: result,
                            },
                          });
                        }

                        chatContents.push({
                          role: "user",
                          parts: functionResponses,
                        });
                      }
                    } else {
                      isDone = true;
                    }
                  }

                  if (!isDone) {
                     sendEvent("text_chunk", { text: "\n\n⚠️ เนื่องจากคำถามนี้ต้องใช้การดึงข้อมูลหลายขั้นตอน ระบบจึงหยุดการค้นหาชั่วคราวเพื่อป้องกันโควต้า AI เต็มครับ แนะนำให้แยกถามทีละคำถามครับ" });
                  }

                  sendEvent("done", { success: true });
                } catch (error: any) {
                  console.error("Gemini AI Streaming Error:", error);
                  let errorMessage = error.message || "Unknown Error";
                  
                  if (error.status === 429 || (error.message && error.message.includes("429"))) {
                    errorMessage = "คุณใช้งาน AI เกินโควต้าของระบบ (Rate Limit Exceeded) กรุณารอสักครู่แล้วลองใหม่อีกครั้ง";
                    
                    const retryMatch = error.message?.match(/retry in ([\d\.]+)s/i);
                    if (retryMatch) {
                      const seconds = Math.ceil(parseFloat(retryMatch[1]));
                      errorMessage = `โควต้า AI เต็ม กรุณารอประมาณ ${seconds} วินาที แล้วลองใหม่อีกครั้ง`;
                    }
                  }
                  
                  sendEvent("error", { message: errorMessage });
                } finally {
                  // Save assistant reply and prune to last 20 messages
                  if (fullAssistantReply.trim()) {
                    try {
                      await prisma.ai_chat_messages.create({
                        data: { store_id: storeId, user_id: userId, role: "assistant", content: fullAssistantReply },
                      });

                      const allMsgs = await prisma.ai_chat_messages.findMany({
                        where: { store_id: storeId, user_id: userId },
                        orderBy: { created_at: "desc" },
                        select: { id: true },
                      });

                      if (allMsgs.length > 20) {
                        const idsToDelete = allMsgs.slice(20).map((m) => m.id);
                        await prisma.ai_chat_messages.deleteMany({
                          where: { id: { in: idsToDelete } },
                        });
                      }
                    } catch (dbErr) {
                      console.error("Failed to save assistant chat message:", dbErr);
                    }
                  }
                  controller.close();
                }
              },
            }),
            {
              headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
              },
            }
          );

        } catch (error: any) {
          console.error("Gemini AI Error:", error);
          return {
            success: false,
            message: "เกิดข้อผิดพลาดในการเชื่อมต่อกับ AI Service: " + (error.message || "Unknown Error")
          };
        }
      })
      .get("/chat/quota", async (req) => {
        const storeId = Number((req as any).params.storeId);
        const session = getAuthSession((req as any).headers?.authorization);
        const store = await prisma.stores.findUnique({ where: { id: storeId } });
        const userId = session?.user?.id || store?.owner_id;

        if (!userId) {
          return { success: false, message: "Unauthorized user" };
        }

        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        try {
          const usedToday = await prisma.ai_chat_messages.count({
            where: {
              store_id: storeId,
              user_id: userId,
              role: "user",
              created_at: { gte: startOfDay },
            },
          });

          const dailyLimit = 100;
          const remaining = Math.max(0, dailyLimit - usedToday);

          return {
            success: true,
            model: "Gemini 3.1 Flash Lite",
            usedToday,
            dailyLimit,
            remaining,
            status: remaining > 0 ? "active" : "exceeded",
          };
        } catch (err: any) {
          console.error("Failed to fetch quota:", err);
          return { success: false, message: "Failed to calculate quota" };
        }
      })
      .get("/chat/history", async (req) => {
        const storeId = Number((req as any).params.storeId);
        const session = getAuthSession((req as any).headers?.authorization);
        const store = await prisma.stores.findUnique({ where: { id: storeId } });
        const userId = session?.user?.id || store?.owner_id;

        if (!userId) {
          return { success: true, messages: [] };
        }

        try {
          const historyMsgs = await prisma.ai_chat_messages.findMany({
            where: { store_id: storeId, user_id: userId },
            orderBy: { created_at: "desc" },
            take: 20,
          });

          const formatted = historyMsgs.reverse().map((m) => ({
            id: m.id.toString(),
            role: m.role as "user" | "assistant",
            content: m.content,
            timestamp: m.created_at.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }),
          }));

          return { success: true, messages: formatted };
        } catch (err: any) {
          console.error("Failed to fetch chat history:", err);
          return { success: false, messages: [] };
        }
      })
      .post("/confirm-action", async (req) => {
        const storeId = Number((req as any).params.storeId);
        const schema = z.object({
          toolName: z.string(),
          args: z.any(),
          approved: z.boolean(),
        });

        const parsed = schema.safeParse(req.body);
        if (!parsed.success) {
          req.set.status = 400;
          return { success: false, message: "Invalid action confirmation payload" };
        }

        const { toolName, args, approved } = parsed.data;

        const session = getAuthSession((req as any).headers?.authorization);
        const store = await prisma.stores.findUnique({ where: { id: storeId } });
        const userId = session?.user?.id || store?.owner_id;

        if (!approved) {
          const reply = "❌ **ยกเลิกการทำรายการตามคำขอของคุณแล้วครับ**";
          if (userId) {
            try {
              await prisma.ai_chat_messages.create({
                data: { store_id: storeId, user_id: userId, role: "assistant", content: reply },
              });
            } catch {}
          }
          return {
            success: true,
            approved: false,
            message: "ยกเลิกการทำรายการเรียบร้อยแล้ว",
            reply,
          };
        }

        let userPermissions: Record<string, boolean> = {};
        let userRole = "ผู้ใช้";

        if (userId && userId === store?.owner_id) {
          userPermissions = { "*": true };
          userRole = "เจ้าของร้าน";
        } else if (userId) {
          const membership = await prisma.store_members.findUnique({
            where: {
              store_id_user_id: { store_id: storeId, user_id: userId },
            }
          });
          if (membership) {
            userPermissions = (membership.permissions ?? {}) as Record<string, boolean>;
            userRole = membership.job_title || "พนักงาน";
          }
        }

        const result = await executeTool(toolName, { ...args, storeId }, userPermissions, userRole);
        const reply = result.error
          ? `⚠️ **ทำรายการไม่สำเร็จ:** ${result.error}`
          : `✅ **ดำเนินการสำเร็จ:** ${result.message || "ทำรายการเรียบร้อยแล้วครับ"}`;

        if (userId) {
          try {
            await prisma.ai_chat_messages.create({
              data: { store_id: storeId, user_id: userId, role: "assistant", content: reply },
            });
          } catch {}
        }

        if (result.error) {
          return {
            success: false,
            approved: true,
            message: result.error,
            reply,
          };
        }

        return {
          success: true,
          approved: true,
          message: result.message || "ทำรายการสำเร็จ",
          reply,
          result
        };
      })
    );

    return router;
  }
}

export { AIRoutes };
