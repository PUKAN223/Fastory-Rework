"use client";

/**
 * BarcodeScannerDialog
 *
 * สแกนบาร์โค้ดผ่านกล้อง Webcam บน Desktop/Laptop
 */

import { BrowserMultiFormatReader } from "@zxing/browser";
import { NotFoundException } from "@zxing/library";
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  Loader2,
  RefreshCw,
  ScanLine,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type CameraState =
  | "initializing"
  | "scanning"
  | "success"
  | "error"
  | "no-permission";

interface BarcodeScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan: (barcode: string) => void;
  /** single = สแกนครั้งเดียวแล้วปิด | multi = สแกนหลายรอบจนกว่าจะปิดเอง */
  scanMode?: "single" | "multi";
}

// IScannerControls returned by decodeFromVideoDevice
interface ScannerControls {
  stop: () => void;
}

export function BarcodeScannerDialog({
  open,
  onOpenChange,
  onScan,
  scanMode = "single",
}: BarcodeScannerDialogProps) {
  const [cameraState, setCameraState] = useState<CameraState>("initializing");
  const [cameraError, setCameraError] = useState("");
  const [scannedValue, setScannedValue] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<ScannerControls | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const hasScannedRef = useRef(false);

  // ── Helpers ──────────────────────────────────────────────────────────────

  const stopCamera = useCallback(() => {
    try { controlsRef.current?.stop(); } catch {}
    controlsRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const handleSuccess = useCallback(
    (barcode: string) => {
      setScannedValue(barcode);
      onScan(barcode);
      if (scanMode === "single") {
        stopCamera();
        setCameraState("success");
      }
      // multi mode: กล้องยังเปิดอยู่ สแกนต่อได้เลย (อาจจะแสดง effect เล็กน้อยแล้วเริ่มสแกนต่อ)
      else {
        setCameraState("success");
        setTimeout(() => {
          if (open) setCameraState("scanning");
        }, 1000);
      }
    },
    [onScan, stopCamera, scanMode, open],
  );

  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  // ── Camera Mode ───────────────────────────────────────────────────────────

  const startCamera = useCallback(async () => {
    hasScannedRef.current = false;
    setCameraState("initializing");

    try {
      // 1. Get media stream manually to ensure permissions and tracks are handled correctly
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment", // Prefer back camera if available (tablets/phones)
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;

      // Wait a tick for the video element to be ready in the DOM
      await new Promise((resolve) => requestAnimationFrame(resolve));

      if (!videoRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      const reader = new BrowserMultiFormatReader();
      const controls = await reader.decodeFromStream(
        stream,
        videoRef.current,
        (result, err) => {
          if (hasScannedRef.current) return;
          if (result) {
            hasScannedRef.current = true;
            handleSuccess(result.getText());
          }
          if (err && !(err instanceof NotFoundException)) {
            // NotFoundException is normal when it just hasn't found a barcode yet
            // console.warn("Scan error:", err);
          }
        },
      );

      controlsRef.current = controls as unknown as ScannerControls;
      setCameraState("scanning");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (
        msg.toLowerCase().includes("permission") ||
        msg.toLowerCase().includes("denied") ||
        msg.toLowerCase().includes("notallowed") ||
        msg.toLowerCase().includes("requested device not found")
      ) {
        setCameraState("no-permission");
      } else {
        setCameraState("error");
        setCameraError(msg);
      }
    }
  }, [handleSuccess]);

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (open) {
      setScannedValue("");
      hasScannedRef.current = false;
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [open, startCamera, stopCamera]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-background">
        <DialogHeader className="p-4 sm:p-6 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="w-5 h-5 text-primary" />
            สแกนบาร์โค้ด
          </DialogTitle>
        </DialogHeader>

        <div className="p-4 sm:p-6 pt-2">
          {/* CAMERA MODE */}
          <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden border">
            {/* ซ่อน video ถ้าไม่ใช่ state scanning/success แต่ยังต้องมี element ไว้ใน DOM สำหรับ ZXing */}
            <video
              ref={videoRef}
              className={`w-full h-full object-cover ${
                cameraState === "scanning" || cameraState === "success"
                  ? "block"
                  : "hidden"
              }`}
              autoPlay
              muted
              playsInline
              {...({ "webkit-playsinline": "true" } as any)}
            />

            {/* SCANNING STATE OVERLAY */}
            {cameraState === "scanning" && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-0 bg-black/20" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-[60%] h-[40%] relative">
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-[3px] border-l-[3px] border-primary" />
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-[3px] border-r-[3px] border-primary" />
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-[3px] border-l-[3px] border-primary" />
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-[3px] border-r-[3px] border-primary" />
                    <div className="absolute inset-x-0 h-0.5 bg-primary/70 top-1/2 -translate-y-1/2 shadow-[0_0_8px_rgba(var(--primary))] animate-[scan_2s_ease-in-out_infinite]" />
                  </div>
                </div>
              </div>
            )}

            {/* INITIALIZING */}
            {cameraState === "initializing" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-950/80">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm text-zinc-400 font-medium">กำลังเปิดกล้อง...</p>
              </div>
            )}

            {/* NO PERMISSION */}
            {cameraState === "no-permission" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-950/80 px-6 text-center">
                <Camera className="w-10 h-10 text-zinc-500 mb-1" />
                <p className="text-sm font-semibold text-zinc-200">
                  ไม่สามารถเข้าถึงกล้องได้
                </p>
                <p className="text-xs text-zinc-400 max-w-[200px]">
                  กรุณาอนุญาตให้เบราว์เซอร์ใช้งานกล้อง หรือตรวจดูว่ามีกล้องเชื่อมต่ออยู่หรือไม่
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={startCamera}
                  className="mt-2 h-8 text-xs bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                  ลองใหม่
                </Button>
              </div>
            )}

            {/* ERROR */}
            {cameraState === "error" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-950/80 px-6 text-center">
                <AlertCircle className="w-10 h-10 text-red-500/80 mb-1" />
                <p className="text-sm font-semibold text-red-400">
                  เกิดข้อผิดพลาด
                </p>
                <p className="text-xs text-zinc-400 max-w-[200px] truncate">
                  {cameraError}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={startCamera}
                  className="mt-2 h-8 text-xs bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                  ลองใหม่
                </Button>
              </div>
            )}

            {/* SUCCESS */}
            {cameraState === "success" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-emerald-950/90 gap-4">
                <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-7 h-7 text-emerald-500" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-emerald-400">สแกนสำเร็จ</p>
                  <p className="font-mono mt-1 px-3 py-1 bg-black/30 rounded text-emerald-500 border border-emerald-500/20">
                    {scannedValue}
                  </p>
                </div>
              </div>
            )}
          </div>
          
          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground">
              {scanMode === "single" 
                ? "นำบาร์โค้ดมาจ่อที่กล้องเพื่อสแกน" 
                : "สแกนบาร์โค้ดได้ต่อเนื่องโดยไม่ต้องปิดหน้าต่างนี้"}
            </p>
          </div>
        </div>
      </DialogContent>

      <style>{`
        @keyframes scan {
          0% { top: 0%; }
          50% { top: 100%; }
          100% { top: 0%; }
        }
      `}</style>
    </Dialog>
  );
}
