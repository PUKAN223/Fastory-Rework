import React from "react";
import { cn } from "@/lib/utils";
import Image from "next/image";

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
      <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
        {/* Light Mode Logo */}
        <div className="absolute inset-0 dark:hidden">
          <Image
            src="/logo-light.png"
            alt="Fastory Logo"
            fill
            sizes={`${size}px`}
            priority
            className="object-contain"
          />
        </div>
        {/* Dark Mode Logo */}
        <div className="absolute inset-0 hidden dark:block">
          <Image
            src="/logo-dark.png"
            alt="Fastory Logo"
            fill
            sizes={`${size}px`}
            priority
            className="object-contain"
          />
        </div>
      </div>
      {showText && (
        <span className="tracking-tight text-foreground">Fastory</span>
      )}
    </div>
  );
}
