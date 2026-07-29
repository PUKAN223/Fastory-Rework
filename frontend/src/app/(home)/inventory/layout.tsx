"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { label: "สินค้า", href: "/inventory/products" },
  { label: "หมวดหมู่", href: "/inventory/categories" },
  { label: "คลังสินค้า", href: "/inventory/warehouses" },
  { label: "ประวัติสต็อก", href: "/inventory/movements" },
];

export default function InventoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col gap-0">
      <div className="border-b border-border/60">
        <nav className="flex gap-0 px-0" aria-label="คลังสินค้า">
          {tabs.map((tab) => {
            const isActive =
              pathname === tab.href || pathname.startsWith(`${tab.href}/`);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "relative px-4 py-3 text-sm font-medium transition-colors",
                  "hover:text-foreground",
                  isActive
                    ? "text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary"
                    : "text-muted-foreground",
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}
