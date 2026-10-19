import Link from "next/link";
import { CalendarCheck, LifeBuoy, Megaphone, ShieldCheck, Users, Wallet } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PLAN } from "@/lib/plan";
import { overview } from "@/lib/store";

const DEPARTMENTS = [
  { name: "Sales", icon: Wallet, copy: "A pipeline from new lead to trial. Discounts wait for you." },
  { name: "Marketing", icon: Megaphone, copy: "Drafts stay drafts until you approve them." },
  { name: "Support", icon: LifeBuoy, copy: "Tickets and replies. Refunds are queued, never sent." },
  { name: "HR", icon: Users, copy: "Roles, applicants, and time off. Hires need a yes." },
  { name: "Finance", icon: CalendarCheck, copy: "Every finished session becomes an invoice and a test checkout." },
  { name: "Approvals", icon: ShieldCheck, copy: "One inbox. Nothing risky runs because a bot said so." },
];

export default async function HomePage() {
  let desk: Awaited<ReturnType<typeof overview>> | null = null;
  let loadError = "";
  try {
    desk = await overview();
  } catch (error) {
    loadError = error instanceof Error ? error.message : "The desk could not be loaded.";
  }

  return (
    <>
      <SiteHeader />
      <main id="main">
        <section className="mx-auto grid max-w-[1120px] items-center gap-12 px-4 py-16 md:grid-cols-12 md:py-24">
          <div className="md:col-span-7">
            <p className="inline-flex rounded-full bg-accent-100 px-3 py-1 text-xs font-semibold text-neutral-900">
              $19/mo · 14-day trial · no card to start
            </p>
            <h1 className="mt-6 max-w-xl text-[40px] font-bold leading-[1.15] tracking-tight text-neutral-900 md:text-5xl md:leading-[56px]">
              The company that keeps working while you&apos;re with a client.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-7 text-neutral-700">
              Business OS is the back office for a one-person service business. Bots draft sales, support, and billing. You approve anything that changes a price, a promise, or a hire.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/t/maya-tutor">Open demo</Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link href="/login?next=/os">Open the desk</Link>
              </Button>
            </div>
          </div>
          <Card className="md:col-span-5 p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Live demo · Maya Chen Tutoring</p>
            {loadError ? (
              <p className="mt-4 text-sm text-error-600">{loadError}</p>
            ) : (
              <dl className="mt-4 grid grid-cols-2 gap-4">
                <Stat label="Approvals waiting" value={String(desk?.pendingApprovals ?? 0)} />
                <Stat label="Open tickets" value={String(desk?.openTickets ?? 0)} />
                <Stat label="New leads" value={String(desk?.newLeads ?? 0)} />
                <Stat label="Sessions today" value={String(desk?.bookingsToday ?? 0)} />
              </dl>
            )}
            <p className="mt-6 text-sm leading-6 text-neutral-700">
              Book an $80 SAT Math session, mark it done, and pay with a demo card. 4242 succeeds. 0002 declines. No Stripe account required.
            </p>
          </Card>
        </section>

        <section className="border-y border-neutral-200 bg-white">
          <div className="mx-auto max-w-[1120px] px-4 py-16">
            <h2 className="text-2xl font-semibold">One desk, six jobs</h2>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {DEPARTMENTS.map((item) => {
                const Icon = item.icon;
                return (
                  <Card key={item.name} className="p-5">
                    <Icon className="h-5 w-5 text-primary-600" aria-hidden />
                    <h3 className="mt-3 text-lg font-semibold">{item.name}</h3>
                    <p className="mt-2 text-sm leading-6 text-neutral-700">{item.copy}</p>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-[1120px] gap-6 px-4 py-16 md:grid-cols-3">
          {["Share the booking link", "Teach the session", "Invoice and update go out"].map((step, index) => (
            <div key={step}>
              <p className="font-mono text-sm text-primary-600">0{index + 1}</p>
              <h2 className="mt-2 text-xl font-semibold">{step}</h2>
              <p className="mt-2 text-sm leading-6 text-neutral-700">
                {index === 0 && "Parents pick a fixed evening slot and the session confirms itself."}
                {index === 1 && "Mark it done with three notes: covered, went well, next focus."}
                {index === 2 && "The parent update lands in the Outbox. The invoice is ready to pay in demo mode."}
              </p>
            </div>
          ))}
        </section>

        <section className="bg-primary-900 text-white">
          <div className="mx-auto flex max-w-[1120px] flex-wrap items-end justify-between gap-6 px-4 py-14">
            <div>
              <p className="text-sm text-primary-100">One plan</p>
              <p className="mt-2 text-4xl font-bold">{PLAN.priceLabel}</p>
              <p className="mt-2 max-w-md text-sm leading-6 text-primary-100">
                14-day free trial, no card required, cancel anytime. The demo checkout lets judges pay $19 with a test card and see Paid or Failed.
              </p>
            </div>
            <Button asChild size="lg" className="bg-white text-primary-900 hover:bg-primary-50">
              <Link href="/pricing">See pricing</Link>
            </Button>
          </div>
        </section>
      </main>
      <footer className="border-t border-neutral-200">
        <div className="mx-auto flex max-w-[1120px] flex-wrap gap-4 px-4 py-8 text-sm text-neutral-700">
          <Link href="/pricing">Pricing</Link>
          <Link href="/t/maya-tutor">Demo booking</Link>
          <Link href="/docs">Bot API</Link>
          <Link href="/login?next=/os">Desk</Link>
        </div>
      </footer>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-neutral-500">{label}</dt>
      <dd className="mt-1 font-mono text-2xl font-semibold">{value}</dd>
    </div>
  );
}
