"use client";

import Link from "next/link";
import type { ElementType } from "react";
import {
  Accessibility,
  HelpCircle,
  MoreHorizontal,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { ViewKey } from "@/components/astoria/store";

type NavItem = { key: ViewKey; label: string; icon: ElementType };

/**
 * Navigasi bawah khusus layar kecil. Target sentuh minimal 44x44 px dan
 * menghormati safe-area perangkat (iPhone home indicator).
 */
export function MobileNav({
  items,
  view,
  onSelect,
  isAdmin,
  onOpenGuide,
}: {
  items: NavItem[];
  view: ViewKey;
  onSelect: (key: ViewKey) => void;
  isAdmin: boolean;
  onOpenGuide: () => void;
}) {
  const main = items.filter((item) => item.key !== "admin");

  return (
    <nav
      aria-label="Navigasi bawah"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="mx-auto flex max-w-6xl items-stretch px-1">
        {main.map((item) => {
          const active = view === item.key;
          return (
            <li key={item.key} className="flex-1">
              <button
                type="button"
                data-testid={`nav-${item.key}`}
                onClick={() => onSelect(item.key)}
                aria-current={active ? "page" : undefined}
                aria-label={item.label}
                className={`flex min-h-[56px] w-full flex-col items-center justify-center gap-0.5 rounded-lg px-1 text-[11px] font-medium transition-colors ${
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <item.icon className="h-5 w-5" aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            </li>
          );
        })}

        <li className="flex-1">
          <Sheet>
            <SheetTrigger asChild>
              <button
                type="button"
                data-testid="nav-more"
                aria-label="Buka menu lainnya"
                className="flex min-h-[56px] w-full flex-col items-center justify-center gap-0.5 rounded-lg px-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
                <span>Lainnya</span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="pb-[calc(1rem+env(safe-area-inset-bottom))]">
              <SheetHeader>
                <SheetTitle>Menu lainnya</SheetTitle>
                <SheetDescription>
                  Fitur kolaborasi, akun, dan panduan penggunaan.
                </SheetDescription>
              </SheetHeader>

              <div className="mt-4 flex flex-col gap-1">
                <SheetClose asChild>
                  <button
                    type="button"
                    onClick={onOpenGuide}
                    className="flex min-h-12 items-center gap-3 rounded-lg px-3 text-left text-sm font-medium hover:bg-muted focus-visible:bg-muted"
                  >
                    <HelpCircle className="h-5 w-5 text-primary" aria-hidden="true" />
                    Panduan aplikasi
                  </button>
                </SheetClose>

                <SheetClose asChild>
                  <Link
                    href="/collab"
                    className="flex min-h-12 items-center gap-3 rounded-lg px-3 text-sm font-medium hover:bg-muted focus-visible:bg-muted"
                  >
                    <Users className="h-5 w-5 text-primary" aria-hidden="true" />
                    Collab: tim dan proyek
                  </Link>
                </SheetClose>

                <SheetClose asChild>
                  <Link
                    href="/akun"
                    className="flex min-h-12 items-center gap-3 rounded-lg px-3 text-sm font-medium hover:bg-muted focus-visible:bg-muted"
                  >
                    <Settings className="h-5 w-5 text-primary" aria-hidden="true" />
                    Akun dan keamanan
                  </Link>
                </SheetClose>

                <SheetClose asChild>
                  <Link
                    href="/legal/aksesibilitas"
                    className="flex min-h-12 items-center gap-3 rounded-lg px-3 text-sm font-medium hover:bg-muted focus-visible:bg-muted"
                  >
                    <Accessibility className="h-5 w-5 text-primary" aria-hidden="true" />
                    Pernyataan aksesibilitas
                  </Link>
                </SheetClose>

                {isAdmin && (
                  <SheetClose asChild>
                    <button
                      type="button"
                      onClick={() => onSelect("admin")}
                      className="flex min-h-12 items-center gap-3 rounded-lg px-3 text-left text-sm font-medium hover:bg-muted focus-visible:bg-muted"
                    >
                      <ShieldCheck className="h-5 w-5 text-primary" aria-hidden="true" />
                      Panel admin
                    </button>
                  </SheetClose>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </li>
      </ul>
    </nav>
  );
}
