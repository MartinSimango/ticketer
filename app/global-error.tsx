"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <div
          style={{
            display: "flex",
            height: "100vh",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <div style={{ maxWidth: "24rem", textAlign: "center" }}>
            <h1 style={{ fontSize: "1.125rem", fontWeight: 600 }}>
              Something went wrong
            </h1>
            <p style={{ marginTop: "0.5rem", color: "#64748b" }}>
              {error.message || "An unexpected error occurred."}
            </p>
            <button
              onClick={reset}
              style={{
                marginTop: "1rem",
                borderRadius: "0.5rem",
                background: "#2563eb",
                color: "#fff",
                padding: "0.5rem 1rem",
                fontSize: "0.875rem",
                fontWeight: 500,
                border: "none",
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
