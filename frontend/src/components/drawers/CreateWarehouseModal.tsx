"use client";

import { Building2 } from "lucide-react";
import { type FormEvent, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import type { CreateWarehousePayload } from "@/types/locations";

type CreateWarehouseModalProps = {
  onCreate: (payload: CreateWarehousePayload) => Promise<boolean> | boolean;
  isSubmitting?: boolean;
};

export function CreateWarehouseModal({
  onCreate,
  isSubmitting = false,
}: CreateWarehouseModalProps) {
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <Button variant="default">
          <Building2 className="size-4" />
          เพิ่มคลังสินค้า
        </Button>
      } />
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-xl p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>เพิ่มคลังสินค้าใหม่</DialogTitle>
          <DialogDescription>กรอกข้อมูลคลังสินค้าและความจุสูงสุด</DialogDescription>
        </DialogHeader>
        <div className="flex-1 space-y-4 overflow-y-auto px-6 pb-6">
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
        <DialogFooter className="px-6 pb-6 pt-2">
          <DialogClose render={
            <Button disabled={isSubmitting} variant="outline">
              ยกเลิก
            </Button>
          } />
          <Button disabled={!name || isSubmitting} form="add-warehouse-form" type="submit">
            {isSubmitting ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
