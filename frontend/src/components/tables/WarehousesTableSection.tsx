import { AlertTriangle, Ellipsis, Search, Shapes } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { ConfirmDeleteDialog } from "@/components/dialogs/ConfirmDeleteDialog";
import { DataTablePagination } from "@/components/tables/DataTablePagination";
import { usePagination } from "@/hooks/usePagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  onForceDeleteWarehouse: (id: string) => Promise<boolean> | boolean;
};

export function WarehousesTableSection({
  warehouses,
  search,
  onSearchChange,
  onUpdateWarehouse,
  onDeleteWarehouse,
  onForceDeleteWarehouse,
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
  // Force delete dialog state
  const [forceDeleteOpen, setForceDeleteOpen] = useState(false);
  const [forceDeleting, setForceDeleting] = useState(false);

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

  // First attempt normal delete — if it fails (has products), show force dialog
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
    } else {
      // Check if it failed due to products inside (409)
      const productCount = deletingWarehouse.productCount ?? 0;
      if (productCount > 0) {
        setDeleteOpen(false);
        setForceDeleteOpen(true);
      }
    }
  };

  const handleForceDelete = async () => {
    if (!deletingWarehouse) return;
    setForceDeleting(true);
    const isSuccess = await onForceDeleteWarehouse(deletingWarehouse.id);
    setForceDeleting(false);
    if (isSuccess) {
      setForceDeleteOpen(false);
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
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-center whitespace-nowrap">ชื่อคลัง</TableHead>
                  <TableHead className="hidden sm:table-cell">คำอธิบาย</TableHead>
                  <TableHead className="text-center min-w-[120px]">ความจุ</TableHead>
                  <TableHead className="text-center hidden md:table-cell">สินค้า</TableHead>
                  <TableHead className="whitespace-nowrap hidden lg:table-cell">สร้างเมื่อ</TableHead>
                  <TableHead className="text-center whitespace-nowrap">
                    การกระทำ
                  </TableHead>
                </TableRow>
              </TableHeader>
            <TableBody>
              {paginatedWarehouses.map((warehouse) => {
                const stockTotal = warehouse.stockTotal ?? 0;
                const maxCap = warehouse.maxCapacity;
                const usagePercent =
                  maxCap > 0
                    ? Math.min(100, Math.round((stockTotal / maxCap) * 100))
                    : 0;
                const isNearFull = usagePercent >= 80;
                const isFull = usagePercent >= 100;

                return (
                  <TableRow key={warehouse.id}>
                    <TableCell className="truncate font-medium text-center">
                      {warehouse.name}
                    </TableCell>
                    <TableCell className="truncate hidden sm:table-cell">
                      {warehouse.description.length === 0
                        ? "ไม่มีคำอธิบาย"
                        : warehouse.description}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center gap-1 min-w-[80px]">
                        <span
                          className={`text-xs font-medium ${isFull ? "text-destructive" : isNearFull ? "text-warning" : "text-muted-foreground"}`}
                        >
                          {stockTotal}/{maxCap}
                        </span>
                        <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${isFull ? "bg-destructive" : isNearFull ? "bg-amber-500" : "bg-primary"}`}
                            style={{ width: `${usagePercent}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center hidden md:table-cell">
                      <Badge variant="secondary">
                        {warehouse.productCount ?? 0} รายการ
                      </Badge>
                    </TableCell>
                    <TableCell className="truncate whitespace-nowrap hidden lg:table-cell">
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
                );
              })}
            </TableBody>
            </Table>
          </div>
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

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-xl p-0">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle>แก้ไขคลังสินค้า</DialogTitle>
            <DialogDescription>ปรับข้อมูลคลังสินค้า</DialogDescription>
          </DialogHeader>
          <div className="flex-1 space-y-4 overflow-y-auto px-6 pb-6">
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
          <DialogFooter className="px-6 pb-6 pt-2">
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
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Normal delete confirmation */}
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

      {/* Force delete dialog — shown when location has products */}
      <Dialog
        open={forceDeleteOpen}
        onOpenChange={(open) => {
          setForceDeleteOpen(open);
          if (!open) setDeletingWarehouse(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-destructive" />
              ไม่สามารถลบคลังสินค้าได้
            </DialogTitle>
            <DialogDescription>
              <div className="space-y-3 pt-1">
                <p>
                  คลัง{" "}
                  <strong className="text-foreground">
                    "{deletingWarehouse?.name}"
                  </strong>{" "}
                  มีสินค้า{" "}
                  <strong className="text-destructive">
                    {deletingWarehouse?.productCount ?? 0} รายการ
                  </strong>{" "}
                  อยู่ในนี้
                </p>
                <p className="text-sm">คุณต้องการ:</p>
                <ul className="list-disc pl-4 text-sm space-y-1">
                  <li>
                    <strong>ย้ายสินค้าออกก่อน</strong> —
                    ไปที่หน้าสินค้าและเปลี่ยนที่เก็บของสินค้าเหล่านั้น แล้วค่อยลบ
                  </li>
                  <li>
                    <strong>Force ลบ</strong> — สินค้าทั้งหมดในคลังนี้จะถูกตั้งค่าเป็น
                    "ไม่มีที่เก็บ" และลบคลังนี้ออก
                  </li>
                </ul>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setForceDeleteOpen(false);
                setDeletingWarehouse(null);
              }}
            >
              ย้ายสินค้าไปก่อน
            </Button>
            <Button
              variant="destructive"
              disabled={forceDeleting}
              onClick={handleForceDelete}
            >
              {forceDeleting ? "กำลังลบ..." : "Force ลบ (เคลียร์สินค้าออก)"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
