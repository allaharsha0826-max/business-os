import { ConfirmSubmit } from "@/components/confirm-submit";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { listApplicants, listApprovals, listJobs, listTimeOff } from "@/lib/store";

export default async function HrPage() {
  const [jobs, applicants, timeOff, approvals] = await Promise.all([listJobs(), listApplicants(), listTimeOff(), listApprovals()]);
  const pendingByTarget = new Map(
    approvals.filter((row) => String(row.status) === "pending" && row.target_id).map((row) => [String(row.target_id), String(row.id)]),
  );
  return (
    <div className="grid gap-6">
      <section className="grid gap-3">
        <h2 className="font-semibold">Open roles</h2>
        <Card className="p-4">
          <form action="/api/admin/action" method="POST" className="grid gap-2 md:grid-cols-2">
            <input type="hidden" name="type" value="create_job" />
            <input type="hidden" name="return" value="/os/hr" />
            <Input name="title" required placeholder="Role title" aria-label="Role title" />
            <Input name="team" placeholder="Team" aria-label="Team" />
            <Textarea name="description" required placeholder="What the role is" className="md:col-span-2" aria-label="Role description" />
            <Button type="submit" className="w-fit">
              Post role
            </Button>
          </form>
        </Card>
        {jobs.map((job) => (
          <Card key={String(job.id)} className="p-4">
            <div className="flex justify-between gap-2">
              <h3 className="font-semibold">{String(job.title)}</h3>
              <StatusBadge status={String(job.status)} />
            </div>
            <p className="mt-2 text-sm text-neutral-700">{String(job.description)}</p>
          </Card>
        ))}
      </section>
      <section>
        <h2 className="font-semibold">Applicants</h2>
        <Card className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-neutral-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {applicants.map((applicant) => (
                <tr key={String(applicant.id)} className="border-t border-neutral-100 hover:bg-neutral-50">
                  <td className="px-4 py-3">
                    {String(applicant.name)}
                    <span className="block text-neutral-500">{String(applicant.email)}</span>
                  </td>
                  <td className="px-4 py-3">{String(applicant.job_title)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={String(applicant.status)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <form action="/api/admin/action" method="POST" className="mt-3 grid gap-2 md:grid-cols-4">
          <input type="hidden" name="type" value="create_applicant" />
          <input type="hidden" name="return" value="/os/hr" />
          <select name="job_id" required aria-label="Role" className="h-10 rounded-sm border border-neutral-200 bg-white px-2 text-sm">
            {jobs.map((job) => (
              <option key={String(job.id)} value={String(job.id)}>
                {String(job.title)}
              </option>
            ))}
          </select>
          <Input name="name" required placeholder="Name" aria-label="Applicant name" />
          <Input name="email" type="email" required placeholder="Email" aria-label="Applicant email" />
          <Button type="submit">Add applicant</Button>
        </form>
      </section>
      <section>
        <h2 className="font-semibold">Time off</h2>
        <div className="mt-3 grid gap-3">
          {timeOff.map((item) => {
            const approvalId = pendingByTarget.get(String(item.id));
            return (
              <Card key={String(item.id)} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-medium">{String(item.person)}</p>
                  <p className="text-sm text-neutral-700">
                    {String(item.starts_on)} to {String(item.ends_on)} · {String(item.reason)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={String(item.status)} />
                  {approvalId ? (
                    <>
                      <ConfirmSubmit
                        label="Approve"
                        title="Approve time off?"
                        body="This marks the request approved. It does not email anyone."
                        fields={{ type: "decide_approval", id: approvalId, decision: "approved", return: "/os/hr" }}
                      />
                      <ConfirmSubmit
                        label="Reject"
                        tone="destructive"
                        title="Reject time off?"
                        body="The request stays as it is, aside from this decision. Nothing else changes."
                        fields={{ type: "decide_approval", id: approvalId, decision: "rejected", return: "/os/hr" }}
                      />
                    </>
                  ) : null}
                </div>
              </Card>
            );
          })}
        </div>
        <form action="/api/admin/action" method="POST" className="mt-3 grid gap-2 md:grid-cols-4">
          <input type="hidden" name="type" value="create_time_off" />
          <input type="hidden" name="return" value="/os/hr" />
          <Input name="person" required placeholder="Person" aria-label="Person" />
          <Input name="starts_on" type="date" required aria-label="Starts" />
          <Input name="ends_on" type="date" required aria-label="Ends" />
          <Input name="reason" required placeholder="Reason" aria-label="Reason" />
          <Button type="submit" className="md:col-span-4 w-fit">
            Request time off
          </Button>
        </form>
      </section>
    </div>
  );
}
