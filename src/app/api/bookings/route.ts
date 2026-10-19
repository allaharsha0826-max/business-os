import { redirectBack } from "@/lib/http";
import { bookSession } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const form = await request.formData();
  const slug = String(form.get("slug") ?? "");
  const result = await bookSession({
    slug,
    startsAt: String(form.get("starts_at") ?? ""),
    parentName: String(form.get("parent_name") ?? ""),
    parentEmail: String(form.get("parent_email") ?? ""),
    parentPhone: String(form.get("parent_phone") ?? ""),
    studentName: String(form.get("student_name") ?? ""),
    studentGrade: String(form.get("student_grade") ?? ""),
    notes: String(form.get("notes") ?? ""),
  });
  if (!result.ok) return redirectBack(`/t/${slug || "maya-tutor"}`, { error: result.message });
  return redirectBack(`/t/${slug}/confirmed?session=${result.sessionId}`, { toast: "Booking confirmed." });
}
