"use client";

import { Pencil, Plus, Trash2, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Containers } from "@/components/Containers";
import { EntityListCard } from "@/components/card/EntityListCard";
import { PageHeaderCards } from "@/components/card/PageHeaderCards";
import { ConfirmDeleteDialog } from "@/components/dialogs/ConfirmDeleteDialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  createMember,
  deleteMember,
  fetchMembers,
  updateMember,
} from "@/features/staffSlice";
import { useAppDispatch, useAppSelector } from "@/store/hook";

const PERMISSION_OPTIONS = [
  { id: "products:read", label: "ดูรายการสินค้า" },
  { id: "products:write", label: "เพิ่ม/แก้ไขสินค้า" },
  { id: "categories:read", label: "ดูหมวดหมู่" },
  { id: "categories:write", label: "จัดการหมวดหมู่" },
  { id: "locations:read", label: "ดูคลังสินค้า" },
  { id: "locations:write", label: "จัดการคลังสินค้า" },
  { id: "stocks:read", label: "ดูประวัติสต็อก" },
  { id: "stocks:write", label: "ปรับสต็อก" },
  { id: "settings:read", label: "ดูการตั้งค่าและพนักงาน" },
  { id: "settings:write", label: "แก้ไขการตั้งค่าและพนักงาน" },
];

const PRESETS = {
  manager: {
    label: "ผู้จัดการร้าน",
    permissions: {
      "products:read": true,
      "products:write": true,
      "categories:read": true,
      "categories:write": true,
      "locations:read": true,
      "locations:write": true,
      "stocks:read": true,
      "stocks:write": true,
      "settings:read": true,
      "settings:write": true,
    },
  },
  cashier: {
    label: "แคชเชียร์",
    permissions: {
      "products:read": true,
      "products:write": false,
      "categories:read": true,
      "categories:write": false,
      "locations:read": false,
      "locations:write": false,
      "stocks:read": true,
      "stocks:write": true,
      "settings:read": false,
      "settings:write": false,
    },
  },
  stockClerk: {
    label: "พนักงานคลังสินค้า",
    permissions: {
      "products:read": true,
      "products:write": true,
      "categories:read": true,
      "categories:write": false,
      "locations:read": true,
      "locations:write": false,
      "stocks:read": true,
      "stocks:write": true,
      "settings:read": false,
      "settings:write": false,
    },
  },
};

