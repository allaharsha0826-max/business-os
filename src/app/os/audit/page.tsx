import { Card } from "@/components/ui/card";
import { listAudit } from "@/lib/store";
import { formatDateTime } from "@/lib/time";

export default async function AuditPage() {
  const rows = await listAudit();
  return (
    <Card className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="text-xs uppercase text-neutral-500">
          <tr>
            <th className="px-4 py-3">When</th>
            <th className="px-4 py-3">Actor</th>
            <th className="px-4 py-3">Action</th>
            <th className="px-4 py-3">Target</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-4 py-8 text-neutral-500">
                No audit rows yet.
              </td>
            </tr>
          ) : null}
          {rows.map((row) => (
            <tr key={String(row.id)} className="border-t border-neutral-100">
              <td className="px-4 py-3 whitespace-nowrap text-neutral-500">{formatDateTime(String(row.created_at), "America/Chicago")}</td>
              <td className="px-4 py-3 font-medium">{String(row.actor)}</td>
              <td className="px-4 py-3">{String(row.action)}</td>
              <td className="px-4 py-3 font-mono text-xs">{String(row.target)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
