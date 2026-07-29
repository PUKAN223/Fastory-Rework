import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";

interface ConfirmDeleteDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;
  /** Dialog title */
  title: string;
  /** Dialog description / warning text */
  description: ReactNode;
  /** Async confirm handler — dialog stays open while loading */
  onConfirm: () => void | Promise<void>;
  /** Whether the delete operation is in progress */
  isDeleting?: boolean;
  /** Custom label for the confirm button (default: "ยืนยันลบ") */
  confirmLabel?: string;
  /** Custom label for the cancel button (default: "ยกเลิก") */
  cancelLabel?: string;
  /** Optional trigger element — if provided, wraps in AlertDialogTrigger */
  trigger?: ReactNode;
  /** Optional extra content between description and footer (e.g. password input, text confirm) */
  children?: ReactNode;
}

/**
 * Reusable delete confirmation dialog built on AlertDialog.
 *
 * Usage with controlled open state (most common):
 *
 * ```tsx
 * <ConfirmDeleteDialog
 *   open={deleteOpen}
 *   onOpenChange={setDeleteOpen}
 *   title="ยืนยันการลบสินค้า"
 *   description={`ต้องการลบ "${product.name}" ใช่หรือไม่?`}
 *   onConfirm={handleDelete}
 *   isDeleting={isDeletingProduct}
 * />
 * ```
 *
 * Usage with inline trigger:
 *
 * ```tsx
 * <ConfirmDeleteDialog
 *   open={open}
 *   onOpenChange={setOpen}
 *   title="ยืนยันการลบ"
 *   description="การกระทำนี้ไม่สามารถย้อนกลับได้"
 *   onConfirm={handleDelete}
 *   trigger={<Button variant="destructive">ลบ</Button>}
 * />
 * ```
 */
export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  isDeleting = false,
  confirmLabel = "ยืนยันลบ",
  cancelLabel = "ยกเลิก",
  trigger,
  children,
}: ConfirmDeleteDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      {trigger && (
        <AlertDialogTrigger render={trigger as React.ReactElement} />
      )}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        {/* Optional extra content (e.g. password input, name confirm input) */}
        {children && <div className="px-6 pb-4">{children}</div>}

        <AlertDialogFooter className="gap-3 sm:gap-3">
          <AlertDialogClose
            render={<Button variant="outline">{cancelLabel}</Button>}
          />
          <Button
            variant="destructive"
            disabled={isDeleting}
            onClick={onConfirm}
          >
            {isDeleting ? "กำลังลบ..." : confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
