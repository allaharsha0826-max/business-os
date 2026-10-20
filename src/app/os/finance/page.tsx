import Link from "next/link";
import { StatusBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { money } from "@/lib/money";
import { listInvoices, listPlanPayments } from "@/lib/store";

export default async function FinancePage() {
  const invoices = await listInvoices();
  const plans = await listPlanPayments();
  const paid = invoices.filter((row) => String(row.status) === "paid").reduce((sum, row) => sum + Number(row.amount_cents), 0);
  const failed = invoices.filter((row) => String(row.status) === "failed").length;
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs text-neutral-500">Session revenue</p>
          <p className="font-mono text-2xl font-semibold">{money(paid)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-neutral-500">Failed invoices</p>
          <p className="font-mono text-2xl font-semibold">{failed}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-neutral-500">Plan checkouts</p>
          <p className="font-mono text-2xl font-semibold">{plans.length}</p>
        </Card>
      </div>
      <Card className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase text-neutral-500">
            <tr>
              <th className="px-4 py-3">Invoice</th>
              <th className="px-4 py-3">Family</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-neutral-500">
                  No invoices yet. Mark a session done to create one.
                </td>
              </tr>
            ) : null}
            {invoices.map((invoice) => (
              <tr key={String(invoice.id)} className="border-t border-neutral-100 hover:bg-neutral-50">
                <td className="px-4 py-3">
                  <Link href={`/invoice/${String(invoice.id)}`} className="font-semibold text-primary-600">
                    {String(invoice.number)}
                  </Link>
                </td>
                <td className="px-4 py-3">{String(invoice.parent_name)}</td>
                <td className="px-4 py-3 font-mono">{money(Number(invoice.amount_cents))}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={String(invoice.status)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      {plans.length > 0 ? (
        <Card className="p-4">
          <h2 className="font-semibold">$19 plan checkouts</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {plans.map((plan) => (
              <li key={String(plan.id)} className="flex items-center justify-between gap-2">
                <span>{String(plan.email)}</span>
                <StatusBadge status={String(plan.status)} />
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
