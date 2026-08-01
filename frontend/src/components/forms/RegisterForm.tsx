"use client";

import { AlertCircle, Loader } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authRegister } from "@/features/authSlice";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/store/hook";

export function RegisterForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const authStatus = useAppSelector((state) => state.auth.status);
  const registerLoading = mounted && authStatus === "loading";

  const errorParam = searchParams.get("error");
  const paramEmail = searchParams.get("email") || "";
  const paramName = searchParams.get("name") || "";
  const paramGoogleId = searchParams.get("google_id") || "";
  const paramPicture = searchParams.get("picture") || "";

  const handleGoogleLogin = async () => {
    const isTauri =
      typeof window !== "undefined" &&
      ("__TAURI_INTERNALS__" in window || "__TAURI__" in window);

    if (isTauri) {
      try {
        const res = await fetch("/api/auth/google?json=true");
        const data = await res.json();
        if (data.url) {
          const popup = window.open(
            data.url,
            "GoogleLogin",
            "width=500,height=650,top=100,left=100",
          );

          const interval = setInterval(async () => {
            try {
              const checkRes = await fetch("/api/auth/me");
              if (checkRes.ok) {
                const checkData = await checkRes.json();
                if (checkData.user || checkData.authenticated) {
                  clearInterval(interval);
                  if (popup && !popup.closed) popup.close();
                  toast.success("เข้าสู่ระบบด้วย Google สำเร็จ");
                  router.push("/stores");
                }
              }
            } catch (e) {
              // Ignore polling errors
            }
          }, 1500);
          return;
        }
      } catch (e) {
        console.error("Google Auth error:", e);
      }
    }

    window.location.href = "/api/auth/google";
  };

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (paramEmail) {
      setEmail(paramEmail);
    }
    if (paramName) {
      setUsername(paramName.replace(/\s+/g, "_"));
    } else if (paramEmail) {
      setUsername(paramEmail.split("@")[0]);
    }
  }, [paramEmail, paramName]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน");
      return;
    }

    const schema = z.object({
      username: z.string().min(1, "กรุณากรอกชื่อผู้ใช้"),
      email: z.string().email("กรุณากรอกอีเมลที่ถูกต้อง"),
      password: z.string().min(6, "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร"),
    });

    const result = schema.safeParse({ username, email, password });
    if (!result.success) {
      toast.error(result.error.issues.map((err) => err.message).join(", "));
      return;
    }

    try {
      await dispatch(
        authRegister({
          username: result.data.username,
          email: result.data.email,
          password: result.data.password,
          google_id: paramGoogleId || undefined,
          profile_picture: paramPicture || undefined,
        }),
      ).unwrap();

      toast.success("สมัครสมาชิกสำเร็จ");
      router.push("/stores");
    } catch (error) {
      const message = typeof error === "string" ? error : "ไม่สามารถสมัครสมาชิกได้";
      toast.error(message);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">สร้างบัญชีใหม่</CardTitle>
          <CardDescription>
            {errorParam === "account_not_found"
              ? "ไม่พบบัญชีนี้ กรุณากรอกรหัสผ่านเพื่อตั้งค่าบัญชีสมาชิกใหม่"
              : "กรอกข้อมูลด้านล่างเพื่อสมัครสมาชิก"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {errorParam === "account_not_found" && (
            <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-600 dark:text-amber-400">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span>
                ไม่พบข้อมูลบัญชีที่ลงทะเบียนด้วย Google นี้ในระบบ
                กรุณากรอกข้อมูลและตั้งรหัสผ่านเพื่อสมัครสมาชิกใหม่
              </span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <FieldGroup className="space-y-4">
              {!paramGoogleId && (
                <>
                  <Field>
                    <Button
                      variant="outline"
                      type="button"
                      disabled={registerLoading}
                      onClick={handleGoogleLogin}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                      >
                        <path
                          d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                          fill="currentColor"
                        />
                      </svg>
                      สมัครสมาชิกด้วย Google
                    </Button>
                  </Field>
                  <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
                    หรือสมัครด้วยอีเมล
                  </FieldSeparator>
                </>
              )}

              <Field>
                <FieldLabel htmlFor="username">ชื่อผู้ใช้</FieldLabel>
                <Input
                  id="username"
                  name="username"
                  type="text"
                  placeholder="john_doe"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="email">อีเมล</FieldLabel>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="john@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="password">รหัสผ่าน</FieldLabel>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="อย่างน้อย 6 ตัวอักษร"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="confirmPassword">ยืนยันรหัสผ่าน</FieldLabel>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="กรอกรหัสผ่านอีกครั้ง"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </Field>

              <Field>
                <Button
                  type="submit"
                  disabled={registerLoading}
                  className="w-full"
                >
                  {registerLoading ? (
                    <Loader className="animate-spin size-4" />
                  ) : null}
                  {registerLoading ? "กำลังสมัครสมาชิก..." : "สมัครสมาชิก"}
                </Button>
              </Field>

              <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
                หรือ
              </FieldSeparator>

              <Field>
                <p className="text-muted-foreground text-center text-sm">
                  มีบัญชีอยู่แล้ว?{" "}
                  <Link
                    href="/login"
                    className="text-primary underline-offset-4 hover:underline font-medium"
                  >
                    เข้าสู่ระบบ
                  </Link>
                </p>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
