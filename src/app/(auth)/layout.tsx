import { Toaster as SonnerToaster } from "@/components/ui/sonner";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <SonnerToaster />
    </>
  );
}
