"use client";
import React from "react";
import Link from "next/link";
import Container from "@/components/Container";

export default function AppError({
  error,
  reset,
}: {
  error: Error;
  reset?: () => void;
}) {
  // Render only primitives and controlled UI to avoid accidental object children
  const msg = error?.message
    ? String(error.message)
    : "An unexpected error occurred.";
  return (
    <html>
      <body>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem",
          }}
        >
          <Container>
            <div style={{ maxWidth: 720, margin: "0 auto" }}>
              <div
                style={{
                  background: "var(--card)",
                  borderRadius: 12,
                  padding: "1.25rem",
                  boxShadow: "0 6px 18px rgba(2,6,23,0.06)",
                }}
              >
                <h1 style={{ margin: 0, fontSize: "1.5rem" }}>
                  Something went wrong
                </h1>
                <p style={{ color: "var(--muted)" }}>{msg}</p>
                <div
                  style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}
                >
                  <Link
                    href="/"
                    style={{
                      padding: "0.5rem 0.75rem",
                      borderRadius: 8,
                      background: "var(--brand)",
                      color: "var(--fg)",
                      textDecoration: "none",
                    }}
                  >
                    Go home
                  </Link>
                  <button
                    onClick={() => {
                      if (typeof reset === "function") reset();
                      else window.location.reload();
                    }}
                    style={{ padding: "0.5rem 0.75rem", borderRadius: 8 }}
                  >
                    Try again
                  </button>
                </div>
              </div>
            </div>
          </Container>
        </div>
      </body>
    </html>
  );
}
