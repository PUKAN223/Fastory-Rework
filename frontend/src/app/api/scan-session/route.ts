/**
 * Barcode Scan Session API — Server-Sent Events (SSE)
 *
 * POST   /api/scan-session          — สร้าง session token ใหม่
 * GET    /api/scan-session?token=x  — SSE stream รอรับ barcode (Desktop)
 * PUT    /api/scan-session?token=x  — ส่ง barcode จาก mobile (multi-scan ได้)
 * DELETE /api/scan-session?token=x  — ยกเลิก session
 */

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

const SESSION_TTL_MS = 5 * 60 * 1000; // 5 minutes (เพิ่มเวลาสำหรับ multi-scan)

interface ScanSession {
  controller: ReadableStreamDefaultController | null;
  expiresAt: number;
  timer: ReturnType<typeof setTimeout>;
}

// In-memory store — resets on server restart (acceptable for this use-case)
const sessions = new Map<string, ScanSession>();

function cleanupSession(token: string) {
  const s = sessions.get(token);
  if (!s) return;
  clearTimeout(s.timer);
  try {
    s.controller?.close();
  } catch {
    // already closed
  }
  sessions.delete(token);
}

function sendSSE(
  controller: ReadableStreamDefaultController,
  event: string,
  data: unknown,
) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  controller.enqueue(new TextEncoder().encode(payload));
}

// POST — create session
export async function POST() {
  const token = randomUUID();
  const timer = setTimeout(() => {
    const s = sessions.get(token);
    if (s?.controller) {
      try {
        sendSSE(s.controller, "expired", { message: "Session expired" });
        s.controller.close();
      } catch {
        // ignore
      }
    }
    sessions.delete(token);
  }, SESSION_TTL_MS);

  sessions.set(token, {
    controller: null,
    expiresAt: Date.now() + SESSION_TTL_MS,
    timer,
  });

  return NextResponse.json({ token, expiresAt: Date.now() + SESSION_TTL_MS });
}

// GET — SSE stream (Desktop listens here)
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token)
    return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const session = sessions.get(token);
  if (!session)
    return NextResponse.json(
      { error: "Session not found or expired" },
      { status: 404 },
    );

  const stream = new ReadableStream({
    start(controller) {
      session.controller = controller;

      // Heartbeat every 15s to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          sendSSE(controller, "ping", { ts: Date.now() });
        } catch {
          clearInterval(heartbeat);
        }
      }, 15000);

      // Initial ready event
      sendSSE(controller, "ready", { token, expiresAt: session.expiresAt });

      req.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        cleanupSession(token);
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

// PUT — mobile sends scanned barcode (ไม่ปิด session หลัง scan — รองรับ multi-scan)
export async function PUT(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token)
    return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const session = sessions.get(token);
  if (!session)
    return NextResponse.json(
      { error: "Session not found or expired" },
      { status: 404 },
    );

  const body = await req.json().catch(() => null);
  const barcode = body?.barcode?.trim();
  if (!barcode)
    return NextResponse.json({ error: "Missing barcode" }, { status: 400 });

  // Push scan event to Desktop via SSE — ไม่ปิด session ให้สแกนได้หลายรอบ
  if (session.controller) {
    try {
      sendSSE(session.controller, "scan", { barcode });
    } catch {
      // connection already closed
    }
  }

  return NextResponse.json({ success: true });
}

// DELETE — cancel session
export async function DELETE(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (token) cleanupSession(token);
  return NextResponse.json({ success: true });
}
