import { NextResponse } from "next/server";
import { redirectBack } from "@/lib/http";
import { requestOrigin } from "@/lib/origin";
import { startInvoiceCheckout } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const started = await startInvoiceCheckout(id, await requestOrigin());
  if (!started.ok || !started.url) return redirectBack(`/invoice/${id}`, { error: started.ok ? "Checkout did not return a link." : started.message });
  return NextResponse.redirect(started.url, 303);
}
