import Link from "next/link";
import { notFound } from "next/navigation";
import { DemoPayForm } from "@/components/demo-pay-form";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { money } from "@/lib/money";
import { stripeMode, stripeRefusalMessage } from "@/lib/secrets";
import { getPlanPayment } from "@/lib/store";

export default async function PayPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const payment = await getPlanPayment(id);
  if (!payment) notFound();
  const mode = stripeMode();
  const status = String(payment.status);

  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto max-w-[560px] px-4 py-8">
        <p className="rounded-md bg-accent-100 px-3 py-2 text-center text-sm font-semibold text-neutral-900">
          Demo / test mode, no real money
        </p>
        <Card className="mt-4 p-6">
          <p className="text-sm text-neutral-500">Business OS · {String(payment.email)}</p>
          <h1 className="mt-1 font-mono text-3xl font-semibold">{money(Number(payment.amount_cents))}</h1>
          <p className="mt-1 text-sm text-neutral-500">First month of the $19 plan, in test mode. The published trial is still 14 days with no card.</p>
          {status === "paid" ? (
            <div className="mt-6">
              <p className="text-success-600">Paid. The plan checkout succeeded.</p>
              <Button asChild className="mt-4" variant="secondary">
                <Link href="/os/finance">See it in Finance</Link>
              </Button>
            </div>
          ) : mode === "test" ? (
            <form action={`/api/pricing/checkout?existing=${id}`} method="POST" className="mt-6">
              <input type="hidden" name="existing" value={id} />
              <Button type="submit" size="lg" className="w-full">
                Continue to Stripe
              </Button>
            </form>
          ) : mode === "refused" ? (
            <p className="mt-4 text-sm text-error-600">{stripeRefusalMessage()}</p>
          ) : (
            <>
              {status === "failed" ? <p className="mt-4 text-sm text-error-600">Your card was declined.</p> : null}
              <div className="mt-6">
                <DemoPayForm target="plan" id={id} returnTo={`/pay/plan/${id}`} />
              </div>
            </>
          )}
        </Card>
      </main>
    </>
  );
}
