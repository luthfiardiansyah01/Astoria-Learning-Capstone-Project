"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserPlus, X } from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

interface Member {
  userId: string;
  role: string;
  user: { id: string; name: string };
}

export function TeamMembers({ teamId, members }: { teamId: string; members: Member[] }) {
  const [name, setName] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const isOwner = members.some((m) => m.userId === session?.user?.id && m.role === "owner");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(name.trim()), 250);
    return () => clearTimeout(t);
  }, [name]);

  const { data: suggestions, isFetching } = useQuery({
    queryKey: ["collab", "user-search", teamId, debounced],
    queryFn: async () => {
      const res = await fetch(`/api/collab/users/search?teamId=${teamId}&q=${encodeURIComponent(debounced)}`);
      if (!res.ok) throw new Error("Gagal mencari pengguna.");
      return (await res.json()).users as { id: string; name: string }[];
    },
    enabled: isOwner && open && debounced.length > 0,
  });

  const showList = isOwner && open && debounced.length > 0 && debounced === name.trim();

  const removeMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`/api/collab/teams/${teamId}/members/${userId}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error || "Gagal mengeluarkan anggota.");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collab", "teams"] });
      toast.success("Anggota dikeluarkan.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/collab/teams/${teamId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menambah anggota.");
      return data.member;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collab", "teams"] });
      setName("");
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["collab", "user-search", teamId] });
      toast.success("Anggota ditambahkan.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {members.map((m) => (
          <span
            key={m.userId}
            className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground"
          >
            {m.user.name}
            {m.role === "owner" ? " · owner" : ""}
            {isOwner && m.role !== "owner" && (
              <button
                type="button"
                aria-label={`Keluarkan ${m.user.name}`}
                onClick={() => removeMutation.mutate(m.userId)}
                className="ml-1 inline-flex align-middle hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </span>
        ))}
      </div>
      {isOwner && (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) mutation.mutate();
        }}
        className="flex gap-1.5"
      >
        <div className="relative flex-1">
          <Input
            type="text"
            placeholder="Cari nama anggota baru"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setOpen(false)}
            autoComplete="off"
            className="h-8 text-xs"
          />
          {showList && (
            <ul className="absolute left-0 right-0 top-9 z-20 max-h-48 overflow-auto rounded-md border bg-popover p-1 text-xs shadow-md">
              {suggestions?.map((u) => (
                <li key={u.id}>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setName(u.name);
                      setOpen(false);
                    }}
                    className="w-full rounded px-2 py-1.5 text-left hover:bg-muted"
                  >
                    {u.name}
                  </button>
                </li>
              ))}
              {suggestions && suggestions.length === 0 && !isFetching && (
                <li className="px-2 py-1.5 text-muted-foreground">
                  Tidak ada pengguna bernama "{debounced}". Minta orang tersebut mendaftar di /register dulu.
                </li>
              )}
              {isFetching && !suggestions && <li className="px-2 py-1.5 text-muted-foreground">Mencari...</li>}
            </ul>
          )}
        </div>
        <Button type="submit" size="sm" variant="outline" disabled={mutation.isPending} className="gap-1">
          <UserPlus className="h-3.5 w-3.5" />
        </Button>
      </form>
      )}
    </div>
  );
}
