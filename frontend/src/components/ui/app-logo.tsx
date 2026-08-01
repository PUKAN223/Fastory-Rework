import React from "react";
import { cn } from "@/lib/utils";

interface AppLogoProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: number;
  showText?: boolean;
  className?: string;
}

export function AppLogo({
  size = 28,
  showText = true,
  className,
  ...props
}: AppLogoProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2.5 font-bold leading-none select-none",
        className,
      )}
      {...props}
    >
      <div className="relative flex items-center justify-center shrink-0">
        {/* Light Mode Logo */}
        <img
          src="/logo-light.png"
          alt="Fastory Logo"
          style={{ width: size, height: size }}
          className="dark:hidden object-contain"
        />
        {/* Dark Mode Logo */}
        <img
          src="/logo-dark.png"
          alt="Fastory Logo"
          style={{ width: size, height: size }}
          className="hidden dark:block object-contain"
        />
      </div>
      {showText && (
        <span className="tracking-tight text-foreground">Fastory</span>
      )}
    </div>
  );
}
