import { Card } from "@/components/ui/card";
import { listActivity } from "@/lib/store";
import { ago, formatDateTime } from "@/lib/time";

const COLORS: Record<string, string> = {
  sales: "bg-primary-600",
  support: "bg-accent-500",
  ops: "bg-success-600",
  marketing: "bg-primary-900",
  hr: "bg-warn-600",
  system: "bg-neutral-700",
};

export default async function ActivityPage() {
  const rows = await listActivity(80);
  return (
    <div className="grid gap-3">
      {rows.length === 0 ? <Card className="p-8 text-sm text-neutral-500">No bot activity yet.</Card> : null}
      {rows.map((row) => {
        const bot = String(row.bot);
        return (
          <Card key={String(row.id)} className="flex gap-3 p-4">
            <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-xs font-semibold text-white ${COLORS[bot] ?? "bg-neutral-700"}`} aria-hidden>
              {bot.slice(0, 2).toUpperCase()}
            </span>
            <div>
              <p className="text-sm">
                <span className="font-semibold capitalize">{bot}</span>
                <span className="text-neutral-500"> · {String(row.department)} · {String(row.action).replaceAll("_", " ")}</span>
              </p>
              <p className="mt-1 text-sm leading-6 text-neutral-900">{String(row.summary)}</p>
              <p className="mt-1 text-xs text-neutral-500">
                <time dateTime={String(row.created_at)}>{formatDateTime(String(row.created_at), "America/Chicago")}</time>
                {" · "}
                {ago(String(row.created_at))}
              </p>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
