"use client";

import { Loader } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  const dispatch = useAppDispatch();
  const authStatus = useAppSelector((state) => state.auth.status);
  const registerLoading = authStatus === "loading";

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const schema = z.object({
      username: z.string().min(1, "กรุณากรอกชื่อผู้ใช้"),
      email: z.string().email("กรุณากรอกอีเมลที่ถูกต้อง"),
      password: z.string().min(6, "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร"),
    });

    const formData = new FormData(e.currentTarget);
    const data = {
      username: formData.get("username"),
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
        authRegister({
          username: result.data.username,
          email: result.data.email,
          password: result.data.password,
        }),
      ).unwrap();

      toast.success("สมัครสมาชิกสำเร็จ");
      router.push("/dashboard");
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
          <CardDescription>กรอกข้อมูลด้านล่างเพื่อสมัครสมาชิก</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="username">ชื่อผู้ใช้</FieldLabel>
                <Input
                  id="username"
                  name="username"
                  type="text"
                  placeholder="john_doe"
                  required
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
                />
              </Field>
              <Field>
                <Button type="submit" disabled={registerLoading}>
                  {registerLoading ? <Loader className="animate-spin" /> : null}
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
                    className="text-primary underline-offset-4 hover:underline"
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
