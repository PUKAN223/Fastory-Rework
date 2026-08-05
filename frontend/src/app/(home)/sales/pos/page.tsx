"use client";

import {
  ArrowRight,
  Banknote,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  QrCode,
  Scan,
  Search,
  ShoppingBag,
  ShoppingCart,
  Trash2,
  Wallet,
  Clock,
  MonitorPlay,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { BarcodeScannerDialog } from "@/components/ui/BarcodeScannerDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchCategories } from "@/features/categoriesSlice";
import { fetchImages } from "@/features/imageSlice";
import { fetchProducts } from "@/features/productsSlice";
import {
  addToCart,
  checkout,
  clearCart,
  removeFromCart,
  setAmountReceived,
  setPaymentMethod,
  updateQuantity,
  voidOrder,
} from "@/features/salesSlice";
import { formatImageSrc } from "@/lib/formatImageSrc";
import { useAppDispatch, useAppSelector } from "@/store/hook";
import type { Product } from "@/types/products";

function ProductCardImage({ src, name }: { src?: string; name: string }) {
  const [error, setError] = useState(false);

  if (!src || error) {
    return <ShoppingBag className="size-10 text-muted-foreground/30" />;
  }

  return (
    <img
      src={formatImageSrc(src)}
      alt={name}
      className="object-cover w-full h-full"
      onError={() => setError(true)}
    />
  );
}

export default function POSPage() {
  const dispatch = useAppDispatch();
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // State from Redux
  const products = useAppSelector((state) => state.products.items);
  const categories = useAppSelector((state) => state.categories.items);
  const images = useAppSelector((state) => state.images.items);
  const cartItems = useAppSelector((state) => state.sales.cartItems);
  const paymentMethod = useAppSelector((state) => state.sales.paymentMethod);
  const amountReceived = useAppSelector((state) => state.sales.amountReceived);
  const discount = useAppSelector((state) => state.sales.discount);
  const checkoutStatus = useAppSelector((state) => state.sales.checkoutStatus);
  const note = useAppSelector((state) => state.sales.note);

  // Build image URL lookup map (same pattern as products page)
  const imageUrlById = useMemo(
    () =>
      images.reduce<Record<string, string>>((acc, img) => {
        acc[img.id] = img.url;
        return acc;
      }, {}),
    [images],
  );

  // Local UI State
  const [barcodeInput, setBarcodeInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showCheckoutDialog, setShowCheckoutDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showPromptpayDialog, setShowPromptpayDialog] = useState(false);
  const [promptpayPayload, setPromptpayPayload] = useState("");
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes countdown
  const [lastOrder, setLastOrder] = useState<any>(null);
  const [isCartSheetOpen, setIsCartSheetOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // POS Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);

  useEffect(() => {
    setCurrentPage(1);
  }, []);

  useEffect(() => {
    dispatch(fetchProducts());
    dispatch(fetchCategories());
    dispatch(fetchImages());
  }, [dispatch]);

  useEffect(() => {
    if (!showCheckoutDialog && !showSuccessDialog && !showPromptpayDialog) {
      setTimeout(() => barcodeInputRef.current?.focus(), 100);
    }
  }, [showCheckoutDialog, showSuccessDialog, showPromptpayDialog]);

  // Derived state for BroadcastChannel
  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.product.sellingPrice * item.quantity,
    0,
  );
  const total = subtotal;
  
  // Sync POS state to Customer Facing Display (CFD) via Backend Sync
  useEffect(() => {
    try {
      let status = "shopping";
      if (showSuccessDialog) {
        status = "completed";
      } else if (showPromptpayDialog) {
        status = "paying";
      } else if (showCheckoutDialog && paymentMethod === "cash") {
        status = "paying";
      }

      const payload = {
        cartItems: cartItems.map((item) => ({
          ...item,
          imageUrl: item.product.imageId ? imageUrlById[item.product.imageId] : undefined,
        })),
        paymentMethod,
        amountReceived,
        discount,
        subtotal,
        total,
        status,
        promptpayPayload,
      };

      fetch("/api/sales/pos-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch((error) => console.error("Failed to sync state:", error));
    } catch (error) {
      console.error("Failed to prepare state sync:", error);
    }
  }, [
    cartItems,
    paymentMethod,
    amountReceived,
    discount,
    subtotal,
    total,
    showSuccessDialog,
    showPromptpayDialog,
    showCheckoutDialog,
    promptpayPayload,
    imageUrlById,
  ]);

  // PromptPay Polling
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (
      showPromptpayDialog &&
      lastOrder &&
      lastOrder.paymentMethod === "promptpay"
    ) {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/sales/${lastOrder.id}`);
          if (res.ok) {
            const data = await res.json();
            const orderData = data.order || data;
            if (orderData.status === "completed") {
              setShowPromptpayDialog(false);
              setShowSuccessDialog(true);
              dispatch(clearCart());
            } else if (orderData.status === "voided") {
              setShowPromptpayDialog(false);
              toast.error("ออเดอร์ถูกยกเลิกเนื่องจากหมดอายุเรียบร้อยแล้ว");
            }
          }
        } catch (e) {}
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [showPromptpayDialog, lastOrder, dispatch]);

  const handleCancelPromptpay = async (isExpired = false) => {
    if (lastOrder?.id) {
      try {
        await dispatch(voidOrder(lastOrder.id)).unwrap();
        dispatch(fetchProducts());
      } catch (e) {}
    }
    setShowPromptpayDialog(false);
    if (isExpired) {
      toast.error("QR Code หมดอายุแล้ว (5 นาที) และคืนสต็อกสินค้าเรียบร้อยแล้ว");
    } else {
      toast.info("ยกเลิกรายการชำระเงินและคืนสต็อกสินค้าเรียบร้อยแล้ว");
    }
  };

  // 5-Minute Timer Countdown
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showPromptpayDialog && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (showPromptpayDialog && timeLeft === 0) {
      handleCancelPromptpay(true);
    }
    return () => clearInterval(timer);
  }, [showPromptpayDialog, timeLeft]);

  const processBarcode = (query: string) => {
    if (!query) return;

    const exactMatch = products.find(
      (p) => p.sku.toLowerCase() === query.toLowerCase() && p.isActive,
    );

    if (exactMatch) {
      const inCart =
        cartItems.find((i) => i.product.id === exactMatch.id)?.quantity || 0;
      if (exactMatch.stockOnHand - inCart <= 0) {
        toast.error(`สินค้า "${exactMatch.name}" หมดสต็อก`);
      } else {
        dispatch(addToCart(exactMatch));
        toast.success(`เพิ่ม "${exactMatch.name}" แล้ว`);
        setBarcodeInput("");
        setSearchQuery("");
      }
    } else {
      setSearchQuery(query);
      toast.info(`ไม่พบ SKU "${query}" ตรงเป๊ะ กำลังค้นหา...`);
    }
  };

  // Handle Barcode Scan / Enter Key Submit
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    processBarcode(barcodeInput.trim());
  };

  const filteredProducts = useMemo(() => {
    const activeSearch = searchQuery || barcodeInput;
    return products
      .filter((p) => {
        const matchSearch =
          !activeSearch ||
          p.name.toLowerCase().includes(activeSearch.toLowerCase()) ||
          p.sku.toLowerCase().includes(activeSearch.toLowerCase());
        const matchCategory =
          selectedCategory === "all" || p.categoryId === selectedCategory;
        return matchSearch && matchCategory && p.isActive;
      })
      .sort((a, b) => {
        const aHasStock = a.stockOnHand > 0 ? 1 : 0;
        const bHasStock = b.stockOnHand > 0 ? 1 : 0;
        if (aHasStock !== bHasStock) {
          return bHasStock - aHasStock;
        }
        return 0;
      });
  }, [products, searchQuery, barcodeInput, selectedCategory]);

  const totalItems = filteredProducts.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedProducts = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * pageSize;
    return filteredProducts.slice(startIndex, startIndex + pageSize);
  }, [filteredProducts, safeCurrentPage, pageSize]);

  const change =
    paymentMethod === "cash" ? Math.max(0, amountReceived - total) : 0;

  const canCheckout =
    cartItems.length > 0 &&
    (paymentMethod === "promptpay" ||
      (paymentMethod === "cash" && amountReceived >= total));

  const handleProductClick = (product: Product) => {
    const inCart =
      cartItems.find((i) => i.product.id === product.id)?.quantity || 0;
    if (product.stockOnHand - inCart <= 0) {
      toast.error("สินค้าหมดสต็อก");
      return;
    }
    dispatch(addToCart(product));
    barcodeInputRef.current?.focus();
  };

  const handleCheckout = async () => {
    if (!canCheckout) return;
    try {
      const resultAction = await dispatch(
        checkout({
          items: cartItems.map((item) => ({
            productId: Number(item.product.id),
            quantity: item.quantity,
          })),
          paymentMethod,
          amountReceived: paymentMethod === "cash" ? amountReceived : undefined,
          note,
        }),
      ).unwrap();

      setLastOrder(resultAction);
      setShowCheckoutDialog(false);

      if (resultAction.paymentMethod === "promptpay") {
        setPromptpayPayload(resultAction.promptpayPayload || "");
        setTimeLeft(300); // Reset timer to 5 mins
        setShowPromptpayDialog(true);
      } else {
        setShowSuccessDialog(true);
        dispatch(clearCart());
      }

      dispatch(fetchProducts());
    } catch (error: any) {
      toast.error(error || "ชำระเงินไม่สำเร็จ");
    }
  };

  const cartBodyAndFooter = (
    <>
      {/* Cart Items */}
      <ScrollArea className="flex-1">
        {cartItems.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground py-16">
            <div className="size-16 rounded-full bg-muted/50 flex items-center justify-center mb-3">
              <Scan className="size-7 opacity-30" />
            </div>
            <p className="font-medium text-sm">ตะกร้าว่างเปล่า</p>
            <p className="text-xs mt-1 text-muted-foreground/70">
              สแกนสินค้าหรือคลิกเพื่อเพิ่ม
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2 p-3">
            {cartItems.map((item) => (
              <div
                key={item.product.id}
                className="flex flex-col gap-2 rounded-lg border p-3 bg-background"
              >
                <div className="flex justify-between items-start gap-2.5">
                  <div className="size-10 rounded-md bg-muted/40 overflow-hidden shrink-0 flex items-center justify-center border">
                    <ProductCardImage
                      src={
                        item.product.imageId
                          ? imageUrlById[item.product.imageId]
                          : undefined
                      }
                      name={item.product.name}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-medium text-sm leading-tight truncate">
                      {item.product.name}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      ฿{item.product.sellingPrice.toLocaleString()} ×{" "}
                      {item.quantity}
                    </p>
                  </div>
                  <span className="font-semibold text-sm shrink-0">
                    ฿
                    {(
                      item.product.sellingPrice * item.quantity
                    ).toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center border rounded-md h-7 overflow-hidden">
                    <button
                      className="px-2 h-full hover:bg-muted text-muted-foreground"
                      onClick={() => {
                        if (item.quantity > 1) {
                          dispatch(
                            updateQuantity({
                              productId: item.product.id,
                              quantity: item.quantity - 1,
                            }),
                          );
                        } else {
                          dispatch(removeFromCart(item.product.id));
                        }
                      }}
                    >
                      <Minus className="size-3" />
                    </button>
                    <div className="px-3 text-sm font-medium border-x h-full flex items-center justify-center min-w-9">
                      {item.quantity}
                    </div>
                    <button
                      className="px-2 h-full hover:bg-muted text-muted-foreground"
                      onClick={() =>
                        dispatch(
                          updateQuantity({
                            productId: item.product.id,
                            quantity: item.quantity + 1,
                          }),
                        )
                      }
                    >
                      <Plus className="size-3" />
                    </button>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => dispatch(removeFromCart(item.product.id))}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Cart Footer / Totals */}
      <div className="border-t p-4 bg-muted/10 flex flex-col gap-3 shrink-0">
        <div className="flex flex-col gap-1.5 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>
              ยอดรวม ({cartItems.reduce((n, i) => n + i.quantity, 0)} ชิ้น)
            </span>
            <span>฿{subtotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between font-bold text-lg pt-2 border-t">
            <span>รวมทั้งสิ้น</span>
            <span className="text-primary">฿{total.toLocaleString()}</span>
          </div>
        </div>

        <Button
          className="w-full h-11 text-base font-semibold"
          disabled={cartItems.length === 0}
          onClick={() => {
            setIsCartSheetOpen(false);
            // Delay slightly to prevent Radix UI pointer-events lock conflict on mobile
            setTimeout(() => setShowCheckoutDialog(true), 150);
          }}
        >
          ชำระเงิน <ArrowRight className="ml-2 size-5" />
        </Button>
      </div>
    </>
  );

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100svh-5.5rem)] w-full gap-3 overflow-hidden">
      {/* Left Column: Products Grid & Bottom Floating Search Dock */}
      <div className="relative flex flex-1 flex-col gap-3 overflow-hidden rounded-xl border bg-card p-3 lg:p-4 shadow-sm h-full">
        {/* Top Barcode Scan Row (Original Position) */}
        <div className="flex flex-row items-center gap-3 rounded-xl border bg-muted/30 p-3">
          <form onSubmit={handleBarcodeSubmit} className="relative flex-1">
            <Scan className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-primary" />
            <Input
              ref={barcodeInputRef}
              type="text"
              placeholder="สแกนบาร์โค้ด / พิมพ์ SKU แล้วกด Enter..."
              className="pl-10 h-10 bg-background border-primary/40 focus-visible:ring-primary"
              value={barcodeInput}
              onChange={(e) => {
                setBarcodeInput(e.target.value);
                setSearchQuery(e.target.value);
              }}
              autoFocus
            />
            {barcodeInput && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-7 text-xs text-muted-foreground px-2"
                onClick={() => {
                  setBarcodeInput("");
                  setSearchQuery("");
                  barcodeInputRef.current?.focus();
                }}
              >
                ล้าง
              </Button>
            )}
          </form>
          <Button
            variant="outline"
            className="shrink-0 gap-2 bg-primary/10 hover:bg-primary/20 text-primary border-primary/20"
            onClick={() => setIsScannerOpen(true)}
          >
            <QrCode className="size-4" />
            สแกนกล้อง
          </Button>
          <Button
            variant="outline"
            className="shrink-0 gap-2 text-primary"
            onClick={() => window.open("/sales/pos/display", "_blank", "width=1024,height=768")}
          >
            <MonitorPlay className="size-4" />
            เปิดจอลูกค้า
          </Button>
        </div>

        {/* Header Label Row */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              สินค้าพร้อมขาย ({totalItems.toLocaleString()})
            </span>
            {totalItems > 0 && (
              <Badge variant="outline" className="text-[10px]">
                หน้า {safeCurrentPage} / {totalPages}
              </Badge>
            )}
          </div>
          {(searchQuery || barcodeInput || selectedCategory !== "all") && (
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-xs text-primary"
              onClick={() => {
                setSearchQuery("");
                setBarcodeInput("");
                setSelectedCategory("all");
              }}
            >
              รีเซ็ตการกรอง
            </Button>
          )}
        </div>

        {/* Product Grid */}
        <ScrollArea className="flex-1 -mx-1 px-1">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 pb-20 p-1">
            {paginatedProducts.map((p) => {
              const inCart =
                cartItems.find((i) => i.product.id === p.id)?.quantity || 0;
              const remaining = p.stockOnHand - inCart;
              const outOfStock = remaining <= 0;

              return (
                <Card
                  key={p.id}
                  className={`cursor-pointer transition-all hover:ring-2 hover:ring-primary/60 hover:shadow-md ${
                    outOfStock ? "opacity-50 grayscale pointer-events-none" : ""
                  }`}
                  onClick={() => !outOfStock && handleProductClick(p)}
                >
                  <div className="aspect-square bg-muted/40 flex items-center justify-center relative overflow-hidden">
                    <ProductCardImage
                      src={p.imageId ? imageUrlById[p.imageId] : undefined}
                      name={p.name}
                    />
                    {outOfStock && (
                      <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
                        <Badge variant="destructive" className="text-xs">
                          หมดสต็อก
                        </Badge>
                      </div>
                    )}
                    {inCart > 0 && !outOfStock && (
                      <div className="absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground font-bold shadow">
                        {inCart}
                      </div>
                    )}
                  </div>
                  <CardContent className="p-2.5">
                    <h3
                      className="font-medium text-xs line-clamp-2 leading-snug"
                      title={p.name}
                    >
                      {p.name}
                    </h3>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {p.sku}
                    </p>
                    <div className="mt-1.5 flex items-center justify-between">
                      <span className="font-bold text-sm text-primary">
                        ฿{p.sellingPrice.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        เหลือ {remaining}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {filteredProducts.length === 0 && (
              <div className="col-span-full py-16 text-center text-muted-foreground">
                <Search className="size-10 mx-auto mb-3 opacity-20" />
                <p className="font-medium text-sm">ไม่พบสินค้า</p>
                <p className="text-xs mt-1">ลองค้นหาด้วยคำอื่น หรือล้างตัวกรอง</p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* FLOATING BOTTOM CENTER SEARCH & FILTER DOCK */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 flex max-w-[95%] items-center gap-2 rounded-full border border-border/80 bg-background/95 p-2 shadow-2xl backdrop-blur supports-backdrop-filter:bg-background/85">
          {/* Search Query Input */}
          <div className="relative flex items-center flex-1 min-w-[100px]">
            <Search className="absolute left-3 size-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="ค้นหาชื่อสินค้า..."
              className="h-9 w-full pl-9 pr-7 rounded-full bg-muted/40 border-muted text-xs focus-visible:ring-primary"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="absolute right-2.5 text-muted-foreground hover:text-foreground text-xs font-bold"
                onClick={() => setSearchQuery("")}
              >
                ✕
              </button>
            )}
          </div>

          {/* Category Filter Dropdown */}
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="h-9 w-24 sm:w-36 lg:w-28 xl:w-40 rounded-full border-muted bg-muted/40 text-xs shrink-0">
              <SelectValue placeholder="หมวดหมู่" />
            </SelectTrigger>
            <SelectContent align="center">
              <SelectItem value="all">หมวดหมู่ทั้งหมด</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Items Per Page Select */}
          <div className="hidden md:block lg:hidden xl:block shrink-0">
            <Select
              value={String(pageSize)}
              onValueChange={(val) => {
                setPageSize(Number(val));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="h-9 w-20 rounded-full border-muted bg-muted/40 text-xs">
                <SelectValue placeholder={`${pageSize}/หน้า`} />
              </SelectTrigger>
              <SelectContent align="center">
                <SelectItem value="12">12 / หน้า</SelectItem>
                <SelectItem value="20">20 / หน้า</SelectItem>
                <SelectItem value="40">40 / หน้า</SelectItem>
                <SelectItem value="80">80 / หน้า</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Pagination Navigation */}
          <div className="flex items-center shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-full"
              disabled={safeCurrentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              title="หน้าก่อนหน้า"
            >
              <ChevronLeft className="size-4" />
            </Button>

            <span className="text-[10px] sm:text-xs font-semibold px-1 min-w-[2rem] text-center">
              {safeCurrentPage}/{totalPages}
            </span>

            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-full"
              disabled={safeCurrentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              title="หน้าถัดไป"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Right Column: Cart */}
      <div className="hidden lg:flex w-[340px] xl:w-[400px] flex-col rounded-xl border bg-card shadow-sm overflow-hidden h-full shrink-0">
        {/* Cart Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/20 shrink-0">
          <h2 className="font-semibold flex items-center gap-2">
            <ShoppingCart className="size-4 text-primary" />
            ตะกร้าสินค้า
          </h2>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="rounded-full text-xs">
              {cartItems.length} รายการ
            </Badge>
            {cartItems.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => dispatch(clearCart())}
              >
                ล้างตะกร้า
              </Button>
            )}
          </div>
        </div>
        {cartBodyAndFooter}
      </div>

      {/* Floating Cart Button & Sheet (Mobile) */}
      <div className="lg:hidden fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] right-4 sm:right-6 z-40">
        <Sheet open={isCartSheetOpen} onOpenChange={setIsCartSheetOpen}>
          <SheetTrigger asChild>
            <Button size="icon" className="rounded-full size-16 shadow-2xl relative">
              <ShoppingCart className="size-6" />
              {cartItems.length > 0 && (
                <span className="absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full bg-destructive text-xs font-bold text-destructive-foreground border-2 border-background">
                  {cartItems.length}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[90vw] sm:max-w-md p-0 flex flex-col gap-0 border-l" showCloseButton={true}>
            <SheetHeader className="p-4 border-b text-left space-y-0">
              <SheetTitle className="flex items-center gap-2 text-base">
                <ShoppingCart className="size-5 text-primary" />
                ตะกร้าสินค้า
              </SheetTitle>
              <SheetDescription className="sr-only">
                ตะกร้าสินค้าปัจจุบัน
              </SheetDescription>
            </SheetHeader>
            <div className="flex items-center justify-between px-4 py-2 bg-muted/20 shrink-0 border-b">
              <Badge variant="secondary" className="rounded-full text-xs">
                {cartItems.length} รายการ
              </Badge>
              {cartItems.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => dispatch(clearCart())}
                >
                  ล้างตะกร้า
                </Button>
              )}
            </div>
            {cartBodyAndFooter}
          </SheetContent>
        </Sheet>
      </div>

      {/* ===================== Checkout Dialog ===================== */}
      <Dialog open={showCheckoutDialog} onOpenChange={setShowCheckoutDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ชำระเงิน</DialogTitle>
            <DialogDescription>เลือกวิธีชำระเงินและตรวจสอบยอดสุทธิ</DialogDescription>
          </DialogHeader>

          <DialogPanel>
            {/* Total Banner */}
            <div className="flex flex-col items-center justify-center py-4 px-6 mb-4 bg-primary/5 rounded-xl border border-primary/20">
              <span className="text-xs font-medium text-muted-foreground mb-1">
                ยอดที่ต้องชำระ
              </span>
              <span className="text-4xl font-black text-primary">
                ฿{total.toLocaleString()}
              </span>
            </div>

            {/* Payment Method Selection */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <button
                type="button"
                onClick={() => dispatch(setPaymentMethod("cash"))}
                className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-colors text-center ${
                  paymentMethod === "cash"
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border bg-background hover:bg-muted/50 text-muted-foreground"
                }`}
              >
                <Banknote className="size-8" />
                <span className="font-semibold text-sm">เงินสด</span>
              </button>
              <button
                type="button"
                onClick={() => dispatch(setPaymentMethod("promptpay"))}
                className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-colors text-center ${
                  paymentMethod === "promptpay"
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border bg-background hover:bg-muted/50 text-muted-foreground"
                }`}
              >
                <QrCode className="size-8" />
                <span className="font-semibold text-sm">พร้อมเพย์</span>
              </button>
            </div>

            {/* Cash Input */}
            {paymentMethod === "cash" && (
              <div className="space-y-3 p-4 bg-muted/40 rounded-xl border">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium">รับเงินมา (บาท)</label>
                  <Input
                    type="number"
                    value={amountReceived || ""}
                    onChange={(e) =>
                      dispatch(setAmountReceived(Number(e.target.value)))
                    }
                    className="text-xl font-bold h-12 text-center"
                    placeholder="0"
                    autoFocus
                  />
                </div>

                {amountReceived > 0 && (
                  <div className="flex justify-between items-center p-3 bg-background rounded-lg border">
                    <span className="text-sm text-muted-foreground">
                      เงินทอน
                    </span>
                    <span
                      className={`font-bold text-xl ${
                        change > 0
                          ? "text-green-600"
                          : amountReceived < total
                            ? "text-destructive"
                            : "text-foreground"
                      }`}
                    >
                      ฿{change.toLocaleString()}
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant="outline"
                    className="h-9 text-xs"
                    onClick={() => dispatch(setAmountReceived(total))}
                  >
                    รับพอดี
                  </Button>
                  <Button
                    variant="outline"
                    className="h-9 text-xs"
                    onClick={() =>
                      dispatch(setAmountReceived(Math.ceil(total / 100) * 100))
                    }
                  >
                    ปัดเศษ 100
                  </Button>
                  <Button
                    variant="outline"
                    className="h-9 text-xs"
                    onClick={() => dispatch(setAmountReceived(1000))}
                  >
                    ฿1,000
                  </Button>
                </div>
              </div>
            )}

            {/* PromptPay Info */}
            {paymentMethod === "promptpay" && (
              <div className="p-5 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-900 flex flex-col items-center text-center gap-3">
                <Wallet className="size-12 text-blue-500" />
                <div>
                  <h4 className="font-semibold text-blue-700 dark:text-blue-400">
                    ตรวจสอบการโอนเงิน
                  </h4>
                  <p className="text-sm text-blue-600/80 dark:text-blue-300 mt-1">
                    ให้ลูกค้าสแกน QR Code แล้วตรวจสอบสลิปยอด{" "}
                    <b className="text-blue-700 dark:text-blue-300">
                      ฿{total.toLocaleString()}
                    </b>{" "}
                    ก่อนกดยืนยัน
                  </p>
                </div>
              </div>
            )}
          </DialogPanel>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCheckoutDialog(false)}
            >
              ยกเลิก
            </Button>
            <Button
              onClick={handleCheckout}
              disabled={!canCheckout || checkoutStatus === "loading"}
              className="min-w-32"
            >
              {checkoutStatus === "loading"
                ? "กำลังบันทึก..."
                : paymentMethod === "promptpay"
                  ? "สร้าง QR Code"
                  : "ยืนยันชำระเงินสด"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===================== PromptPay Dialog ===================== */}
      <Dialog
        open={showPromptpayDialog}
        onOpenChange={(open) => {
          if (!open) {
            handleCancelPromptpay(false);
          } else {
            setShowPromptpayDialog(open);
          }
        }}
      >
        <DialogContent showCloseButton={true}>
          <DialogPanel>
            <div className="flex flex-col items-center justify-center text-center py-4">
              <QrCode className="size-10 text-primary mb-2" />
              <DialogTitle className="text-xl mb-1">สแกนเพื่อชำระเงิน</DialogTitle>

              {/* Countdown Timer Badge */}
              <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900 rounded-full text-xs font-medium mb-3">
                <Clock className="size-3.5 animate-pulse" />
                <span>
                  QR Code หมดอายุใน{" "}
                  {String(Math.floor(timeLeft / 60)).padStart(2, "0")}:
                  {String(timeLeft % 60).padStart(2, "0")} นาที
                </span>
              </div>

              {promptpayPayload ? (
                <div className="bg-white p-4 rounded-xl border-2 border-primary/20 shadow-sm mb-3">
                  <QRCodeSVG
                    value={promptpayPayload}
                    size={220}
                    level="H"
                    imageSettings={{
                      src: "/logo-dark.png",
                      x: undefined,
                      y: undefined,
                      height: 42,
                      width: 42,
                      excavate: true,
                    }}
                  />
                </div>
              ) : (
                <p className="text-destructive mb-4">
                  ไม่สามารถสร้าง QR Code ได้ (กรุณาตั้งค่า PromptPay ในหน้าตั้งค่า)
                </p>
              )}
              <p className="text-muted-foreground text-sm mb-4">
                ยอดที่ต้องชำระ:{" "}
                <b>
                  ฿
                  {Number(
                    lastOrder?.promptpayAmount || lastOrder?.total,
                  ).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </b>
              </p>
              <div className="flex w-full gap-2 mt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleCancelPromptpay(false)}
                >
                  ยกเลิก
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => {
                    setShowPromptpayDialog(false);
                    setShowSuccessDialog(true);
                    dispatch(clearCart());
                  }}
                >
                  ข้ามการตรวจสอบ
                </Button>
              </div>
            </div>
          </DialogPanel>
        </DialogContent>
      </Dialog>

      {/* ===================== Success Dialog ===================== */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent showCloseButton={false}>
          <DialogPanel>
            <div className="flex flex-col items-center justify-center text-center py-4">
              <CheckCircle2 className="size-20 text-green-500 mb-4" />
              <DialogTitle className="text-2xl mb-1">
                ทำรายการสำเร็จ!
              </DialogTitle>
              <p className="text-muted-foreground text-sm mb-5">
                เลขออเดอร์: <b>{lastOrder?.orderNumber}</b>
              </p>

              <div className="w-full space-y-2.5 p-4 bg-muted/40 rounded-xl border text-left mb-5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">ยอดรวม</span>
                  <span className="font-medium">
                    ฿{Number(lastOrder?.total ?? 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">ชำระด้วย</span>
                  <span className="font-medium">
                    {lastOrder?.paymentMethod === "cash"
                      ? "เงินสด"
                      : "PromptPay"}
                  </span>
                </div>
                {lastOrder?.paymentMethod === "cash" && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">รับเงินมา</span>
                      <span className="font-medium">
                        ฿
                        {Number(
                          lastOrder?.amountReceived ?? 0,
                        ).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between pt-2 border-t">
                      <span className="font-semibold">เงินทอน</span>
                      <span className="font-bold text-xl text-green-600">
                        ฿{Number(lastOrder?.changeAmount ?? 0).toLocaleString()}
                      </span>
                    </div>
                  </>
                )}
              </div>

              <Button
                className="w-full"
                onClick={() => setShowSuccessDialog(false)}
              >
                กลับขายสินค้าต่อ
              </Button>
            </div>
          </DialogPanel>
        </DialogContent>
      </Dialog>

      <BarcodeScannerDialog
        open={isScannerOpen}
        onOpenChange={setIsScannerOpen}
        scanMode="multi"
        onScan={(barcode) => {
          setBarcodeInput(barcode);
          setTimeout(() => processBarcode(barcode), 50);
        }}
      />
    </div>
  );
}

function _ShoppingBagIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
      <path d="M3 6h18" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}
