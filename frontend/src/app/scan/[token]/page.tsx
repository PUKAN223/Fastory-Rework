"use client";

import { BrowserMultiFormatReader } from "@zxing/browser";
import { NotFoundException } from "@zxing/library";
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  Loader2,
  ScanLine,
  XCircle,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type ScanState =
  | "initializing"
  | "scanning"
  | "success"
  | "error"
  | "expired"
  | "no-camera";

export default function MobileScanPage() {
  const params = useParams();
  const token = params?.token as string;

  const [state, setState] = useState<ScanState>("initializing");
  const [scannedValue, setScannedValue] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const hasScannedRef = useRef(false);

  const submitBarcode = useCallback(
    async (barcode: string) => {
      if (hasScannedRef.current) return;
      hasScannedRef.current = true;

      // Stop scanner
      if (controlsRef.current) {
        try {
          controlsRef.current.stop();
        } catch {}
        controlsRef.current = null;
      }

      setScannedValue(barcode);
      setState("success");

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
          }
        }
      } catch {
        // network error — still show success locally
      }
    },
    [token],
  );

  useEffect(() => {
    if (!token) return;

    let mounted = true;
    const reader = new BrowserMultiFormatReader();

    (async () => {
      try {
        // ── iOS Fix: ต้องเรียก getUserMedia ก่อนเสมอ ──────────────────
        // iOS Safari จะ return device labels ว่างถ้าไม่มี active stream
        // ดังนั้นขอ permission ผ่าน getUserMedia ก่อน แล้วปล่อย stream นั้นทิ้ง
        // จากนั้น ZXing จะเปิด stream ใหม่เองผ่าน decodeFromConstraints
        const tempStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        tempStream.getTracks().forEach((t) => t.stop());

        if (!mounted) return;
        setState("scanning");

        // ── ใช้ facingMode แทน deviceId เพื่อรองรับ iOS ──────────────
        // iOS ไม่รองรับ deviceId ใน constraints ได้ดี
        const controls = await reader.decodeFromConstraints(
          {
            video: {
              facingMode: { ideal: "environment" },
            },
          },
          videoRef.current!,
          (result, err) => {
            if (!mounted || hasScannedRef.current) return;
            if (result) {
              const text = result.getText();
              submitBarcode(text);
            }
            if (err && !(err instanceof NotFoundException)) {
              // NotFoundException เป็นปกติขณะ scan ยังไม่เจอ barcode
            }
          },
        );

        if (!mounted) {
          controls.stop();
          return;
        }

        controlsRef.current = controls as any;
      } catch (err: unknown) {
        if (!mounted) return;
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
    })();

    return () => {
      mounted = false;
      if (controlsRef.current) {
        try {
          controlsRef.current.stop();
        } catch {}
        controlsRef.current = null;
      }
    };
  }, [token, submitBarcode]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-6 select-none">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <ScanLine className="w-6 h-6 text-primary" />
          <span className="text-lg font-semibold tracking-tight">
            Fastory Scanner
          </span>
        </div>
        <p className="text-sm text-zinc-400">สแกน Barcode เพื่อกรอก SKU</p>
      </div>

      {/* States */}
      {state === "initializing" && (
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-sm text-zinc-400">กำลังเปิดกล้อง...</p>
        </div>
      )}

      {state === "scanning" && (
        <div className="w-full max-w-sm flex flex-col items-center gap-4">
          {/* Camera viewfinder */}
          <div className="relative w-full aspect-square rounded-2xl overflow-hidden border-2 border-primary/50 shadow-lg shadow-primary/20">
            {/* 
              iOS requires:
              1. autoPlay
              2. muted  
              3. playsInline (JSX prop)
              4. webkit-playsinline (HTML attr via ref — ใส่ไว้ใน useEffect ด้านล่าง)
            */}
            <video
              ref={(el) => {
                (videoRef as any).current = el;
                // webkit-playsinline สำคัญมากบน iOS เพื่อป้องกันวิดีโอเปิดแบบ fullscreen
                if (el) el.setAttribute("webkit-playsinline", "true");
              }}
              className="w-full h-full object-cover"
              autoPlay
              muted
              playsInline
            />
            {/* Scan overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-3/4 h-3/4 relative">
                {/* Corner brackets */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg" />
                {/* Scan line animation */}
                <div className="absolute inset-x-0 h-0.5 bg-primary/80 shadow-[0_0_8px_2px] shadow-primary animate-[scan-line_2s_ease-in-out_infinite]" />
              </div>
            </div>
          </div>
          <p className="text-sm text-zinc-400 text-center">
            จ่อกล้องไปที่ Barcode บนสินค้า
          </p>
        </div>
      )}

      {state === "success" && (
        <div className="flex flex-col items-center gap-5 text-center">
          <div className="w-20 h-20 rounded-full bg-emerald-500/15 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
          </div>
          <div>
            <p className="text-lg font-semibold text-emerald-400">สแกนสำเร็จ!</p>
            <p className="text-sm text-zinc-400 mt-1">
              ค่าที่สแกนได้ถูกส่งไปยังคอมพิวเตอร์แล้ว
            </p>
          </div>
          <div className="bg-zinc-800 rounded-xl px-6 py-3 border border-zinc-700">
            <p className="text-xs text-zinc-500 mb-1">Barcode</p>
            <p className="font-mono text-base font-semibold tracking-wider text-white break-all">
              {scannedValue}
            </p>
          </div>
          <p className="text-xs text-zinc-600">
            คุณสามารถปิดหน้านี้ได้แล้ว
          </p>
        </div>
      )}

      {state === "expired" && (
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-20 h-20 rounded-full bg-amber-500/15 flex items-center justify-center">
            <AlertCircle className="w-10 h-10 text-amber-400" />
          </div>
          <div>
            <p className="text-lg font-semibold text-amber-400">Session หมดอายุ</p>
            <p className="text-sm text-zinc-400 mt-1">
              กลับไปกดปุ่มสแกนใหม่อีกครั้ง
            </p>
          </div>
        </div>
      )}

      {state === "no-camera" && (
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-20 h-20 rounded-full bg-zinc-800 flex items-center justify-center">
            <Camera className="w-10 h-10 text-zinc-500" />
          </div>
          <div>
            <p className="text-lg font-semibold">ไม่พบกล้อง</p>
            <p className="text-sm text-zinc-400 mt-1">
              กรุณาอนุญาตการเข้าถึงกล้องในเบราว์เซอร์ แล้วลองใหม่อีกครั้ง
            </p>
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium active:scale-95 transition-transform"
          >
            ลองใหม่
          </button>
        </div>
      )}

      {state === "error" && (
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-20 h-20 rounded-full bg-red-500/15 flex items-center justify-center">
            <XCircle className="w-10 h-10 text-red-400" />
          </div>
          <div>
            <p className="text-lg font-semibold text-red-400">เกิดข้อผิดพลาด</p>
            <p className="text-sm text-zinc-400 mt-1">{errorMsg || "ไม่สามารถเปิดกล้องได้"}</p>
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-2 px-5 py-2.5 rounded-xl bg-zinc-700 text-white text-sm font-medium active:scale-95 transition-transform"
          >
            ลองใหม่
          </button>
        </div>
      )}

      <style>{`
        @keyframes scan-line {
          0% { top: 10%; }
          50% { top: 85%; }
          100% { top: 10%; }
        }
      `}</style>
    </div>
  );
}
