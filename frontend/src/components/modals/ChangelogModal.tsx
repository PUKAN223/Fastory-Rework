"use client";

import { Clock, ShieldCheck, Cpu, Layers, Sparkles } from "lucide-react";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

const SNOOZE_KEY = "fastory_changelog_snooze_until";
const SNOOZE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

interface ChangelogModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ChangelogModal({
  open: externalOpen,
  onOpenChange: externalOnOpenChange,
}: ChangelogModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);

  const isControlled = externalOpen !== undefined;
  const isOpen = isControlled ? externalOpen : internalOpen;

  const setOpen = (open: boolean) => {
    if (externalOnOpenChange) {
      externalOnOpenChange(open);
    } else {
      setInternalOpen(open);
    }
  };

  useEffect(() => {
    if (isControlled) return;

    try {
      const snoozeUntil = localStorage.getItem(SNOOZE_KEY);
      if (snoozeUntil) {
        const until = parseInt(snoozeUntil, 10);
        if (Date.now() < until) {
          return;
        }
      }
      setInternalOpen(true);
    } catch {
      setInternalOpen(true);
    }
  }, [isControlled]);

  const handleSnooze5Min = () => {
    try {
      const snoozeTime = Date.now() + SNOOZE_DURATION_MS;
      localStorage.setItem(SNOOZE_KEY, snoozeTime.toString());
      toast.info("ซ่อนการแจ้งเตือน 5 นาที");
    } catch (err) {
      console.error("Failed to save snooze timestamp:", err);
    }
    setOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogContent className="max-w-[540px] p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b bg-card pr-12">
          <div className="flex items-center gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <DialogTitle className="text-base font-semibold tracking-tight text-foreground">
                  Release Notes
                </DialogTitle>
                <Badge
                  variant="outline"
                  className="font-mono text-[11px] font-normal px-2 py-0.5 border-border bg-muted/40 text-foreground"
                >
                  v1.0.50
                </Badge>
              </div>
              <DialogDescription className="text-xs text-muted-foreground">
                สรุปการปรับปรุงระบบประจำวันที่ 30 กรกฎาคม 2569
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Change List */}
        <div className="p-6 max-h-[58vh] overflow-y-auto text-xs">
          {/* Security */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-medium text-foreground">
                <ShieldCheck className="size-3.5 text-muted-foreground" />
                <span>Security & Authentication</span>
              </div>
              <Badge
                variant="outline"
                className="font-mono text-[10px] text-muted-foreground border-border/60 font-normal"
              >
                Security
              </Badge>
            </div>
            <ul className="space-y-1.5 text-muted-foreground pl-5 list-disc leading-relaxed">
              <li>
                <strong className="text-foreground font-medium">
                  Account Protection:
                </strong>{" "}
                ไม่อนุญาตให้ลบบัญชีหากยังคงมีสถานะเป็นเจ้าของร้านค้า
              </li>
              <li>
                <strong className="text-foreground font-medium">
                  OAuth Password Setup:
                </strong>{" "}
                บังคับกำหนดรหัสผ่านเพื่อยืนยันสิทธิ์เมื่อสมัครผ่าน Google OAuth
              </li>
            </ul>
          </div>

          <Separator className="my-5 bg-border/50" />

          {/* AI */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-medium text-foreground">
                <Cpu className="size-3.5 text-muted-foreground" />
                <span>AI Assistant Engine</span>
              </div>
              <Badge
                variant="outline"
                className="font-mono text-[10px] text-muted-foreground border-border/60 font-normal"
              >
                Feature
              </Badge>
            </div>
            <ul className="space-y-1.5 text-muted-foreground pl-5 list-disc leading-relaxed">
              <li>
                <strong className="text-foreground font-medium">
                  URL Routing:
                </strong>{" "}
                ปรับเปลี่ยนเส้นทางผู้ช่วย AI เป็น{" "}
                <code className="text-foreground bg-muted px-1.5 py-0.5 rounded font-mono text-[11px]">
                  /assistant
                </code>
              </li>
              <li>
                <strong className="text-foreground font-medium">
                  Quota Monitor:
                </strong>{" "}
                เพิ่มระบบตรวจสอบโควต้าการใช้งานคำถามประจำวัน
              </li>
              <li>
                <strong className="text-foreground font-medium">
                  Dynamic Input:
                </strong>{" "}
                ช่องพิมพ์ข้อความขยายความสูงตามเนื้อหาอัตโนมัติ
              </li>
            </ul>
          </div>

          <Separator className="my-5 bg-border/50" />

          {/* Asset & Performance */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-medium text-foreground">
                <Layers className="size-3.5 text-muted-foreground" />
                <span>Asset & Performance</span>
              </div>
              <Badge
                variant="outline"
                className="font-mono text-[10px] text-muted-foreground border-border/60 font-normal"
              >
                Performance
              </Badge>
            </div>
            <ul className="space-y-1.5 text-muted-foreground pl-5 list-disc leading-relaxed">
              <li>
                <strong className="text-foreground font-medium">
                  Image Optimization:
                </strong>{" "}
                บีบอัดรูปภาพเป็น WebP อัตโนมัติด้วย Sharp Engine ก่อนบันทึก
              </li>
              <li>
                <strong className="text-foreground font-medium">
                  Proxy Routing:
                </strong>{" "}
                ปรับปรุง Proxy Matcher สำหรับ Static Assets และธีมโลโก้
              </li>
            </ul>
          </div>

          <Separator className="my-5 bg-border/50" />

          {/* User Interface */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-medium text-foreground">
                <Sparkles className="size-3.5 text-muted-foreground" />
                <span>User Interface</span>
              </div>
              <Badge
                variant="outline"
                className="font-mono text-[10px] text-muted-foreground border-border/60 font-normal"
              >
                UI/UX
              </Badge>
            </div>
            <ul className="space-y-1.5 text-muted-foreground pl-5 list-disc leading-relaxed">
              <li>
                <strong className="text-foreground font-medium">
                  Order Details Layout:
                </strong>{" "}
                ปรับปรุงเลย์เอาต์ส่วนแสดงรายละเอียดคำสั่งซื้อให้เป็นสัดส่วน
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-muted/20 border-t flex flex-row items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSnooze5Min}
            className="text-xs text-muted-foreground hover:text-foreground gap-1.5 font-normal h-8"
          >
            <Clock className="size-3.5" />
            ซ่อน 5 นาที
          </Button>

          <Button
            size="sm"
            onClick={() => setOpen(false)}
            className="text-xs font-medium px-4 h-8"
          >
            เข้าใช้งานระบบ
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
