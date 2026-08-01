"use client";

import React, { useEffect, useState } from "react";
import { Minus, Square, Copy, X } from "lucide-react";

export function WindowControls() {
  const [isTauri, setIsTauri] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    // Detect if running inside a Tauri container
    if (
      typeof window !== "undefined" &&
      ("__TAURI_INTERNALS__" in window || "__TAURI__" in window)
    ) {
      setIsTauri(true);

      // Dynamically import Tauri window module
      import("@tauri-apps/api/window").then(({ getCurrentWindow }) => {
        const appWindow = getCurrentWindow();
        appWindow.isMaximized().then(setIsMaximized);

        // Listen for window resize to toggle maximize/restore icon state
        appWindow.onResized(() => {
          appWindow.isMaximized().then(setIsMaximized);
        });
      }).catch(() => {
        // Fallback if plugin fails
      });
    }
  }, []);

  if (!isTauri) return null;

  const handleMinimize = async () => {
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      await getCurrentWindow().minimize();
    } catch (e) {
      console.error(e);
    }
  };

  const handleMaximize = async () => {
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      await getCurrentWindow().toggleMaximize();
      const maximized = await getCurrentWindow().isMaximized();
      setIsMaximized(maximized);
    } catch (e) {
      console.error(e);
    }
  };

  const handleClose = async () => {
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      await getCurrentWindow().close();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div
      data-tauri-drag-region
      className="h-8 w-full bg-card/90 border-b border-border/40 backdrop-blur-md flex items-center justify-between px-3 select-none z-50 shrink-0"
    >
      {/* Draggable Title / Brand Area */}
      <div data-tauri-drag-region className="flex items-center gap-2 text-xs font-semibold text-muted-foreground pointer-events-none">
        <span className="inline-block size-2 rounded-full bg-emerald-500 animate-pulse" />
        <span>Fastory Desktop</span>
      </div>

      {/* Control Buttons */}
      <div className="flex items-center space-x-1 no-drag">
        <button
          type="button"
          onClick={handleMinimize}
          className="size-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          title="Minimize"
        >
          <Minus className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={handleMaximize}
          className="size-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          title={isMaximized ? "Restore" : "Maximize"}
        >
          {isMaximized ? (
            <Copy className="size-3" />
          ) : (
            <Square className="size-3" />
          )}
        </button>
        <button
          type="button"
          onClick={handleClose}
          className="size-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors"
          title="Close"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
