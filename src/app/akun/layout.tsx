import { AstoriaSessionProvider } from "@/components/providers/session-provider";
import { Toaster } from "@/components/ui/sonner";
import { SessionGuard } from "@/components/astoria/session-guard";

export default function AkunLayout({ children }: { children: React.ReactNode }) {
  return (
    <AstoriaSessionProvider>
      <SessionGuard />
      {children}
      <Toaster />
    </AstoriaSessionProvider>
  );
}
