"use client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  AlertTriangle,
  Bot,
  BrainCircuit,
  Check,
  ChevronRight,
  Copy,
  Lightbulb,
  Package,
  PackageX,
  RefreshCw,
  Send,
  Sparkles,
  TrendingUp,
  User,
  Zap,
  DollarSign,
  Receipt,
  BarChart3,
  Table as TableIcon,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { PageHeaderCards } from "@/components/card/PageHeaderCards";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAppDispatch, useAppSelector } from "@/store/hook";
import { AiTableCard } from "@/components/ai/AiTableCard";
import { AiChartCard } from "@/components/ai/AiChartCard";
import { fetchProducts } from "@/features/productsSlice";
import { fetchCategories } from "@/features/categoriesSlice";
import { fetchLocations } from "@/features/locationsSlice";
import { fetchStores } from "@/features/storeSlice";
import { fetchMovements } from "@/features/stockMovementsSlice";
import { fetchMembers } from "@/features/staffSlice";
import { fetchOrders, fetchSummary } from "@/features/salesSlice";

interface ActionRequired {
  toolName: string;
  args: any;
  storeId?: number;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  actionRequired?: ActionRequired;
  actionCompleted?: boolean;
  actionResultReply?: string;
  actionLoading?: boolean;
}

const QUICK_PROMPTS = [
  {
    icon: TrendingUp,
    title: "สรุปยอดขายวันนี้",
    prompt: "ขอสรุปยอดขายและจำนวนคำสั่งซื้อของวันนี้",
  },
  {
    icon: BarChart3,
    title: "รายงานยอดขาย 7 วัน",
    prompt: "ขอสรุปรายงานยอดขายย้อนหลัง 7 วันแสดงเป็นกราฟและตาราง",
  },
  {
    icon: TableIcon,
    title: "ตารางสต็อกสินค้า",
    prompt: "ขอตารางแสดงรายการสินค้าทั้งหมดพร้อมราคาขาย ต้นทุน และสต็อกคงเหลือ",
  },
  {
    icon: PackageX,
    title: "เช็คสินค้าสต็อกต่ำ",
    prompt: "ตรวจสอบสินค้าที่มีสต็อกต่ำกว่าเกณฑ์หรือต้องสั่งเพิ่ม",
  },
  {
    icon: Sparkles,
    title: "สินค้าขายดี",
    prompt: "สรุปรายการสินค้าที่ขายดีที่สุดในร้านค้า",
  },
];

const TOOL_NAME_MAP: Record<string, string> = {
  createProduct: "เพิ่มสินค้าใหม่",
  updateProduct: "อัปเดตข้อมูลสินค้า",
  bulkUpdateProducts: "อัปเดตหลายสินค้าพร้อมกัน (Bulk Update)",
  deleteProduct: "ลบสินค้า",
  createCategory: "เพิ่มหมวดหมู่ใหม่",
  deleteCategory: "ลบหมวดหมู่",
  createLocation: "เพิ่มพื้นที่จัดเก็บ",
  updateLocation: "อัปเดตพื้นที่จัดเก็บ",
  deleteLocation: "ลบพื้นที่จัดเก็บ",
  adjustStock: "ปรับปรุงสต็อกสินค้า",
  voidOrder: "ยกเลิกคำสั่งซื้อ / คืนสต็อก",
  updateStoreSettings: "อัปเดตตั้งค่าร้านค้า",
  addStoreMember: "เพิ่มพนักงานใหม่เข้าทีมร้านค้า",
  updateMemberRole: "ปรับเปลี่ยนตำแหน่งพนักงาน",
  removeStoreMember: "ลบพนักงานออกจากทีม",
};

const ARG_KEY_MAP: Record<string, string> = {
  name: "ชื่อ",
  description: "รายละเอียด",
  price: "ราคา",
  sellingPrice: "ราคาขาย",
  cost: "ต้นทุน",
  costPrice: "ต้นทุน",
  stock: "สต็อก",
  stockOnHand: "สต็อกตั้งต้น",
  sku: "SKU",
  categoryId: "รหัสหมวดหมู่",
  categoryName: "หมวดหมู่สินค้า",
  productId: "รหัสสินค้า",
  delta: "จำนวนที่ปรับ",
  reason: "เหตุผล",
  note: "หมายเหตุ",
  maxCapacity: "ความจุสูงสุด",
  locationId: "รหัสพื้นที่",
  reorderPoint: "จุดสั่งซื้อเพิ่ม",
  emailOrUsername: "อีเมล / ชื่อผู้ใช้",
  jobTitle: "ตำแหน่งงาน",
  memberId: "รหัสสมาชิก",
};

