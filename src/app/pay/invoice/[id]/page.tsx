import Link from "next/link";
import { notFound } from "next/navigation";
import { DemoPayForm } from "@/components/demo-pay-form";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { money } from "@/lib/money";
import { stripeMode, stripeRefusalMessage } from "@/lib/secrets";
import { getInvoice } from "@/lib/store";

export default async function PayInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const invoice = await getInvoice(id);
  if (!invoice) notFound();
  const mode = stripeMode();
  const amount = money(Number(invoice.amount_cents));
  const status = String(invoice.status);

  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto max-w-[560px] px-4 py-8">
        <p className="rounded-md bg-accent-100 px-3 py-2 text-center text-sm font-semibold text-neutral-900">
          Demo / test mode, no real money
        </p>
        <Card className="mt-4 p-6">
          <p className="text-sm text-neutral-500">{String(invoice.number)} · {String(invoice.student_name)}</p>
          <h1 className="mt-1 font-mono text-3xl font-semibold">{amount}</h1>
          {status === "paid" ? (
            <div className="mt-6">
              <p className="text-success-600">Paid. The demo card succeeded and the invoice is marked paid.</p>
              <Button asChild className="mt-4">
                <Link href={`/invoice/${id}`}>Back to invoice</Link>
              </Button>
            </div>
          ) : mode === "test" ? (
            <form action={`/api/invoices/${id}/checkout`} method="POST" className="mt-6">
              <p className="text-sm text-neutral-700">A Stripe test key is set, so this invoice uses Stripe Checkout.</p>
              <Button type="submit" size="lg" className="mt-4 w-full">
                Continue to Stripe
              </Button>
            </form>
          ) : mode === "refused" ? (
            <p className="mt-4 text-sm text-error-600">{stripeRefusalMessage()}</p>
          ) : (
            <>
              {status === "failed" ? (
                <p className="mt-4 rounded-md bg-error-50 px-3 py-2 text-sm text-error-600">Your card was declined. Try 4242 to pay it.</p>
              ) : null}
              <div className="mt-6">
                <DemoPayForm target="invoice" id={id} returnTo={`/pay/invoice/${id}`} />
              </div>
            </>
          )}
        </Card>
      </main>
    </>
  );
}
