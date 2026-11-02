"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

interface Usage {
  daily: { used: number; remaining: number; limit: number; resetAt: number };
}

function formatReset(resetAt: number) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(resetAt));
}

export function AiQuotaBadge({ className = "" }: { className?: string }) {
  const { data, isError } = useQuery<Usage>({
    queryKey: ["ai-usage"],
    queryFn: async () => {
      const res = await fetch("/api/ai-usage");
      if (!res.ok) throw new Error("Gagal memuat kuota AI.");
      return res.json();
    },
    staleTime: 15_000,
    refetchInterval: 30_000,
    retry: 1,
  });

  if (isError || !data?.daily) return null;

  const { remaining, limit, resetAt } = data.daily;
  const low = remaining <= 20;
  const empty = remaining <= 0;

  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 320, damping: 24 }}
      title={`Sisa kuota aplikasi: ${remaining}/${limit}. Kuota penyedia AI terpisah. Reset ${formatReset(resetAt)} WIB.`}
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium tabular-nums ${
        empty
          ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
          : low
            ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
            : "bg-primary/10 text-primary"
      } ${className}`}
    >
      <Sparkles className="h-3 w-3" />
      AI {remaining}/{limit}
    </motion.span>
  );
}
