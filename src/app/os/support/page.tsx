import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { listReplies, listTickets } from "@/lib/store";

export default async function SupportPage() {
  const tickets = await listTickets();
  const threads = await Promise.all(tickets.map(async (ticket) => ({ ticket, replies: await listReplies(String(ticket.id)) })));
  return (
    <div className="grid gap-4">
      <Card className="p-4">
        <h2 className="font-semibold">New ticket</h2>
        <form action="/api/admin/action" method="POST" className="mt-3 grid gap-2 md:grid-cols-2">
          <input type="hidden" name="type" value="create_ticket" />
          <input type="hidden" name="return" value="/os/support" />
          <Input name="from_name" required placeholder="From" aria-label="From name" />
          <Input name="from_email" type="email" required placeholder="Email" aria-label="From email" />
          <Input name="subject" required placeholder="Subject" className="md:col-span-2" aria-label="Subject" />
          <Textarea name="body" required placeholder="What they asked" className="md:col-span-2" aria-label="Ticket body" />
          <Button type="submit" className="w-fit">
            Open ticket
          </Button>
        </form>
      </Card>
      {threads.length === 0 ? <p className="text-sm text-neutral-500">No tickets.</p> : null}
      {threads.map(({ ticket, replies }) => (
        <Card key={String(ticket.id)} className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold">{String(ticket.subject)}</h3>
            <StatusBadge status={String(ticket.status)} />
          </div>
          <p className="text-xs text-neutral-500">{String(ticket.from_name)} · {String(ticket.from_email)}</p>
          <p className="mt-2 text-sm leading-6">{String(ticket.body)}</p>
          <ul className="mt-3 space-y-2">
            {replies.map((reply) => (
              <li key={String(reply.id)} className="rounded-md bg-neutral-50 px-3 py-2 text-sm">
                <span className="font-medium capitalize">{String(reply.author)}: </span>
                {String(reply.body)}
              </li>
            ))}
          </ul>
          <form action="/api/admin/action" method="POST" className="mt-3 grid gap-2">
            <input type="hidden" name="type" value="reply_ticket" />
            <input type="hidden" name="id" value={String(ticket.id)} />
            <input type="hidden" name="return" value="/os/support" />
            <Textarea name="body" required placeholder="Reply" aria-label={`Reply to ${String(ticket.subject)}`} />
            <div className="flex gap-2">
              <select name="status" defaultValue="answered" aria-label="Ticket status" className="h-10 rounded-sm border border-neutral-200 bg-white px-2 text-sm">
                <option value="answered">Answered</option>
                <option value="open">Open</option>
                <option value="escalated">Escalated</option>
              </select>
              <Button type="submit">Send reply</Button>
            </div>
          </form>
        </Card>
      ))}
    </div>
  );
}
