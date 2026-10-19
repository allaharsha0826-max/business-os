import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getSession, getTutor } from "@/lib/store";
import { formatDateTime, googleCalendarUrl } from "@/lib/time";

export default async function ConfirmedPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ session?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const tutor = await getTutor(slug);
  const session = query.session ? await getSession(query.session) : null;
  if (!tutor || !session || String(session.tutor_id) !== String(tutor.id)) notFound();
  const when = formatDateTime(String(session.starts_at), String(tutor.timezone));
  const calendar = googleCalendarUrl({
    title: `${String(session.session_type)} with ${String(tutor.name)}`,
    startsAt: String(session.starts_at),
    endsAt: String(session.ends_at),
    details: `Student: ${String(session.student_name)}`,
  });

  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto max-w-[560px] px-4 py-10">
        <Card className="p-6">
          <p className="text-sm font-semibold text-success-600">Confirmed</p>
          <h1 className="mt-2 text-2xl font-semibold">{String(session.student_name)} is booked</h1>
          <p className="mt-3 text-neutral-700">
            {String(session.session_type)} · {when} Central · $80
          </p>
          <p className="mt-2 text-sm text-neutral-500">A note will go to {String(session.parent_email)} after Maya marks the session done.</p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button asChild>
              <a href={calendar}>Add to calendar</a>
            </Button>
            <Button asChild variant="secondary">
              <Link href={`/t/${slug}`}>Book another</Link>
            </Button>
          </div>
        </Card>
      </main>
    </>
  );
}
