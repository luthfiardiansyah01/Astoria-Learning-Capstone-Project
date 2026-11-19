import { AstoriaSessionProvider } from "@/components/providers/session-provider";
import { Toaster } from "@/components/ui/sonner";

export default function AkunLayout({ children }: { children: React.ReactNode }) {
  return (
    <AstoriaSessionProvider>
      {children}
      <Toaster />
    </AstoriaSessionProvider>
  );
}
