"use client";

import { TicketPlus } from "lucide-react";
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
import { Icon, type IconName, IconPicker } from "@/components/ui/icon-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { CreateCategoryPayload } from "@/types/categories";

type CreateCategoryDrawerProps = {
  onCreate: (payload: CreateCategoryPayload) => Promise<boolean> | boolean;
  isSubmitting?: boolean;
};

export function CreateCategoryDrawer({
  onCreate,
  isSubmitting = false,
}: CreateCategoryDrawerProps) {
  const [open, setOpen] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [categoryDescription, setCategoryDescription] = useState("");
  const [categoryIcon, setCategoryIcon] = useState<IconName>("box");

  const resetForm = () => {
    setCategoryName("");
    setCategoryDescription("");
    setCategoryIcon("box");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = categoryName.trim();
    if (!name) {
      return;
    }

    const isSuccess = await onCreate({
      name,
      description: categoryDescription.trim(),
      icon: categoryIcon,
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
          <TicketPlus className="size-4" />
          เพิ่มหมวดหมู่
        </Button>
      </DrawerTrigger>
      <DrawerContent className="flex h-full sm:max-w-md">
        <DrawerHeader>
          <DrawerTitle>เพิ่มหมวดหมู่ใหม่</DrawerTitle>
          <DrawerDescription>
            กรอกข้อมูลหมวดหมู่และเลือกไอคอนที่ต้องการ
          </DrawerDescription>
        </DrawerHeader>
        <div className="flex-1 space-y-4 overflow-y-auto px-4 pb-4">
          <form
            className="space-y-4"
            id="add-category-form"
            onSubmit={handleSubmit}
          >
            <div className="space-y-2">
              <Label htmlFor="category-name">ชื่อหมวดหมู่</Label>
              <Input
                id="category-name"
                placeholder="กรุณาใส่ชื่อหมวดหมู่"
                required
                value={categoryName}
                onChange={(event) => setCategoryName(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category-description">คำอธิบาย</Label>
              <Textarea
                className="min-h-56"
                id="category-description"
                placeholder="คำอธิบายเพิ่มเติมเกี่ยวกับหมวดหมู่นี้ (ไม่จำเป็นต้องกรอก)"
                rows={12}
                value={categoryDescription}
                onChange={(event) => setCategoryDescription(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>ไอคอน</Label>
              <IconPicker value={categoryIcon} onValueChange={setCategoryIcon}>
                <Button
                  className="w-full justify-start"
                  type="button"
                  variant="outline"
                >
                  <Icon className="size-4" name={categoryIcon} />
                  <span className="truncate capitalize">{categoryIcon}</span>
                </Button>
              </IconPicker>
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
            form="add-category-form"
            type="submit"
          >
            {isSubmitting ? "กำลังบันทึก..." : "บันทึก"}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
