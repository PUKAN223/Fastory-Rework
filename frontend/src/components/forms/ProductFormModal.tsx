"use client";

import { ImagePlus, ScanLine, Trash2 } from "lucide-react";
import Image from "next/image";
import {
  type ChangeEvent,
  type FormEvent,
  type ClipboardEvent as ReactClipboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { BarcodeScannerDialog } from "@/components/ui/BarcodeScannerDialog";
import { formatImageSrc } from "@/lib/formatImageSrc";
import { prepareImageDataUrl } from "@/lib/prepareImageDataUrl";
import type {
  CreateProductPayload,
  ProductFormInitialValues,
  ProductFormMode,
} from "@/types/products";

type ProductCategoryOption = {
  id: string;
  name: string;
};

type ProductLocationOption = {
  id: string;
  name: string;
};

type ProductFormModalProps = {
  mode: ProductFormMode;
  open: boolean;
  categories: ProductCategoryOption[];
  locations?: ProductLocationOption[];
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: CreateProductPayload) => Promise<boolean> | boolean;
  isSubmitting?: boolean;
  initialValues?: ProductFormInitialValues;
  triggerLabel?: string;
  triggerIcon?: ReactNode;
  triggerClassName?: string;
};

const emptyInitialValues: ProductFormInitialValues = {
  sku: "",
  name: "",
  categoryId: "",
  locationId: null,
  description: "",
  costPrice: 0,
  sellingPrice: 0,
  reorderPoint: 0,
  isActive: true,
  imageId: null,
  imageUrl: null,
};

