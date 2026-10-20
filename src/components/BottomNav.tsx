"use client";

import { HeartHandshake, Mail, PenLine, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { t } from "@/content";
import { cn } from "@/lib/utils";

const items = [
  { href: "/home", label: t.nav.home, Icon: Mail, primary: false },
  { href: "/write", label: t.nav.write, Icon: PenLine, primary: true },
  { href: "/us", label: t.nav.us, Icon: HeartHandshake, primary: false },
  { href: "/settings", label: t.nav.settings, Icon: Settings, primary: false },
];

export function BottomNav({ unread }: { unread: number }) {
  const pathname = usePathname();
  return (
    <nav aria-label={t.nav.label} className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-line bg-cream/85 backdrop-blur-xl">
      <ul className="mx-auto flex max-w-md items-stretch justify-around px-2">
        {items.map(({ href, label, Icon, primary }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          if (primary) {
            return (
              <li key={href} className="flex flex-1 justify-center">
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className="relative -mt-5 flex h-16 w-16 flex-col items-center justify-center rounded-full bg-cherry text-on-cherry shadow-lift ring-4 ring-cream transition active:scale-95"
                >
                  <Icon className="h-6 w-6" strokeWidth={1.8} aria-hidden />
                  <span className="mt-0.5 text-[10px] font-medium">{label}</span>
                </Link>
              </li>
            );
          }
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn("relative flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors", active ? "text-cherry" : "text-muted hover:text-ink")}
              >
                <span className="relative">
                  <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2 : 1.6} aria-hidden />
                  {href === "/settings" && unread > 0 && (
                    <span className="absolute -right-1.5 -top-1 h-2.5 w-2.5 rounded-full bg-cherry ring-2 ring-cream" aria-hidden />
                  )}
                </span>
                {label}
                {href === "/settings" && unread > 0 && <span className="sr-only">{t.a11y.unreadCount(unread)}</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
