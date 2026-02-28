"use client";

import { useSyncExternalStore } from "react";

const subscribe = (callback: () => void) => {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
};

const getSnapshot = () =>
  typeof navigator !== "undefined" ? navigator.onLine : true;

const getServerSnapshot = () => true;

export function OfflineBanner() {
  const isOnline = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  if (isOnline) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        marginBottom: "16px",
        padding: "12px 16px",
        border: "1px solid #e2e8f0",
        borderRadius: "8px",
        background: "#f8fafc",
        color: "#0f172a",
        fontSize: "14px",
      }}
    >
      Você está offline. Exibindo dados salvos do catálogo.
    </div>
  );
}
