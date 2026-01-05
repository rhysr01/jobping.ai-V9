"use client";

import { Toaster as HotToaster } from "react-hot-toast";

export default function Toaster() {
  return (
    <HotToaster
      position="top-center"
      toastOptions={{
        duration: 4000,
        style: {
          background: "rgba(0, 0, 0, 0.9)",
          color: "#fff",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: "12px",
          padding: "12px 16px",
          fontSize: "14px",
          fontWeight: "500",
          backdropFilter: "blur(12px)",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
        },
        success: {
          iconTheme: {
            primary: "#10b981",
            secondary: "#fff",
          },
          style: {
            border: "1px solid rgba(16, 185, 129, 0.3)",
          },
        },
        error: {
          iconTheme: {
            primary: "#ef4444",
            secondary: "#fff",
          },
          style: {
            border: "1px solid rgba(239, 68, 68, 0.3)",
          },
        },
        loading: {
          iconTheme: {
            primary: "#6366f1",
            secondary: "#fff",
          },
        },
      }}
    />
  );
}
