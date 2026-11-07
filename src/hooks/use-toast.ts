"use client";

// Adapter tipis di atas Sonner agar seluruh aplikasi memakai satu sistem toast.
// API lama `toast({ title, description, variant })` tetap didukung.
import type { ReactNode } from "react";
import { toast as sonnerToast } from "sonner";

type ToastVariant = "default" | "destructive";

interface ToastInput {
  title?: ReactNode;
  description?: ReactNode;
  variant?: ToastVariant;
  duration?: number;
}

function toText(value: ReactNode): string {
  if (value === null || value === undefined) return "";
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function toast(input: ToastInput) {
  const title = toText(input.title);
  const description = toText(input.description);
  const options = {
    description: description || undefined,
    duration: input.duration,
  };
  if (input.variant === "destructive") {
    return sonnerToast.error(title || "Terjadi kesalahan", options);
  }
  return sonnerToast(title || description || "Berhasil", options);
}

function useToast() {
  return {
    toast,
    toasts: [] as never[],
    dismiss: sonnerToast.dismiss,
  };
}

export { useToast, toast };
