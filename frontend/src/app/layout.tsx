import type { Metadata } from "next";
import { Kanit } from "next/font/google";
import "./globals.css";

import { ThemeProvider } from "next-themes";
import { Providers } from "@/components/Providers";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

const kanit = Kanit({
  subsets: ["latin", "thai"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
  variable: "--font-kanit",
});

export const metadata: Metadata = {
  title: "Fastory - ระบบจัดการสินค้า",
  description:
    "Fastory เป็นระบบจัดการสินค้าสำหรับร้านค้าออนไลน์ที่ช่วยให้คุณสามารถจัดการสินค้าของคุณได้อย่างง่ายดายและมีประสิทธิภาพ ด้วยฟีเจอร์ที่ครบครัน เช่น การเพิ่มสินค้า การจัดการคลังสินค้า และการวิเคราะห์ข้อมูล เพื่อช่วยให้ธุรกิจของคุณเติบโตอย่างรวดเร็ว",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${kanit.className} ${kanit.variable} antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <Providers>
            <TooltipProvider>
              {children}
              <Toaster />
            </TooltipProvider>
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
