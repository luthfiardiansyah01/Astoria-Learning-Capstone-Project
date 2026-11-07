"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Mail, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

interface Invite {
  id: string;
  createdAt: string;
  team: { id: string; name: string; _count: { members: number } };
  invitedBy: { id: string; name: string };
}

export function PendingInvites() {
  const queryClient = useQueryClient();

  const { data: invites = [], isError } = useQuery<Invite[]>({
    queryKey: ["collab", "invites"],
    queryFn: async () => {
      const res = await fetch("/api/collab/invites");
      if (!res.ok) throw new Error("Gagal memuat undangan.");
      return (await res.json()).invites ?? [];
    },
    staleTime: 30_000,
  });

  const respond = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "accept" | "decline" }) => {
      const res = await fetch(`/api/collab/invites/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Gagal memproses undangan.");
      return action;
    },
    onSuccess: (action) => {
      queryClient.invalidateQueries({ queryKey: ["collab", "invites"] });
      queryClient.invalidateQueries({ queryKey: ["collab", "teams"] });
      toast.success(action === "accept" ? "Undangan diterima." : "Undangan ditolak.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isError) {
    return (
      <Card className="border-destructive/30">
        <CardContent className="p-4 text-sm text-destructive">
          Gagal memuat undangan tim. Coba muat ulang halaman.
        </CardContent>
      </Card>
    );
  }

  if (invites.length === 0) return null;

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Mail className="h-4 w-4 text-primary" /> Undangan Tim
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {invites.map((invite) => (
          <div
            key={invite.id}
            className="flex flex-col gap-2 rounded-lg border bg-background/80 p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium">{invite.team.name}</p>
              <p className="text-xs text-muted-foreground">
                Diundang oleh {invite.invitedBy.name} · {invite.team._count.members} anggota
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button
                size="sm"
                onClick={() => respond.mutate({ id: invite.id, action: "accept" })}
                disabled={respond.isPending}
              >
                <Check className="mr-1 h-3.5 w-3.5" /> Terima
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => respond.mutate({ id: invite.id, action: "decline" })}
                disabled={respond.isPending}
              >
                <X className="mr-1 h-3.5 w-3.5" /> Tolak
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
