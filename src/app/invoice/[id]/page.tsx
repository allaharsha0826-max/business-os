import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { money } from "@/lib/money";
import { stripeMode } from "@/lib/secrets";
import { getInvoice } from "@/lib/store";
import { formatDay } from "@/lib/time";

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const invoice = await getInvoice(id);
  if (!invoice) notFound();
  const status = String(invoice.status);
  const mode = stripeMode();
  const amount = money(Number(invoice.amount_cents));

  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto max-w-[560px] px-4 py-8">
        <Card className="p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-neutral-500">Maya Chen</p>
              <h1 className="text-xl font-semibold">{String(invoice.number)}</h1>
            </div>
            <StatusBadge status={status} />
          </div>
          <p className="mt-4 text-sm text-neutral-700">
            Billed to {String(invoice.parent_name)} · {String(invoice.student_name)}
          </p>
          <div className="mt-4 flex items-center justify-between border-t border-neutral-200 pt-4 text-sm">
            <span>
              {String(invoice.session_type)}
              <span className="block text-neutral-500">{formatDay(String(invoice.starts_at), "America/Chicago")}</span>
            </span>
            <span className="font-mono">{amount}</span>
          </div>
          <p className="mt-6 font-mono text-3xl font-semibold">{amount}</p>
          {status === "paid" ? (
            <p className="mt-4 rounded-md bg-success-50 px-3 py-2 text-sm text-success-600">Paid. No further charge.</p>
          ) : null}
          {status === "failed" ? (
            <p className="mt-4 rounded-md bg-error-50 px-3 py-2 text-sm text-error-600">
              {String(invoice.failure_reason || "The card was declined.")} Try another card.
            </p>
          ) : null}
          {status !== "paid" && mode === "missing" ? (
            <Button asChild size="lg" className="mt-6 w-full">
              <Link href={`/pay/invoice/${id}`}>Pay {amount}</Link>
            </Button>
          ) : null}
          {status !== "paid" && mode === "test" ? (
            <form action={`/api/invoices/${id}/checkout`} method="POST" className="mt-6">
              <Button type="submit" size="lg" className="w-full">
                Pay {amount} with Stripe
              </Button>
            </form>
          ) : null}
          {status !== "paid" && mode === "refused" ? (
            <p className="mt-4 text-sm text-error-600">Payment is refused until the Stripe key is a test key.</p>
          ) : null}
          {mode === "test" && invoice.stripe_session_id ? (
            <form action={`/api/invoices/${id}/sync`} method="POST" className="mt-3">
              <Button type="submit" variant="secondary" className="w-full">
                Check status with Stripe
              </Button>
            </form>
          ) : null}
        </Card>
      </main>
    </>
  );
}
