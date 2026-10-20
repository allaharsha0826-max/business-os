import Link from "next/link";
import { BotAvatar } from "@/components/bot-avatar";
import { Spark } from "@/components/spark";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { money } from "@/lib/money";
import { ago } from "@/lib/time";
import { overview } from "@/lib/store";

export default async function OverviewPage() {
  const home = await overview();
  const last = home.lastActivity as { created_at?: string; summary?: string; bot?: string } | null;
  return (
    <div className="grid gap-6">
      <Card className={`p-6 ${home.paused ? "bg-error-50" : "bg-success-50"}`} id="bots">
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Status</p>
        <h2 className="mt-1 text-2xl font-semibold">{home.paused ? "Bots are paused" : "Laptop closed: company running"}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-700">
          {home.paused
            ? "Bot API calls are refused and logged. The booking page and demo checkout still work."
            : "Sales, support, and ops can still read the FAQ, log work, and queue approvals. Nothing risky runs without you."}
        </p>
        <p className="mt-2 text-sm text-neutral-700">
          Last bot activity: {last?.created_at ? `${ago(String(last.created_at))} · ${last.summary}` : "None yet"}
        </p>
        <form action="/api/admin/action" method="POST" className="mt-4">
          <input type="hidden" name="type" value="kill_switch" />
          <input type="hidden" name="paused" value={home.paused ? "0" : "1"} />
          <input type="hidden" name="return" value="/os" />
          <Button type="submit" variant={home.paused ? "primary" : "secondary"}>
            {home.paused ? "Resume bots" : "Pause bots"}
          </Button>
        </form>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Revenue collected" value={money(home.revenueCents)} data={home.series.revenue} color="#16A34A" hint="Paid session invoices · 7 days" />
        <Kpi label="On the calendar today" value={String(home.bookingsToday)} data={home.series.bookings} color="#2F5BEA" hint="Sessions · last 7 days" />
        <Kpi label="Tickets still open" value={String(home.openTickets)} data={home.series.tickets} color="#D97706" hint="Open or escalated" />
        <Kpi label="Approvals waiting" value={String(home.pendingApprovals)} data={home.series.approvals} color="#F59E0B" hint="Founder inbox · 7 days" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Waiting on you</h2>
            <Link href="/os/approvals" className="text-sm font-semibold text-primary-600">
              Open inbox
            </Link>
          </div>
          <ul className="mt-4 space-y-3">
            {home.approvals.length === 0 ? <li className="text-sm text-neutral-500">Nothing is waiting.</li> : null}
            {(home.approvals as { id: string; request: string; bot: string; status: string }[]).map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-3 text-sm">
                <span>{item.request}</span>
                <StatusBadge status={item.status} />
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Recent bot activity</h2>
            <Link href="/os/activity" className="text-sm font-semibold text-primary-600">
              Full feed
            </Link>
          </div>
          <ul className="mt-4 space-y-3">
            {(home.activity as { id: string; bot: string; summary: string; created_at: string; department?: string }[]).map((item) => (
              <li key={String(item.id)} className="flex gap-3 text-sm">
                <BotAvatar bot={String(item.bot)} size="sm" />
                <div>
                  <p>
                    <span className="font-semibold capitalize">{item.bot}</span>
                    <span className="text-neutral-500"> · {item.department ?? "ops"} · {ago(String(item.created_at))}</span>
                  </p>
                  <p className="text-neutral-700">{item.summary}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  hint,
  data,
  color,
}: {
  label: string;
  value: string;
  hint: string;
  data: { label: string; value: number }[];
  color: string;
}) {
  return (
    <Card className="p-4">
      <p className="text-xs font-medium text-neutral-500">{label}</p>
      <p className="mt-1 font-mono text-2xl font-semibold">{value}</p>
      <Spark data={data} color={color} />
      <p className="text-xs text-neutral-500">{hint}</p>
    </Card>
  );
}
