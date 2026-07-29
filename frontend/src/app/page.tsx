"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAppSelector } from "@/store/hook";

export default function Home() {
  const authStatus = useAppSelector((state) => state.auth.status);
  const activeStoreId = useAppSelector((state) => state.stores.activeStoreId);
  const router = useRouter();

  useEffect(() => {
    if (authStatus === "authed") {
      if (activeStoreId !== null) {
        router.push("/dashboard");
      } else {
        router.push("/stores");
      }
    } else if (authStatus === "guest") {
      window.location.href = "/login";
    }
  }, [authStatus, activeStoreId, router]);

  return <></>;
}