export default function StaffPage() {
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector((state) => state.auth.user);
  const activeStoreId = useAppSelector((state) => state.stores.activeStoreId);
  const { items, fetchStatus, createStatus, updateStatus } = useAppSelector(
    (state: any) =>
      state.staff || {
        items: [],
        fetchStatus: "idle",
        createStatus: "idle",
        updateStatus: "idle",
      },
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form states
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const staffMembers = useMemo(() => {
    return items.filter((m: any) => {
      const isSelf =
        currentUser &&
        (currentUser.id === Number(m.userId) ||
          currentUser.id === Number(m.user?.id) ||
          currentUser.email === m.user?.email);
      return !isSelf;
    });
  }, [items, currentUser]);

  useEffect(() => {
    if (fetchStatus === "idle" && activeStoreId) {
      dispatch(fetchMembers(activeStoreId));
    }
  }, [dispatch, fetchStatus, activeStoreId]);

  const handleOpenCreate = () => {
    setEditingId(null);
    setEmailOrUsername("");
    setJobTitle("");
    setFormError(null);
    setPermissions({
      "products:read": true,
      "categories:read": true,
      "locations:read": true,
      "stocks:read": true,
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (member: any) => {
    setEditingId(member.id);
    setEmailOrUsername(member.user?.username || member.user?.email || "");
    setJobTitle(member.jobTitle || member.job_title || "");
    setPermissions(member.permissions || {});
    setFormError(null);
    setDialogOpen(true);
  };

  const handleApplyPreset = (preset: any) => {
    setJobTitle(preset.label);
    setPermissions(preset.permissions);
  };

  const handleTogglePermission = (id: string, checked: boolean) => {
    setPermissions((prev) => ({ ...prev, [id]: checked }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!activeStoreId) return;
    if (!editingId && !emailOrUsername.trim()) {
      setFormError("กรุณากรอก Username หรือ Email");
      toast.error("กรุณากรอก Username หรือ Email");
      return;
    }

    try {
      if (editingId) {
        await dispatch(
          updateMember({
            storeId: activeStoreId,
            memberId: editingId,
            data: { jobTitle },
          }),
        ).unwrap();
        toast.success("อัปเดตสิทธิ์สำเร็จ");
      } else {
        await dispatch(
          createMember({
            storeId: activeStoreId,
            data: { emailOrUsername, jobTitle },
          }),
        ).unwrap();
        toast.success("เพิ่มพนักงานสำเร็จ");
      }
      setDialogOpen(false);
    } catch (err: any) {
      const msg = typeof err === "string" ? err : "เกิดข้อผิดพลาด";
      setFormError(msg);
      toast.error(msg);
    }
  };

  const handleDelete = async (id: number) => {
    if (!activeStoreId) return;
    setDeletingId(id);
    try {
      await dispatch(
        deleteMember({ storeId: activeStoreId, memberId: id }),
      ).unwrap();
      toast.success("ลบพนักงานสำเร็จ");
    } catch (err: any) {
      toast.error(err || "ไม่สามารถลบพนักงานได้");
    } finally {
      setDeletingId(null);
    }
  };

  const isSubmitting = createStatus === "loading" || updateStatus === "loading";

  return (
    <Containers>
      <PageHeaderCards
        title="จัดการพนักงาน"
        description="เชิญพนักงานเข้าร้านและกำหนดสิทธิ์การใช้งานระบบต่างๆ แบบแยกรายบุคคล"
      >
        <Badge variant="outline">ทั้งหมด {staffMembers.length} คน</Badge>
      </PageHeaderCards>

      <EntityListCard
        title="รายชื่อพนักงาน"
        description="รายชื่อผู้ที่สามารถเข้าใช้งานร้านค้านี้ได้"
        actions={
          <Button onClick={handleOpenCreate} className="px-5 shadow-xs">
            <Plus className="mr-2 size-4" />
            เพิ่มพนักงาน
          </Button>
        }
      >
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingId ? "แก้ไขสิทธิ์พนักงาน" : "เพิ่มพนักงานใหม่"}
              </DialogTitle>
              <DialogDescription>
                {editingId
                  ? "ปรับเปลี่ยนตำแหน่งและสิทธิ์การเข้าถึงเมนูต่างๆ ของพนักงาน"
                  : "กรอก Username หรือ Email ของผู้ใช้ที่มีอยู่ในระบบเพื่อเชิญเข้าร้าน"}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="flex flex-col min-h-0">
              <DialogPanel className="space-y-4 max-h-[60vh]">
                {formError && (
                  <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-medium">
                    {formError}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="user-id">
                    Username หรือ Email {editingId && "(เปลี่ยนแปลงไม่ได้)"}
                  </Label>
                  <Input
                    id="user-id"
                    placeholder="เช่น user123 หรือ email@example.com"
                    value={emailOrUsername}
                    onChange={(e) => setEmailOrUsername(e.target.value)}
                    disabled={!!editingId}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="job-title">ชื่อตำแหน่ง (ไม่บังคับ)</Label>
                  <Input
                    id="job-title"
                    placeholder="เช่น ผู้จัดการร้าน, แคชเชียร์"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>ชุดสิทธิ์แนะนำ (Presets)</Label>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(PRESETS).map(([key, preset]) => (
                      <Button
                        key={key}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs rounded-lg"
                        onClick={() => handleApplyPreset(preset)}
                      >
                        {preset.label}
                      </Button>
                    ))}
                  </div>
                </div>

              </DialogPanel>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  disabled={isSubmitting}
                >
                  ยกเลิก
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <div className="space-y-4 mt-4">
          {fetchStatus === "loading" ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>พนักงาน</TableHead>
                    <TableHead>ตำแหน่ง</TableHead>
                    <TableHead>วันที่เข้าร่วม</TableHead>
                    <TableHead className="text-right">จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[1, 2, 3].map((key) => (
                    <TableRow key={key}>
                      <TableCell>
                        <Skeleton className="h-4 w-40" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-32" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Skeleton className="ml-auto h-8 w-20" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : staffMembers.length === 0 ? (
            <div className="rounded-lg border bg-muted/15">
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Users />
                  </EmptyMedia>
                  <EmptyTitle>ยังไม่มีพนักงานในร้าน</EmptyTitle>
                  <EmptyDescription>
                    ร้านนี้ยังไม่มีพนักงานคนอื่น กดเพิ่มพนักงานเพื่อเชิญคนอื่นเข้ามาช่วยจัดการร้าน
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>พนักงาน</TableHead>
                    <TableHead>ตำแหน่ง</TableHead>
                    <TableHead>วันที่เข้าร่วม</TableHead>
                    <TableHead className="text-right">จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staffMembers.map((m: any) => (
                    <TableRow key={m.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="size-9 border border-border/60">
                            <AvatarImage
                              src={
                                m.user?.profile_picture_url ||
                                (m.user?.profile_image_id ||
                                m.user?.profileImageId
                                  ? `/api/images/${m.user.profile_image_id || m.user.profileImageId}`
                                  : undefined)
                              }
                              alt={m.user?.username || "Staff"}
                            />
                            <AvatarFallback className="font-semibold text-xs bg-primary/10 text-primary uppercase">
                              {m.user?.username
                                ? m.user.username.slice(0, 2)
                                : "US"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="font-medium text-sm">
                              {m.user?.username}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {m.user?.email}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{m.jobTitle || "-"}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {(() => {
                          const rawDate = m.createdAt || m.created_at;
                          const date = rawDate ? new Date(rawDate) : null;
                          return date && !Number.isNaN(date.getTime())
                            ? date.toLocaleDateString("th-TH")
                            : "-";
                        })()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEdit(m)}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <ConfirmDeleteDialog
                            open={deletingId === m.id}
                            onOpenChange={(open) => !open && setDeletingId(null)}
                            title="ยืนยันการลบพนักงาน?"
                            description={
                              <>
                                คุณกำลังจะลบพนักงาน <b>{m.user?.username}</b>{" "}
                                ออกจากร้านค้า การกระทำนี้ไม่สามารถย้อนกลับได้
                              </>
                            }
                            onConfirm={() => handleDelete(m.id)}
                            isDeleting={deletingId === m.id}
                            confirmLabel="ลบพนักงาน"
                            trigger={
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                                onClick={() => setDeletingId(m.id)}
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            }
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </EntityListCard>
    </Containers>
  );
}
