import { Suspense } from "react";
import { AppLogo } from "@/components/ui/app-logo";
import { LoginForm } from "@/components/forms/LoginForm";

export default function LoginPage() {
  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <a href="#" className="self-center font-medium">
          <AppLogo size={32} className="text-lg" />
        </a>
        <Suspense fallback={<div className="text-center text-sm text-muted-foreground">กำลังโหลด...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
