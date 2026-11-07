"use client";

import type { ReactNode } from "react";
import { AlertCircle, Inbox, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function QueryState({
  isLoading,
  isError,
  isEmpty,
  onRetry,
  loadingText = "Memuat...",
  errorText = "Gagal memuat data.",
  emptyText = "Belum ada data.",
  children,
}: {
  isLoading: boolean;
  isError?: boolean;
  isEmpty?: boolean;
  onRetry?: () => void;
  loadingText?: string;
  errorText?: string;
  emptyText?: string;
  children?: ReactNode;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground" role="status">
        <Loader2 className="h-4 w-4 animate-spin" /> {loadingText}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        <p className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4" /> {errorText}
        </p>
        {onRetry && (
          <Button size="sm" variant="outline" onClick={onRetry}>
            Coba lagi
          </Button>
        )}
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
        <Inbox className="h-4 w-4" /> {emptyText}
      </div>
    );
  }

  return <>{children}</>;
}
