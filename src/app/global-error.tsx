"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { logger } from "@/lib/logger";
import { CONTACT_EMAIL } from "@/lib/contact";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("ui.global_error", { message: error.message, digest: error.digest });
  }, [error]);

  return (
    <html lang="id">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#f8faf8" }}>
        <main
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <div
            style={{
              maxWidth: 420,
              width: "100%",
              textAlign: "center",
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: 16,
              padding: 32,
            }}
          >
            <AlertTriangle size={40} color="#b91c1c" style={{ margin: "0 auto" }} />
            <h1 style={{ fontSize: 20, margin: "16px 0 8px" }}>Aplikasi gagal dimuat</h1>
            <p style={{ fontSize: 14, color: "#4b5563", lineHeight: 1.6 }}>
              Terjadi kesalahan pada aplikasi. Coba muat ulang halaman. Jika masih gagal, hubungi{" "}
              {CONTACT_EMAIL}.
            </p>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                marginTop: 20,
                background: "#047857",
                color: "#fff",
                border: 0,
                borderRadius: 999,
                padding: "10px 18px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Coba lagi
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
