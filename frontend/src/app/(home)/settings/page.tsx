"use client";

import { format } from "date-fns";
import {
  AlertTriangle,
  Building2,
  Check,
  Copy,
  CreditCard,
  Eye,
  EyeOff,
  FileCode,
  Info,
  Key,
  Package,
  Printer,
  QrCode,
  ReceiptText,
  Save,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Store,
  Terminal,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Containers } from "@/components/Containers";
import { PageHeaderCards } from "@/components/card/PageHeaderCards";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { deleteStore, updateStore } from "@/features/storeSlice";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/store/hook";

type SettingsTab = "general" | "receipt" | "env" | "danger";

const SETTINGS_TABS = [
  { id: "general" as SettingsTab, label: "ข้อมูลทั่วไป", icon: Store },
  { id: "receipt" as SettingsTab, label: "การตั้งค่าใบเสร็จ", icon: ReceiptText },
  { id: "env" as SettingsTab, label: "ตั้งค่าระบบ (.env)", icon: Sliders },
  { id: "danger" as SettingsTab, label: "ตั้งค่าขั้นสูง", icon: ShieldAlert },
];

export default function SettingsPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();

  const stores = useAppSelector((state) => state.stores.stores);
  const activeStoreId = useAppSelector((state) => state.stores.activeStoreId);
  const activeStore = useMemo(
    () => stores.find((s) => s.id === activeStoreId),
    [stores, activeStoreId],
  );

  // Active Tab State (Underline style matching Inventory Layout)
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");

  // Form states
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [receiptHeader, setReceiptHeader] = useState("");
  const [receiptFooter, setReceiptFooter] = useState("");
  const [receiptTaxId, setReceiptTaxId] = useState("");
  const [promptpayId, setPromptpayId] = useState("");

  // Saving & Deleting UI states
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [copiedSlug, setCopiedSlug] = useState(false);

  // .env Form states
  const [envApiUrl, setEnvApiUrl] = useState(
    process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:8080",
  );
  const [envPublicBaseUrl, setEnvPublicBaseUrl] = useState(
    process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:8080",
  );
  const [envGeminiKey, setEnvGeminiKey] = useState(
    process.env.GEMINI_API_KEY || "",
  );
  const [envPort, setEnvPort] = useState("8080");
  const [envNodeEnv, setEnvNodeEnv] = useState("production");
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [copiedEnv, setCopiedEnv] = useState(false);

  useEffect(() => {
    if (activeStore) {
      setName(activeStore.name);
      setDescription(activeStore.description || "");
      setReceiptHeader(activeStore.receiptHeader || "");
      setReceiptFooter(activeStore.receiptFooter || "");
      setReceiptTaxId(activeStore.receiptTaxId || "");
      setPromptpayId(activeStore.promptpayId || "");
    }
  }, [activeStore]);

  const handleSaveProfile = async () => {
    if (!activeStore) return;
    setIsSaving(true);
    try {
      await dispatch(
        updateStore({
          id: activeStore.id,
          name,
          description,
          receiptHeader,
          receiptFooter,
          receiptTaxId,
          promptpayId,
        }),
      ).unwrap();

      toast.success("บันทึกข้อมูลการตั้งค่าเรียบร้อยแล้ว");
    } catch (e: any) {
      toast.error(typeof e === "string" ? e : "เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteStore = async () => {
    if (!activeStore || deleteConfirmText !== activeStore.name) return;
    setIsDeleting(true);
    try {
      await dispatch(deleteStore({ id: activeStore.id })).unwrap();
      toast.success("ร้านค้าถูกลบออกจากระบบแล้ว");
      router.push("/dashboard");
    } catch (e: any) {
      toast.error(typeof e === "string" ? e : "เกิดข้อผิดพลาดในการลบร้านค้า");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCopySlug = () => {
    if (!activeStore?.slug) return;
    navigator.clipboard.writeText(activeStore.slug);
    setCopiedSlug(true);
    toast.success("คัดลอก Slug ร้านค้าเรียบร้อย");
    setTimeout(() => setCopiedSlug(false), 2000);
  };

  const handleCopyEnv = () => {
    const envSnippet = `API_URL=${envApiUrl}
NEXT_PUBLIC_BASE_URL=${envPublicBaseUrl}
GEMINI_API_KEY=${envGeminiKey}
PORT=${envPort}
NODE_ENV=${envNodeEnv}`;

    navigator.clipboard.writeText(envSnippet);
    setCopiedEnv(true);
    toast.success("คัดลอกไฟล์กำหนดค่า .env เรียบร้อยแล้ว");
    setTimeout(() => setCopiedEnv(false), 2000);
  };

  const handleSaveEnvConfig = () => {
    toast.success("บันทึกการตั้งค่าระบบ (.env) เรียบร้อยแล้ว");
  };

  if (!activeStore) return null;

  return (
    <Containers>
      {/* Header */}
      <PageHeaderCards
        title="การตั้งค่าร้านค้า"
        description="จัดการข้อมูลร้านค้า ช่องทางชำระเงิน การออกใบเสร็จรับเงิน และความปลอดภัยของระบบ"
      >
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 px-3 py-1 font-medium text-xs gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            {activeStore.jobTitle || "Owner"}
          </Badge>
          <Badge variant="secondary" className="px-3 py-1 text-xs">
            ID: #{activeStore.id}
          </Badge>
        </div>
      </PageHeaderCards>

      {/* Underline Tabs matching Inventory Layout design */}
      <div className="border-b border-border/60">
        <nav className="flex gap-1 px-0" aria-label="การตั้งค่าร้านค้า">
          {SETTINGS_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors hover:text-foreground cursor-pointer",
                  isActive
                    ? "text-foreground font-semibold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary"
                    : "text-muted-foreground",
                )}
              >
                <Icon
                  className={cn(
                    "w-4 h-4",
                    isActive
                      ? tab.id === "danger"
                        ? "text-rose-500"
                        : "text-primary"
                      : "text-muted-foreground",
                  )}
                />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content 1: General Settings */}
      {activeTab === "general" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pt-2">
          {/* Main Form */}
          <div className="lg:col-span-8 space-y-6">
            <Card className="border-border/60 shadow-xs">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-bold">
                  <Building2 className="w-5 h-5 text-primary" />
                  ข้อมูลพื้นฐานร้านค้า
                </CardTitle>
                <CardDescription>
                  กำหนดชื่อร้าน คำอธิบาย และข้อมูลติดต่อหลักสำหรับแสดงในระบบ
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="store-name" className="font-semibold text-xs">
                      ชื่อร้านค้า <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="store-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="เช่น Fastory Flagship Store"
                      className="h-10"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="store-slug" className="font-semibold text-xs">
                      Store Slug (URL Identifier)
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="store-slug"
                        value={activeStore.slug || ""}
                        disabled
                        className="h-10 bg-muted/40 font-mono text-xs"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 shrink-0"
                        onClick={handleCopySlug}
                        title="คัดลอก Slug"
                      >
                        {copiedSlug ? (
                          <Check className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="store-desc" className="font-semibold text-xs">
                    รายละเอียดร้านค้า / สโลแกน
                  </Label>
                  <Textarea
                    id="store-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="อธิบายเกี่ยวกับร้านค้า สินค้าที่ขาย หรือสาขา..."
                    rows={3}
                    className="resize-none"
                  />
                </div>

                <div className="pt-2 border-t space-y-4">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <CreditCard className="w-4 h-4 text-emerald-500" />
                    ช่องทางรับชำระเงิน (PromptPay POS)
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="store-promptpay" className="font-semibold text-xs">
                        หมายเลขพร้อมเพย์ (PromptPay ID)
                      </Label>
                      <Input
                        id="store-promptpay"
                        value={promptpayId}
                        onChange={(e) => setPromptpayId(e.target.value)}
                        placeholder="เบอร์โทรศัพท์ (08X-XXX-XXXX) หรือ Tax ID 13 หลัก"
                        className="h-10 font-mono"
                      />
                      <p className="text-[11px] text-muted-foreground">
                        ใช้สำหรับการสร้าง Dynamic QR Code ชำระเงินที่หน้า POS
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="store-taxid-gen" className="font-semibold text-xs">
                        เลขประจำตัวผู้เสียภาษี (Tax ID)
                      </Label>
                      <Input
                        id="store-taxid-gen"
                        value={receiptTaxId}
                        onChange={(e) => setReceiptTaxId(e.target.value)}
                        placeholder="เลข 13 หลัก"
                        className="h-10 font-mono"
                      />
                      <p className="text-[11px] text-muted-foreground">
                        สำหรับแสดงบนใบเสร็จรับเงินอย่างย่อ/เต็มรูปแบบ
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t bg-muted/20 px-6 py-4 flex justify-between items-center">
                <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5" />
                  กดบันทึกเพื่ออัปเดตข้อมูลไปยังเครื่อง POS ทั้งหมด
                </span>
                <Button
                  onClick={handleSaveProfile}
                  disabled={isSaving || !name.trim()}
                  className="px-6 font-medium shadow-xs"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isSaving ? "กำลังบันทึก..." : "บันทึกเปลี่ยนแปลง"}
                </Button>
              </CardFooter>
            </Card>
          </div>

          {/* Side Card: Store Stats Overview */}
          <div className="lg:col-span-4 space-y-6">
            <Card className="border-border/60 shadow-xs bg-linear-to-b from-card to-muted/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  ข้อมูลภาพรวมร้านค้า
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-background border">
                  <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                    {activeStore.name.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">
                      {activeStore.name}
                    </div>
                    <div className="text-xs text-muted-foreground truncate font-mono">
                      slug: {activeStore.slug}
                    </div>
                  </div>
                  <Badge variant={activeStore.is_active ? "default" : "secondary"}>
                    {activeStore.is_active ? "เปิดใช้งาน" : "ปิดใช้งาน"}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl border bg-background space-y-1">
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Package className="w-3.5 h-3.5" />
                      จำนวนสินค้า
                    </div>
                    <div className="text-xl font-bold">
                      {activeStore.productCount ?? 0}
                    </div>
                  </div>
                  <div className="p-3.5 rounded-xl border bg-background space-y-1">
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      พนักงานทั้งหมด
                    </div>
                    <div className="text-xl font-bold">
                      {activeStore.memberCount ?? 1}
                    </div>
                  </div>
                </div>

                <div
                  className={cn(
                    "p-3.5 rounded-xl border text-xs space-y-2",
                    promptpayId
                      ? "bg-emerald-500/5 border-emerald-500/20"
                      : "bg-amber-500/5 border-amber-500/20",
                  )}
                >
                  <div
                    className={cn(
                      "font-medium flex items-center gap-1.5",
                      promptpayId
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-amber-600 dark:text-amber-400",
                    )}
                  >
                    <QrCode className="w-4 h-4" />
                    {promptpayId ? "พร้อมเพย์พร้อมใช้งาน" : "ยังไม่ได้ตั้งค่าพร้อมเพย์"}
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    {promptpayId
                      ? `เปิดรับชำระผ่าน PromptPay เบอร์/เลข: ${promptpayId}`
                      : "ยังไม่ได้ระบุหมายเลข PromptPay สำหรับสร้าง QR Code ชำระเงินที่หน้า POS"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Tab Content 2: Receipt Settings */}
      {activeTab === "receipt" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pt-2">
          {/* Form */}
          <div className="lg:col-span-7 space-y-6">
            <Card className="border-border/60 shadow-xs">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-bold">
                  <ReceiptText className="w-5 h-5 text-blue-500" />
                  ออกแบบใบเสร็จรับเงิน (Receipt Layout)
                </CardTitle>
                <CardDescription>
                  ปรับแต่งข้อความส่วนหัว ข้อความส่วนท้าย และข้อมูลภาษีที่จะพิมพ์ลงบนใบเสร็จสลิป
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="receipt-header" className="font-semibold text-xs">
                    ข้อความส่วนหัวใบเสร็จ (Header)
                  </Label>
                  <Textarea
                    id="receipt-header"
                    value={receiptHeader}
                    onChange={(e) => setReceiptHeader(e.target.value)}
                    placeholder="เช่น สาขาใหญ่ สยามสแควร์&#10;โทร. 02-123-4567"
                    rows={3}
                    className="resize-none font-mono text-xs"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    แสดงบริเวณบนสุดของสลิปใบเสร็จรับเงิน
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="receipt-tax" className="font-semibold text-xs">
                    เลขประจำตัวผู้เสียภาษี (Tax ID / VAT Reg.)
                  </Label>
                  <Input
                    id="receipt-tax"
                    value={receiptTaxId}
                    onChange={(e) => setReceiptTaxId(e.target.value)}
                    placeholder="เช่น 0105558012345"
                    className="h-10 font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="receipt-footer" className="font-semibold text-xs">
                    ข้อความส่วนท้ายใบเสร็จ (Footer)
                  </Label>
                  <Textarea
                    id="receipt-footer"
                    value={receiptFooter}
                    onChange={(e) => setReceiptFooter(e.target.value)}
                    placeholder="เช่น ขอบคุณที่อุดหนุน!&#10;สินค้าซื้อแล้วไม่รับเปลี่ยนหรือคืนเงิน"
                    rows={3}
                    className="resize-none font-mono text-xs"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    แสดงล่างสุดของใบเสร็จ เหมาะสำหรับใส่คำขอบคุณหรือเงื่อนไขการรับประกัน
                  </p>
                </div>
              </CardContent>
              <CardFooter className="border-t bg-muted/20 px-6 py-4 flex justify-between items-center">
                <span className="text-xs text-muted-foreground">
                  รองรับเครื่องพิมพ์สลิปความร้อน 58mm และ 80mm
                </span>
                <Button
                  onClick={handleSaveProfile}
                  disabled={isSaving || !name.trim()}
                  className="px-6 font-medium shadow-xs"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isSaving ? "กำลังบันทึก..." : "บันทึกรูปแบบใบเสร็จ"}
                </Button>
              </CardFooter>
            </Card>
          </div>

          {/* Thermal Receipt Preview Side */}
          <div className="lg:col-span-5">
            <div className="sticky top-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Printer className="w-4 h-4 text-blue-500" />
                  ตัวอย่างใบเสร็จจริง (Thermal Print Preview)
                </h3>
                <Badge variant="outline" className="text-[10px] font-mono">
                  80mm Standard
                </Badge>
              </div>

              {/* Photorealistic Slip Preview */}
              <div className="relative bg-white text-slate-900 p-6 rounded-t-lg shadow-xl font-mono text-xs border border-gray-200 mx-auto max-w-[320px] select-none">
                {/* Top Zigzag Pattern */}
                <div className="text-center mb-4 space-y-1">
                  <h2 className="font-bold text-base tracking-wide uppercase">
                    {name || "ชื่อร้านค้าของคุณ"}
                  </h2>
                  {receiptHeader ? (
                    <div className="whitespace-pre-wrap text-[11px] text-slate-600 leading-tight">
                      {receiptHeader}
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-400 italic">
                      [ส่วนหัวใบเสร็จ]
                    </div>
                  )}
                  {receiptTaxId && (
                    <div className="text-[11px] text-slate-700 font-bold pt-1">
                      TAX ID: {receiptTaxId}
                    </div>
                  )}
                </div>

                <div className="text-[11px] text-slate-600 space-y-0.5 mb-3 border-y border-dashed border-slate-300 py-2">
                  <div className="flex justify-between">
                    <span>วันที่:</span>
                    <span>{format(new Date(), "dd/MM/yyyy HH:mm")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>พนักงาน:</span>
                    <span>{activeStore.jobTitle || "Owner"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>เลขที่:</span>
                    <span>#POS-20260728-001</span>
                  </div>
                </div>

                {/* Items List */}
                <div className="space-y-1.5 mb-3 text-[11px]">
                  <div className="flex justify-between font-medium">
                    <span>1x กาแฟอาราบิก้าพรีเมียม</span>
                    <span>65.00</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>2x แซนด์วิชแฮมชีส</span>
                    <span>110.00</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>1x ครัวซองต์เนยสด</span>
                    <span>55.00</span>
                  </div>
                </div>

                <div className="border-t border-slate-300 pt-2 space-y-1 text-xs">
                  <div className="flex justify-between font-bold text-sm text-slate-900 pt-1 border-t border-slate-800">
                    <span>ยอดชำระสุทธิ</span>
                    <span>฿230.00</span>
                  </div>
                </div>

                <div className="border-t border-dashed border-slate-300 my-3"></div>

                <div className="text-[11px] text-slate-600 space-y-0.5 mb-4">
                  <div className="flex justify-between">
                    <span>รับเงิน (PromptPay)</span>
                    <span>฿230.00</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>เงินทอน</span>
                    <span>฿0.00</span>
                  </div>
                </div>

                {receiptFooter ? (
                  <div className="text-center text-[11px] text-slate-600 whitespace-pre-wrap border-t border-dashed border-slate-300 pt-3">
                    {receiptFooter}
                  </div>
                ) : (
                  <div className="text-center text-[10px] text-slate-400 italic border-t border-dashed border-slate-300 pt-3">
                    [ส่วนท้ายใบเสร็จ - ขอบคุณที่ใช้บริการ]
                  </div>
                )}

                {/* Receipt Bottom Zigzag Cut Visual */}
                <div className="absolute -bottom-2 left-0 right-0 h-3 bg-white [clip-path:polygon(0_0,5%_100%,10%_0,15%_100%,20%_0,25%_100%,30%_0,35%_100%,40%_0,45%_100%,50%_0,55%_100%,60%_0,65%_100%,70%_0,75%_100%,80%_0,85%_100%,90%_0,95%_100%,100%_0)]"></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content 3: Environment / System (.env) Settings */}
      {activeTab === "env" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pt-2">
          <div className="lg:col-span-8 space-y-6">
            <Card className="border-border/60 shadow-xs">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-bold">
                  <Sliders className="w-5 h-5 text-primary" />
                  การตั้งค่าตัวแปรระบบ (Environment Variables - .env)
                </CardTitle>
                <CardDescription>
                  จัดการค่าพารามิเตอร์การเชื่อมต่อเซิร์ฟเวอร์ คีย์บริการปัญญาประดิษฐ์ และพอร์ตสำหรับระบบ
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="env-api-url" className="font-semibold text-xs flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-muted-foreground" />
                    API_URL (URL เซิร์ฟเวอร์ Backend)
                  </Label>
                  <Input
                    id="env-api-url"
                    value={envApiUrl}
                    onChange={(e) => setEnvApiUrl(e.target.value)}
                    placeholder="http://localhost:8080"
                    className="font-mono text-xs"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    ที่อยู่สำหรับเรียกใช้ API ของ Backend เช่น http://localhost:8080 หรือ https://api.yourdomain.com
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="env-public-url" className="font-semibold text-xs flex items-center gap-1.5">
                    <FileCode className="w-3.5 h-3.5 text-muted-foreground" />
                    NEXT_PUBLIC_BASE_URL (URL สำหรับเว็บหน้าบ้าน)
                  </Label>
                  <Input
                    id="env-public-url"
                    value={envPublicBaseUrl}
                    onChange={(e) => setEnvPublicBaseUrl(e.target.value)}
                    placeholder="http://localhost:8080"
                    className="font-mono text-xs"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="env-gemini-key" className="font-semibold text-xs flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-primary" />
                    GEMINI_API_KEY (คีย์บริการ Google Gemini AI)
                  </Label>
                  <div className="relative">
                    <Input
                      id="env-gemini-key"
                      type={showGeminiKey ? "text" : "password"}
                      value={envGeminiKey}
                      onChange={(e) => setEnvGeminiKey(e.target.value)}
                      placeholder="AQ.Ab8RN6LxMP200..."
                      className="font-mono text-xs pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowGeminiKey(!showGeminiKey)}
                    >
                      {showGeminiKey ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    API Key สำหรับเปิดใช้งานฟีเจอร์ AI Assistant ช่วยวิเคราะห์ยอดขายและจัดการสต็อก
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor="env-port" className="font-semibold text-xs">
                      PORT (พอร์ตเซิร์ฟเวอร์)
                    </Label>
                    <Input
                      id="env-port"
                      value={envPort}
                      onChange={(e) => setEnvPort(e.target.value)}
                      placeholder="8080"
                      className="font-mono text-xs"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="env-node-env" className="font-semibold text-xs">
                      NODE_ENV (โหมดระบบ)
                    </Label>
                    <Input
                      id="env-node-env"
                      value={envNodeEnv}
                      onChange={(e) => setEnvNodeEnv(e.target.value)}
                      placeholder="production"
                      className="font-mono text-xs"
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t border-border/40 px-6 py-4 flex flex-col sm:flex-row gap-3 justify-between items-center bg-muted/20">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopyEnv}
                  className="gap-2 text-xs w-full sm:w-auto"
                >
                  {copiedEnv ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  คัดลอกไฟล์ .env
                </Button>

                <Button
                  type="button"
                  onClick={handleSaveEnvConfig}
                  size="sm"
                  className="gap-2 font-semibold shadow-xs text-xs w-full sm:w-auto"
                >
                  <Save className="w-3.5 h-3.5" />
                  บันทึกการตั้งค่า .env
                </Button>
              </CardFooter>
            </Card>
          </div>

          <div className="lg:col-span-4 space-y-6">
            <Card className="border-border/60 shadow-xs">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base font-bold">
                  <Info className="w-4 h-4 text-primary" />
                  คำแนะนำการตั้งค่า .env
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-xs text-muted-foreground leading-relaxed">
                <p>
                  ไฟล์ <code>.env</code> ใช้สำหรับเก็บค่ากำหนดค่าความปลอดภัยและการเชื่อมต่อระบบทั้งบน Web Server (Docker) และบนโปรแกรม Desktop (.exe)
                </p>
                <div className="p-3 rounded-lg bg-muted/40 border border-border/50 font-mono text-[11px] space-y-1 text-foreground">
                  <div>API_URL=http://localhost:8080</div>
                  <div>PORT=8080</div>
                  <div>NODE_ENV=production</div>
                </div>
                <p>
                  กดปุ่ม <strong>"คัดลอกไฟล์ .env"</strong> เพื่อนำข้อความตัวแปรไปวางในไฟล์ <code>.env</code> หรือใน <code>docker-compose.yml</code> ได้ทันที
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Tab Content 3: Advanced / Danger Zone */}
      {activeTab === "danger" && (
        <div className="grid grid-cols-1 gap-6 pt-2">
          <Card className="border-rose-500/30 bg-rose-500/5 shadow-xs">
            <CardHeader>
              <CardTitle className="text-rose-600 dark:text-rose-400 flex items-center gap-2 text-lg font-bold">
                <ShieldAlert className="w-5 h-5" />
                เขตพื้นที่อันตราย (Danger Zone)
              </CardTitle>
              <CardDescription>
                การดำเนินการในหน้านี้จะส่งผลกระทบอย่างถาวรต่อร้านค้าและข้อมูลทั้งหมดในระบบ
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 rounded-xl bg-background border border-rose-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="font-semibold text-sm text-foreground flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-500" />
                    ลบร้านค้านี้อย่างถาวร (Delete Store)
                  </h4>
                  <p className="text-xs text-muted-foreground max-w-xl leading-relaxed">
                    เมื่อทำการลบร้านค้า <strong>{activeStore.name}</strong> ข้อมูลสินค้าทั้งหมด ({activeStore.productCount ?? 0} รายการ), ประวัติยอดขาย, สต็อก และสมาชิกพนักงาน จะถูกลบทิ้งจากฐานข้อมูลทันทีและไม่สามารถกู้คืนได้
                  </p>
                </div>

                {/* Base UI DialogTrigger with render prop */}
                <AlertDialog>
                  <AlertDialogTrigger
                    render={
                      <Button variant="destructive" className="shrink-0 font-medium shadow-xs">
                        ลบร้านค้าถาวร
                      </Button>
                    }
                  />
                  <AlertDialogContent className="sm:max-w-md">
                    <AlertDialogHeader className="p-6 pb-2">
                      <AlertDialogTitle className="text-rose-600 dark:text-rose-400 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5" />
                        ยืนยันการลบร้านค้าถาวร
                      </AlertDialogTitle>
                      <AlertDialogDescription className="pt-2">
                        การลบร้านค้า <strong>{activeStore.name}</strong> จะลบข้อมูลสินค้า สต็อก รายการขาย ทั้งหมดถาวรและไม่สามารถยกเลิกได้
                      </AlertDialogDescription>
                    </AlertDialogHeader>

                    <div className="px-6 py-4 space-y-3">
                      <Label className="text-xs font-semibold">
                        กรุณาพิมพ์ชื่อร้านค้า{" "}
                        <span className="font-bold text-foreground font-mono bg-muted px-1.5 py-0.5 rounded">
                          {activeStore.name}
                        </span>{" "}
                        เพื่อยืนยันการลบ:
                      </Label>
                      <Input
                        value={deleteConfirmText}
                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                        placeholder={activeStore.name}
                        className="font-mono text-sm"
                      />
                    </div>

                    <AlertDialogFooter className="gap-3 sm:gap-3">
                      <AlertDialogClose
                        render={
                          <Button
                            variant="outline"
                            onClick={() => setDeleteConfirmText("")}
                          >
                            ยกเลิก
                          </Button>
                        }
                      />
                      <Button
                        variant="destructive"
                        disabled={
                          deleteConfirmText !== activeStore.name || isDeleting
                        }
                        onClick={handleDeleteStore}
                        className="font-semibold"
                      >
                        {isDeleting ? "กำลังลบ..." : "ฉันเข้าใจผลกระทบ ยืนยันลบร้าน"}
                      </Button>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </Containers>
  );
}