const renderActionArgs = (toolName?: string, args?: any) => {
  if (!args) return null;
  const { storeId, ...rest } = args;

  // Handle bulkUpdateProducts specially for beautiful batch UI
  if (toolName === "bulkUpdateProducts" || (Array.isArray(rest.updates) && rest.updates.length > 0)) {
    const updates = Array.isArray(rest.updates) ? rest.updates : [];
    return (
      <div className="mt-2.5 space-y-2 border rounded-xl bg-background/60 p-3 border-border/80 shadow-xs">
        <div className="flex items-center justify-between border-b pb-2 border-border/60">
          <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Package className="size-3.5 text-primary" />
            รายการสินค้าที่จะอัปเดต ({updates.length} รายการ)
          </span>
          <Badge variant="secondary" className="text-[10px] font-normal">
            Bulk Operation
          </Badge>
        </div>

        <div className="max-h-56 overflow-y-auto space-y-2 pr-1 divide-y divide-border/40">
          {updates.map((item: any, idx: number) => (
            <div key={idx} className="pt-2 first:pt-0 flex flex-col gap-1 text-xs">
              <div className="flex items-center justify-between font-medium text-foreground">
                <span className="text-muted-foreground text-[11px]">#{idx + 1} ID: {item.productId}</span>
                {item.name && <span className="font-semibold text-primary truncate max-w-[200px]" title={item.name}>{item.name}</span>}
              </div>
              <div className="flex flex-wrap gap-2 text-[11px]">
                {item.sellingPrice !== undefined && (
                  <span className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 px-2 py-0.5 rounded border border-emerald-200/50 font-medium">
                    ราคาขาย: ฿{item.sellingPrice}
                  </span>
                )}
                {item.costPrice !== undefined && (
                  <span className="bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 px-2 py-0.5 rounded border border-blue-200/50 font-medium">
                    ต้นทุน: ฿{item.costPrice}
                  </span>
                )}
                {item.categoryName !== undefined && (
                  <span className="bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 px-2 py-0.5 rounded border border-amber-200/50 font-medium">
                    หมวดหมู่: {item.categoryName}
                  </span>
                )}
                {item.categoryId !== undefined && (
                  <span className="bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 px-2 py-0.5 rounded border border-amber-200/50 font-medium">
                    รหัสหมวดหมู่: {item.categoryId}
                  </span>
                )}
                {item.reorderPoint !== undefined && (
                  <span className="bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 px-2 py-0.5 rounded border border-purple-200/50 font-medium">
                    จุดสั่งซื้อ: {item.reorderPoint} ชิ้น
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (Object.keys(rest).length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
      {Object.entries(rest).map(([key, value]) => (
        <div key={key} className="flex flex-col gap-0.5 bg-background/50 p-2 rounded-md border border-border/50">
          <span className="text-[10px] text-muted-foreground uppercase">{ARG_KEY_MAP[key] || key}</span>
          <span className="text-xs font-medium text-foreground truncate" title={String(value)}>{String(value) || "-"}</span>
        </div>
      ))}
    </div>
  );
};

export default function AIAssistantPage() {
  const dispatch = useAppDispatch();
  const activeStoreId = useAppSelector((state) => state.stores.activeStoreId);
  const stores = useAppSelector((state) => state.stores.stores);
  const activeStore = stores.find((s) => s.id === activeStoreId);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: `ระบบผู้ช่วยวิเคราะห์ข้อมูลร้านค้า **${activeStore?.name || "ของคุณ"}** พร้อมใช้งานแล้วครับ\n\nสามารถเลือกคำถามด่วนด้านล่าง หรือพิมพ์สอบถามข้อมูลยอดขาย สต็อกสินค้า และจัดการรายการสินค้าได้เลยครับ`,
      timestamp: new Date().toLocaleTimeString("th-TH", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch("/api/ai/chat/history");
        const data = await res.json();
        if (data.success && data.messages && data.messages.length > 0) {
          setMessages(data.messages);
        }
      } catch (err) {
        console.error("Failed to load chat history:", err);
      }
    };
    fetchHistory();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, activeTool]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || input.trim();
    if (!text || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString("th-TH", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput("");
    setIsLoading(true);
    setActiveTool(null);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: messages
            .filter((m) => !m.actionRequired || m.actionCompleted)
            .map((m) => ({
              role: m.role,
              content: m.actionCompleted
                ? `${m.content}\n${m.actionResultReply || ""}`
                : m.content,
            })),
        }),
      });

      if (!res.ok || !res.body) {
        toast.error("เกิดข้อผิดพลาดในการดึงข้อมูลจาก AI");
        setIsLoading(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;

      const aiMsgId = (Date.now() + 1).toString();
      let currentAiContent = "";

      // Initialize an empty message placeholder
      setMessages((prev) => [
        ...prev,
        {
          id: aiMsgId,
          role: "assistant",
          content: "",
          timestamp: new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }),
        },
      ]);

      let buffer = "";

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          buffer += decoder.decode(value, { stream: true });

          let eolIndex;
          while ((eolIndex = buffer.indexOf("\n\n")) >= 0) {
            const chunk = buffer.slice(0, eolIndex);
            buffer = buffer.slice(eolIndex + 2);

            const eventMatch = chunk.match(/^event: (.*)\ndata: (.*)$/s);
            if (eventMatch) {
              const eventName = eventMatch[1];
              const data = JSON.parse(eventMatch[2]);

              if (eventName === "tool_call") {
                setActiveTool(data.name);
                console.log(`[AI Tool Execution] Using Tool: ${data.name}`);
              } else if (eventName === "text_chunk") {
                setActiveTool(null);
                currentAiContent += data.text;
                setMessages((prev) =>
                  prev.map((m) => m.id === aiMsgId ? { ...m, content: currentAiContent } : m)
                );
              } else if (eventName === "action_required") {
                setActiveTool(null);
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === aiMsgId
                      ? {
                        ...m,
                        content: m.content || "⚠️ **ระบบต้องการการยืนยันดำเนินการจากคุณ**",
                        actionRequired: {
                          toolName: data.toolName,
                          args: data.args,
                          storeId: data.storeId,
                        },
                      }
                      : m
                  )
                );
              } else if (eventName === "error") {
                toast.error(data.message || "เกิดข้อผิดพลาด");
              } else if (eventName === "done") {
                setActiveTool(null);
              }
            }
          }
        }
      }
    } catch {
      toast.error("ไม่สามารถเชื่อมต่อกับบริการ AI ได้ในขณะนี้");
    } finally {
      setIsLoading(false);
      setActiveTool(null);
    }
  };

  const handleConfirmAction = async (msgId: string, action: ActionRequired, approved: boolean) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, actionLoading: true } : m))
    );

    try {
      const res = await fetch("/api/ai/confirm-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toolName: action.toolName,
          args: action.args,
          approved,
        }),
      });

      const data = await res.json();
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId
            ? {
              ...m,
              actionLoading: false,
              actionCompleted: true,
              actionResultReply: data.reply || (approved ? "✅ ทำรายการสำเร็จ" : "❌ ยกเลิกทำรายการแล้ว"),
            }
            : m
        )
      );

      if (approved && data.success) {
        toast.success(data.message || "ทำรายการสำเร็จ");

        // Dispatch Redux thunks to update frontend slice state in real-time
        const toolName = action.toolName;
        if (["createProduct", "updateProduct", "deleteProduct", "adjustStock"].includes(toolName)) {
          dispatch(fetchProducts());
          dispatch(fetchMovements());
        } else if (["createCategory", "deleteCategory"].includes(toolName)) {
          dispatch(fetchCategories());
          dispatch(fetchProducts());
        } else if (["createLocation", "updateLocation", "deleteLocation"].includes(toolName)) {
          dispatch(fetchLocations());
        } else if (["updateMemberRole", "removeStoreMember", "addStoreMember"].includes(toolName)) {
          if (activeStoreId) dispatch(fetchMembers(activeStoreId));
        } else if (["voidOrder"].includes(toolName)) {
          dispatch(fetchOrders());
          dispatch(fetchProducts());
          dispatch(fetchSummary());
        } else if (["updateStoreSettings"].includes(toolName)) {
          dispatch(fetchStores());
        }
      } else if (!approved) {
        toast.info("ยกเลิกการทำรายการเรียบร้อยแล้ว");
      } else {
        toast.error(data.message || "เกิดข้อผิดพลาดในการทำรายการ");
      }
    } catch {
      toast.error("ไม่สามารถเชื่อมต่อระบบยืนยันรายการได้");
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, actionLoading: false } : m))
      );
    }
  };

  const handleCopy = (id: string, text: string) => {
    try {
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopiedId(id);
      toast.success("คัดลอกข้อความเรียบร้อยแล้ว");
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error("Failed to copy text:", err);
      toast.error("ไม่สามารถคัดลอกข้อความได้");
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: Date.now().toString(),
        role: "assistant",
        content: `รีเซ็ตการสนทนาเรียบร้อยครับ! มีอะไรให้ **Fastory AI** ช่วยวิเคราะห์เพิ่มเติมเกี่ยวกับร้าน **${activeStore?.name || "ของคุณ"}** ไหมครับ?`,
        timestamp: new Date().toLocaleTimeString("th-TH", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
    ]);
    toast.info("ล้างประวัติการสนทนาเรียบร้อยแล้ว");
  };

  const parseContentAndSuggestions = (rawContent: string) => {
    const suggestMatch = rawContent.match(/\[SUGGESTIONS:\s*([\s\S]*?)\]$/);
    if (!suggestMatch) {
      return { cleanContent: rawContent, suggestions: [] };
    }

    const cleanContent = rawContent.replace(/\[SUGGESTIONS:\s*[\s\S]*?\]$/, "").trim();
    let suggestions: string[] = [];
    try {
      const jsonStr = `[${suggestMatch[1]}]`;
      suggestions = JSON.parse(jsonStr);
    } catch {
      const matches = suggestMatch[1].match(/"([^"]+)"/g);
      suggestions = matches ? matches.map((m) => m.replace(/"/g, "")) : [];
    }

    return { cleanContent, suggestions };
  };

  const parseJsonAttribute = <T = any,>(raw: string, fallback: T): T => {
    if (!raw || !raw.trim()) return fallback;

    let str = raw.trim();
    str = str
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">");

    try {
      return JSON.parse(str);
    } catch { }

    try {
      const fixedQuotes = str.replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, '"$1"');
      return JSON.parse(fixedQuotes);
    } catch { }

    try {
      if ((str.startsWith("[") && str.endsWith("]")) || (str.startsWith("{") && str.endsWith("}"))) {
        const fn = new Function(`return (${str});`);
        const res = fn();
        if (res !== undefined) return res;
      }
    } catch { }

    return fallback;
  };

  const extractTextFromReactNode = (node: any): string => {
    if (node === null || node === undefined) return "";
    if (typeof node === "string" || typeof node === "number") return String(node);
    if (Array.isArray(node)) return node.map(extractTextFromReactNode).join("");
    if (node && typeof node === "object" && node.props && node.props.children) {
      return extractTextFromReactNode(node.props.children);
    }
    return "";
  };

  const PaginatedMarkdownTable = (props: any) => {
    try {
      const headers: string[] = [];
      const rows: string[][] = [];

      const traverseTree = (node: any, inThead = false, inTbody = false) => {
        if (!node) return;
        if (Array.isArray(node)) {
          node.forEach((item) => traverseTree(item, inThead, inTbody));
          return;
        }
        if (typeof node !== "object" || !node.props) return;

        const tagType = String(node.type || node.key || "").toLowerCase();
        const isThead = inThead || tagType.includes("thead");
        const isTbody = inTbody || tagType.includes("tbody");

        if (tagType.includes("tr") || (node.props.children && String(node.key || "").includes("tr"))) {
          const cells: string[] = [];
          const children = React.Children.toArray(node.props.children);
          children.forEach((cell: any) => {
            const cellTxt = extractTextFromReactNode(cell).trim();
            cells.push(cellTxt);
          });

          if (cells.length > 0) {
            if (isThead && headers.length === 0) {
              headers.push(...cells);
            } else {
              rows.push(cells);
            }
          }
          return;
        }

        if (node.props.children) {
          traverseTree(node.props.children, isThead, isTbody);
        }
      };

      traverseTree(props.children);

      if (headers.length > 0 && rows.length > 0) {
        return <AiTableCard headers={headers} rows={rows} defaultPageSize={5} />;
      }

      if (rows.length > 0) {
        return <AiTableCard rows={rows} defaultPageSize={5} />;
      }
    } catch (err) {
      console.error("Failed to parse markdown table:", err);
    }

    return (
      <div className="overflow-x-auto my-3 border rounded-xl bg-card shadow-sm p-3">
        <table className="w-full text-xs text-left border-collapse border border-border" {...props} />
      </div>
    );
  };

  const renderContent = (content: string) => {
    // Regex to extract custom XML-like tags, allowing multi-line tags via [\s\S]
    const cardRegex = /(<(?:ProductCard|SalesCard|OrderCard|TableCard|ChartCard)[\s\S]*?\/>)/g;
    const parts = content.split(cardRegex);

    const getAttr = (tag: string, attr: string) => {
      const attrPattern = new RegExp(`(?:^|\\s)${attr}\\s*=\\s*`);
      const match = tag.match(attrPattern);
      if (!match || match.index === undefined) return "";

      const valueStart = match.index + match[0].length;
      const afterAttr = tag.slice(valueStart).trimStart();
      if (!afterAttr) return "";

      const quoteChar = afterAttr[0];
      if (quoteChar === '"' || quoteChar === "'") {
        const rest = afterAttr.slice(1);

        for (let i = 0; i < rest.length; i++) {
          if (rest[i] === quoteChar) {
            const charAfterQuote = rest.slice(i + 1);
            if (
              charAfterQuote.length === 0 ||
              /^\s*(?:\/>|>|[a-zA-Z0-9_-]+\s*=)/.test(charAfterQuote)
            ) {
              return rest.slice(0, i);
            }
          }
        }

        const matchFallback = rest.match(new RegExp(`([\\s\\S]*?)${quoteChar}(?:\\s|\\/>|>|$)`));
        if (matchFallback) return matchFallback[1];
      } else {
        const match = afterAttr.match(/^([^\s/>]+)/);
        if (match) return match[1];
      }

      return "";
    };

    return parts.map((part, idx) => {
      if (!part) return null;

      if (part.startsWith("<ProductCard")) {
        const name = getAttr(part, "name");
        const price = getAttr(part, "price");
        const stock = getAttr(part, "stock");
        const sku = getAttr(part, "sku");

        return (
          <div key={idx} className="my-3 p-3 border rounded-xl bg-card shadow-sm flex flex-col gap-2 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 opacity-10">
              <Package className="size-12" />
            </div>
            <div className="flex items-start gap-3">
              <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Package className="size-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">SKU: {sku || "-"}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t text-sm">
              <div>
                <p className="text-muted-foreground text-xs">ราคา</p>
                <p className="font-medium text-emerald-600 dark:text-emerald-400">
                  {price && price !== "-" && price !== "undefined" && price !== "null" ? `฿${price}` : "ไม่ระบุ"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">สต็อกคงเหลือ</p>
                <p className="font-medium">{stock || "0"} ชิ้น</p>
              </div>
            </div>
          </div>
        );
      }

      if (part.startsWith("<SalesCard")) {
        const title = getAttr(part, "title");
        const revenue = getAttr(part, "revenue");
        const count = getAttr(part, "count");

        return (
          <div key={idx} className="my-3 p-4 border rounded-xl bg-card shadow-sm flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-blue-50 text-blue-500 dark:bg-blue-950 dark:text-blue-400 flex items-center justify-center shrink-0">
                <DollarSign className="size-5" />
              </div>
              <div>
                <p className="font-semibold text-sm">{title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{count} ออเดอร์</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-bold text-lg text-emerald-600 dark:text-emerald-400">฿{revenue}</p>
            </div>
          </div>
        );
      }

      if (part.startsWith("<OrderCard")) {
        const orderNumber = getAttr(part, "orderNumber");
        const total = getAttr(part, "total");
        const paymentMethod = getAttr(part, "paymentMethod");

        return (
          <div key={idx} className="my-3 p-3 border rounded-xl bg-card shadow-sm flex flex-col gap-2">
            <div className="flex items-center justify-between pb-2 border-b">
              <div className="flex items-center gap-2">
                <Receipt className="size-4 text-muted-foreground" />
                <span className="text-sm font-semibold">บิล #{orderNumber}</span>
              </div>
              <Badge variant="outline" className="text-xs">
                {paymentMethod}
              </Badge>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-muted-foreground">ยอดรวมทั้งสิ้น</span>
              <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400">฿{total}</span>
            </div>
          </div>
        );
      }

      if (part.startsWith("<TableCard")) {
        const title = getAttr(part, "title");
        const headers = parseJsonAttribute<string[]>(getAttr(part, "headers"), []);
        const rows = parseJsonAttribute<any[][]>(getAttr(part, "rows"), []);
        const pageSize = Number(getAttr(part, "pageSize") || 5);

        return (
          <AiTableCard
            key={idx}
            title={title || "ตารางข้อมูล"}
            headers={headers}
            rows={rows}
            defaultPageSize={pageSize}
          />
        );
      }

      if (part.startsWith("<ChartCard")) {
        const type = getAttr(part, "type") || "bar";
        const title = getAttr(part, "title") || "กราฟสรุปข้อมูล";
        const data = parseJsonAttribute<any[]>(getAttr(part, "data"), []);
        const xKey = getAttr(part, "xKey") || "name";
        const dataKeys = parseJsonAttribute<string[]>(getAttr(part, "dataKeys"), ["value"]);
        const labels = parseJsonAttribute<string[]>(getAttr(part, "labels"), []);

        return (
          <AiChartCard
            key={idx}
            type={type}
            title={title}
            data={data}
            xKey={xKey}
            dataKeys={dataKeys}
            labels={labels}
          />
        );
      }

      // Render standard text with Markdown
      return (
        <div key={idx} className="markdown-body prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed my-1">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              table: PaginatedMarkdownTable,
            }}
          >
            {part}
          </ReactMarkdown>
        </div>
      );
    });
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-4">
      <PageHeaderCards
        title="ผู้ช่วย AI วิเคราะห์ร้านค้า (Fastory AI)"
        description={`ร้านค้าปัจจุบัน: ${activeStore?.name || "ยังไม่ได้เลือกร้านค้า"}`}
      >
        <Badge variant="outline" className="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 border-emerald-200">
          Online
        </Badge>
        <Button
          variant="outline"
          size="sm"
          onClick={handleResetChat}
          className="gap-2 text-xs"
        >
          <RefreshCw className="size-3.5" />
          ล้างประวัติการคุย
        </Button>
      </PageHeaderCards>

      {/* Main Chat Container */}
      <Card className="flex flex-col flex-1 min-h-0 border-border/60 shadow-sm overflow-hidden bg-card/50 backdrop-blur-sm">
        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          {messages.map((msg) => {
            const { cleanContent, suggestions } = parseContentAndSuggestions(msg.content);
            return (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-[85%] ${msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                  }`}
              >
                {/* Avatar */}
                <div
                  className={`size-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground border"
                    }`}
                >
                  {msg.role === "user" ? (
                    <User className="size-4" />
                  ) : (
                    <Bot className="size-4" />
                  )}
                </div>

                {/* Message Box */}
                <div className="group relative space-y-1">
                  <div
                    className={`p-4 rounded-2xl text-sm shadow-xs ${msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-tr-none"
                        : "bg-muted/60 border border-border/60 text-foreground rounded-tl-none"
                      }`}
                  >
                    {renderContent(cleanContent)}

                    {msg.actionRequired && (
                      <div className="mt-3 p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 space-y-2">
                        <div className="flex items-center gap-2 text-xs font-semibold">
                          <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400 shrink-0" />
                          <span>AI ขออนุญาตดำเนินการดังต่อไปนี้:</span>
                        </div>

                        <div className="text-xs bg-background/70 p-3 rounded-lg border text-foreground space-y-1">
                          <p className="font-semibold text-primary flex items-center gap-1.5">
                            <Check className="size-3.5" />
                            {TOOL_NAME_MAP[msg.actionRequired.toolName] || msg.actionRequired.toolName}
                          </p>
                          {renderActionArgs(msg.actionRequired.toolName, msg.actionRequired.args)}
                        </div>

                        {!msg.actionCompleted ? (
                          <div className="flex items-center gap-2 pt-1">
                            <Button
                              size="sm"
                              disabled={msg.actionLoading}
                              onClick={() => handleConfirmAction(msg.id, msg.actionRequired!, true)}
                              className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-sm"
                            >
                              <Check className="size-3.5" />
                              {msg.actionLoading ? "กำลังทำรายการ..." : "ยืนยันดำเนินการ"}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={msg.actionLoading}
                              onClick={() => handleConfirmAction(msg.id, msg.actionRequired!, false)}
                              className="text-xs h-8 text-muted-foreground hover:text-foreground"
                            >
                              ยกเลิก
                            </Button>
                          </div>
                        ) : (
                          <div className="text-xs font-medium pt-1 text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                            <Check className="size-4" />
                            <span>{msg.actionResultReply}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Dynamic Suggestions Chips */}
                  {msg.role === "assistant" && suggestions.length > 0 && (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 animate-fade-in">
                      <p className="text-[11px] font-medium text-muted-foreground w-full flex items-center gap-1 mb-0.5">
                        <Sparkles className="size-3 text-primary" /> คำแนะนำถามต่อ:
                      </p>
                      {suggestions.map((sug, sIdx) => (
                        <button
                          key={sIdx}
                          disabled={isLoading}
                          onClick={() => handleSendMessage(sug)}
                          className="text-xs px-3 py-1.5 rounded-full border bg-card hover:bg-accent text-foreground hover:text-accent-foreground transition-all shadow-2xs flex items-center gap-1.5 font-medium group text-left"
                        >
                          <span>{sug}</span>
                          <ChevronRight className="size-3 text-muted-foreground group-hover:text-foreground opacity-60 shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Footer details */}
                  <div
                    className={`flex items-center gap-2 text-[11px] text-muted-foreground px-1 ${msg.role === "user" ? "justify-end" : "justify-start"
                      }`}
                  >
                    <span>{msg.timestamp}</span>
                    {msg.role === "assistant" && (
                      <button
                        onClick={() => handleCopy(msg.id, msg.content)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-foreground p-0.5 rounded"
                        title="คัดลอกข้อความ"
                      >
                        {copiedId === msg.id ? (
                          <Check className="size-3 text-emerald-500" />
                        ) : (
                          <Copy className="size-3" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Typing Indicator */}
          {isLoading && (
            <div className="flex gap-3 max-w-[85%] mr-auto items-center">
              <div className="size-8 rounded-full bg-muted text-muted-foreground border flex items-center justify-center shrink-0 shadow-sm">
                <BrainCircuit className="size-4 animate-spin" />
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="p-3.5 rounded-2xl bg-muted/60 border border-border/60 text-sm text-muted-foreground flex items-center gap-2 rounded-tl-none">
                  <span className="inline-block size-2 rounded-full bg-primary animate-ping" />
                  <span>Fastory AI กำลังคิดและวิเคราะห์ข้อมูล...</span>
                </div>
                {activeTool && (
                  <div className="text-[11px] text-primary flex items-center gap-1.5 px-2 animate-pulse">
                    <span>🛠️</span>
                    <span>กำลังใช้คำสั่ง: <strong>{activeTool}</strong>...</span>
                  </div>
                )}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Prompts Bar */}
        {messages.length < 5 && (
          <div className="p-3 border-t border-border/40 bg-muted/20">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {QUICK_PROMPTS.map((qp, idx) => {
                const IconComponent = qp.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(qp.prompt)}
                    className="flex items-center gap-2 p-2.5 rounded-xl border bg-card text-card-foreground text-left transition-all hover:bg-accent hover:text-accent-foreground shadow-sm group"
                  >
                    <IconComponent className="size-4 shrink-0 text-muted-foreground group-hover:text-foreground" />
                    <span className="text-xs font-medium truncate flex-1">
                      {qp.title}
                    </span>
                    <ChevronRight className="size-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 text-muted-foreground" />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="p-3 md:p-4 border-t border-border/60 bg-card">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-end gap-2"
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="พิมพ์คำถาม หรือพิมพ์สิ่งที่ต้องการให้ AI ช่วยวิเคราะห์ (เช่น ยอดขายวันนี้, สินค้าสต็อกต่ำ)..."
              className="flex-1 min-h-[44px] max-h-32 p-3 text-sm rounded-xl border border-input bg-background resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 transition-all placeholder:text-muted-foreground/60"
              rows={1}
            />
            <Button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="h-11 px-4 rounded-xl gap-2 shadow-sm shrink-0"
            >
              <Send className="size-4" />
              <span className="hidden sm:inline">ส่ง</span>
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
