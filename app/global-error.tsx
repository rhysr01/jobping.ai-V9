"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Capture the error in Sentry with additional context
    Sentry.captureException(error, {
      tags: {
        errorBoundary: "global",
        digest: error.digest,
      },
      contexts: {
        react: {
          componentStack: error.stack,
        },
      },
    });
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          padding: 0,
          background: "#000",
          color: "#fff",
          fontFamily: "system-ui",
        }}
      >
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem",
          }}
        >
          <div style={{ maxWidth: "400px", textAlign: "center" }}>
            <div style={{ fontSize: "4rem", marginBottom: "1rem" }}></div>
            <h2 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>
              Something went wrong!
            </h2>
            <p style={{ color: "#888", marginBottom: "2rem" }}>
              We've been notified. Please try refreshing the page.
            </p>
            <button
              onClick={() => reset()}
              style={{
                background: "linear-gradient(90deg, #6366F1, #8B5CF6)",
                color: "#fff",
                border: "none",
                padding: "0.75rem 2rem",
                borderRadius: "0.5rem",
                fontSize: "1rem",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
