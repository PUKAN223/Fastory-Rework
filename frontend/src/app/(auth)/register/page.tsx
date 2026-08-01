import { Suspense } from "react";
import { AppLogo } from "@/components/ui/app-logo";
import { RegisterForm } from "@/components/forms/RegisterForm";

export default function RegisterPage() {
  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <a href="#" className="self-center font-medium">
          <AppLogo size={32} className="text-lg" />
        </a>
        <Suspense fallback={<div className="text-center text-sm text-muted-foreground">กำลังโหลด...</div>}>
          <RegisterForm />
        </Suspense>
      </div>
    </div>
  );
}
