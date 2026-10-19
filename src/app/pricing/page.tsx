import Link from "next/link";
import { Check } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FAQ, PLAN } from "@/lib/plan";
import { stripeMode } from "@/lib/secrets";

export default function PricingPage() {
  const mode = stripeMode();
  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto max-w-[720px] px-4 py-16">
        <p className="text-sm font-semibold text-primary-600">Pricing</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight">One plan. {PLAN.priceLabel}.</h1>
        <p className="mt-4 text-lg leading-7 text-neutral-700">
          14-day free trial, no card required to start, cancel anytime. This page also runs a {mode === "test" ? "Stripe test" : "built-in demo"} checkout so you can see a real Paid or Failed state.
        </p>
        <Card className="mt-8 p-6">
          <p className="font-mono text-4xl font-semibold">{PLAN.priceLabel}</p>
          <p className="mt-1 text-sm text-neutral-500">per month after the trial</p>
          <ul className="mt-6 space-y-3">
            {PLAN.features.map((feature) => (
              <li key={feature} className="flex gap-2 text-sm leading-6">
                <Check className="mt-1 h-4 w-4 shrink-0 text-success-600" aria-hidden />
                {feature}
              </li>
            ))}
          </ul>
          <form action="/api/pricing/checkout" method="POST" className="mt-8 grid gap-3">
            <Label htmlFor="email">Email for the test receipt</Label>
            <Input id="email" name="email" type="email" required placeholder="you@example.com" />
            <Button type="submit" size="lg">
              {mode === "test" ? "Pay $19 with Stripe test mode" : "Check out $19 in demo mode"}
            </Button>
          </form>
          <p className="mt-3 text-xs leading-5 text-neutral-500">
            {mode === "missing"
              ? "No Stripe key is set. The next screen is labeled Demo / test mode and moves no real money."
              : mode === "test"
                ? "Stripe Checkout opens in test mode. Use 4242 4242 4242 4242."
                : "The Stripe key on this machine was refused. Payment will not start."}
          </p>
        </Card>
        <div className="mt-12 space-y-3">
          {FAQ.map((item) => (
            <details key={item.id} className="rounded-lg border border-neutral-200 bg-white px-4 py-3">
              <summary className="cursor-pointer font-medium">{item.q}</summary>
              <p className="mt-2 text-sm leading-6 text-neutral-700">{item.a}</p>
            </details>
          ))}
        </div>
        <p className="mt-8 text-sm">
          <Link href="/t/maya-tutor" className="font-semibold text-primary-600">
            Open the live tutoring demo
          </Link>
        </p>
      </main>
    </>
  );
}
