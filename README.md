# Business OS

Local back office for a one-person service business. The seeded tenant is Maya Chen Tutoring. Bots draft work. The founder approves anything risky. Payments default to an in-app demo checkout — no Stripe account required.

## Run locally

Mac or Windows, about two minutes:

```bash
npm install
npm run dev
```

Open http://127.0.0.1:3000

- Public booking: http://127.0.0.1:3000/t/maya-tutor
- Founder desk: http://127.0.0.1:3000/os (password `demo`)
- Reset seed data: `npm run demo`

SQLite is created at `data/business-os.db` on first run. Copy `.env.example` to `.env.local` only if you want to override the password, bot key, or add Stripe test keys.

## Demo checkout

The pay page is labeled demo / test mode. No real charge is made.

| Card | Result |
| --- | --- |
| 4242 4242 4242 4242 | Paid |
| 4000 0000 0000 0002 | Declined (one dunning draft, one ops audit row) |
| Anything else | Rejected, invoice unchanged |

Expiry `12/34`, CVC `123`, any cardholder name.

## Three-minute walkthrough

1. Book a slot on `/t/maya-tutor`.
2. Sign in at `/login` with password `demo`.
3. On Bookings, mark that session done. An $80 invoice and a parent update appear.
4. Pay the new invoice with `4242…4242` (paid) and Jordan’s open invoice with `4000…0002` (declined).
5. On Approvals, approve one item and reject another. A discount or refund approval records the decision only.
6. Sales, Support, Marketing, and HR already have seed rows. Create or update one row in each.

## Optional Stripe test mode

Leave `STRIPE_SECRET_KEY` unset to stay on demo checkout. To use Stripe test mode, set a key that starts with `sk_test_` in `.env.local`, then:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Put the CLI signing secret in `STRIPE_WEBHOOK_SECRET`. Live keys are refused.

## Bot API

Send header `x-bot-api-key: dev-bot-key`.

- `GET /api/bot/v1/summary`
- `GET /api/bot/v1/openapi.json`
- Human reference: `/docs`
