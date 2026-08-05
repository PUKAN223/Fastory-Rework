"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";

type ScannerStatus = "disconnected" | "connected";

interface GlobalScannerContextValue {
  token: string | null;
  status: ScannerStatus;
  lastPingAt: number | null;
}

const GlobalScannerContext = createContext<GlobalScannerContextValue>({
  token: null,
  status: "disconnected",
  lastPingAt: null,
});

export const useGlobalScannerContext = () => useContext(GlobalScannerContext);

export function GlobalScannerProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<ScannerStatus>("disconnected");
  const [lastPingAt, setLastPingAt] = useState<number | null>(null);

  // Initialize or retrieve token
  useEffect(() => {
    let savedToken = localStorage.getItem("fastory_scanner_token");
    if (!savedToken) {
      savedToken = uuidv4();
      localStorage.setItem("fastory_scanner_token", savedToken);
    }
    setToken(savedToken);
  }, []);

  // Connect to SSE
  useEffect(() => {
    if (!token) return;

    let eventSource: EventSource | null = null;
    let reconnectTimer: NodeJS.Timeout;

    const connect = () => {
      eventSource = new EventSource(`/api/scan-session?token=${token}`);

      eventSource.addEventListener("ready", () => {
        // SSE connection established. Status will become 'connected' when we receive a ping or scan from mobile.
      });

      eventSource.addEventListener("scan", (e) => {
        try {
          const { barcode } = JSON.parse(e.data);
          setStatus("connected");
          setLastPingAt(Date.now());
          // Broadcast to all active listeners in the DOM
          window.dispatchEvent(
            new CustomEvent("globalBarcodeScanned", { detail: barcode }),
          );
        } catch (err) {
          console.error("Failed to parse scan event", err);
        }
      });

      eventSource.addEventListener("ping", () => {
        setStatus("connected");
        setLastPingAt(Date.now());
      });

      eventSource.onerror = () => {
        // Drop connection and try to reconnect
        if (eventSource) {
          eventSource.close();
        }
        reconnectTimer = setTimeout(connect, 3000);
      };
    };

    connect();

    return () => {
      clearTimeout(reconnectTimer);
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [token]);

  // Monitor connection status
  useEffect(() => {
    if (!lastPingAt) return;
    
    // If we haven't received a ping or scan for 60 seconds, assume mobile disconnected
    const interval = setInterval(() => {
      if (Date.now() - lastPingAt > 60000) {
        setStatus("disconnected");
      }
    }, 10000);
    
    return () => clearInterval(interval);
  }, [lastPingAt]);

  return (
    <GlobalScannerContext.Provider value={{ token, status, lastPingAt }}>
      {children}
    </GlobalScannerContext.Provider>
  );
}
