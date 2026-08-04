import type { Metadata } from "next";
import "./globals.css";

import { ThemeProvider } from "next-themes";
import { Providers } from "@/components/Providers";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import { WindowControls } from "@/components/ui/WindowControls";

export const metadata: Metadata = {
  title: "Fastory - ระบบจัดการสินค้า",
  description:
    "Fastory เป็นระบบจัดการสินค้าสำหรับร้านค้าออนไลน์ที่ช่วยให้คุณสามารถจัดการสินค้าของคุณได้อย่างง่ายดายและมีประสิทธิภาพ ด้วยฟีเจอร์ที่ครบครัน เช่น การเพิ่มสินค้า การจัดการคลังสินค้า และการวิเคราะห์ข้อมูล เพื่อช่วยให้ธุรกิจของคุณเติบโตอย่างรวดเร็ว",
  icons: {
    icon: [
      { url: "/logo-light.png", media: "(prefers-color-scheme: light)" },
      { url: "/logo-dark.png", media: "(prefers-color-scheme: dark)" },
    ],
    shortcut: "/logo-dark.png",
    apple: "/logo-dark.png",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Fastory",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: import("next").Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Preconnect to font CDN early to reduce latency */}
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        {/* Preload critical font files to avoid FOIT */}
        <link
          rel="preload"
          href="https://cdn.jsdelivr.net/gh/lazywasabi/thai-web-fonts@main/fonts/LINESeedSansTH/LINESeedSansTH-Regular.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="https://cdn.jsdelivr.net/gh/lazywasabi/thai-web-fonts@main/fonts/LINESeedSansTH/LINESeedSansTH-Bold.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        {/* Preload logo images for Instant LCP */}
        <link rel="preload" href="/logo-light.webp" as="image" type="image/webp" />
        <link rel="preload" href="/logo-dark.webp" as="image" type="image/webp" />
      </head>
      <body className="font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <Providers>
            <TooltipProvider>
              <WindowControls />
              {children}
              <Toaster />
            </TooltipProvider>
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
