import { toast } from "sonner";

function notifyErrorOnce(
  error: string | null,
  lastRef: React.MutableRefObject<string | null>,
) {
  if (!error || lastRef.current === error) return;

  lastRef.current = error;
  const normalized = error.toLowerCase();

  if (normalized.includes("permission") || normalized.includes("403")) {
    toast.error("ไม่มีสิทธิ์ใช้งานเมนูนี้");
    return;
  }

  toast.error(error);
}

export { notifyErrorOnce };
