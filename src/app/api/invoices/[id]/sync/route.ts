import { redirectBack } from "@/lib/http";
import { syncInvoiceFromStripe } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const result = await syncInvoiceFromStripe(id);
  if (!result.ok) return redirectBack(`/invoice/${id}`, { error: result.message });
  return redirectBack(`/invoice/${id}`, { toast: result.status === "paid" ? "Stripe says paid." : result.status === "failed" ? "Stripe says the card failed." : result.message || "Still open at Stripe." });
}
