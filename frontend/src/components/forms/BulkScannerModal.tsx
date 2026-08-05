/**
 * BulkScannerModal
 * ----------------
 * 1. กรอก / สแกน Barcode หรือ SKU ที่ input บนสุด
 *    → มี autocomplete dropdown แสดงสินค้าที่ตรงกัน (ชื่อ + SKU)
 * 2. ถ้าเจอสินค้าในสต๊อก → เพิ่มเข้า Table (สแกนซ้ำ = +1)
 * 3. ถ้าไม่เจอ → เปิด ProductFormModal (Create mode) พร้อม SKU pre-fill
 * 4. กด "ยืนยัน" → dispatch createMovement สำหรับทุก Row ใน Table
 */

"use client";

import {
  Barcode,
  ChevronRight,
  Loader2,
  Minus,
  Package,
  PackageCheck,
  Plus,
  ScanLine,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ProductFormModal } from "@/components/forms/ProductFormModal";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchProducts } from "@/features/productsSlice";
import { createMovement } from "@/features/stockMovementsSlice";
import { cn } from "@/lib/utils";
import { createProductService } from "@/services/inventory/product.service";
import { useAppDispatch, useAppSelector } from "@/store/hook";
import type { CreateProductPayload, Product } from "@/types/products";
import { useGlobalScanner } from "@/hooks/useGlobalScanner";

/* ── Types ── */
type ScanRow = {
  product: Product;
  delta: number;
};

type BulkScannerModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/* ── Component ── */
export function BulkScannerModal({
  open,
  onOpenChange,
}: BulkScannerModalProps) {
  const dispatch = useAppDispatch();
  const products = useAppSelector((s) => s.products.items);
  const categories = useAppSelector((s) => s.categories.items);

  const [scanInput, setScanInput] = useState("");
  const [rows, setRows] = useState<ScanRow[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);

  // Product form (for new item discovered)
  const [productFormOpen, setProductFormOpen] = useState(false);
  const [prefillSku, setPrefillSku] = useState("");

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Auto-focus + reset when modal opens
  useEffect(() => {
    if (open) {
      setScanInput("");
      setRows([]);
      setDropdownOpen(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Re-focus after product form closes
  useEffect(() => {
    if (!productFormOpen && open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [productFormOpen, open]);

  /* ── Autocomplete suggestions ── */
  const suggestions = useMemo(() => {
    const q = scanInput.trim().toLowerCase();
    if (!q) return [];
    return products
      .filter(
        (p) =>
          p.sku.toLowerCase().includes(q) || p.name.toLowerCase().includes(q),
      )
      .slice(0, 8); // max 8 results
  }, [scanInput, products]);

  // Sync dropdown visibility
  useEffect(() => {
    setDropdownOpen(suggestions.length > 0 && scanInput.trim().length > 0);
    setHighlightIdx(-1);
  }, [suggestions, scanInput]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* ── Core: add product to table ── */
  const addProductToTable = useCallback((product: Product) => {
    setRows((prev) => {
      const idx = prev.findIndex((r) => r.product.id === product.id);
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = { ...next[idx], delta: next[idx].delta + 1 };
        return next;
      }
      return [...prev, { product, delta: 1 }];
    });
    setScanInput("");
    setDropdownOpen(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  /* ── Lookup / submit on Enter or scan ── */
  const processSku = useCallback(
    (rawSku: string) => {
      const sku = rawSku.trim();
      if (!sku) return;

      const found = products.find(
        (p) => p.sku.toLowerCase() === sku.toLowerCase(),
      );

      if (found) {
        addProductToTable(found);
      } else {
        // Unknown SKU → open create form with SKU pre-filled
        setPrefillSku(sku);
        setProductFormOpen(true);
        setScanInput("");
        setDropdownOpen(false);
      }
    },
    [products, addProductToTable],
  );

  /* ── Global Scanner integration ── */
  useGlobalScanner((barcode) => {
    if (open && !productFormOpen) {
      setScanInput(barcode);
      setTimeout(() => processSku(barcode), 50);
    }
  });

  /* ── Keyboard navigation for dropdown ── */
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (dropdownOpen) {
        setHighlightIdx((i) => Math.min(i + 1, suggestions.length - 1));
      }
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIdx((i) => Math.max(i - 1, -1));
      return;
    }
    if (e.key === "Escape") {
      setDropdownOpen(false);
      setHighlightIdx(-1);
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (dropdownOpen && highlightIdx >= 0 && suggestions[highlightIdx]) {
        addProductToTable(suggestions[highlightIdx]);
      } else {
        processSku(scanInput);
      }
    }
  };

  /* ── After creating a new product, add it to table ── */
  const handleCreateProduct = async (
    payload: CreateProductPayload,
  ): Promise<boolean> => {
    try {
      await createProductService(dispatch, payload);

      // Refresh products list to pick up the new product
      const newProducts = await dispatch(fetchProducts())
        .unwrap()
        .catch(() => products);
      const createdArr = Array.isArray(newProducts) ? newProducts : products;
      const created = createdArr.find(
        (p: Product) => p.sku.toLowerCase() === payload.sku.toLowerCase(),
      );
      if (created) {
        setRows((prev) => [...prev, { product: created, delta: 1 }]);
      }
      setProductFormOpen(false);
      return true;
    } catch {
      return false;
    }
  };

  /* ── Row controls ── */
  const updateDelta = (productId: string, delta: number) => {
    setRows((prev) =>
      prev.map((r) => (r.product.id === productId ? { ...r, delta } : r)),
    );
  };

  const removeRow = (productId: string) => {
    setRows((prev) => prev.filter((r) => r.product.id !== productId));
  };

  /* ── Confirm all ── */
  const handleConfirm = async () => {
    if (rows.length === 0) {
      toast.error("ไม่มีรายการสินค้าในรายการ");
      return;
    }
    setIsSubmitting(true);
    try {
      const results = await Promise.allSettled(
        rows.map((row) =>
          dispatch(
            createMovement({
              productId: row.product.id,
              delta: row.delta,
              reason: row.delta > 0 ? "รับสินค้าเข้าคลัง" : "จ่ายสินค้าออก",
            }),
          ).unwrap(),
        ),
      );
      const failed = results.filter(
        (r): r is PromiseRejectedResult => r.status === "rejected",
      );
      const succeeded = results.filter(
        (r): r is PromiseFulfilledResult<any> => r.status === "fulfilled",
      );
      if (succeeded.length > 0)
        toast.success(`ปรับสต๊อกสำเร็จ ${succeeded.length} รายการ`);
      if (failed.length > 0) {
        failed.forEach((f) => {
          const errMsg =
            typeof f.reason === "string" ? f.reason : "ปรับสต๊อกไม่สำเร็จ";
          toast.error(errMsg, { duration: 6000 });
        });
      }
      // Refresh products stock before closing modal
      await dispatch(fetchProducts())
        .unwrap()
        .catch(() => {});

      if (failed.length === 0) {
        onOpenChange(false);
        setRows([]);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const categoryOptions = categories.map((c) => ({ id: c.id, name: c.name }));
  const totalItems = rows.reduce((s, r) => s + Math.abs(r.delta), 0);

  /* ── highlight helper ── */
  const highlight = (text: string, query: string) => {
    const q = query.trim().toLowerCase();
    if (!q) return text;
    const idx = text.toLowerCase().indexOf(q);
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark className="bg-primary/20 text-primary rounded-[2px] px-px">
          {text.slice(idx, idx + q.length)}
        </mark>
        {text.slice(idx + q.length)}
      </>
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          showCloseButton={false}
          className="flex max-h-[90vh] w-full max-w-2xl flex-col gap-0 p-0 overflow-hidden"
        >
          {/* Header */}
          <DialogHeader className="flex-row items-center justify-between border-b border-border/50 px-6 py-4 space-y-0">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg border border-border bg-muted/40 text-muted-foreground">
                <Barcode className="size-4.5" />
              </div>
              <div>
                <DialogTitle className="text-base">
                  สแกนสินค้าเข้า/ออกคลัง
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  สแกน Barcode · พิมพ์ SKU · หรือค้นหาชื่อสินค้า
                </p>
              </div>
            </div>
            <DialogClose
              render={
                <button
                  className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  aria-label="ปิด"
                >
                  <X className="size-4" />
                </button>
              }
            />
          </DialogHeader>

          {/* Scanner input + autocomplete */}
          <div className="border-b border-border/50 px-6 py-4">
            <div ref={wrapperRef} className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none z-10" />
              <Input
                ref={inputRef}
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                onKeyDown={handleInputKeyDown}
                onFocus={() => {
                  if (suggestions.length > 0) setDropdownOpen(true);
                }}
                placeholder="สแกน Barcode, พิมพ์ SKU หรือชื่อสินค้า…"
                className="pl-9 pr-28 h-11 text-sm bg-muted/30 border-border/70 focus:bg-background"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
              />
              <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex gap-1">
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-8 px-3 text-xs"
                  onClick={() => processSku(scanInput)}
                  disabled={!scanInput.trim()}
                >
                  เพิ่ม
                  <ChevronRight className="size-3.5 ml-1" />
                </Button>
              </div>

              {/* Autocomplete Dropdown */}
              {dropdownOpen && (
                <div
                  ref={dropdownRef}
                  className="absolute top-full left-0 right-0 z-50 mt-1 overflow-hidden rounded-lg border border-border bg-popover shadow-lg"
                >
                  {suggestions.map((p, i) => {
                    const alreadyInTable = rows.some(
                      (r) => r.product.id === p.id,
                    );
                    return (
                      <button
                        key={p.id}
                        type="button"
                        className={cn(
                          "flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors",
                          "hover:bg-accent",
                          i === highlightIdx && "bg-accent",
                          "focus-visible:outline-none",
                        )}
                        onMouseDown={(e) => {
                          e.preventDefault(); // prevent input blur
                          addProductToTable(p);
                        }}
                        onMouseEnter={() => setHighlightIdx(i)}
                      >
                        {/* Icon */}
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border/50 bg-muted/50 text-muted-foreground">
                          <Package className="size-3.5" />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium leading-tight line-clamp-1">
                            {highlight(p.name, scanInput)}
                          </p>
                          <p className="text-xs text-muted-foreground font-mono mt-0.5">
                            {highlight(p.sku, scanInput)}
                            <span className="ml-2 font-sans not-mono opacity-70">
                              · สต๊อก {p.stockOnHand} ชิ้น
                            </span>
                          </p>
                        </div>

                        {/* Badge if already in table */}
                        {alreadyInTable && (
                          <span className="shrink-0 text-[10px] font-medium text-primary bg-primary/10 rounded-full px-2 py-0.5">
                            ในรายการ
                          </span>
                        )}
                      </button>
                    );
                  })}

                  {/* Footer hint */}
                  <div className="border-t border-border/50 px-3 py-2 flex items-center gap-3 bg-muted/30">
                    <span className="text-[10px] text-muted-foreground/70">
                      ↑↓ เลือก · Enter เพิ่ม · Esc ปิด
                    </span>
                    {suggestions.length <
                      products.filter(
                        (p) =>
                          p.sku
                            .toLowerCase()
                            .includes(scanInput.trim().toLowerCase()) ||
                          p.name
                            .toLowerCase()
                            .includes(scanInput.trim().toLowerCase()),
                      ).length && (
                      <span className="text-[10px] text-muted-foreground/50 ml-auto">
                        แสดง {suggestions.length} จาก...
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-y-auto px-6 py-2 min-h-0">
            {rows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <PackageCheck className="size-12 text-muted-foreground/30 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">
                  ยังไม่มีสินค้าในรายการ
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  สแกน Barcode หรือพิมพ์ค้นหาด้านบนเพื่อเริ่ม
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead className="text-xs font-medium">สินค้า</TableHead>
                    <TableHead className="text-xs font-medium w-28">
                      SKU
                    </TableHead>
                    <TableHead className="text-xs font-medium text-center w-36">
                      จำนวน
                    </TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.product.id} className="border-border/50">
                      <TableCell>
                        <div className="space-y-0.5">
                          <p className="text-sm font-medium leading-tight line-clamp-1">
                            {row.product.name}
                          </p>
                          <p className="text-xs text-muted-foreground/70">
                            มีในสต๊อก {row.product.stockOnHand} ชิ้น
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted/50 rounded px-1.5 py-0.5 font-mono">
                          {row.product.sku}
                        </code>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="outline"
                            size="icon"
                            className="size-7 border-border/60"
                            onClick={() =>
                              updateDelta(row.product.id, row.delta - 1)
                            }
                          >
                            <Minus className="size-3" />
                          </Button>
                          <Input
                            type="number"
                            value={row.delta}
                            onChange={(e) =>
                              updateDelta(
                                row.product.id,
                                Number(e.target.value),
                              )
                            }
                            className="w-14 h-7 text-center text-sm px-1 font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            className="size-7 border-border/60"
                            onClick={() =>
                              updateDelta(row.product.id, row.delta + 1)
                            }
                          >
                            <Plus className="size-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-muted-foreground hover:text-destructive"
                          onClick={() => removeRow(row.product.id)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-border/50 px-6 py-4 flex items-center justify-between bg-muted/20">
            <div className="text-sm text-muted-foreground">
              {rows.length > 0 ? (
                <span>
                  <strong className="text-foreground font-semibold">
                    {rows.length}
                  </strong>{" "}
                  ชนิด ·{" "}
                  <strong className="text-foreground font-semibold">
                    {totalItems}
                  </strong>{" "}
                  ชิ้น
                </span>
              ) : (
                <span>ยังไม่มีรายการ</span>
              )}
            </div>
            <div className="flex gap-2">
              <DialogClose
                render={
                  <Button variant="outline" size="sm">
                    ยกเลิก
                  </Button>
                }
              />
              <Button
                size="sm"
                onClick={handleConfirm}
                disabled={rows.length === 0 || isSubmitting}
                className="gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    กำลังบันทึก…
                  </>
                ) : (
                  <>
                    <PackageCheck className="size-3.5" />
                    ยืนยัน ({rows.length})
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create product form — opens when SKU not found */}
      <ProductFormModal
        mode="create"
        open={productFormOpen}
        categories={categoryOptions}
        onOpenChange={setProductFormOpen}
        onSubmit={handleCreateProduct}
        initialValues={{
          sku: prefillSku,
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
        }}
        triggerLabel=""
      />
    </>
  );
}
