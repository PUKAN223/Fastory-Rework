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

type SettingsTab = "general" | "receipt" | "integrations" | "danger";

const SETTINGS_TABS = [
  { id: "general" as SettingsTab, label: "ข้อมูลร้านค้า", icon: Store },
  { id: "receipt" as SettingsTab, label: "รูปแบบใบเสร็จ", icon: ReceiptText },
  { id: "integrations" as SettingsTab, label: "รับเงินโอน (PromptPay)", icon: QrCode },
  { id: "danger" as SettingsTab, label: "การจัดการร้านค้า", icon: ShieldAlert },
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
  const [deletePassword, setDeletePassword] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [copiedSlug, setCopiedSlug] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

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
    if (
      !activeStore ||
      deleteConfirmText !== activeStore.name ||
      !deletePassword.trim()
    )
      return;
    setIsDeleting(true);
    try {
      await dispatch(
        deleteStore({ id: activeStore.id, password: deletePassword }),
      ).unwrap();
      toast.success("ร้านค้าถูกลบออกจากระบบแล้ว");
      setDeleteConfirmText("");
      setDeletePassword("");
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
        description="จัดการข้อมูลร้านค้า ช่องทางชำระเงิน การออกใบเสร็จรับเงิน และตัวแปรระบบ"
      >
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="bg-muted/40 font-mono text-xs text-muted-foreground border-border px-2.5 py-1 font-normal gap-1.5"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-muted-foreground" />
            {activeStore.jobTitle || "Owner"}
          </Badge>
          <Badge
            variant="outline"
            className="px-2.5 py-1 font-mono text-xs font-normal border-border"
          >
            ID: #{activeStore.id}
          </Badge>
        </div>
      </PageHeaderCards>

      {/* Navigation Tabs - Monochrome & Clean */}
      <div className="border-b border-border/80">
        <nav className="flex gap-1 overflow-x-auto no-scrollbar" aria-label="การตั้งค่า">
          {SETTINGS_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "relative flex items-center gap-2 px-4 py-2.5 text-xs font-medium transition-colors hover:text-foreground cursor-pointer select-none whitespace-nowrap",
                  isActive
                    ? "text-foreground font-semibold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-foreground"
                    : "text-muted-foreground",
                )}
              >
                <Icon className="w-3.5 h-3.5 text-muted-foreground" />
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
            <Card className="border border-border/80 shadow-none">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                  ข้อมูลพื้นฐานร้านค้า
                </CardTitle>
                <CardDescription className="text-xs">
                  กำหนดชื่อร้าน คำอธิบาย และหมายเลขติดต่อหลักสำหรับใช้งานในระบบ
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="store-name"
                      className="font-medium text-xs text-foreground"
                    >
                      ชื่อร้านค้า <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="store-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="เช่น Fastory Flagship Store"
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label
                      htmlFor="store-slug"
                      className="font-medium text-xs text-foreground"
                    >
                      Store Slug (URL Identifier)
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="store-slug"
                        value={activeStore.slug || ""}
                        disabled
                        className="h-9 bg-muted/40 font-mono text-xs"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 shrink-0"
                        onClick={handleCopySlug}
                        title="คัดลอก Slug"
                      >
                        {copiedSlug ? (
                          <Check className="w-3.5 h-3.5 text-foreground" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="store-desc"
                    className="font-medium text-xs text-foreground"
                  >
                    รายละเอียดร้านค้า / สโลแกน
                  </Label>
                  <Textarea
                    id="store-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="อธิบายเกี่ยวกับร้านค้า สินค้าที่ขาย หรือสาขา..."
                    rows={3}
                    className="resize-none text-xs"
                  />
                </div>

                <div className="pt-3 border-t border-border/60 space-y-4">
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="store-taxid-gen"
                      className="font-medium text-xs text-foreground"
                    >
                      เลขประจำตัวผู้เสียภาษี (Tax ID / VAT Reg.)
                    </Label>
                    <Input
                      id="store-taxid-gen"
                      value={receiptTaxId}
                      onChange={(e) => setReceiptTaxId(e.target.value)}
                      placeholder="เลข 13 หลัก เช่น 0105558012345"
                      className="h-9 font-mono text-xs max-w-sm"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      สำหรับใช้แสดงบนใบเสร็จรับเงินอย่างเป็นทางการของร้านค้า
                    </p>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t border-border/60 bg-muted/20 px-6 py-3.5 flex justify-between items-center">
                <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 shrink-0" />
                  กดบันทึกเพื่ออัปเดตข้อมูลไปยังเครื่อง POS
                </span>
                <Button
                  onClick={handleSaveProfile}
                  disabled={isSaving || !name.trim()}
                  size="sm"
                  className="px-5 text-xs font-medium"
                >
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                  {isSaving ? "กำลังบันทึก..." : "บันทึกการเปลี่ยนแปลง"}
                </Button>
              </CardFooter>
            </Card>
          </div>

          {/* Side Overview Card */}
          <div className="lg:col-span-4 space-y-6">
            <Card className="border border-border/80 shadow-none bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-mono font-medium text-muted-foreground uppercase tracking-wider">
                  Store Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/60">
                  <div className="size-9 rounded-md bg-foreground text-background flex items-center justify-center font-bold text-base shrink-0">
                    {activeStore.name.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-xs truncate text-foreground">
                      {activeStore.name}
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate font-mono">
                      slug: {activeStore.slug}
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className="font-mono text-[10px] border-border text-foreground"
                  >
                    {activeStore.is_active ? "Active" : "Disabled"}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg border border-border/60 bg-muted/20 space-y-1">
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Package className="w-3.5 h-3.5" />
                      สินค้าทั้งหมด
                    </div>
                    <div className="text-lg font-bold text-foreground">
                      {activeStore.productCount ?? 0}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg border border-border/60 bg-muted/20 space-y-1">
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      สมาชิกทีม
                    </div>
                    <div className="text-lg font-bold text-foreground">
                      {activeStore.memberCount ?? 1}
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-border/60 bg-muted/20 text-xs space-y-1.5">
                  <div className="font-medium flex items-center gap-1.5 text-foreground">
                    <QrCode className="w-3.5 h-3.5 text-muted-foreground" />
                    {promptpayId ? "พร้อมเพย์พร้อมใช้งาน" : "ยังไม่ได้ตั้งค่าพร้อมเพย์"}
                  </div>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    {promptpayId
                      ? `เปิดรับชำระผ่าน PromptPay (${promptpayId})`
                      : "ระบุหมายเลข PromptPay เพื่อสร้าง QR Code ที่ POS"}
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
            <Card className="border border-border/80 shadow-none">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                  <ReceiptText className="w-4 h-4 text-muted-foreground" />
                  ออกแบบใบเสร็จรับเงิน (Receipt Layout)
                </CardTitle>
                <CardDescription className="text-xs">
                  ปรับแต่งข้อความส่วนหัว ข้อความส่วนท้าย และข้อมูลภาษีบนสลิปใบเสร็จ
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="receipt-header"
                    className="font-medium text-xs text-foreground"
                  >
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

                <div className="space-y-1.5">
                  <Label
                    htmlFor="receipt-tax"
                    className="font-medium text-xs text-foreground"
                  >
                    เลขประจำตัวผู้เสียภาษี (Tax ID / VAT Reg.)
                  </Label>
                  <Input
                    id="receipt-tax"
                    value={receiptTaxId}
                    onChange={(e) => setReceiptTaxId(e.target.value)}
                    placeholder="เช่น 0105558012345"
                    className="h-9 font-mono text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="receipt-footer"
                    className="font-medium text-xs text-foreground"
                  >
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
                    แสดงล่างสุดของใบเสร็จ เหมาะสำหรับคำขอบคุณหรือเงื่อนไขบริการ
                  </p>
                </div>
              </CardContent>
              <CardFooter className="border-t border-border/60 bg-muted/20 px-6 py-3.5 flex justify-between items-center">
                <span className="text-[11px] text-muted-foreground">
                  รองรับเครื่องพิมพ์สลิปความร้อน 58mm และ 80mm
                </span>
                <Button
                  onClick={handleSaveProfile}
                  disabled={isSaving || !name.trim()}
                  size="sm"
                  className="px-5 text-xs font-medium"
                >
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                  {isSaving ? "กำลังบันทึก..." : "บันทึกรูปแบบใบเสร็จ"}
                </Button>
              </CardFooter>
            </Card>
          </div>

          {/* Thermal Receipt Preview Side */}
          <div className="lg:col-span-5">
            <div className="sticky top-6 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                  <Printer className="w-3.5 h-3.5 text-muted-foreground" />
                  ตัวอย่างใบเสร็จจริง (Thermal Slip Preview)
                </h3>
                <Badge
                  variant="outline"
                  className="text-[10px] font-mono border-border"
                >
                  80mm Standard
                </Badge>
              </div>

              {/* Monochrome Slip Preview */}
              <div className="relative bg-white text-slate-900 p-6 rounded-t-lg shadow-sm font-mono text-xs border border-gray-200 mx-auto max-w-[320px] select-none">
                <div className="text-center mb-4 space-y-1">
                  <h2 className="font-bold text-sm tracking-wide uppercase">
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
                    <span>#POS-20260730-001</span>
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

                {/* Bottom Zigzag */}
                <div className="absolute -bottom-2 left-0 right-0 h-3 bg-white [clip-path:polygon(0_0,5%_100%,10%_0,15%_100%,20%_0,25%_100%,30%_0,35%_100%,40%_0,45%_100%,50%_0,55%_100%,60%_0,65%_100%,70%_0,75%_100%,80%_0,85%_100%,90%_0,95%_100%,100%_0)]"></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content 3: Integrations & PromptPay */}
      {activeTab === "integrations" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pt-2">
          <div className="lg:col-span-8 space-y-6">
            {/* PromptPay Setting Card */}
            <Card className="border border-border/80 shadow-none">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-primary" />
                  บัญชีรับเงินพร้อมเพย์ (PromptPay Account)
                </CardTitle>
                <CardDescription className="text-xs">
                  กำหนดหมายเลขพร้อมเพย์สำหรับสร้าง Dynamic QR Code ชำระเงินที่หน้าร้าน POS
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="store-promptpay-input"
                      className="font-medium text-xs text-foreground"
                    >
                      หมายเลขพร้อมเพย์ (เบอร์โทรศัพท์ หรือ Tax ID 13 หลัก)
                    </Label>
                    {promptpayId ? (
                      <Badge
                        variant="outline"
                        className="text-[10px] text-emerald-600 bg-emerald-500/10 border-emerald-500/30 gap-1 font-normal"
                      >
                        <Check className="w-3 h-3" /> พร้อมใช้งานที่หน้า POS
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-[10px] text-amber-600 bg-amber-500/10 border-amber-500/30 font-normal"
                      >
                        ยังไม่ได้กรอกหมายเลข
                      </Badge>
                    )}
                  </div>
                  <Input
                    id="store-promptpay-input"
                    value={promptpayId}
                    onChange={(e) => setPromptpayId(e.target.value)}
                    placeholder="เช่น 0812345678 หรือ 0105558012345"
                    className="h-9 font-mono text-xs"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    เมื่อกรอกแล้ว ระบบหน้าร้าน (POS) จะสร้าง QR Code สแกนจ่ายตามยอดเงินให้อัตโนมัติ
                  </p>
                </div>
              </CardContent>
              <CardFooter className="border-t border-border/60 bg-muted/20 px-6 py-3.5 flex justify-between items-center">
                <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 shrink-0" />
                  การเปลี่ยนแปลงจะมีผลต่อหน้า POS ทันที
                </span>
                <Button
                  onClick={handleSaveProfile}
                  disabled={isSaving || !name.trim()}
                  size="sm"
                  className="px-5 text-xs font-medium"
                >
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                  {isSaving ? "กำลังบันทึก..." : "บันทึกข้อมูลพร้อมเพย์"}
                </Button>
              </CardFooter>
            </Card>

            {/* Auto-check Webhook Card */}
            <Card className="border border-border/80 shadow-none">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-600" />
                  ระบบตรวจรับเงินโอนอัตโนมัติ (PromptPay Auto-Check)
                </CardTitle>
                <CardDescription className="text-xs">
                  เชื่อมต่อกับแอปพลิเคชันแจ้งเตือนยอดโอนเงินบนมือถือ เพื่อให้อนุมัติออเดอร์หน้าร้าน POS ให้อัตโนมัติ
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground flex items-center gap-1.5 text-xs">
                      🔗 URL สำหรับรับสัญญาณเงินโอน (Webhook Endpoint)
                    </span>
                    <Badge
                      variant="outline"
                      className="text-[10px] font-mono border-emerald-500/30 text-emerald-600"
                    >
                      HTTP POST
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      readOnly
                      value={`${envApiUrl}/api/v1/webhooks/promptpay/${promptpayId.replace(/\D/g, "") || "YOUR_PHONE_NUMBER"}`}
                      className="h-9 bg-background font-mono text-xs text-foreground"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 px-4 shrink-0 text-xs gap-1.5"
                      onClick={() => {
                        const url = `${envApiUrl}/api/v1/webhooks/promptpay/${promptpayId.replace(/\D/g, "") || "YOUR_PHONE_NUMBER"}`;
                        navigator.clipboard.writeText(url);
                        setCopiedWebhook(true);
                        toast.success("คัดลอก Webhook URL เรียบร้อยแล้ว");
                        setTimeout(() => setCopiedWebhook(false), 2000);
                      }}
                    >
                      {copiedWebhook ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      {copiedWebhook ? "คัดลอกแล้ว" : "คัดลอก URL"}
                    </Button>
                  </div>
                  <div className="space-y-2 pt-1 text-[11px] text-muted-foreground leading-relaxed">
                    <p className="font-semibold text-foreground">💡 วิธีการเชื่อมต่อใช้งาน 3 ขั้นตอนง่ายๆ:</p>
                    <ol className="list-decimal list-inside space-y-1 pl-1">
                      <li>กรอกหมายเลขพร้อมเพย์ด้านบน แล้วกด **บันทึก**</li>
                      <li>คัดลอก **URL** ด้านบน ไปใส่ในแอปพลิเคชันแจ้งเตือนโอนเงินบนโทรศัพท์มือถือประจำร้าน</li>
                      <li>เมื่อมีลูกค้าสแกนโอนเงิน หน้าขายสินค้า (POS) จะอนุมัติและปิด QR Code ให้อัตโนมัติทันที</li>
                    </ol>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Side Info Overview */}
          <div className="lg:col-span-4 space-y-6">
            <Card className="border border-border/80 shadow-none bg-muted/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-primary" />
                  เกี่ยวกับระบบรับเงินโอน
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs text-muted-foreground leading-relaxed">
                <p>
                  ระบบจะใช้หมายเลขพร้อมเพย์ของร้านและยอดยืนยันจากแอปยิงสัญญาณในการจับคู่ออเดอร์
                </p>
                <p>
                  หากไม่มีแอปยิงสัญญาณอัตโนมัติ พนักงานยังคงตรวจเช็กเงินเข้าจากแอปธนาคารแล้วอนุมัติออเดอร์ในหน้า POS ได้ตามปกติ
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}


      {/* Tab Content 4: Danger Zone */}
      {activeTab === "danger" && (
        <div className="grid grid-cols-1 gap-6 pt-2">
          <Card className="border border-border/80 shadow-none bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-foreground flex items-center gap-2 text-base font-semibold">
                <ShieldAlert className="w-4 h-4 text-muted-foreground" />
                เขตพื้นที่อันตราย (Danger Zone)
              </CardTitle>
              <CardDescription className="text-xs">
                การดำเนินการในส่วนนี้ส่งผลกระทบถาวรต่อร้านค้าและข้อมูลระบบ
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="p-4 rounded-lg border border-border/60 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="font-medium text-xs text-foreground flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-muted-foreground" />
                    ลบร้านค้านี้อย่างถาวร (Delete Store)
                  </h4>
                  <p className="text-[11px] text-muted-foreground max-w-xl leading-relaxed">
                    เมื่อทำการลบร้านค้า <strong>{activeStore.name}</strong>{" "}
                    ข้อมูลสินค้าทั้งหมด ({activeStore.productCount ?? 0} รายการ),
                    ประวัติยอดขาย, สต็อก และสมาชิกทีมจะถูกลบออกจากฐานข้อมูลอย่างถาวร
                  </p>
                </div>

                <AlertDialog>
                  <AlertDialogTrigger
                    render={
                      <Button
                        variant="destructive"
                        size="sm"
                        className="shrink-0 text-xs font-medium h-8 px-4"
                      >
                        ลบร้านค้าถาวร
                      </Button>
                    }
                  />
                  <AlertDialogContent className="sm:max-w-md">
                    <AlertDialogHeader className="p-6 pb-2">
                      <AlertDialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-destructive" />
                        ยืนยันการลบร้านค้าถาวร
                      </AlertDialogTitle>
                      <AlertDialogDescription className="pt-2 text-xs">
                        การลบร้านค้า <strong>{activeStore.name}</strong>{" "}
                        จะลบข้อมูลสินค้า สต็อก รายการขาย ทั้งหมดถาวรและไม่สามารถยกเลิกได้
                      </AlertDialogDescription>
                    </AlertDialogHeader>

                    <div className="px-6 py-3 space-y-3 text-xs">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-foreground">
                          1. พิมพ์ชื่อร้านค้า{" "}
                          <span className="font-mono font-semibold bg-muted px-1.5 py-0.5 rounded border">
                            {activeStore.name}
                          </span>{" "}
                          เพื่อยืนยัน:
                        </Label>
                        <Input
                          value={deleteConfirmText}
                          onChange={(e) => setDeleteConfirmText(e.target.value)}
                          placeholder={activeStore.name}
                          className="font-mono text-xs h-9"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-foreground">
                          2. กรอกรหัสผ่านของคุณเพื่อยืนยันการลบ:
                        </Label>
                        <Input
                          type="password"
                          value={deletePassword}
                          onChange={(e) => setDeletePassword(e.target.value)}
                          placeholder="รหัสผ่านบัญชีผู้ใช้ของคุณ"
                          className="font-mono text-xs h-9"
                        />
                      </div>
                    </div>

                    <AlertDialogFooter className="gap-2 sm:gap-2 p-6 pt-2">
                      <AlertDialogClose
                        render={
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setDeleteConfirmText("");
                              setDeletePassword("");
                            }}
                            className="text-xs"
                          >
                            ยกเลิก
                          </Button>
                        }
                      />
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={
                          deleteConfirmText !== activeStore.name ||
                          !deletePassword.trim() ||
                          isDeleting
                        }
                        onClick={handleDeleteStore}
                        className="text-xs font-medium"
                      >
                        {isDeleting ? "กำลังลบ..." : "ยืนยันลบร้านค้าถาวร"}
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