export function ProductFormModal({
  mode,
  open,
  categories,
  locations = [],
  onOpenChange,
  onSubmit,
  isSubmitting = false,
  initialValues = emptyInitialValues,
  triggerLabel,
  triggerIcon = null,
  triggerClassName,
}: ProductFormModalProps) {
  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [locationId, setLocationId] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [costPrice, setCostPrice] = useState("0");
  const [sellingPrice, setSellingPrice] = useState("0");
  const [reorderPoint, setReorderPoint] = useState("0");
  const [isActive, setIsActive] = useState(true);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isPreparingImage, setIsPreparingImage] = useState(false);
  const [imageInputKey, setImageInputKey] = useState(0);
  const [imageAction, setImageAction] = useState<"keep" | "replace" | "remove">(
    "keep",
  );
  const [scannerOpen, setScannerOpen] = useState(false);

  const isEditMode = mode === "edit";
  const trimmedSku = sku.trim();
  const trimmedName = name.trim();
  const parsedCostPrice = Number(costPrice);
  const parsedSellingPrice = Number(sellingPrice);
  const hasValidPricing =
    !Number.isNaN(parsedCostPrice) &&
    parsedCostPrice >= 0 &&
    !Number.isNaN(parsedSellingPrice) &&
    parsedSellingPrice >= 0;

  const canSubmit =
    Boolean(trimmedSku) &&
    Boolean(trimmedName) &&
    Boolean(categoryId) &&
    hasValidPricing &&
    !isPreparingImage &&
    !isSubmitting &&
    categories.length > 0;

  const priceDiff = hasValidPricing
    ? Number((parsedSellingPrice - parsedCostPrice).toFixed(2))
    : 0;
  const marginPercent =
    hasValidPricing && parsedCostPrice > 0
      ? ((parsedSellingPrice - parsedCostPrice) / parsedCostPrice) * 100
      : null;

  const modalText = useMemo(
    () =>
      isEditMode
        ? {
            title: "แก้ไขสินค้า",
            description: "ปรับข้อมูลสินค้า",
            submit: "บันทึกการแก้ไข",
          }
        : {
            title: "เพิ่มสินค้าใหม่",
            description: "กรอกข้อมูลสินค้าเพื่อบันทึกเข้าระบบ",
            submit: "บันทึก",
          },
    [isEditMode],
  );

  useEffect(() => {
    if (!open) return;

    setSku(initialValues?.sku ?? "");
    setName(initialValues?.name ?? "");
    setCategoryId(initialValues?.categoryId ?? "");
    setLocationId(initialValues?.locationId ?? null);
    setDescription(initialValues?.description ?? "");
    setCostPrice(String(initialValues?.costPrice ?? 0));
    setSellingPrice(String(initialValues?.sellingPrice ?? 0));
    setReorderPoint(String(initialValues?.reorderPoint ?? 0));
    setIsActive(initialValues?.isActive ?? true);
    setImageDataUrl(null);
    setImagePreviewUrl(
      initialValues?.imageUrl ? formatImageSrc(initialValues.imageUrl) : null,
    );
    setImageAction("keep");
    setImageInputKey((key) => key + 1);
  }, [open, initialValues]);

  const handleRemoveImage = () => {
    setImageDataUrl(null);
    setImagePreviewUrl(null);
    setImageInputKey((key) => key + 1);
    if (isEditMode) {
      setImageAction("remove");
    }
  };

  const handleImageFile = useCallback(
    async (file: File) => {
      setIsPreparingImage(true);
      try {
        const prepared = await prepareImageDataUrl(file, { maxSize: 128 });
        setImageDataUrl(prepared.dataUrl);
        setImagePreviewUrl(prepared.dataUrl);
        if (isEditMode) {
          setImageAction("replace");
        }
      } catch {
        toast.error("ไม่สามารถประมวลผลรูปภาพได้");
        setImageDataUrl(null);
      } finally {
        setIsPreparingImage(false);
      }
    },
    [isEditMode],
  );

  const handleImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setImageDataUrl(null);
      return;
    }

    await handleImageFile(file);
  };

  const handleImagePaste = async (
    event: ReactClipboardEvent<HTMLFormElement>,
  ) => {
    const imageItem = Array.from(event.clipboardData.items).find((item) =>
      item.type.startsWith("image/"),
    );
    if (!imageItem) return;

    const file = imageItem.getAsFile();
    if (!file) return;

    event.preventDefault();
    await handleImageFile(file);
  };

  const handleWindowPaste = useCallback(
    async (event: ClipboardEvent) => {
      if (!open) return;

      const imageItem = Array.from(event.clipboardData?.items ?? []).find(
        (item) => item.type.startsWith("image/"),
      );
      if (!imageItem) return;

      const file = imageItem.getAsFile();
      if (!file) return;

      event.preventDefault();
      await handleImageFile(file);
    },
    [open, handleImageFile],
  );

  useEffect(() => {
    if (!open) return;

    window.addEventListener("paste", handleWindowPaste);
    return () => {
      window.removeEventListener("paste", handleWindowPaste);
    };
  }, [open, handleWindowPaste]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;

    const payload: CreateProductPayload = {
      sku: trimmedSku,
      name: trimmedName,
      categoryId,
      locationId: locationId || null,
      description: description.trim(),
      costPrice: parsedCostPrice,
      sellingPrice: parsedSellingPrice,
      reorderPoint: Number(reorderPoint) || 0,
      isActive,
    };

    if (isEditMode) {
      if (imageAction === "replace" && imageDataUrl) {
        payload.imageDataUrl = imageDataUrl;
      } else if (imageAction === "remove") {
        payload.imageId = null;
      }
    } else if (imageDataUrl) {
      payload.imageDataUrl = imageDataUrl;
    }

    const isSuccess = await onSubmit(payload);
    if (isSuccess) {
      onOpenChange(false);
    }
  };

  const formId = isEditMode ? "edit-product-form" : "add-product-form";
  const submitText = isPreparingImage
    ? "กำลังประมวลผลรูป..."
    : isSubmitting
      ? "กำลังบันทึก..."
      : modalText.submit;

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      {!isEditMode && triggerLabel ? (
        <DialogTrigger render={
          <Button variant="default" className={triggerClassName}>
            {triggerIcon}
            {triggerLabel}
          </Button>
        } />
      ) : null}
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-xl p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>{modalText.title}</DialogTitle>
          <DialogDescription>{modalText.description}</DialogDescription>
        </DialogHeader>
        <div className="flex-1 space-y-4 overflow-y-auto px-6 pb-6">
          <form
            className="space-y-4"
            id={formId}
            onPaste={handleImagePaste}
            onSubmit={handleSubmit}
          >
            <div className="space-y-2">
              <Label htmlFor={`${mode}-product-sku`}>SKU</Label>
              <div className="flex gap-2">
                <Input
                  id={`${mode}-product-sku`}
                  placeholder="เช่น SKU-001"
                  required
                  value={sku}
                  onChange={(event) => setSku(event.target.value)}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  title="สแกน Barcode"
                  onClick={() => setScannerOpen(true)}
                >
                  <ScanLine className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${mode}-product-name`}>ชื่อสินค้า</Label>
              <Input
                id={`${mode}-product-name`}
                placeholder="กรุณาใส่ชื่อสินค้า"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>หมวดหมู่</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="เลือกหมวดหมู่" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {locations.length > 0 && (
              <div className="space-y-2">
                <Label>คลังสินค้า</Label>
                <Select
                  value={locationId ?? ""}
                  onValueChange={(v) => setLocationId(v || null)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="เลือกคลังสินค้า (ไม่จำเป็น)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">ไม่ระบุคลัง</SelectItem>
                    {locations.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-5 rounded-lg text-xs">
                <div className="rounded-md bg-muted/40 p-2">
                  <p className="text-muted-foreground">กำไรต่อชิ้น</p>
                  <p
                    className={`font-medium ${priceDiff >= 0 ? "text-emerald-600" : "text-red-500"}`}
                  >
                    {hasValidPricing ? priceDiff.toFixed(2) : "-"}
                  </p>
                </div>
                <div className="rounded-md bg-muted/40 p-2">
                  <p className="text-muted-foreground">Margin</p>
                  <p className="font-medium">
                    {marginPercent === null
                      ? "-"
                      : `${marginPercent.toFixed(1)}%`}
                  </p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={`${mode}-product-cost-price`}>ราคาทุน</Label>
                <Input
                  id={`${mode}-product-cost-price`}
                  min={0}
                  step="0.01"
                  type="number"
                  value={costPrice}
                  onChange={(event) => setCostPrice(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${mode}-product-selling-price`}>ราคาขาย</Label>
                <Input
                  id={`${mode}-product-selling-price`}
                  min={0}
                  step="0.01"
                  type="number"
                  value={sellingPrice}
                  onChange={(event) => setSellingPrice(event.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={`${mode}-product-reorder-point`}>
                  จุดสั่งซื้อใหม่
                </Label>
                <Input
                  id={`${mode}-product-reorder-point`}
                  min={0}
                  step="1"
                  type="number"
                  value={reorderPoint}
                  onChange={(event) => setReorderPoint(event.target.value)}
                />
                <p className="text-[0.75rem] text-muted-foreground">
                  แจ้งเตือนเมื่อสต็อกต่ำกว่าค่านี้
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${mode}-product-image`}>รูปภาพสินค้า</Label>
              {imagePreviewUrl ? (
                <div className="flex items-center gap-3 rounded-xl border bg-muted/10 p-3">
                  <Image
                    alt="ตัวอย่างรูปสินค้า"
                    className="aspect-square size-16 rounded-lg object-cover ring-1 ring-border"
                    height={64}
                    src={imagePreviewUrl}
                    unoptimized
                    width={64}
                  />
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-sm font-medium">อัปโหลดรูปสำเร็จ</p>
                    <p className="text-xs text-muted-foreground">
                      สัดส่วน 1:1 ขนาด 128x128 px
                    </p>
                  </div>
                  <Button
                    onClick={handleRemoveImage}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ) : (
                <label
                  className="group flex cursor-pointer items-center gap-3 rounded-xl border bg-muted/10 p-3 transition-colors hover:border-primary/40 hover:bg-muted/30"
                  htmlFor={`${mode}-product-image`}
                >
                  <div className="flex size-12 items-center justify-center rounded-lg bg-background shadow-xs">
                    <ImagePlus className="size-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">อัปโหลดรูปสินค้า</p>
                    <p className="text-xs text-muted-foreground">
                      เลือกรูปหรือวางจากคลิปบอร์ด (Ctrl+V)
                    </p>
                  </div>
                </label>
              )}
              <Input
                accept="image/*"
                className="hidden"
                id={`${mode}-product-image`}
                key={imageInputKey}
                onChange={handleImageChange}
                type="file"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${mode}-product-description`}>คำอธิบาย</Label>
              <Textarea
                className="min-h-44"
                id={`${mode}-product-description`}
                placeholder="รายละเอียดเพิ่มเติม (ไม่จำเป็น)"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <Label
                className="cursor-pointer"
                htmlFor={`${mode}-product-active`}
              >
                เปิดใช้งานสินค้า
              </Label>
              <Switch
                checked={isActive}
                id={`${mode}-product-active`}
                onCheckedChange={setIsActive}
              />
            </div>
          </form>
        </div>
        <DialogFooter className="px-6 pb-6 pt-2">
          <DialogClose render={
            <Button disabled={isSubmitting} variant="outline">
              ยกเลิก
            </Button>
          } />
          <Button disabled={!canSubmit} form={formId} type="submit">
            {submitText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <BarcodeScannerDialog
      open={scannerOpen}
      onOpenChange={setScannerOpen}
      scanMode="single"
      onScan={(barcode) => {
        setSku(barcode);
        setScannerOpen(false);
      }}
    />
  </>
  );
}
