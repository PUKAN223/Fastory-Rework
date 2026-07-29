"use client";

import { HelpCircle, Loader } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createStore,
  type Store,
  setActiveStore,
  updateStore,
} from "@/features/storeSlice";
import { storeIconList } from "@/lib/storeIcons";
import { cn } from "@/lib/utils";
import { useAppDispatch } from "@/store/hook";

export function CreateStoreSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [selectedIcon, setSelectedIcon] = React.useState("store");

  const reset = () => {
    setName("");
    setDescription("");
    setSelectedIcon("store");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      const generatedSlug = `store-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const newStore = await dispatch(
        createStore({
          name: name.trim(),
          slug: generatedSlug,
          ...(description.trim() ? { description: description.trim() } : {}),
          icon: selectedIcon,
        }),
      ).unwrap();

      if (newStore?.id) {
        dispatch(setActiveStore(newStore.id));
      }

      toast.success("สร้างร้านค้าสำเร็จ");
      reset();
      onOpenChange(false);
      router.push("/dashboard");
    } catch (error) {
      const message = typeof error === "string" ? error : "ไม่สามารถสร้างร้านค้าได้";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const SelectedIconComponent = React.useMemo(() => {
    const matched = storeIconList.find((item) => item.key === selectedIcon);
    return matched ? matched.icon : HelpCircle;
  }, [selectedIcon]);

  return (
    <Drawer
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
      direction="right"
    >
      <DrawerContent className="h-full border-l sm:max-w-md">
        <DrawerHeader className="border-b border-border/50 pb-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 flex size-11 items-center justify-center rounded-xl border border-primary/20 text-primary">
              <SelectedIconComponent className="size-5" />
            </div>
            <div>
              <DrawerTitle className="text-base font-semibold">
                สร้างร้านค้าใหม่
              </DrawerTitle>
              <DrawerDescription className="text-xs">
                ตั้งค่าข้อมูลร้านค้าของเพื่อเริ่มต้นใช้งานระบบ
              </DrawerDescription>
            </div>
          </div>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto p-5">
          <form
            id="create-store-drawer-form"
            onSubmit={handleSubmit}
            className="space-y-5"
          >
            {/* Store Name */}
            <div className="space-y-1.5">
              <Label htmlFor="store-name" className="text-xs font-semibold">
                ชื่อร้านค้า <span className="text-destructive">*</span>
              </Label>
              <Input
                id="store-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="เช่น Fastory Shop"
                required
                autoFocus
                className="h-9 text-sm"
              />
            </div>

            {/* Icon Picker */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">ประเภทร้านค้า</Label>
              <div className="grid grid-cols-2 gap-2">
                {storeIconList.map((item) => {
                  const Icon = item.icon;
                  const isSelected = item.key === selectedIcon;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setSelectedIcon(item.key)}
                      className={cn(
                        "flex items-center gap-2.5 rounded-xl border p-2.5 text-left transition-all",
                        isSelected
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border/50 bg-muted/10 text-muted-foreground hover:bg-muted/30 hover:text-foreground",
                      )}
                    >
                      <div
                        className={cn(
                          "flex size-8 shrink-0 items-center justify-center rounded-lg border",
                          isSelected
                            ? "border-primary/20 bg-primary/10"
                            : "border-border/40 bg-background",
                        )}
                      >
                        <Icon className="size-4" />
                      </div>
                      <span className="text-[11px] font-medium leading-tight">
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label
                htmlFor="store-description"
                className="text-xs font-semibold"
              >
                คำอธิบายเพิ่มเติม{" "}
                <span className="text-muted-foreground font-normal">
                  (ไม่บังคับ)
                </span>
              </Label>
              <Textarea
                id="store-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="อธิบายข้อมูลเกี่ยวกับสินค้าหรือบริการ..."
                className="min-h-[100px] text-sm resize-none"
              />
            </div>
          </form>
        </div>

        <DrawerFooter className="border-t border-border/50 bg-muted/10 p-4">
          <div className="flex gap-2">
            <DrawerClose asChild>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
                className="flex-1 h-9 text-xs"
              >
                ยกเลิก
              </Button>
            </DrawerClose>
            <Button
              type="submit"
              form="create-store-drawer-form"
              disabled={loading || !name.trim()}
              className="flex-1 h-9 text-xs"
            >
              {loading && <Loader className="mr-1.5 size-3.5 animate-spin" />}
              {loading ? "กำลังสร้าง..." : "สร้างร้านค้า"}
            </Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

export function EditStoreSheet({
  open,
  onOpenChange,
  store,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  store: Store | null;
}) {
  const dispatch = useAppDispatch();
  const [loading, setLoading] = React.useState(false);
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [selectedIcon, setSelectedIcon] = React.useState("store");

  React.useEffect(() => {
    if (store && open) {
      setName(store.name || "");
      setDescription(store.description || "");
      setSelectedIcon(store.icon || "store");
    }
  }, [store, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !store) return;

    setLoading(true);
    try {
      await dispatch(
        updateStore({
          id: store.id,
          name: name.trim(),
          description: description.trim() || null,
          icon: selectedIcon,
        }),
      ).unwrap();
      toast.success("บันทึกการแก้ไขสำเร็จ");
      onOpenChange(false);
    } catch (error) {
      const message = typeof error === "string" ? error : "ไม่สามารถแก้ไขร้านค้าได้";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const SelectedIconComponent = React.useMemo(() => {
    const matched = storeIconList.find((item) => item.key === selectedIcon);
    return matched ? matched.icon : HelpCircle;
  }, [selectedIcon]);

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="h-full border-l sm:max-w-md">
        <DrawerHeader className="border-b border-border/50 pb-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 flex size-11 items-center justify-center rounded-xl border border-primary/20 text-primary">
              <SelectedIconComponent className="size-5" />
            </div>
            <div>
              <DrawerTitle className="text-base font-semibold">
                แก้ไขข้อมูลร้านค้า
              </DrawerTitle>
              <DrawerDescription className="text-xs">
                ปรับปรุงข้อมูลทั่วไปของร้านค้าคุณ
              </DrawerDescription>
            </div>
          </div>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto p-5">
          <form
            id="edit-store-drawer-form"
            onSubmit={handleSubmit}
            className="space-y-5"
          >
            {/* Store Name */}
            <div className="space-y-1.5">
              <Label
                htmlFor="edit-store-name"
                className="text-xs font-semibold"
              >
                ชื่อร้านค้า <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-store-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="เช่น Fastory Shop"
                required
                className="h-9 text-sm"
              />
            </div>

            {/* Icon Picker */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">ประเภทร้านค้า</Label>
              <div className="grid grid-cols-2 gap-2">
                {storeIconList.map((item) => {
                  const Icon = item.icon;
                  const isSelected = item.key === selectedIcon;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setSelectedIcon(item.key)}
                      className={cn(
                        "flex items-center gap-2.5 rounded-xl border p-2.5 text-left transition-all",
                        isSelected
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border/50 bg-muted/10 text-muted-foreground hover:bg-muted/30 hover:text-foreground",
                      )}
                    >
                      <div
                        className={cn(
                          "flex size-8 shrink-0 items-center justify-center rounded-lg border",
                          isSelected
                            ? "border-primary/20 bg-primary/10"
                            : "border-border/40 bg-background",
                        )}
                      >
                        <Icon className="size-4" />
                      </div>
                      <span className="text-[11px] font-medium leading-tight">
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label
                htmlFor="edit-store-description"
                className="text-xs font-semibold"
              >
                คำอธิบายเพิ่มเติม
              </Label>
              <Textarea
                id="edit-store-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="อธิบายข้อมูลเกี่ยวกับสินค้าหรือบริการ..."
                className="min-h-[100px] text-sm resize-none"
              />
            </div>
          </form>
        </div>

        <DrawerFooter className="border-t border-border/50 bg-muted/10 p-4">
          <div className="flex gap-2">
            <DrawerClose asChild>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
                className="flex-1 h-9 text-xs"
              >
                ยกเลิก
              </Button>
            </DrawerClose>
            <Button
              type="submit"
              form="edit-store-drawer-form"
              disabled={loading || !name.trim()}
              className="flex-1 h-9 text-xs"
            >
              {loading && <Loader className="mr-1.5 size-3.5 animate-spin" />}
              {loading ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
            </Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
