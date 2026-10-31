"use client";

import { SessionProvider } from "next-auth/react";

export function AstoriaSessionProvider({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
