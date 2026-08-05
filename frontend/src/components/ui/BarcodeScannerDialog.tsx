"use client";

/**
 * BarcodeScannerDialog
 *
 * Auto-detects camera availability:
 * - มีกล้อง  → สแกนตรงๆ ผ่าน ZXing
 * - ไม่มีกล้อง → แสดง QR code ให้มือถือสแกน แล้วรับค่ากลับผ่าน SSE
 */

import { BrowserMultiFormatReader } from "@zxing/browser";
import { NotFoundException } from "@zxing/library";
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  Loader2,
  MonitorSmartphone,
  RefreshCw,
  ScanLine,
  X,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ScannerMode = "detecting" | "camera" | "remote";
type CameraState =
  | "initializing"
  | "scanning"
  | "success"
  | "error"
  | "no-permission";
type RemoteState =
  | "creating"
  | "waiting"
  | "success"
  | "expired"
  | "error";

interface BarcodeScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan: (barcode: string) => void;
}

const SESSION_TTL = 120; // seconds

export function BarcodeScannerDialog({
  open,
  onOpenChange,
  onScan,
}: BarcodeScannerDialogProps) {
  const [mode, setMode] = useState<ScannerMode>("detecting");

  // Camera mode state
  const [cameraState, setCameraState] = useState<CameraState>("initializing");
  const [cameraError, setCameraError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const hasScannedRef = useRef(false);

  // Remote mode state
  const [remoteState, setRemoteState] = useState<RemoteState>("creating");
  const [sessionToken, setSessionToken] = useState("");
  const [scanUrl, setScanUrl] = useState("");
  const [countdown, setCountdown] = useState(SESSION_TTL);
  const [scannedValue, setScannedValue] = useState("");
  const eventSourceRef = useRef<EventSource | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Helpers ──────────────────────────────────────────────────────────────

  const stopCamera = useCallback(() => {
    readerRef.current?.reset();
    readerRef.current = null;
  }, []);

  const closeSession = useCallback((token: string) => {
    eventSourceRef.current?.close();
    eventSourceRef.current = null;
    if (countdownRef.current) clearInterval(countdownRef.current);
    if (token) {
      fetch(`/api/scan-session?token=${token}`, { method: "DELETE" }).catch(
        () => {},
      );
    }
  }, []);

  const handleClose = useCallback(() => {
    stopCamera();
    closeSession(sessionToken);
    onOpenChange(false);
  }, [stopCamera, closeSession, sessionToken, onOpenChange]);

  const handleSuccess = useCallback(
    (barcode: string) => {
      setScannedValue(barcode);
      onScan(barcode);
      stopCamera();
      closeSession(sessionToken);
    },
    [onScan, stopCamera, closeSession, sessionToken],
  );

  // ── Camera Mode ───────────────────────────────────────────────────────────

  const startCamera = useCallback(async () => {
    setCameraState("initializing");
    hasScannedRef.current = false;

    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;

    try {
      const devices = await BrowserMultiFormatReader.listVideoInputDevices();
      if (devices.length === 0) {
        setCameraState("no-permission");
        return;
      }

      // Prefer back/environment camera
      const backCamera =
        devices.find(
          (d) =>
            d.label.toLowerCase().includes("back") ||
            d.label.toLowerCase().includes("rear") ||
            d.label.toLowerCase().includes("environment"),
        ) ?? devices[devices.length - 1];

      setCameraState("scanning");

      await reader.decodeFromVideoDevice(
        backCamera.deviceId,
        videoRef.current!,
        (result, err) => {
          if (hasScannedRef.current) return;
          if (result) {
            hasScannedRef.current = true;
            const text = result.getText();
            setCameraState("success");
            setScannedValue(text);
            handleSuccess(text);
          }
          if (err && !(err instanceof NotFoundException)) {
            console.warn("ZXing scan error:", err);
          }
        },
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (
        msg.toLowerCase().includes("permission") ||
        msg.toLowerCase().includes("denied")
      ) {
        setCameraState("no-permission");
      } else {
        setCameraState("error");
        setCameraError(msg);
      }
    }
  }, [handleSuccess]);

  // ── Remote Mode ───────────────────────────────────────────────────────────

  const startRemote = useCallback(async () => {
    setRemoteState("creating");
    setCountdown(SESSION_TTL);

    try {
      const res = await fetch("/api/scan-session", { method: "POST" });
      const data = await res.json();
      const token: string = data.token;
      setSessionToken(token);

      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      const url = `${origin}/scan/${token}`;
      setScanUrl(url);
      setRemoteState("waiting");

      // Start SSE
      const es = new EventSource(`/api/scan-session?token=${token}`);
      eventSourceRef.current = es;

      es.addEventListener("scan", (e) => {
        const { barcode } = JSON.parse(e.data);
        setRemoteState("success");
        setScannedValue(barcode);
        handleSuccess(barcode);
        closeSession(token);
      });

      es.addEventListener("expired", () => {
        setRemoteState("expired");
        closeSession(token);
      });

      es.onerror = () => {
        setRemoteState("error");
        closeSession(token);
      };

      // Countdown timer
      countdownRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch {
      setRemoteState("error");
    }
  }, [handleSuccess, closeSession]);

  // ── Auto-detect on open ───────────────────────────────────────────────────

  useEffect(() => {
    if (!open) {
      stopCamera();
      closeSession(sessionToken);
      setMode("detecting");
      setScannedValue("");
      setCameraState("initializing");
      setRemoteState("creating");
      return;
    }

    // Try to detect camera
    (async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasVideo = devices.some((d) => d.kind === "videoinput");
        if (hasVideo) {
          setMode("camera");
        } else {
          setMode("remote");
        }
      } catch {
        // Fallback to remote if enumeration fails
        setMode("remote");
      }
    })();
  }, [open, stopCamera, closeSession, sessionToken]);

  // ── Start camera/remote when mode resolves ────────────────────────────────
  useEffect(() => {
    if (!open) return;
    if (mode === "camera") startCamera();
    if (mode === "remote") startRemote();
  }, [mode, open, startCamera, startRemote]);

  // ── UI ────────────────────────────────────────────────────────────────────

  const formatCountdown = (s: number) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden gap-0">
        <DialogHeader className="px-5 pt-5 pb-3 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ScanLine className="w-4 h-4 text-primary" />
              <DialogTitle className="text-base">สแกน Barcode</DialogTitle>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full"
              onClick={handleClose}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          {/* Mode toggle */}
          <div className="flex gap-1 mt-2">
            <button
              type="button"
              onClick={() => {
                stopCamera();
                closeSession(sessionToken);
                setScannedValue("");
                setMode("camera");
              }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                mode === "camera"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <Camera className="w-3 h-3" />
              กล้องนี้
            </button>
            <button
              type="button"
              onClick={() => {
                stopCamera();
                closeSession(sessionToken);
                setScannedValue("");
                setMode("remote");
              }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                mode === "remote"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <MonitorSmartphone className="w-3 h-3" />
              อุปกรณ์อื่น
            </button>
          </div>
        </DialogHeader>

        <div className="p-5 min-h-[340px] flex flex-col items-center justify-center">
          {/* ── Camera Mode ── */}
          {mode === "camera" && (
            <>
              {cameraState === "initializing" && (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">กำลังเปิดกล้อง...</p>
                </div>
              )}

              {cameraState === "scanning" && (
                <div className="w-full flex flex-col items-center gap-3">
                  <div className="relative w-full aspect-video max-h-64 rounded-xl overflow-hidden bg-black border border-border">
                    <video
                      ref={videoRef}
                      className="w-full h-full object-cover"
                      autoPlay
                      muted
                      playsInline
                    />
                    {/* Scan overlay */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-2/3 h-1/2 relative">
                        <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-primary" />
                        <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-primary" />
                        <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-primary" />
                        <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-primary" />
                        <div
                          className="absolute inset-x-0 h-px bg-primary/80"
                          style={{
                            animation: "scan-line 2s ease-in-out infinite",
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    จ่อกล้องไปที่ Barcode บนสินค้า
                  </p>
                </div>
              )}

              {cameraState === "success" && (
                <SuccessState value={scannedValue} onClose={handleClose} />
              )}

              {cameraState === "no-permission" && (
                <div className="flex flex-col items-center gap-3 text-center">
                  <AlertCircle className="w-10 h-10 text-amber-500" />
                  <div>
                    <p className="font-medium text-sm">ไม่สามารถเข้าถึงกล้องได้</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      กรุณาอนุญาตการเข้าถึงกล้องในเบราว์เซอร์
                    </p>
                  </div>
                  <div className="flex gap-2 mt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-xs"
                      onClick={() => {
                        setCameraState("initializing");
                        startCamera();
                      }}
                    >
                      <RefreshCw className="w-3 h-3" /> ลองใหม่
                    </Button>
                    <Button
                      size="sm"
                      variant="default"
                      className="gap-1.5 text-xs"
                      onClick={() => {
                        stopCamera();
                        setMode("remote");
                      }}
                    >
                      <MonitorSmartphone className="w-3 h-3" /> ใช้อุปกรณ์อื่น
                    </Button>
                  </div>
                </div>
              )}

              {cameraState === "error" && (
                <div className="flex flex-col items-center gap-3 text-center">
                  <AlertCircle className="w-10 h-10 text-destructive" />
                  <p className="text-sm font-medium">เกิดข้อผิดพลาด</p>
                  <p className="text-xs text-muted-foreground">{cameraError}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setCameraState("initializing");
                      startCamera();
                    }}
                  >
                    <RefreshCw className="w-3 h-3 mr-1" /> ลองใหม่
                  </Button>
                </div>
              )}
            </>
          )}

          {/* ── Remote Mode ── */}
          {mode === "remote" && (
            <>
              {(remoteState === "creating") && (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">กำลังสร้าง QR code...</p>
                </div>
              )}

              {remoteState === "waiting" && scanUrl && (
                <div className="flex flex-col items-center gap-4 w-full">
                  <div className="bg-white p-3 rounded-xl shadow-sm">
                    <QRCodeSVG value={scanUrl} size={180} level="M" />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-sm font-medium">สแกน QR code ด้วยมือถือ</p>
                    <p className="text-xs text-muted-foreground">
                      จากนั้นเปิดกล้องสแกน Barcode สินค้าบนมือถือ
                    </p>
                  </div>
                  {/* Countdown */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="w-16 h-1 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-1000"
                        style={{
                          width: `${(countdown / SESSION_TTL) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="tabular-nums">
                      {formatCountdown(countdown)}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground/60 break-all text-center max-w-xs">
                    {scanUrl}
                  </p>
                </div>
              )}

              {remoteState === "success" && (
                <SuccessState value={scannedValue} onClose={handleClose} />
              )}

              {remoteState === "expired" && (
                <div className="flex flex-col items-center gap-3 text-center">
                  <AlertCircle className="w-10 h-10 text-amber-500" />
                  <div>
                    <p className="font-medium text-sm">QR code หมดอายุ</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      กรุณาสร้าง QR code ใหม่
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setRemoteState("creating");
                      startRemote();
                    }}
                  >
                    <RefreshCw className="w-3 h-3 mr-1" /> สร้างใหม่
                  </Button>
                </div>
              )}

              {remoteState === "error" && (
                <div className="flex flex-col items-center gap-3 text-center">
                  <AlertCircle className="w-10 h-10 text-destructive" />
                  <p className="text-sm font-medium">เชื่อมต่อไม่ได้</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setRemoteState("creating");
                      startRemote();
                    }}
                  >
                    <RefreshCw className="w-3 h-3 mr-1" /> ลองใหม่
                  </Button>
                </div>
              )}
            </>
          )}

          {/* Detecting */}
          {mode === "detecting" && (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">กำลังตรวจสอบอุปกรณ์...</p>
            </div>
          )}
        </div>

        <style>{`
          @keyframes scan-line {
            0% { top: 5%; }
            50% { top: 90%; }
            100% { top: 5%; }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}

// ── Success shared UI ─────────────────────────────────────────────────────

function SuccessState({
  value,
  onClose,
}: {
  value: string;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center">
        <CheckCircle2 className="w-8 h-8 text-emerald-500" />
      </div>
      <div>
        <p className="font-semibold text-emerald-600 dark:text-emerald-400">
          สแกนสำเร็จ!
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          กรอก SKU ในฟอร์มเรียบร้อยแล้ว
        </p>
      </div>
      <div className="bg-muted rounded-lg px-4 py-2 border border-border">
        <p className="text-xs text-muted-foreground mb-0.5">Barcode</p>
        <p className="font-mono text-sm font-semibold tracking-wider break-all">
          {value}
        </p>
      </div>
      <Button size="sm" onClick={onClose} className="mt-1">
        ปิด
      </Button>
    </div>
  );
}
