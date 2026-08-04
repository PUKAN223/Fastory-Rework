"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { driver, type Config } from "driver.js";
import "driver.js/dist/driver.css";
import { useAppSelector } from "@/store/hook";

export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const authStatus = useAppSelector((state) => state.auth.status);
  const user = useAppSelector((state) => state.auth.user);

  const driverInitialized = useRef(false);
  const isNavigating = useRef(false);

  useEffect(() => {
    if (authStatus !== "authed" || !user) return;

    const hasSeenTutorial = localStorage.getItem("hasSeenTutorial");
    const isDemoUser = user.email === "test@example.com";

    if (
      isDemoUser &&
      !hasSeenTutorial &&
      (pathname === "/dashboard" ||
        pathname === "/stores" ||
        pathname.startsWith("/inventory"))
    ) {
      if (driverInitialized.current) return;
      driverInitialized.current = true;

      const navigateThen = (url: string, obj: ReturnType<typeof driver>) => {
        if (isNavigating.current) return;
        isNavigating.current = true;
        router.push(url);
        setTimeout(() => {
          isNavigating.current = false;
          obj.moveNext();
        }, 1200);
      };

      const config: Config = {
        showProgress: true,
        popoverClass: "dv-popover",
        nextBtnText: "Next",
        prevBtnText: "Back",
        doneBtnText: "Get Started",
        progressText: "{{current}} of {{total}}",
        animate: true,
        overlayOpacity: 0.55,
        steps: [
          // ── 0: Welcome ──────────────────────────────────────────────
          {
            popover: {
              title: "Welcome to Fastory",
              description:
                "ระบบจัดการคลังสินค้าและหน้าร้านที่ออกแบบมาเพื่อความรวดเร็ว เราจะพาคุณทัวร์ฟีเจอร์หลักๆ ในเวลาเพียง 1 นาที",
              align: "center",
            },
          },

          // ── 1: Sidebar / Sidebar Trigger ────────────────────────────
          // On desktop: highlight the aside element
          // On mobile: highlight the hamburger trigger button
          {
            element: window.innerWidth >= 768 ? "aside" : "#sidebar-trigger",
            popover: {
              title: "แถบเมนูหลัก",
              description:
                window.innerWidth >= 768
                  ? "ศูนย์รวมการเข้าถึงทุกส่วนของระบบ ไม่ว่าจะเป็นการจัดการคลังสินค้า, ระบบ POS หรือรายงานสรุป"
                  : "กดปุ่มนี้เพื่อเปิดเมนูหลักของระบบ ซึ่งให้คุณเข้าถึงคลังสินค้า, POS และรายงานสรุป",
              side: window.innerWidth >= 768 ? "right" : "bottom",
              align: "start",
            },
          },

          // ── 2: Header ── onNextClick navigates to /inventory/products ─
          {
            element: "header",
            popover: {
              title: "แถบนำทาง",
              description:
                "แสดงหน้าที่คุณกำลังอยู่ และให้คุณย้อนกลับไปหน้าก่อนหน้าได้อย่างรวดเร็ว",
              side: "bottom",
              align: "start",
            },
          },

          // ── 3: Products table (after nav to /inventory/products) ────
          {
            element: "#products-table",
            popover: {
              title: "ตารางสินค้า",
              description:
                "แสดงรายการสินค้าทั้งหมด คลิกที่แถวเพื่อแก้ไข, ค้นหาสินค้า, กรองหมวดหมู่ หรือเรียงลำดับได้ทันที",
              side: "top",
              align: "start",
            },
          },

          // ── 4: POS intro (after nav to /sales/pos) ──────────────────
          {
            popover: {
              title: "ระบบขายหน้าร้าน (POS)",
              description:
                "รองรับการยิงบาร์โค้ด, ค้นหาสินค้า, คำนวณเงินทอน และออกใบเสร็จได้ทันที ออกแบบมาเพื่อความเร็วสูงสุด",
              align: "center",
            },
          },

          // ── 5: Dashboard (after nav to /dashboard) ──────────────────
          {
            popover: {
              title: "แดชบอร์ด & รายงาน",
              description:
                "สรุปยอดขายแบบ Real-time พร้อมผู้ช่วย AI ที่วิเคราะห์ข้อมูลและให้คำแนะนำทางธุรกิจโดยอัตโนมัติ",
              align: "center",
            },
          },

          // ── 6: AI Assistant (after nav to /assistant) ───────────────
          {
            popover: {
              title: "ผู้ช่วย AI",
              description:
                "ถามคำถามเกี่ยวกับธุรกิจของคุณ วิเคราะห์ยอดขาย หรือขอคำแนะนำเพื่อปรับปรุงร้านค้าได้ทุกเมื่อ",
              align: "center",
            },
          },

          // ── 7: Done ─────────────────────────────────────────────────
          {
            popover: {
              title: "พร้อมใช้งาน",
              description:
                "เลือกร้านค้าของคุณจากเมนูด้านซ้าย และเริ่มต้นได้เลย หากมีข้อสงสัยใดๆ กดที่ไอคอน AI ผู้ช่วยได้ทุกเมื่อ",
              align: "center",
            },
          },
        ],

        onNextClick: () => {
          const current = driverObj.getActiveIndex() ?? 0;
          // Step 2 → Inventory Products
          if (current === 2) { navigateThen("/inventory/products", driverObj); return; }
          // Step 3 (table shown) → POS
          if (current === 3) { navigateThen("/sales/pos", driverObj); return; }
          // Step 4 → Dashboard
          if (current === 4) { navigateThen("/dashboard", driverObj); return; }
          // Step 5 → AI Assistant
          if (current === 5) { navigateThen("/assistant", driverObj); return; }
          if (!isNavigating.current) driverObj.moveNext();
        },

        // Clamp popover inside viewport after driver.js positions it
        onHighlightStarted: () => {
          requestAnimationFrame(() => {
            const popover = document.querySelector<HTMLElement>(".dv-popover.driver-popover");
            if (!popover) return;

            const rect = popover.getBoundingClientRect();
            const vw = window.innerWidth;
            const vh = window.innerHeight;
            const margin = 12;

            let left = parseFloat(popover.style.left || "0");
            let top  = parseFloat(popover.style.top  || "0");

            // Clamp right overflow
            if (rect.right > vw - margin) {
              left -= rect.right - (vw - margin);
            }
            // Clamp left overflow
            if (rect.left < margin) {
              left += margin - rect.left;
            }
            // Clamp bottom overflow
            if (rect.bottom > vh - margin) {
              top -= rect.bottom - (vh - margin);
            }
            // Clamp top overflow
            if (rect.top < margin) {
              top += margin - rect.top;
            }

            popover.style.left = `${left}px`;
            popover.style.top  = `${top}px`;
          });
        },

        onDestroyStarted: () => {
          if (!driverObj.hasNextStep() || confirm("ออกจากบทแนะนำใช่หรือไม่?")) {
            driverObj.destroy();
            localStorage.setItem("hasSeenTutorial", "true");
          }
        },
      };

      const driverObj = driver(config);

      const startTutorial = () => {
        if (document.querySelector('[role="dialog"]')) {
          setTimeout(startTutorial, 1000);
          return;
        }
        driverObj.drive();
      };

      setTimeout(startTutorial, 800);
    }
  }, [authStatus, user, pathname, router]);

  return (
    <>
      <style>{`
        /* ── Reset ──────────────────────────────────────────────────────── */
        .driver-overlay { backdrop-filter: none !important; }

        /* ── Container ──────────────────────────────────────────────────── */
        .dv-popover.driver-popover {
          background-color: var(--popover) !important;
          color: var(--popover-foreground) !important;
          border: 1px solid var(--border) !important;
          border-radius: var(--radius-lg) !important;
          box-shadow:
            0 0 0 1px color-mix(in oklch, var(--border) 80%, transparent),
            0 8px 20px -4px rgb(0 0 0 / 0.3),
            0 24px 48px -12px rgb(0 0 0 / 0.45) !important;
          padding: 0 !important;
          font-family: var(--font-sans), system-ui, sans-serif !important;
          /* Always sit above sidebar, sticky headers, modals & tooltips */
          z-index: 99999 !important;
          width: min(340px, calc(100vw - 2rem)) !important;
          max-width: none !important;
          max-height: calc(100vh - 2rem) !important;
          overflow: hidden !important;
          /* Keep driver.js default positioning (it uses absolute/fixed internally) */
        }

        /* Overlay stays just below the popover */
        .driver-overlay,
        #driver-page-overlay {
          z-index: 99998 !important;
        }

        /* ── Title ──────────────────────────────────────────────────────── */
        .dv-popover .driver-popover-title {
          display: block !important;
          /* top + sides padding; right is wider for the × button */
          padding: 1.125rem 2.75rem 0 1.25rem !important;
          margin: 0 !important;
          font-size: 0.9375rem !important;
          font-weight: 600 !important;
          color: var(--foreground) !important;
          letter-spacing: -0.01em !important;
          line-height: 1.4 !important;
        }

        /* ── Description ────────────────────────────────────────────────── */
        .dv-popover .driver-popover-description {
          display: block !important;
          padding: 0.375rem 1.25rem 1.125rem !important;
          margin: 0 !important;
          font-size: 0.8125rem !important;
          color: var(--muted-foreground) !important;
          line-height: 1.65 !important;
        }

        /* ── Footer ─────────────────────────────────────────────────────── */
        .dv-popover .driver-popover-footer {
          display: flex !important;
          align-items: center !important;
          justify-content: space-between !important;
          gap: 0.5rem !important;
          padding: 0.625rem 0.875rem 0.625rem 1.25rem !important;
          margin: 0 !important;
          border-top: 1px solid var(--border) !important;
          background-color: color-mix(in oklch, var(--muted) 50%, transparent) !important;
        }

        /* ── Progress ───────────────────────────────────────────────────── */
        .dv-popover .driver-popover-progress-text {
          flex: 1 !important;
          font-size: 0.6875rem !important;
          font-weight: 500 !important;
          color: var(--muted-foreground) !important;
          letter-spacing: 0.04em !important;
          text-transform: uppercase !important;
          line-height: 1 !important;
        }

        /* ── Button group ───────────────────────────────────────────────── */
        .dv-popover .driver-popover-navigation-btns {
          display: flex !important;
          align-items: center !important;
          gap: 0.375rem !important;
          margin: 0 !important;
        }

        /* ── Base button (Back) ─────────────────────────────────────────── */
        .dv-popover .driver-popover-btn {
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          height: 1.875rem !important;
          padding: 0 0.75rem !important;
          font-size: 0.8125rem !important;
          font-weight: 500 !important;
          font-family: var(--font-sans), system-ui, sans-serif !important;
          border-radius: var(--radius-md) !important;
          border: 1px solid var(--border) !important;
          background-color: transparent !important;
          color: var(--foreground) !important;
          cursor: pointer !important;
          text-shadow: none !important;
          box-shadow: none !important;
          line-height: 1 !important;
          white-space: nowrap !important;
          transition: background-color 0.12s ease, color 0.12s ease, opacity 0.12s ease !important;
        }

        .dv-popover .driver-popover-btn:focus-visible {
          outline: 2px solid var(--ring) !important;
          outline-offset: 2px !important;
        }

        .dv-popover .driver-popover-prev-btn:hover {
          background-color: var(--accent) !important;
          color: var(--accent-foreground) !important;
        }

        /* ── Next / Done button ─────────────────────────────────────────── */
        .dv-popover .driver-popover-next-btn {
          background-color: var(--primary) !important;
          color: var(--primary-foreground) !important;
          border-color: transparent !important;
        }

        .dv-popover .driver-popover-next-btn:hover {
          opacity: 0.88 !important;
        }

        /* ── Close (×) button ───────────────────────────────────────────── */
        .dv-popover .driver-popover-close-btn {
          position: absolute !important;
          top: 0.75rem !important;
          right: 0.75rem !important;
          width: 1.625rem !important;
          height: 1.625rem !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          background: transparent !important;
          border: 1px solid transparent !important;
          border-radius: var(--radius-sm) !important;
          color: var(--muted-foreground) !important;
          font-size: 0.875rem !important;
          cursor: pointer !important;
          line-height: 1 !important;
          z-index: 1 !important;
          transition: background-color 0.12s ease, color 0.12s ease, border-color 0.12s ease !important;
        }

        .dv-popover .driver-popover-close-btn:hover {
          background-color: var(--accent) !important;
          color: var(--foreground) !important;
          border-color: var(--border) !important;
        }

        /* ── Arrows ─────────────────────────────────────────────────────── */
        .dv-popover.driver-popover .driver-popover-arrow-side-top::before    { border-bottom-color: var(--popover) !important; }
        .dv-popover.driver-popover .driver-popover-arrow-side-bottom::before { border-top-color: var(--popover) !important; }
        .dv-popover.driver-popover .driver-popover-arrow-side-left::before   { border-right-color: var(--popover) !important; }
        .dv-popover.driver-popover .driver-popover-arrow-side-right::before  { border-left-color: var(--popover) !important; }

        /* ── Highlight ring ──────────────────────────────────────────────── */
        .driver-active-element {
          outline: 2px solid var(--primary) !important;
          outline-offset: 4px !important;
          border-radius: var(--radius-md) !important;
        }

        /* ── Mobile (<480px) ─────────────────────────────────────────────── */
        @media (max-width: 480px) {
          .dv-popover.driver-popover {
            width: calc(100vw - 1.5rem) !important;
          }
          .dv-popover .driver-popover-title {
            font-size: 0.875rem !important;
            padding: 1rem 2.5rem 0 1rem !important;
          }
          .dv-popover .driver-popover-description {
            font-size: 0.75rem !important;
            padding: 0.375rem 1rem 1rem !important;
          }
          .dv-popover .driver-popover-footer {
            padding: 0.5rem 0.75rem 0.5rem 1rem !important;
          }
          .dv-popover .driver-popover-btn {
            height: 1.75rem !important;
            padding: 0 0.625rem !important;
            font-size: 0.75rem !important;
          }
        }
      `}</style>
      {children}
    </>
  );
}
