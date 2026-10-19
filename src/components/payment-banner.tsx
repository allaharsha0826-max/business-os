import { stripeMode, stripeRefusalMessage } from "@/lib/secrets";

export function PaymentBanner() {
  const mode = stripeMode();
  if (mode === "test") {
    return (
      <div className="bg-accent-100 px-4 py-2 text-center text-xs font-semibold tracking-wide text-neutral-900">
        Stripe test mode · no real charges. Demo cards still work only when the Stripe key is unset.
      </div>
    );
  }
  if (mode === "refused") {
    return (
      <div className="bg-error-50 px-4 py-2 text-center text-sm text-error-600">{stripeRefusalMessage()}</div>
    );
  }
  return (
    <div className="bg-accent-100 px-4 py-2 text-center text-xs font-semibold tracking-wide text-neutral-900">
      Demo / test mode, no real money. 4242 4242 4242 4242 succeeds · 4000 0000 0000 0002 declines.
    </div>
  );
}
