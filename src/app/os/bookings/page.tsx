import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { listInvoices, listSessions } from "@/lib/store";
import { formatDateTime } from "@/lib/time";

export default async function BookingsPage() {
  const sessions = await listSessions();
  const invoices = await listInvoices();
  const bySession = new Map(invoices.map((row) => [String(row.session_id), row]));
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-neutral-700">Maya&apos;s appointments. Marking one done writes an invoice and a parent update.</p>
        <Button asChild variant="secondary">
          <Link href="/t/maya-tutor">Open booking page</Link>
        </Button>
      </div>
      {sessions.length === 0 ? (
        <Empty title="No sessions yet" body="Share the booking page and the first appointment will land here." />
      ) : (
        <div className="grid gap-3">
          {sessions.map((session) => {
            const invoice = bySession.get(String(session.id));
            return (
              <Card key={String(session.id)} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{String(session.student_name)}</p>
                    <p className="text-sm text-neutral-700">
                      {formatDateTime(String(session.starts_at), "America/Chicago")} Central · {String(session.session_type)}
                    </p>
                    <p className="text-sm text-neutral-500">{String(session.parent_name)} · {String(session.parent_email)}</p>
                  </div>
                  <StatusBadge status={String(session.status)} />
                </div>
                {String(session.status) === "booked" ? (
                  <form action="/api/admin/action" method="POST" className="mt-4 grid gap-2">
                    <input type="hidden" name="type" value="mark_done" />
                    <input type="hidden" name="session_id" value={String(session.id)} />
                    <input type="hidden" name="return" value="/os/bookings" />
                    <Textarea name="covered" required placeholder="What we covered" />
                    <Textarea name="went_well" required placeholder="What went well" />
                    <Textarea name="next_focus" required placeholder="Next focus" />
                    <Button type="submit" className="w-fit">
                      Mark done and send update
                    </Button>
                  </form>
                ) : null}
                {invoice ? (
                  <Link href={`/invoice/${String(invoice.id)}`} className="mt-3 inline-block text-sm font-semibold text-primary-600">
                    {String(invoice.number)} · {String(invoice.status)}
                  </Link>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-dashed border-neutral-200 bg-white px-6 py-10 text-center">
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-sm text-neutral-500">{body}</p>
    </div>
  );
}
