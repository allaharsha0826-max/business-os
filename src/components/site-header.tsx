import Link from "next/link";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1120px] items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold text-neutral-900">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-primary-600 text-sm text-white">OS</span>
          Business OS
        </Link>
        <nav className="flex items-center gap-1 text-sm" aria-label="Marketing">
          <Link href="/pricing" className="rounded-md px-3 py-2 hover:bg-neutral-50">
            Pricing
          </Link>
          <Link href="/docs" className="hidden rounded-md px-3 py-2 hover:bg-neutral-50 sm:inline">
            Bot API
          </Link>
          <Link href="/login?next=/os" className="rounded-md px-3 py-2 hover:bg-neutral-50">
            Desk
          </Link>
          <Button asChild size="sm">
            <Link href="/t/maya-tutor">Open demo</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
