import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LEAD_STATUSES, listLeads } from "@/lib/store";

export default async function SalesPage() {
  const leads = await listLeads();
  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <Card className="h-fit p-4">
        <h2 className="font-semibold">New lead</h2>
        <form action="/api/admin/action" method="POST" className="mt-3 grid gap-2">
          <input type="hidden" name="type" value="create_lead" />
          <input type="hidden" name="return" value="/os/sales" />
          <Input name="name" required placeholder="Name" aria-label="Lead name" />
          <Input name="email" type="email" required placeholder="Email" aria-label="Lead email" />
          <Input name="source" placeholder="Source" aria-label="Lead source" />
          <Button type="submit">Add lead</Button>
        </form>
      </Card>
      <Card className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-3">Lead</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {leads.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-neutral-500">
                  No leads yet.
                </td>
              </tr>
            ) : null}
            {leads.map((lead) => (
              <tr key={String(lead.id)} className="border-b border-neutral-100 hover:bg-neutral-50">
                <td className="px-4 py-3">
                  <p className="font-medium">{String(lead.name)}</p>
                  <p className="text-neutral-500">{String(lead.email)}</p>
                </td>
                <td className="px-4 py-3">{String(lead.source)}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={String(lead.status)} />
                    <form action="/api/admin/action" method="POST" className="flex gap-2">
                      <input type="hidden" name="type" value="set_lead_status" />
                      <input type="hidden" name="id" value={String(lead.id)} />
                      <input type="hidden" name="return" value="/os/sales" />
                      <select name="status" defaultValue={String(lead.status)} aria-label={`Status for ${String(lead.name)}`} className="h-8 rounded-sm border border-neutral-200 bg-white px-2 text-xs">
                        {LEAD_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                      <Button type="submit" size="sm" variant="secondary">
                        Update
                      </Button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
