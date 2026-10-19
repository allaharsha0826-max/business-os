import { NextResponse } from "next/server";
import { redirectBack } from "@/lib/http";
import { requestOrigin } from "@/lib/origin";
import { createPlanPayment, getPlanPayment, startPlanCheckout } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const form = await request.formData();
  const existing = String(form.get("existing") ?? "");
  const origin = await requestOrigin();
  const created = existing ? { ok: true as const, id: existing } : await createPlanPayment(String(form.get("email") ?? ""));
  if (!created.ok) return redirectBack("/pricing", { error: created.message });
  const row = await getPlanPayment(created.id);
  if (!row) return redirectBack("/pricing", { error: "Checkout could not be created." });
  const started = await startPlanCheckout(created.id, origin);
  if (!started.ok || !started.url) return redirectBack("/pricing", { error: started.ok ? "Checkout did not return a link." : started.message });
  return NextResponse.redirect(started.url, 303);
}
