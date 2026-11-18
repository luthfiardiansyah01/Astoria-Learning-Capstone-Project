import { MotionProvider } from "@/components/providers/motion-provider";

export default function CollabLayout({ children }: { children: React.ReactNode }) {
  return <MotionProvider>{children}</MotionProvider>;
}
