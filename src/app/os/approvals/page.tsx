import { ConfirmSubmit } from "@/components/confirm-submit";
import { StatusBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { listApprovals } from "@/lib/store";
import { formatDateTime } from "@/lib/time";

export default async function ApprovalsPage() {
  const approvals = await listApprovals();
  const pending = approvals.filter((row) => String(row.status) === "pending");
  const decided = approvals.filter((row) => String(row.status) !== "pending");
  return (
    <div className="grid gap-4">
      <p className="max-w-2xl text-sm leading-6 text-neutral-700">
        Approving a discount or a refund records your decision only. The price stays $19 and no refund is sent. Approving time off, a campaign, or a hire updates that row and nothing else.
      </p>
      {pending.length === 0 ? (
        <Card className="px-6 py-10 text-center text-sm text-neutral-500">The inbox is clear.</Card>
      ) : null}
      {pending.map((item) => (
        <Card key={String(item.id)} className="p-5">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status="pending" />
            <span className="text-xs uppercase tracking-wide text-neutral-500">{String(item.department)} · {String(item.bot)}</span>
          </div>
          <h2 className="mt-2 text-lg font-semibold">{String(item.request)}</h2>
          <p className="mt-1 text-sm text-neutral-700">{String(item.customer)}</p>
          <p className="mt-3 text-sm leading-6">{String(item.recommendation)}</p>
          <p className="mt-2 text-xs text-neutral-500">{formatDateTime(String(item.created_at), "America/Chicago")}</p>
          <div className="mt-4 flex gap-2">
            <ConfirmSubmit
              label="Approve"
              title="Approve this request?"
              body={
                String(item.kind) === "discount" || String(item.kind) === "refund"
                  ? "This records your yes. It does not change the price or touch Stripe."
                  : "This records your yes and updates that one row."
              }
              fields={{ type: "decide_approval", id: String(item.id), decision: "approved", return: "/os/approvals" }}
            />
            <ConfirmSubmit
              label="Reject"
              tone="destructive"
              title="Reject this request?"
              body="Rejecting has no side effect. The price, invoices, and Stripe stay as they are."
              fields={{ type: "decide_approval", id: String(item.id), decision: "rejected", return: "/os/approvals" }}
            />
          </div>
        </Card>
      ))}
      {decided.length > 0 ? (
        <div className="grid gap-2">
          <h2 className="text-sm font-semibold text-neutral-500">Decided</h2>
          {decided.map((item) => (
            <Card key={String(item.id)} className="flex items-center justify-between gap-3 p-4">
              <p className="text-sm">{String(item.request)}</p>
              <StatusBadge status={String(item.status)} />
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  );
}
