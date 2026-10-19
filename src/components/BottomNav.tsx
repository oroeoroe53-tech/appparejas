"use client";

import { Archive, HeartHandshake, Mail, PenLine, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { t } from "@/content";
import { cn } from "@/lib/utils";

const items = [
  { href: "/home", label: t.nav.home, Icon: Mail },
  { href: "/write", label: t.nav.write, Icon: PenLine },
  { href: "/letters", label: t.nav.letters, Icon: Archive },
  { href: "/us", label: t.nav.us, Icon: HeartHandshake },
  { href: "/settings", label: t.nav.settings, Icon: Settings },
];

export function BottomNav({ unread }: { unread: number }) {
  const pathname = usePathname();
  return (
    <nav aria-label={t.nav.label} className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-line bg-cream/85 backdrop-blur-xl">
      <ul className="mx-auto flex max-w-md items-stretch justify-around px-2">
        {items.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn("relative flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors", active ? "text-cherry" : "text-muted hover:text-ink")}
              >
                <span className="relative">
                  <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2 : 1.6} aria-hidden />
                  {href === "/home" && unread > 0 && (
                    <span className="absolute -right-1.5 -top-1 h-2.5 w-2.5 rounded-full bg-cherry ring-2 ring-cream" aria-hidden />
                  )}
                </span>
                {label}
                {href === "/home" && unread > 0 && <span className="sr-only">{t.a11y.unreadCount(unread)}</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
