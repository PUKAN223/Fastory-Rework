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
import type { CreateWarehousePayload, Warehouse } from "@/types/locations";

type WarehousesTableSectionProps = {
  warehouses: Warehouse[];
  search: string;
  onSearchChange: (value: string) => void;
  onUpdateWarehouse: (
    id: string,
    payload: Partial<CreateWarehousePayload>,
  ) => Promise<boolean> | boolean;
  onDeleteWarehouse: (id: string) => Promise<boolean> | boolean;
};

export function WarehousesTableSection({
  warehouses,
  search,
  onSearchChange,
  onUpdateWarehouse,
  onDeleteWarehouse,
}: WarehousesTableSectionProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(
    null,
  );
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editMaxCapacity, setEditMaxCapacity] = useState("0");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [deletingWarehouseId, setDeletingWarehouseId] = useState<string | null>(
    null,
  );
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingWarehouse, setDeletingWarehouse] = useState<Warehouse | null>(
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
    totalItems: warehouses.length,
    defaultPageSize: 10,
  });

  const paginatedWarehouses = useMemo(
    () => paginate(warehouses),
    [warehouses, paginate],
  );

  useEffect(() => {
    if (!editingWarehouse) {
      return;
    }

    setEditName(editingWarehouse.name);
    setEditDescription(editingWarehouse.description ?? "");
    setEditMaxCapacity(String(editingWarehouse.maxCapacity));
  }, [editingWarehouse]);

  const handleEditOpen = (warehouse: Warehouse) => {
    setEditingWarehouse(warehouse);
    setEditOpen(true);
  };

  const handleEditSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingWarehouse) {
      return;
    }

    const name = editName.trim();
    const capacity = Number(editMaxCapacity);
    if (!name || Number.isNaN(capacity) || capacity < 0) {
      return;
    }

    setIsSavingEdit(true);
    const isSuccess = await onUpdateWarehouse(editingWarehouse.id, {
      name,
      description: editDescription.trim(),
      maxCapacity: Math.trunc(capacity),
    });
    setIsSavingEdit(false);

    if (isSuccess) {
      setEditOpen(false);
      setEditingWarehouse(null);
    }
  };

  const handleDeleteOpen = (warehouse: Warehouse) => {
    setDeletingWarehouse(warehouse);
    setDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingWarehouse) {
      return;
    }

    setDeletingWarehouseId(deletingWarehouse.id);
    const isSuccess = await onDeleteWarehouse(deletingWarehouse.id);
    setDeletingWarehouseId(null);

    if (isSuccess) {
      setDeleteOpen(false);
      setDeletingWarehouse(null);
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
            placeholder="ค้นหาคลังสินค้าด้วยชื่อ..."
            value={search}
          />
        </div>

        {warehouses.length === 0 ? (
          <div className="rounded-lg border bg-muted/15">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Shapes />
                </EmptyMedia>
                <EmptyTitle>ไม่พบคลังสินค้า</EmptyTitle>
                <EmptyDescription>
                  ลองเปลี่ยนคำค้นหาหรือเพิ่มคลังสินค้าใหม่
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-center">ชื่อคลัง</TableHead>
                <TableHead>คำอธิบาย</TableHead>
                <TableHead className="text-center">ความจุสูงสุด</TableHead>
                <TableHead className="whitespace-nowrap">สร้างเมื่อ</TableHead>
                <TableHead className="text-center whitespace-nowrap">
                  การกระทำ
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedWarehouses.map((warehouse) => (
                <TableRow key={warehouse.id}>
                  <TableCell className="truncate font-medium text-center">
                    {warehouse.name}
                  </TableCell>
                  <TableCell className="truncate">
                    {warehouse.description.length === 0
                      ? "ไม่มีคำอธิบาย"
                      : warehouse.description}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">{warehouse.maxCapacity}</Badge>
                  </TableCell>
                  <TableCell className="truncate whitespace-nowrap">
                    {new Date(warehouse.createdAt).toLocaleString("th-TH", {
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
                          disabled={deletingWarehouseId === warehouse.id}
                          size="icon"
                          variant="ghost"
                        >
                          <Ellipsis className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onSelect={() => handleEditOpen(warehouse)}
                        >
                          แก้ไข
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() => handleDeleteOpen(warehouse)}
                          variant="destructive"
                        >
                          {deletingWarehouseId === warehouse.id
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
        )}

        {/* Pagination Controls */}
        {warehouses.length > 0 && (
          <DataTablePagination
            currentPage={safeCurrentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={warehouses.length}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        )}
      </div>

      <Drawer open={editOpen} onOpenChange={setEditOpen} direction="right">
        <DrawerContent className="flex h-full sm:max-w-md">
          <DrawerHeader>
            <DrawerTitle>แก้ไขคลังสินค้า</DrawerTitle>
            <DrawerDescription>ปรับข้อมูลคลังสินค้า</DrawerDescription>
          </DrawerHeader>
          <div className="flex-1 space-y-4 overflow-y-auto px-4 pb-4">
            <form
              className="space-y-4"
              id="edit-warehouse-form"
              onSubmit={handleEditSubmit}
            >
              <div className="space-y-2">
                <Label htmlFor="edit-warehouse-name">ชื่อคลัง</Label>
                <Input
                  id="edit-warehouse-name"
                  placeholder="กรุณาใส่ชื่อคลัง"
                  required
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-warehouse-max-capacity">ความจุสูงสุด</Label>
                <Input
                  id="edit-warehouse-max-capacity"
                  min={0}
                  required
                  type="number"
                  value={editMaxCapacity}
                  onChange={(event) => setEditMaxCapacity(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-warehouse-description">คำอธิบาย</Label>
                <Textarea
                  className="min-h-44"
                  id="edit-warehouse-description"
                  placeholder="คำอธิบายเพิ่มเติม"
                  value={editDescription}
                  onChange={(event) => setEditDescription(event.target.value)}
                />
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
              form="edit-warehouse-form"
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
            setDeletingWarehouse(null);
          }
        }}
        title="ยืนยันการลบคลังสินค้า"
        description={`คุณต้องการลบคลัง "${deletingWarehouse?.name ?? "-"}" ใช่หรือไม่?`}
        onConfirm={handleConfirmDelete}
        isDeleting={deletingWarehouseId === deletingWarehouse?.id}
      />
    </>
  );
}
