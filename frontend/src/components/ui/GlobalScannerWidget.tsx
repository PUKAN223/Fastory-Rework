"use client";

import React, { useEffect, useState } from "react";
import { QrCode, Smartphone, CheckCircle2, AlertCircle } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useGlobalScannerContext } from "@/components/providers/GlobalScannerProvider";

export function GlobalScannerWidget() {
  const { token, status } = useGlobalScannerContext();
  const [scanUrl, setScanUrl] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (token) {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      setScanUrl(`${origin}/scan/${token}`);
    }
  }, [token]);

  if (!token) return null;

  const isConnected = status === "connected";

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`h-8 gap-1.5 px-2.5 transition-colors ${
            isConnected
              ? "text-emerald-600 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-700 dark:text-emerald-400 dark:bg-emerald-950/30 dark:hover:bg-emerald-900/50"
              : "text-muted-foreground hover:bg-muted"
          }`}
          title={isConnected ? "เชื่อมต่อมือถือแล้ว" : "คลิกเพื่อจับคู่มือถือสแกนบาร์โค้ด"}
        >
          <Smartphone className="w-4 h-4" />
          <span className="text-xs font-medium hidden sm:inline-block">
            {isConnected ? "เชื่อมต่อแล้ว" : "จับคู่สแกนเนอร์"}
          </span>
          {isConnected && (
            <span className="relative flex h-2 w-2 ml-1">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4" align="end" sideOffset={8}>
        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-1">
            <QrCode className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h4 className="font-semibold text-sm">สแกนเนอร์ไร้สาย</h4>
            <p className="text-xs text-muted-foreground mt-1">
              ใช้มือถือของคุณเป็นเครื่องสแกนบาร์โค้ดไร้สาย สแกนครั้งเดียวเชื่อมต่อได้ตลอด
            </p>
          </div>

          <div className="bg-white p-3 rounded-xl shadow-sm border mt-2">
            {scanUrl ? (
              <QRCodeSVG value={scanUrl} size={160} level="M" />
            ) : (
              <div className="w-[160px] h-[160px] bg-muted animate-pulse rounded-lg" />
            )}
          </div>

          <div className={`w-full rounded-lg border p-3 flex items-start gap-2.5 mt-2 ${
            isConnected ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900/50" : "bg-muted/50"
          }`}>
            {isConnected ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
            )}
            <div className="text-left text-xs min-w-0">
              <p className={`font-medium ${isConnected ? "text-emerald-700 dark:text-emerald-400" : "text-foreground"}`}>
                {isConnected ? "มือถือเชื่อมต่อแล้ว" : "รอการเชื่อมต่อ..."}
              </p>
              <p className={`mt-0.5 ${isConnected ? "text-emerald-600 dark:text-emerald-500" : "text-muted-foreground"}`}>
                {isConnected 
                  ? "ตอนนี้คุณสามารถใช้กล้องมือถือสแกนบาร์โค้ดเข้าสู่ระบบได้ทันที"
                  : "เปิดกล้องมือถือสแกน QR Code ด้านบนเพื่อจับคู่"}
              </p>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
