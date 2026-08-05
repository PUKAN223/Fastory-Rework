"use client";

import { BrowserMultiFormatReader } from "@zxing/browser";
import { NotFoundException } from "@zxing/library";
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  Loader2,
  RotateCcw,
  ScanLine,
  XCircle,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type ScanState =
  | "initializing"
  | "scanning"
  | "scanned"   // แสดงผลสำเร็จชั่วคราวก่อน reset กลับ
  | "error"
  | "expired"
  | "no-camera";

interface ScannedItem {
  barcode: string;
  ts: number;
}

export default function MobileScanPage() {
  const params = useParams();
  const token = params?.token as string;

  const [state, setState] = useState<ScanState>("initializing");
  const [lastScanned, setLastScanned] = useState<ScannedItem | null>(null);
  const [history, setHistory] = useState<ScannedItem[]>([]);
  const [errorMsg, setErrorMsg] = useState("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const hasScannedRef = useRef(false);
  const mountedRef = useRef(true);

  // ── เปิดกล้องสแกน ─────────────────────────────────────────────────────────
  const startScanning = useCallback(async () => {
    if (!mountedRef.current) return;
    hasScannedRef.current = false;
    setState("scanning");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      if (!mountedRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      streamRef.current = stream;
      await new Promise((resolve) => requestAnimationFrame(resolve));

      if (!mountedRef.current || !videoRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      const reader = new BrowserMultiFormatReader();
      const controls = await reader.decodeFromStream(
        stream,
        videoRef.current,
        (result, err) => {
          if (!mountedRef.current || hasScannedRef.current) return;
          if (result) {
            hasScannedRef.current = true;
            handleScan(result.getText());
          }
          if (err && !(err instanceof NotFoundException)) {
            // NotFoundException ปกติขณะ scan
          }
        },
      );

      if (!mountedRef.current) {
        controls.stop();
        return;
      }
      controlsRef.current = controls as unknown as { stop: () => void };
    } catch (err: unknown) {
      if (!mountedRef.current) return;
      const msg = err instanceof Error ? err.message : String(err);
      if (
        msg.toLowerCase().includes("permission") ||
        msg.toLowerCase().includes("denied") ||
        msg.toLowerCase().includes("notallowed")
      ) {
        setState("no-camera");
      } else {
        setState("error");
        setErrorMsg(msg);
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── หยุดกล้อง ─────────────────────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    if (controlsRef.current) {
      try { controlsRef.current.stop(); } catch {}
      controlsRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  // ── จัดการ scan ─────────────────────────────────────────────────────────
  const handleScan = useCallback(async (barcode: string) => {
    stopCamera();
    const item: ScannedItem = { barcode, ts: Date.now() };
    setLastScanned(item);
    setHistory((prev) => [item, ...prev]);
    setState("scanned");

    try {
      const res = await fetch(`/api/scan-session?token=${token}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ barcode }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data?.error?.includes("expired") || res.status === 404) {
          setState("expired");
          return;
        }
      }
    } catch {
      // network error — show success locally
    }

    // Auto-reset กลับไปสแกนหลังจาก 1.5 วินาที
    setTimeout(() => {
      if (mountedRef.current) startScanning();
    }, 1500);
  }, [token, stopCamera, startScanning]);

  useEffect(() => {
    if (!token) return;
    mountedRef.current = true;
    startScanning();

    return () => {
      mountedRef.current = false;
      if (controlsRef.current) {
        try { controlsRef.current.stop(); } catch {}
        controlsRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col select-none">
      {/* Header */}
      <div className="px-5 pt-10 pb-4">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center">
            <ScanLine className="w-4 h-4 text-primary" />
          </div>
          <span className="text-base font-semibold tracking-tight">Fastory Scanner</span>
        </div>
        <p className="text-xs text-zinc-500 pl-[42px]">
          {state === "scanning"
            ? "จ่อกล้องไปที่บาร์โค้ดบนสินค้า"
            : state === "scanned"
            ? "สแกนสำเร็จ กำลังเตรียมสแกนครั้งถัดไป..."
            : "พร้อมสแกน"}
        </p>
      </div>

      {/* Camera — render ตลอดเวลา ซ่อนด้วย hidden */}
      <div className={`relative mx-4 rounded-2xl overflow-hidden bg-black border border-zinc-800 ${
        state === "scanning" || state === "scanned" ? "block" : "hidden"
      }`}
        style={{ aspectRatio: "4/3" }}
      >
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          autoPlay
          muted
          playsInline
          {...({ "webkit-playsinline": "true" } as any)}
        />

        {/* Scan overlay — ซ่อนตอน scanned */}
        <div className={`absolute inset-0 ${state === "scanned" ? "opacity-0" : "opacity-100"} transition-opacity`}>
          {/* มุมกรอบ */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-3/4 h-1/2 relative">
              <div className="absolute top-0 left-0 w-10 h-10 border-t-[3px] border-l-[3px] border-primary rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-10 h-10 border-t-[3px] border-r-[3px] border-primary rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-10 h-10 border-b-[3px] border-l-[3px] border-primary rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-10 h-10 border-b-[3px] border-r-[3px] border-primary rounded-br-lg" />
              {/* เส้น scan */}
              <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_8px_2px_var(--tw-shadow-color)] shadow-primary/60 animate-[scan-line_2s_ease-in-out_infinite]" />
            </div>
          </div>
          {/* dim corners */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/40 pointer-events-none" />
        </div>

        {/* สแกนสำเร็จ overlay */}
        {state === "scanned" && (
          <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center">
            <div className="bg-emerald-500 rounded-full p-3 shadow-lg shadow-emerald-500/50">
              <CheckCircle2 className="w-8 h-8 text-white" />
            </div>
          </div>
        )}
      </div>

      {/* Initializing */}
      {state === "initializing" && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-sm text-zinc-400">กำลังเปิดกล้อง...</p>
        </div>
      )}

      {/* No camera */}
      {state === "no-camera" && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
          <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center">
            <Camera className="w-8 h-8 text-zinc-500" />
          </div>
          <div>
            <p className="font-semibold">ไม่สามารถเข้าถึงกล้องได้</p>
            <p className="text-sm text-zinc-400 mt-1">กรุณาอนุญาตการเข้าถึงกล้องในเบราว์เซอร์</p>
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-black text-sm font-medium active:scale-95 transition-transform"
          >
            <RotateCcw className="w-4 h-4" /> ลองใหม่
          </button>
        </div>
      )}

      {/* Expired */}
      {state === "expired" && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
          <div className="w-16 h-16 rounded-full bg-amber-500/15 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-amber-400" />
          </div>
          <div>
            <p className="font-semibold text-amber-400">Session หมดอายุ</p>
            <p className="text-sm text-zinc-400 mt-1">กลับไปกดปุ่มสแกนใหม่บนคอมพิวเตอร์</p>
          </div>
        </div>
      )}

      {/* Error */}
      {state === "error" && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/15 flex items-center justify-center">
            <XCircle className="w-8 h-8 text-red-400" />
          </div>
          <div>
            <p className="font-semibold text-red-400">เกิดข้อผิดพลาด</p>
            <p className="text-sm text-zinc-400 mt-1">{errorMsg || "ไม่สามารถเปิดกล้องได้"}</p>
          </div>
          <button
            type="button"
            onClick={() => { setState("initializing"); startScanning(); }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-700 text-white text-sm font-medium active:scale-95 transition-transform"
          >
            <RotateCcw className="w-4 h-4" /> ลองใหม่
          </button>
        </div>
      )}

      {/* Last scanned + history */}
      {lastScanned && (state === "scanning" || state === "scanned") && (
        <div className="px-4 mt-4 space-y-2">
          {/* Last scan */}
          <div className="flex items-center gap-3 bg-zinc-900 rounded-xl px-4 py-3 border border-zinc-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-zinc-500">สแกนล่าสุด</p>
              <p className="font-mono text-sm font-semibold tracking-wider truncate">
                {lastScanned.barcode}
              </p>
            </div>
          </div>

          {/* History */}
          {history.length > 1 && (
            <div className="bg-zinc-900/60 rounded-xl border border-zinc-800 overflow-hidden">
              <div className="px-4 py-2 border-b border-zinc-800">
                <p className="text-xs text-zinc-500">ประวัติการสแกน ({history.length} รายการ)</p>
              </div>
              <div className="max-h-36 overflow-y-auto">
                {history.slice(1).map((item, i) => (
                  <div key={item.ts} className={`flex items-center gap-3 px-4 py-2.5 ${
                    i < history.length - 2 ? "border-b border-zinc-800/50" : ""
                  }`}>
                    <div className="w-1.5 h-1.5 rounded-full bg-zinc-600 shrink-0" />
                    <p className="font-mono text-xs text-zinc-400 truncate">{item.barcode}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes scan-line {
          0% { top: 5%; }
          50% { top: 90%; }
          100% { top: 5%; }
        }
      `}</style>
    </div>
  );
}
