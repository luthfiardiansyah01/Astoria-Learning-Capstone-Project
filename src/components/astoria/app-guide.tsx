"use client";

import { useEffect, useState, type ElementType } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Home,
  MessagesSquare,
  Settings,
  Sparkles,
  Target,
  UploadCloud,
  Users,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { ViewKey } from "@/components/astoria/store";

type Step = {
  title: string;
  description: string;
  icon: ElementType;
  view?: ViewKey;
  href?: string;
};

const STEPS: Step[] = [
  {
    title: "Selamat datang di SOBAT ADI",
    description:
      "Beranda menampilkan progres belajar, XP, level, dan aktivitas terbaru. Gunakan navigasi bawah untuk berpindah fitur.",
    icon: Home,
    view: "beranda",
  },
  {
    title: "Unggah modul kuliah",
    description:
      "Unggah PDF atau teks modul. Sistem memecah materi dan menyiapkan pencarian agar jawaban tetap sesuai isi modul.",
    icon: UploadCloud,
    view: "unggah",
  },
  {
    title: "Bertanya ke Mentor AI",
    description:
      "Ajukan pertanyaan tentang modul. Setiap jawaban menyertakan rujukan bagian dokumen yang bisa diperiksa.",
    icon: MessagesSquare,
    view: "mentor",
  },
  {
    title: "Latihan dengan kuis",
    description:
      "Buat kuis otomatis dari modul, jawab pertanyaan, lalu lihat skor dan XP yang diperoleh.",
    icon: Target,
    view: "kuis",
  },
  {
    title: "Belajar bersama tim",
    description:
      "Collab menyediakan tim, proyek, papan Kanban, tenggat, dan undangan anggota. Cocok untuk tugas kelompok.",
    icon: Users,
    href: "/collab",
  },
  {
    title: "Akun, privasi, dan aksesibilitas",
    description:
      "Atur kata sandi, unduh data, atau hapus akun di halaman Akun. Aplikasi mendukung navigasi keyboard, pembaca layar, dan mode gerak minimal.",
    icon: Settings,
    href: "/akun",
  },
];

export function AppGuide({
  open,
  onOpenChange,
  onNavigate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate: (view: ViewKey) => void;
}) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const Icon = current.icon;

  function goTo(target: ViewKey) {
    onNavigate(target);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-lg"
        onKeyDown={(event) => {
          if (event.key === "ArrowRight" && !isLast) {
            event.preventDefault();
            setStep((s) => s + 1);
          }
          if (event.key === "ArrowLeft" && step > 0) {
            event.preventDefault();
            setStep((s) => s - 1);
          }
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-left text-lg">
            <span className="rounded-lg bg-primary/10 p-2 text-primary">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            {current.title}
          </DialogTitle>
          <DialogDescription className="text-left text-sm leading-relaxed">
            {current.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Progress
            value={((step + 1) / STEPS.length) * 100}
            aria-label={`Langkah ${step + 1} dari ${STEPS.length}`}
          />
          <p className="text-xs text-muted-foreground">
            Langkah {step + 1} dari {STEPS.length}
          </p>
        </div>

        <p aria-live="polite" className="sr-only">
          {current.title}. Langkah {step + 1} dari {STEPS.length}.
        </p>

        {(current.view || current.href) && (
          <Button
            variant="link"
            className="h-auto justify-start px-0"
            onClick={() => (current.view ? goTo(current.view) : onOpenChange(false))}
            asChild={Boolean(current.href)}
          >
            {current.href ? (
              <Link href={current.href}>Buka fitur ini</Link>
            ) : (
              <span>Buka fitur ini</span>
            )}
          </Button>
        )}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Lewati panduan
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              Sebelumnya
            </Button>
            {isLast ? (
              <Button onClick={() => onOpenChange(false)}>
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                Selesai
              </Button>
            ) : (
              <Button onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}>
                Berikutnya
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
