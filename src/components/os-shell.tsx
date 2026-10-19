"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Activity,
  BadgeDollarSign,
  CalendarCheck,
  Inbox,
  LayoutDashboard,
  LifeBuoy,
  Megaphone,
  ScrollText,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/os", label: "Overview", icon: LayoutDashboard },
  { href: "/os/bookings", label: "Bookings", icon: CalendarCheck },
  { href: "/os/sales", label: "Sales", icon: BadgeDollarSign },
  { href: "/os/marketing", label: "Marketing", icon: Megaphone },
  { href: "/os/support", label: "Support", icon: LifeBuoy },
  { href: "/os/hr", label: "HR", icon: Users },
  { href: "/os/finance", label: "Finance", icon: Wallet },
  { href: "/os/approvals", label: "Approvals", icon: ShieldCheck },
  { href: "/os/activity", label: "Activity", icon: Activity },
  { href: "/os/audit", label: "Audit", icon: ScrollText },
  { href: "/os/outbox", label: "Outbox", icon: Inbox },
];

export function OsShell({
  children,
  pending,
  paused,
}: {
  children: React.ReactNode;
  pending: number;
  paused: boolean;
}) {
  const pathname = usePathname();
  const [botsPaused, setBotsPaused] = useState(paused);

  useEffect(() => {
    const timer = setInterval(async () => {
      const response = await fetch("/api/status").catch(() => null);
      if (!response?.ok) return;
      const body = (await response.json()) as { bots?: string };
      setBotsPaused(body.bots === "paused");
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  const title = NAV.find((item) => item.href === pathname)?.label ?? "Business OS";

  return (
    <div className="min-h-screen md:grid md:grid-cols-[240px_1fr]">
      <aside className="border-b border-neutral-200 bg-white md:min-h-screen md:border-b-0 md:border-r">
        <div className="flex items-center gap-2 px-4 py-4">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-primary-600 text-sm font-semibold text-white">OS</span>
          <div>
            <p className="text-sm font-semibold">Business OS</p>
            <p className="text-xs text-neutral-500">Founder desk</p>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-3 md:block md:space-y-1 md:px-3" aria-label="Departments">
          {NAV.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium",
                  active ? "bg-primary-50 text-primary-700" : "text-neutral-700 hover:bg-neutral-50",
                )}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {item.label}
                {item.href === "/os/approvals" && pending > 0 ? (
                  <span className="ml-auto rounded-full bg-warn-50 px-1.5 text-xs text-warn-600">{pending}</span>
                ) : null}
              </Link>
            );
          })}
        </nav>
        <p className="hidden px-6 py-4 text-xs font-medium text-neutral-500 md:block">14-day trial · no card</p>
      </aside>
      <div className="min-w-0">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 bg-white px-4 py-3 md:px-8">
          <h1 className="text-lg font-semibold">{title}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <details className="relative">
              <summary className="flex cursor-pointer list-none items-center gap-2 rounded-md border border-neutral-200 px-2 py-1.5">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-primary-600 text-xs font-semibold text-white">MC</span>
                <span className="text-left">
                  <span className="block text-sm font-semibold leading-4">Maya Chen Tutoring</span>
                  <span className="block text-xs text-neutral-500">Demo business</span>
                </span>
              </summary>
              <div className="absolute right-0 z-20 mt-2 w-64 rounded-lg border border-neutral-200 bg-white p-3 text-sm shadow-md">
                <p className="text-neutral-700">This demo runs one business. Booking stays on Maya&apos;s public page.</p>
                <Link href="/t/maya-tutor" className="mt-2 inline-block font-semibold text-primary-600">
                  Open booking page
                </Link>
              </div>
            </details>
            <Link
              href="/os#bots"
              className="inline-flex items-center gap-2 rounded-full border border-neutral-200 px-3 py-1.5 text-sm font-medium"
              aria-live="polite"
            >
              <span className="relative flex h-2.5 w-2.5">
                {botsPaused ? null : (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success-600 opacity-60 motion-reduce:hidden" />
                )}
                <span className={`relative h-2.5 w-2.5 rounded-full ${botsPaused ? "bg-error-600" : "bg-success-600"}`} />
              </span>
              {botsPaused ? "Bots paused" : "Bots running"}
            </Link>
            <form action="/api/auth/logout" method="POST">
              <button className="rounded-md px-2 py-1 text-sm text-neutral-700 hover:bg-neutral-50" type="submit">
                Log out
              </button>
            </form>
          </div>
        </header>
        <div className="px-4 py-6 md:px-8">{children}</div>
      </div>
    </div>
  );
}
