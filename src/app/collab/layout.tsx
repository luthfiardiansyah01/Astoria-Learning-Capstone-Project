import { AstoriaSessionProvider } from "@/components/providers/session-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { MotionProvider } from "@/components/providers/motion-provider";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { SessionGuard } from "@/components/astoria/session-guard";

export default function CollabLayout({ children }: { children: React.ReactNode }) {
  return (
    <AstoriaSessionProvider>
      <QueryProvider>
        <MotionProvider>
          <SessionGuard />
          {children}
          <SonnerToaster />
        </MotionProvider>
      </QueryProvider>
    </AstoriaSessionProvider>
  );
}
