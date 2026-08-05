import { useEffect } from "react";

export function useGlobalScanner(onScan: (barcode: string) => void) {
  useEffect(() => {
    const handleScan = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      onScan(customEvent.detail);
    };

    window.addEventListener("globalBarcodeScanned", handleScan);
    return () => {
      window.removeEventListener("globalBarcodeScanned", handleScan);
    };
  }, [onScan]);
}
