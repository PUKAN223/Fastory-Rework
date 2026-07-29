"use client";

import { Building2 } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { CreateWarehousePayload } from "@/types/locations";

type CreateWarehouseDrawerProps = {
  onCreate: (payload: CreateWarehousePayload) => Promise<boolean> | boolean;
  isSubmitting?: boolean;
};

export function CreateWarehouseDrawer({
  onCreate,
  isSubmitting = false,
}: CreateWarehouseDrawerProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [maxCapacity, setMaxCapacity] = useState("0");

  const resetForm = () => {
    setName("");
    setDescription("");
    setMaxCapacity("0");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = name.trim();
    const capacity = Number(maxCapacity);

    if (!trimmedName || Number.isNaN(capacity) || capacity < 0) {
      return;
    }

    const isSuccess = await onCreate({
      name: trimmedName,
      description: description.trim(),
      maxCapacity: Math.trunc(capacity),
    });

    if (isSuccess) {
      resetForm();
      setOpen(false);
    }
  };

  return (
    <Drawer direction="right" open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button variant="default">
          <Building2 className="size-4" />
          เพิ่มคลังสินค้า
        </Button>
      </DrawerTrigger>
      <DrawerContent className="flex h-full sm:max-w-md">
        <DrawerHeader>
          <DrawerTitle>เพิ่มคลังสินค้าใหม่</DrawerTitle>
          <DrawerDescription>กรอกข้อมูลคลังสินค้าและความจุสูงสุด</DrawerDescription>
        </DrawerHeader>
        <div className="flex-1 space-y-4 overflow-y-auto px-4 pb-4">
          <form
            className="space-y-4"
            id="add-warehouse-form"
            onSubmit={handleSubmit}
          >
            <div className="space-y-2">
              <Label htmlFor="warehouse-name">ชื่อคลัง</Label>
              <Input
                id="warehouse-name"
                placeholder="เช่น คลังกลาง"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="warehouse-max-capacity">ความจุสูงสุด</Label>
              <Input
                id="warehouse-max-capacity"
                min={0}
                required
                type="number"
                value={maxCapacity}
                onChange={(event) => setMaxCapacity(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="warehouse-description">คำอธิบาย</Label>
              <Textarea
                className="min-h-44"
                id="warehouse-description"
                placeholder="รายละเอียดเพิ่มเติม (ไม่จำเป็น)"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>
          </form>
        </div>
        <DrawerFooter>
          <DrawerClose asChild>
            <Button disabled={isSubmitting} variant="outline">
              ยกเลิก
            </Button>
          </DrawerClose>
          <Button
            disabled={isSubmitting}
            form="add-warehouse-form"
            type="submit"
          >
            {isSubmitting ? "กำลังบันทึก..." : "บันทึก"}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
