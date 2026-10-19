import { Card } from "@/components/ui/card";
import { listOutbox } from "@/lib/store";
import { formatDateTime } from "@/lib/time";

export default async function OutboxPage() {
  const rows = await listOutbox();
  return (
    <div className="grid gap-3">
      {rows.length === 0 ? <Card className="p-8 text-sm text-neutral-500">The outbox is empty.</Card> : null}
      {rows.map((row) => (
        <Card key={String(row.id)} className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-500">
            <span className="font-semibold uppercase tracking-wide">{String(row.kind).replaceAll("_", " ")}</span>
            <time dateTime={String(row.created_at)}>{formatDateTime(String(row.created_at), "America/Chicago")}</time>
          </div>
          <h2 className="mt-2 font-semibold">{String(row.subject)}</h2>
          <p className="text-sm text-neutral-500">To {String(row.to_email)}</p>
          <pre className="mt-3 whitespace-pre-wrap font-sans text-sm leading-6 text-neutral-900">{String(row.body)}</pre>
        </Card>
      ))}
    </div>
  );
}
