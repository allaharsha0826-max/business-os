import { NextResponse } from "next/server";
import { handleStripeEvent } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      { ok: false, message: "Set STRIPE_WEBHOOK_SECRET. Locally: stripe listen --forward-to localhost:3000/api/stripe/webhook" },
      { status: 500 },
    );
  }
  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ ok: false, message: "Missing stripe-signature header." }, { status: 400 });
  const raw = await request.text();
  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY?.trim() || "sk_test_placeholder");
  try {
    const event = stripe.webhooks.constructEvent(raw, signature, secret);
    await handleStripeEvent({ id: event.id, type: event.type, data: { object: event.data.object as unknown as Record<string, unknown> } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, message: "Webhook signature verification failed." }, { status: 400 });
  }
}
