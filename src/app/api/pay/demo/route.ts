import { redirectBack } from "@/lib/http";
import { settleDemoCard } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const form = await request.formData();
  const target = String(form.get("target") ?? "") === "plan" ? "plan" : "invoice";
  const id = String(form.get("id") ?? "");
  const back = String(form.get("return") ?? (target === "plan" ? `/pay/plan/${id}` : `/pay/invoice/${id}`));
  const result = await settleDemoCard({
    target,
    id,
    card: String(form.get("card_number") ?? ""),
    exp: String(form.get("exp") ?? ""),
    cvc: String(form.get("cvc") ?? ""),
    name: String(form.get("card_name") ?? ""),
  });
  if (!result.ok) return redirectBack(back, { error: result.message });
  return redirectBack(back, { toast: result.message });
}
