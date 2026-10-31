import { TEAM_BADGE_META } from "@/lib/collab-badge-meta";

export function TeamBadges({ badges, showEmpty }: { badges: string[]; showEmpty?: boolean }) {
  if (badges.length === 0) {
    return showEmpty ? <p className="text-xs text-muted-foreground">Belum ada badge tim.</p> : null;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {badges.map((name) => {
        const meta = TEAM_BADGE_META[name];
        return (
          <span
            key={name}
            title={meta ? `${name} — ${meta.desc}` : name}
            className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
          >
            <span aria-hidden>{meta?.emoji ?? "🏅"}</span>
            {name}
          </span>
        );
      })}
    </div>
  );
}
