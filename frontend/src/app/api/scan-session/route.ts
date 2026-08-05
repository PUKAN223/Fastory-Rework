/**
 * Barcode Scan Session API — Server-Sent Events (SSE)
 *
 * GET    /api/scan-session?token=x  — SSE stream รอรับ barcode (Desktop)
 * PUT    /api/scan-session?token=x  — ส่ง barcode หรือ ping จาก mobile
 * DELETE /api/scan-session?token=x  — ปิด session
 */

import { NextRequest, NextResponse } from "next/server";

interface ScanSession {
  controller: ReadableStreamDefaultController | null;
}

// In-memory store
// Note: In development, Next.js fast refresh may clear this. The desktop client handles auto-reconnect.
const sessions = new Map<string, ScanSession>();

function getOrCreateSession(token: string) {
  if (!sessions.has(token)) {
    sessions.set(token, { controller: null });
  }
  return sessions.get(token)!;
}

function cleanupSession(token: string) {
  const s = sessions.get(token);
  if (!s) return;
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

// GET — SSE stream (Desktop listens here)
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token)
    return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const session = getOrCreateSession(token);

  const stream = new ReadableStream({
    start(controller) {
      session.controller = controller;

      // Heartbeat every 15s to keep connection alive and prevent timeout
      const heartbeat = setInterval(() => {
        try {
          sendSSE(controller, "heartbeat", { ts: Date.now() });
        } catch {
          clearInterval(heartbeat);
        }
      }, 15000);

      // Initial ready event
      sendSSE(controller, "ready", { token });

      req.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        // We only clear the controller, not the session itself, 
        // so that if mobile sends a payload before desktop reconnects, the session exists.
        // Actually, just clearing controller is safer.
        if (session.controller === controller) {
          session.controller = null;
        }
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

// PUT — mobile sends scanned barcode or ping
export async function PUT(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token)
    return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const session = getOrCreateSession(token);
  const body = await req.json().catch(() => null);

  const type = body?.type || "scan"; // default to scan
  const barcode = body?.barcode?.trim();

  if (type === "scan" && !barcode) {
    return NextResponse.json({ error: "Missing barcode" }, { status: 400 });
  }

  // Push event to Desktop via SSE
  if (session.controller) {
    try {
      if (type === "scan") {
        sendSSE(session.controller, "scan", { barcode });
      } else if (type === "ping") {
        sendSSE(session.controller, "ping", { ts: Date.now() });
      }
    } catch {
      // connection might be closed
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
