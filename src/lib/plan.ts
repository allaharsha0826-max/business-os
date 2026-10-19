export const PRODUCT = "Business OS";

export const SESSION_OFFER = {
  name: "60-min SAT Math",
  label: "60-min SAT Math · $80",
  durationMin: 60,
  priceCents: 8000,
};

export const SLOT_TIMES = ["16:00", "17:00", "18:00", "19:00"];

export const PLAN = {
  name: "Business OS",
  priceLabel: "$19/mo",
  priceCents: 1900,
  interval: "month",
  trialDays: 14,
  cardRequired: false,
  cancelAnytime: true,
  students: "unlimited",
  features: [
    "A public booking page for the business",
    "Appointments that turn into invoices and a test checkout",
    "Sales, support, marketing, and HR desks",
    "One approvals inbox for discounts, refunds, campaigns, time off, and hires",
    "A bot API, an activity feed, and a kill switch",
  ],
};

export const FAQ = [
  {
    id: "price",
    q: "How much is it, and is there a trial?",
    a: "Business OS is $19/mo. One plan. There is a 14-day free trial, no card required, and you can cancel anytime.",
  },
  {
    id: "who",
    q: "Who is it for?",
    a: "A one-person service business: a tutor, a coach, a cleaner, a stylist. The live demo is Maya Chen's tutoring desk.",
  },
  {
    id: "bots",
    q: "What do the bots do?",
    a: "Sales, support, and ops can answer from this FAQ, log work, and draft the next step. Discounts, refunds, campaigns that go out, time off, and hires wait for the founder. Silence is not approval.",
  },
  {
    id: "discount",
    q: "Can I get a discount or an annual plan?",
    a: "Not from the published plan. Business OS does not offer discounts or annual pricing. A request like that is queued for Kodanda, and the price does not change unless he changes it himself.",
  },
  {
    id: "payments",
    q: "How do payments work in the demo?",
    a: "With no Stripe key, checkout is an in-app demo. It is labeled demo / test mode and moves no real money. Card 4242 4242 4242 4242 succeeds. Card 4000 0000 0000 0002 declines. A sk_test_ key switches the same buttons to Stripe Checkout.",
  },
  {
    id: "parent-update",
    q: "How do I send a parent update?",
    a: "1. Open Business OS and go to Bookings. 2. Find the session. 3. Fill Covered, Went well, and Next focus. 4. Mark done. The note is saved in the Outbox and an invoice is created.",
  },
];

export const HOLDING_REPLY =
  "Thanks, I've passed this to Kodanda and you'll hear back within 1 business day.";

export function pricingPayload(origin: string) {
  return {
    ok: true,
    product: PRODUCT,
    plan: {
      name: PLAN.name,
      price: PLAN.priceLabel,
      price_cents: PLAN.priceCents,
      currency: "usd",
      interval: PLAN.interval,
      trial_days: PLAN.trialDays,
      card_required: PLAN.cardRequired,
      cancel_anytime: PLAN.cancelAnytime,
      students: PLAN.students,
    },
    features: PLAN.features,
    faq: FAQ.map((item) => ({ id: item.id, question: item.q, answer: item.a })),
    signup_url: `${origin}/pricing`,
    demo_url: `${origin}/t/maya-tutor`,
    booking_url: `${origin}/t/maya-tutor`,
    rules: [
      "Answer only from this payload.",
      "Do not offer a discount, a custom price, an annual plan, or a trial longer than 14 days.",
      "If the request is off this list, queue an approval and send the holding reply.",
      "Silence is not approval. Rejecting an approval has no side effect.",
    ],
  };
}
