"use client";

import {
  AlertTriangle,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Lock,
  Mail,
  Pencil,
  Shield,
  ShieldAlert,
  Trash2,
  UserCheck,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ConfirmDeleteDialog } from "@/components/dialogs/ConfirmDeleteDialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { deleteAccount, updateProfile } from "@/features/authSlice";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/store/hook";

interface ProfileSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProfileSettingsModal({
  open,
  onOpenChange,
}: ProfileSettingsModalProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [username, setUsername] = useState("");
  const [profilePicture, setProfilePicture] = useState("");
  const [bio, setBio] = useState("");

  // Lock / Edit states
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Hidden Advanced Section state
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Two-Step Account Deletion Flow state
  const [deleteStep, setDeleteStep] = useState<0 | 1 | 2>(0); // 0 = closed, 1 = verify password/code, 2 = final confirmation
  const [deletePasswordInput, setDeletePasswordInput] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  useEffect(() => {
    if (open) {
      if (user) {
        setUsername(user.username || "");
        setProfilePicture(user.profile_picture_url || "");
        setBio(user.bio || "");
      }
      setIsEditingUsername(false);
      setIsEditingBio(false);
      setShowAdvanced(false);
      setDeleteStep(0);
      setDeletePasswordInput("");
    }
  }, [user, open]);

  const hasChanges =
    user &&
    (username !== (user.username || "") ||
      profilePicture !== (user.profile_picture_url || "") ||
      bio !== (user.bio || ""));

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("ขนาดไฟล์ต้องไม่เกิน 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setProfilePicture(reader.result);
        toast.success("เลือกรูปโปรไฟล์เรียบร้อยแล้ว อย่าลืมกดบันทึก");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      toast.error("กรุณากรอกชื่อผู้ใช้");
      return;
    }

    setIsSaving(true);
    try {
      await dispatch(
        updateProfile({
          username: username.trim(),
          profile_picture: profilePicture.trim() || null,
          bio: bio.trim() || null,
        }),
      ).unwrap();

      toast.success("อัปเดตโปรไฟล์เรียบร้อยแล้ว");
      setIsEditingUsername(false);
      setIsEditingBio(false);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(typeof err === "string" ? err : "ไม่สามารถอัปเดตข้อมูลได้");
    } finally {
      setIsSaving(false);
    }
  };

  // Step 1 -> Step 2 validation
  const handleProceedToDeleteStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deletePasswordInput.trim()) {
      toast.error("กรุณากรอกรหัสผ่านเพื่อยืนยันตัวตน");
      return;
    }
    setDeleteStep(2);
  };

  // Step 2 Final Execution
  const handleFinalDeleteAccount = async () => {
    setIsDeletingAccount(true);
    try {
      await dispatch(
        deleteAccount({
          password: deletePasswordInput.trim(),
          confirmation: deletePasswordInput.trim(),
        }),
      ).unwrap();

      toast.success("ลบบัญชีผู้ใช้สำเร็จ");
      setDeleteStep(0);
      onOpenChange(false);
      router.push("/login");
    } catch (err: any) {
      toast.error(typeof err === "string" ? err : "ไม่สามารถลบบัญชีผู้ใช้ได้");
      setIsDeletingAccount(false);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return "U";
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="left"
          className="w-full sm:max-w-md p-0 flex flex-col h-full bg-background border-r overflow-y-auto"
        >
          {/* Hidden File Input for Avatar Upload */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />

          {/* Clean Header Section */}
          <div className="relative border-b border-border/50 bg-card/60 pt-6 pb-6 px-6 text-center">
            <SheetHeader className="p-0 text-center mb-4">
              <SheetTitle className="text-center text-base font-semibold flex items-center justify-center gap-2">
                <UserCheck className="size-4 text-primary" />
                โปรไฟล์และบัญชีผู้ใช้
              </SheetTitle>
              <SheetDescription className="text-center text-xs">
                จัดการข้อมูลส่วนตัวและตั้งค่าบัญชี
              </SheetDescription>
            </SheetHeader>

            {/* Avatar Centered On Top */}
            <div className="relative mx-auto mt-2 mb-3 inline-block">
              <div
                className="relative group cursor-pointer"
                onClick={handleAvatarClick}
              >
                <Avatar className="size-24 border-2 border-border/80 shadow-xs transition-opacity group-hover:opacity-90">
                  <AvatarImage src={profilePicture} alt={username} />
                  <AvatarFallback className="text-2xl font-bold bg-muted text-foreground">
                    {getInitials(username || user?.username)}
                  </AvatarFallback>
                </Avatar>

                {/* Upload Button Overlay */}
                <div
                  className="absolute bottom-0 right-0 flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-transform hover:scale-105 active:scale-95"
                  title="อัปโหลดรูปโปรไฟล์ใหม่"
                >
                  <Camera className="size-4" />
                </div>
              </div>
            </div>

            {/* Centered Name and Email */}
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-foreground tracking-tight flex items-center justify-center gap-2">
                {username || user?.username || "ผู้ใช้"}
                {user?.role?.name && (
                  <Badge
                    variant="secondary"
                    className="text-[10px] px-2 py-0.5 font-normal"
                  >
                    {user.role.name}
                  </Badge>
                )}
              </h3>
              <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
                <Mail className="size-3 text-muted-foreground/70" />
                {user?.email}
              </p>
            </div>
          </div>

          {/* Form Content Body */}
          <form onSubmit={handleSave} className="flex-1 p-6 space-y-5">
            <div className="rounded-xl border border-border/60 bg-card p-4 space-y-4 shadow-xs">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                ข้อมูลส่วนตัว
              </h4>

              <FieldGroup className="space-y-4">
                {/* Username Field with Lock Toggle */}
                <Field>
                  <div className="flex items-center justify-between mb-1">
                    <FieldLabel
                      htmlFor="drawer_username"
                      className="text-xs font-medium"
                    >
                      ชื่อผู้ใช้ (Username)
                    </FieldLabel>
                    <button
                      type="button"
                      onClick={() => setIsEditingUsername(!isEditingUsername)}
                      className={cn(
                        "inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md transition-colors",
                        isEditingUsername
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted",
                      )}
                    >
                      {isEditingUsername ? (
                        <>
                          <CheckCircle2 className="size-3.5" />
                          แก้ไขอยู่
                        </>
                      ) : (
                        <>
                          <Pencil className="size-3.5" />
                          ปลดล็อกเพื่อแก้ไข
                        </>
                      )}
                    </button>
                  </div>
                  <Input
                    id="drawer_username"
                    type="text"
                    required
                    disabled={!isEditingUsername}
                    placeholder="john_doe"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className={cn(
                      "transition-all",
                      !isEditingUsername &&
                        "bg-muted/40 text-muted-foreground border-transparent cursor-not-allowed opacity-90",
                    )}
                  />
                </Field>

                {/* Email Field (Always Locked) */}
                <Field>
                  <div className="flex items-center justify-between mb-1">
                    <FieldLabel
                      htmlFor="drawer_email"
                      className="text-xs font-medium"
                    >
                      อีเมล (Email)
                    </FieldLabel>
                    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground/70">
                      <Lock className="size-3" />
                      ล็อกไว้
                    </span>
                  </div>
                  <Input
                    id="drawer_email"
                    type="email"
                    disabled
                    value={user?.email || ""}
                    className="bg-muted/40 text-muted-foreground border-transparent cursor-not-allowed opacity-80"
                  />
                </Field>

                {/* Bio Field with Lock Toggle */}
                <Field>
                  <div className="flex items-center justify-between mb-1">
                    <FieldLabel
                      htmlFor="drawer_bio"
                      className="text-xs font-medium"
                    >
                      คำอธิบายโปรไฟล์ (Bio)
                    </FieldLabel>
                    <button
                      type="button"
                      onClick={() => setIsEditingBio(!isEditingBio)}
                      className={cn(
                        "inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md transition-colors",
                        isEditingBio
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted",
                      )}
                    >
                      {isEditingBio ? (
                        <>
                          <CheckCircle2 className="size-3.5" />
                          แก้ไขอยู่
                        </>
                      ) : (
                        <>
                          <Pencil className="size-3.5" />
                          ปลดล็อกเพื่อแก้ไข
                        </>
                      )}
                    </button>
                  </div>
                  <textarea
                    id="drawer_bio"
                    rows={3}
                    disabled={!isEditingBio}
                    placeholder="แนะนำตัวเองสั้นๆ..."
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className={cn(
                      "flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring",
                      !isEditingBio &&
                        "bg-muted/40 text-muted-foreground border-transparent cursor-not-allowed opacity-90",
                    )}
                  />
                </Field>
              </FieldGroup>
            </div>

            {/* Action Save/Cancel Buttons */}
            <div className="pt-1 flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
                disabled={isSaving}
              >
                ปิด
              </Button>
              <Button
                type="submit"
                className="flex-1 gap-1.5"
                disabled={isSaving || !hasChanges}
              >
                {isSaving ? (
                  <span className="animate-spin text-xs">...</span>
                ) : (
                  <Check className="size-4" />
                )}
                {isSaving ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
              </Button>
            </div>

            {/* Hidden Advanced Settings Section (Deep Access) */}
            <div className="mt-8 pt-4 border-t border-border/50">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full flex items-center justify-between py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <span className="flex items-center gap-1.5 font-medium">
                  <Shield className="size-3.5" />
                  การตั้งค่าขั้นสูงและความปลอดภัย
                </span>
                {showAdvanced ? (
                  <ChevronDown className="size-3.5" />
                ) : (
                  <ChevronRight className="size-3.5" />
                )}
              </button>

              {showAdvanced && (
                <div className="mt-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="flex items-center gap-1.5 text-destructive font-semibold text-xs">
                    <ShieldAlert className="size-4" />
                    การจัดการบัญชีระดับสูง
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    การลบบัญชีผู้ใช้จะถอนสิทธิ์และลบข้อมูลของคุณถาวร ต้องยืนยันตัวตน 2
                    ขั้นตอนก่อนดำเนินการ
                  </p>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      onOpenChange(false);
                      setDeleteStep(1);
                      setDeletePasswordInput("");
                    }}
                    className="w-full gap-1.5 mt-1"
                  >
                    <Trash2 className="size-3.5" />
                    ดำเนินการลบบัญชีผู้ใช้
                  </Button>
                </div>
              )}
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* TWO-STEP DELETION PROCESS DIALOGS */}

      {/* STEP 1: Authentication & Password Verification */}
      <ConfirmDeleteDialog
        open={deleteStep === 1}
        onOpenChange={(v) => {
          if (!v) {
            setDeleteStep(0);
            setDeletePasswordInput("");
          }
        }}
        title="ยืนยันการลบบัญชีผู้ใช้ (ขั้นที่ 1 จาก 2)"
        description={
          <>
            การดำเนินการนี้ไม่สามารถย้อนกลับได้ ข้อมูลประวัติและสิทธิ์การใช้งานทั้งหมดภายใต้บัญชีผู้ใช้{" "}
            <strong className="text-foreground">"{user?.username}"</strong>{" "}
            จะถูกลบออกถาวร
          </>
        }
        onConfirm={() => {
          if (!deletePasswordInput.trim()) {
            toast.error("กรุณากรอกรหัสผ่านเพื่อยืนยันตัวตน");
            return;
          }
          setDeleteStep(2);
        }}
        isDeleting={!deletePasswordInput.trim()}
        confirmLabel="ถัดไป (ยืนยันขั้นที่ 2)"
      >
        <div className="space-y-1.5 pt-2">
          <label
            htmlFor="delete-account-password"
            className="text-xs font-semibold text-muted-foreground"
          >
            กรอกรหัสผ่านของคุณเพื่อยืนยันการลบ{" "}
            <span className="text-destructive">*</span>
          </label>
          <Input
            id="delete-account-password"
            type="password"
            placeholder="รหัสผ่านบัญชีผู้ใช้ของคุณ"
            value={deletePasswordInput}
            onChange={(e) => setDeletePasswordInput(e.target.value)}
            className="h-9"
          />
        </div>
      </ConfirmDeleteDialog>

      {/* STEP 2: Final Confirmation & Execution */}
      <ConfirmDeleteDialog
        open={deleteStep === 2}
        onOpenChange={(v) => {
          if (!v) {
            setDeleteStep(0);
          }
        }}
        title="คำเตือนครั้งสุดท้าย! ยืนยันการลบบัญชีถาวร (ขั้นที่ 2 จาก 2)"
        description={
          <>
            คุณกำลังจะลบบัญชีผู้ใช้{" "}
            <strong className="text-destructive font-semibold">
              "{user?.username}"
            </strong>{" "}
            อย่างถาวร ข้อมูลส่วนตัว สิทธิ์การใช้งาน และประวัติการทำรายการทั้งหมดจะถูกลบทันที
            (หมายเหตุ: หากยังเป็นเจ้าของร้านค้า ต้องลบร้านค้าออกก่อน)
          </>
        }
        onConfirm={handleFinalDeleteAccount}
        isDeleting={isDeletingAccount}
        confirmLabel="กดยืนยันการลบบัญชีถาวร"
        cancelLabel="ยกเลิกและย้อนกลับ"
      />
    </>
  );
}
