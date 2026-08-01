import { Ellipsis, Search, Shapes } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { ConfirmDeleteDialog } from "@/components/dialogs/ConfirmDeleteDialog";
import { DataTablePagination } from "@/components/tables/DataTablePagination";
import { usePagination } from "@/hooks/usePagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Icon, type IconName, IconPicker } from "@/components/ui/icon-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import type { Category, CreateCategoryPayload } from "../../types/categories";

type CategoriesTableSectionProps = {
  categories: Category[];
  search: string;
  onSearchChange: (value: string) => void;
  onUpdateCategory: (
    id: string,
    payload: Partial<CreateCategoryPayload>,
  ) => Promise<boolean> | boolean;
  onDeleteCategory: (id: string) => Promise<boolean> | boolean;
};

export function CategoriesTableSection({
  categories,
  search,
  onSearchChange,
  onUpdateCategory,
  onDeleteCategory,
}: CategoriesTableSectionProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editIcon, setEditIcon] = useState<IconName>("box");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(
    null,
  );
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(
    null,
  );

  const {
    pageSize,
    totalPages,
    safeCurrentPage,
    setCurrentPage,
    setPageSize,
    paginate,
  } = usePagination({
    totalItems: categories.length,
    defaultPageSize: 10,
  });

  const paginatedCategories = useMemo(
    () => paginate(categories),
    [categories, paginate],
  );

  useEffect(() => {
    if (!editingCategory) {
      return;
    }

    setEditName(editingCategory.name);
    setEditDescription(editingCategory.description ?? "");
    setEditIcon(editingCategory.icon);
  }, [editingCategory]);

  const handleEditOpen = (category: Category) => {
    setEditingCategory(category);
    setEditOpen(true);
  };

  const handleEditSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingCategory) {
      return;
    }

    const name = editName.trim();
    if (!name) {
      return;
    }

    setIsSavingEdit(true);
    const isSuccess = await onUpdateCategory(editingCategory.id, {
      name,
      description: editDescription.trim(),
      icon: editIcon,
    });
    setIsSavingEdit(false);

    if (isSuccess) {
      setEditOpen(false);
      setEditingCategory(null);
    }
  };

  const handleDeleteOpen = (category: Category) => {
    setDeletingCategory(category);
    setDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingCategory) {
      return;
    }

    setDeletingCategoryId(deletingCategory.id);
    const isSuccess = await onDeleteCategory(deletingCategory.id);
    setDeletingCategoryId(null);

    if (isSuccess) {
      setDeleteOpen(false);
      setDeletingCategory(null);
    }
  };

  return (
    <>
      <div className="space-y-4">
        <div className="relative max-w-sm">
          <Search className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-3 size-4 text-muted-foreground" />
          <Input
            className="pl-9"
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="ค้นหาหมวดหมู่ด้วยชื่อ..."
            value={search}
          />
        </div>

        {categories.length === 0 ? (
          <div className="rounded-lg border bg-muted/15">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Shapes />
                </EmptyMedia>
                <EmptyTitle>ไม่พบหมวดหมู่</EmptyTitle>
                <EmptyDescription>
                  ลองเปลี่ยนคำค้นหาหรือเพิ่มหมวดหมู่ใหม่
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table className="[&_th:first-child]:text-center [&_td:first-child]:text-center">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16 text-center">ไอคอน</TableHead>
                  <TableHead className="whitespace-nowrap">ชื่อหมวดหมู่</TableHead>
                  <TableHead className="hidden sm:table-cell">คำอธิบาย</TableHead>
                  <TableHead className="text-center">สินค้า</TableHead>
                  <TableHead className="whitespace-nowrap hidden md:table-cell">สร้างเมื่อ</TableHead>
                  <TableHead className="text-center whitespace-nowrap">
                    การกระทำ
                  </TableHead>
                </TableRow>
              </TableHeader>
            <TableBody>

                {paginatedCategories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className="text-center align-middle">
                      <span className="mx-auto inline-flex size-8 items-center justify-center rounded-md border bg-muted/20">
                        <Icon className="size-4" name={category.icon} />
                      </span>
                    </TableCell>
                    <TableCell className="truncate font-medium">
                      {category.name}
                    </TableCell>
                    <TableCell className="truncate hidden sm:table-cell">
                      {category.description.length === 0
                        ? "ไม่มีคำอธิบาย"
                        : category.description}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{category.productCount}</Badge>
                    </TableCell>
                    <TableCell className="truncate whitespace-nowrap hidden md:table-cell">
                      {new Date(category.createdAt).toLocaleString("th-TH", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell className="text-center whitespace-nowrap">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            disabled={deletingCategoryId === category.id}
                            size="icon"
                            variant="ghost"
                          >
                            <Ellipsis className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onSelect={() => handleEditOpen(category)}
                          >
                            แก้ไข
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => handleDeleteOpen(category)}
                            variant="destructive"
                          >
                            {deletingCategoryId === category.id
                              ? "กำลังลบ..."
                              : "ลบ"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination Controls */}
        {categories.length > 0 && (
          <DataTablePagination
            currentPage={safeCurrentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={categories.length}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        )}
      </div>

      <Drawer open={editOpen} onOpenChange={setEditOpen} direction="right">
        <DrawerContent className="flex h-full sm:max-w-md">
          <DrawerHeader>
            <DrawerTitle>แก้ไขหมวดหมู่</DrawerTitle>
            <DrawerDescription>ปรับข้อมูลหมวดหมู่สินค้า</DrawerDescription>
          </DrawerHeader>
          <div className="flex-1 space-y-4 overflow-y-auto px-4 pb-4">
            <form
              className="space-y-4"
              id="edit-category-form"
              onSubmit={handleEditSubmit}
            >
              <div className="space-y-2">
                <Label htmlFor="edit-category-name">ชื่อหมวดหมู่</Label>
                <Input
                  id="edit-category-name"
                  placeholder="กรุณาใส่ชื่อหมวดหมู่"
                  required
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-category-description">คำอธิบาย</Label>
                <Textarea
                  className="min-h-44"
                  id="edit-category-description"
                  placeholder="คำอธิบายเพิ่มเติม"
                  value={editDescription}
                  onChange={(event) => setEditDescription(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>ไอคอน</Label>
                <IconPicker value={editIcon} onValueChange={setEditIcon}>
                  <Button
                    className="w-full justify-start"
                    type="button"
                    variant="outline"
                  >
                    <Icon className="size-4" name={editIcon} />
                    <span className="truncate capitalize">{editIcon}</span>
                  </Button>
                </IconPicker>
              </div>
            </form>
          </div>
          <DrawerFooter>
            <Button
              onClick={() => setEditOpen(false)}
              type="button"
              variant="outline"
            >
              ยกเลิก
            </Button>
            <Button
              disabled={isSavingEdit}
              form="edit-category-form"
              type="submit"
            >
              {isSavingEdit ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (!open) {
            setDeletingCategory(null);
          }
        }}
        title="ยืนยันการลบหมวดหมู่"
        description={`คุณต้องการลบหมวดหมู่ "${deletingCategory?.name ?? "-"}" ใช่หรือไม่?`}
        onConfirm={handleConfirmDelete}
        isDeleting={deletingCategoryId === deletingCategory?.id}
      />
    </>
  );
}
