"use client";

import { useEffect, useState } from "react";
import { Loader } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
import { authLogin } from "@/features/authSlice";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/store/hook";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const authStatus = useAppSelector((state) => state.auth.status);
  const loginLoading = mounted && authStatus === "loading";

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(6),
    });

    const formData = new FormData(e.currentTarget);
    const data = {
      email: formData.get("email"),
      password: formData.get("password"),
    };

    const result = schema.safeParse(data);
    if (!result.success) {
      toast(result.error.issues.map((err) => err.message).join(", "));
      return;
    }

    try {
      await dispatch(
        authLogin({
          email: result.data.email,
          password: result.data.password,
        }),
      ).unwrap();

      toast.success("เข้าสู่ระบบสำเร็จ");
      router.push("/stores");
    } catch (error) {
      const message =
        typeof error === "string" ? error : "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
      toast.error(message);
    }
  };

  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");

  useEffect(() => {
    if (errorParam) {
      toast.error(errorParam);
    }
  }, [errorParam]);

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

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">ยินดีต้อนรับ</CardTitle>
          <CardDescription>กรุณาเข้าสู่ระบบเพื่อดำเนินการต่อไป</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <Button
                  variant="outline"
                  type="button"
                  disabled={loginLoading}
                  onClick={handleGoogleLogin}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path
                      d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                      fill="currentColor"
                    />
                  </svg>
                  เข้าสู่ระบบด้วย Google
                </Button>
              </Field>
              <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
                หรือเข้าสู่ระบบด้วยชื่อผู้ใช้
              </FieldSeparator>
              <Field>
                <FieldLabel htmlFor="email">อีเมล</FieldLabel>
                <Input
                  id="email"
                  name="email"
                  type="text"
                  placeholder="john@example.com"
                  required
                />
              </Field>
              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="password">รหัสผ่าน</FieldLabel>
                  <a
                    href="#"
                    className="ml-auto text-sm underline-offset-4 hover:underline"
                  >
                    ลืมรหัสผ่าน?
                  </a>
                </div>
                <Input id="password" name="password" type="password" required />
              </Field>
              <Field>
                <Button type="submit" disabled={loginLoading}>
                  {loginLoading ? <Loader className="animate-spin" /> : null}
                  {loginLoading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
                </Button>
              </Field>
              <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
                หรือ
              </FieldSeparator>
              <Field>
                <p className="text-muted-foreground text-center text-sm">
                  ยังไม่มีบัญชี?{" "}
                  <Link
                    href="/register"
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    สมัครสมาชิก
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
