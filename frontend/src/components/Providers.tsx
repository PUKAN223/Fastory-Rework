"use client";

import * as React from "react";
import { Provider } from "react-redux";
import { authMe, clearAuth } from "@/features/authSlice";
import { store } from "@/store";
import { useAppDispatch } from "@/store/hook";

function AuthBootstrap() {
  const dispatch = useAppDispatch();
  const startedRef = React.useRef(false);

  React.useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      if (response.status === 401) {
        const url =
          typeof args[0] === "string"
            ? args[0]
            : (args[0] as Request)?.url || "";
        if (
          url &&
          !url.includes("/api/auth/login") &&
          !url.includes("/api/auth/refresh") &&
          !url.includes("/api/auth/me") &&
          !url.includes("/api/auth/logout")
        ) {
          dispatch(clearAuth());
        }
      }
      return response;
    };
    return () => {
      window.fetch = originalFetch;
    };
  }, [dispatch]);

  React.useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    dispatch(authMe());
  }, [dispatch]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <AuthBootstrap />
      {children}
    </Provider>
  );
}
