"use client";

import { ShoppingBag, ShoppingCart, CheckCircle2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import React, { useEffect, useState, useRef } from "react";
import type { CartItem } from "@/features/salesSlice";
import { formatImageSrc } from "@/lib/formatImageSrc";

interface CFDItem extends CartItem {
  imageUrl?: string;
}

export default function POSDisplayPage() {
  const [state, setState] = useState({
    cartItems: [] as CFDItem[],
    paymentMethod: "cash",
    amountReceived: 0,
    discount: 0,
    subtotal: 0,
    total: 0,
    status: "shopping", // shopping, paying, completed
    promptpayPayload: "",
  });

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchState = async () => {
      try {
        const response = await fetch("/api/sales/pos-sync");
        const data = await response.json();
        if (data.success && data.state && isMounted) {
          setState(data.state);
        }
      } catch (error) {
        console.error("Failed to sync POS state:", error);
      }
    };

    fetchState();
    const interval = setInterval(fetchState, 1000); // Poll every second

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Auto-scroll to bottom of the list when cartItems change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [state.cartItems]);

  const {
    cartItems,
    paymentMethod,
    amountReceived,
    discount,
    subtotal,
    total,
    status,
    promptpayPayload,
  } = state;

  const changeAmount = Math.max(0, amountReceived - total);

  return (
    <div className="fixed inset-0 flex h-full w-full overflow-hidden bg-background text-foreground selection:bg-primary/20 overscroll-none select-none">
      {/* Left side: Item List */}
      <div className="flex w-[65%] flex-col border-r border-border/40 bg-card">
        <div className="flex items-center justify-between border-b border-border/40 bg-muted/20 px-6 py-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ShoppingCart className="size-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">รายการสินค้า (Items)</h1>
              <p className="text-sm text-muted-foreground">
                {cartItems.length} รายการ
              </p>
            </div>
          </div>
        </div>

        <div 
          className="flex-1 overflow-y-auto p-4 space-y-3"
          ref={scrollRef}
        >
          {cartItems.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-muted-foreground/60">
              <ShoppingBag className="size-20 mb-4 opacity-20" />
              <p className="text-2xl font-medium">ยินดีต้อนรับ</p>
              <p className="text-base mt-2">Welcome, please wait for the cashier to scan items.</p>
            </div>
          ) : (
            cartItems.map((item, idx) => (
              <div
                key={`${item.product.id}-${idx}`}
                className="flex items-center gap-4 rounded-2xl border border-border/40 bg-background p-4 shadow-sm transition-all animate-in slide-in-from-bottom-2 fade-in-50 duration-300"
              >
                <div className="size-16 shrink-0 overflow-hidden rounded-xl bg-muted/30">
                  {item.imageUrl ? (
                    <img
                      src={formatImageSrc(item.imageUrl)}
                      alt={item.product.name}
                      className="size-full object-cover"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center">
                      <ShoppingBag className="size-8 text-muted-foreground/30" />
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col">
                  <h3 className="text-lg font-semibold leading-tight line-clamp-1">
                    {item.product.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    ฿{item.product.sellingPrice.toLocaleString()} × {item.quantity}
                  </p>
                </div>
                <div className="text-xl font-bold tabular-nums">
                  ฿{(item.product.sellingPrice * item.quantity).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right side: Summary & Payment */}
      <div className="flex w-[35%] flex-col bg-muted/10 relative overflow-hidden">
        
        {/* Absolute Thank You Overlay */}
        {status === "completed" && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="flex size-32 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 mb-6">
              <CheckCircle2 className="size-16" />
            </div>
            <h2 className="text-4xl font-bold text-emerald-500 mb-2">ทำรายการสำเร็จ</h2>
            <p className="text-xl text-muted-foreground">ขอบคุณที่ใช้บริการครับ/ค่ะ</p>
          </div>
        )}

        <div className="flex-1 p-8 flex flex-col justify-center">
          {status === "paying" ? (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500 w-full flex flex-col items-center justify-center text-center">

              {paymentMethod === "promptpay" && promptpayPayload ? (
                <div className="flex flex-col items-center">
                  <div className="rounded-3xl border-4 border-white bg-white p-4 shadow-xl">
                    <QRCodeSVG
                      value={promptpayPayload}
                      size={280}
                      level="H"
                      includeMargin={false}
                      imageSettings={{
                        src: "/logo-dark.png",
                        x: undefined,
                        y: undefined,
                        height: 52,
                        width: 52,
                        excavate: true,
                      }}
                    />
                  </div>
                  <div className="mt-8 flex items-center justify-center gap-3">
                    <img src="/promptpay-logo.png" alt="PromptPay" className="h-8 object-contain opacity-80" onError={(e) => (e.currentTarget.style.display = 'none')} />
                    <p className="text-xl font-medium text-muted-foreground">สแกนเพื่อชำระเงิน</p>
                  </div>
                </div>
              ) : (
                <div className="w-full max-w-sm space-y-6 text-left">
                  <div className="rounded-2xl border border-border/50 bg-background p-6 shadow-sm">
                    <p className="text-sm font-medium text-muted-foreground mb-1">รับเงินมา (Cash Received)</p>
                    <p className="text-3xl font-bold tabular-nums">฿{amountReceived.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>
                  <div className="rounded-2xl border border-border/50 bg-background p-6 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">เงินทอน (Change)</p>
                    <p className="text-4xl font-black text-emerald-500 tabular-nums">
                      ฿{changeAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="w-full flex flex-col items-center justify-center text-center opacity-80">
              {cartItems.length > 0 ? (
                <>
                  <div className="size-24 rounded-3xl bg-muted flex items-center justify-center mb-6">
                    <ShoppingBag className="size-10 text-muted-foreground" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">กำลังทำรายการ...</h2>
                  <p className="text-muted-foreground">Please wait while the cashier scans your items.</p>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center">
                  <div className="size-32 rounded-full bg-primary/5 flex items-center justify-center mb-6">
                    <ShoppingBag className="size-12 text-primary/40" />
                  </div>
                  <h2 className="text-3xl font-bold mb-3">Fastory POS</h2>
                  <p className="text-lg text-muted-foreground">พร้อมให้บริการ</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Total Summary */}
        <div className="border-t border-border/40 bg-card p-6 shadow-[0_-4px_24px_-12px_rgba(0,0,0,0.1)] z-10">
          <div className="space-y-3 mb-6">
            <div className="flex justify-between text-lg text-muted-foreground">
              <span>ยอดรวม (Subtotal)</span>
              <span className="tabular-nums">฿{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-lg text-destructive font-medium">
                <span>ส่วนลด (Discount)</span>
                <span className="tabular-nums">-฿{discount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            )}
          </div>
          <div className="flex items-end justify-between pt-4 border-t border-border/50">
            <span className="text-xl font-bold">ยอดสุทธิ (Total)</span>
            <span className="text-4xl font-black text-primary tabular-nums tracking-tight">
              ฿{total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
