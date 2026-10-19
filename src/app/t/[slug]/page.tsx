import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { LocalTime } from "@/components/local-time";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SESSION_OFFER } from "@/lib/plan";
import { listOpenSlots } from "@/lib/store";
import { formatDay, formatTime } from "@/lib/time";

export default async function BookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const data = await listOpenSlots(slug);
  if (!data) notFound();
  const timeZone = String(data.tutor.timezone);
  const groups = new Map<string, { label: string; slots: { startsAt: string; endsAt: string }[] }>();
  for (const slot of data.slots) {
    const label = formatDay(slot.startsAt, timeZone);
    const group = groups.get(label) ?? { label, slots: [] };
    group.slots.push(slot);
    groups.set(label, group);
  }

  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto max-w-[560px] px-4 py-8">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-primary-600 text-sm font-semibold text-white">MC</span>
          <div>
            <h1 className="text-2xl font-semibold">{String(data.tutor.name)}</h1>
            <p className="text-sm text-neutral-700">{String(data.tutor.bio)}</p>
          </div>
        </div>
        <p className="mt-4 inline-flex rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700">SAT Math</p>
        <form action="/api/bookings" method="POST" className="mt-6 grid gap-5">
          <input type="hidden" name="slug" value={slug} />
          <fieldset className="grid gap-3">
            <legend className="text-sm font-semibold">Session</legend>
            <div className="flex items-center justify-between rounded-lg border border-primary-600 bg-primary-50 px-4 py-3">
              <span className="text-sm font-medium">{SESSION_OFFER.label}</span>
              <span className="font-mono text-sm">60 min</span>
            </div>
          </fieldset>
          <fieldset className="grid gap-4">
            <legend className="text-sm font-semibold">Time · Central</legend>
            {groups.size === 0 ? (
              <p className="rounded-lg border border-dashed border-neutral-200 bg-white px-4 py-8 text-sm text-neutral-700">
                No open slots this week. Check back tomorrow evening.
              </p>
            ) : (
              [...groups.values()].map((group) => (
                <div key={group.label}>
                  <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">{group.label}</p>
                  <div className="mt-2 grid gap-2">
                    {group.slots.map((slot) => (
                      <label key={slot.startsAt} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border border-neutral-200 bg-white px-3 py-2">
                        <input type="radio" name="starts_at" value={slot.startsAt} required className="h-4 w-4" />
                        <span className="text-sm">
                          {formatTime(slot.startsAt, timeZone)} Central
                          <LocalTime iso={slot.startsAt} />
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))
            )}
          </fieldset>
          <div className="grid gap-3">
            <Field label="Parent name" name="parent_name" />
            <Field label="Parent email" name="parent_email" type="email" />
            <Field label="Parent phone" name="parent_phone" type="tel" />
            <Field label="Student name" name="student_name" />
            <label className="grid gap-1.5 text-sm font-medium">
              Grade
              <select name="student_grade" required className="h-10 rounded-sm border border-neutral-200 bg-white px-3 text-sm">
                <option value="">Select</option>
                {["6", "7", "8", "9", "10", "11", "12"].map((grade) => (
                  <option key={grade} value={grade}>
                    Grade {grade}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Notes
              <Textarea name="notes" placeholder="Anything Maya should know" />
            </label>
          </div>
          {query.error ? <p className="text-sm text-error-600">{query.error}</p> : null}
          <Button type="submit" size="lg" disabled={groups.size === 0}>
            Book session
          </Button>
          <p className="text-xs leading-5 text-neutral-500">
            Maya confirms automatically. Cancel or reschedule at least {String(data.tutor.cancel_policy_hours)} hours ahead by writing to her.
          </p>
        </form>
      </main>
    </>
  );
}

function Field({ label, name, type = "text" }: { label: string; name: string; type?: string }) {
  const id = name;
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={name} type={type} required />
    </div>
  );
}
