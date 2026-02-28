"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    if (process.env.NODE_ENV !== "production") {
      // In development, remove any previously registered SW to avoid stale bundles.
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) =>
          Promise.all(registrations.map((registration) => registration.unregister())),
        )
        .catch(() => {
          // Ignore cleanup failures in development.
        });
      return;
    }

    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.info("Service Worker registered", registration);
      })
      .catch((error) => {
        console.warn("Service Worker registration failed", error);
      });
  }, []);

  return null;
}
