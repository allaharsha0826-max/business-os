import { money } from "./money";
import { HOLDING_REPLY } from "./plan";
import { formatDateTime } from "./time";

export { HOLDING_REPLY };

export function parentUpdateBody(input: {
  parentName: string;
  studentName: string;
  sessionType: string;
  startsAt: string;
  timeZone: string;
  covered: string;
  wentWell: string;
  nextFocus: string;
  tutorName: string;
  payUrl: string;
}) {
  const when = formatDateTime(input.startsAt, input.timeZone);
  return [
    `Hi ${input.parentName},`,
    "",
    `Here is today's update for ${input.studentName}'s ${input.sessionType} session (${when} Central).`,
    "",
    "What we covered",
    input.covered,
    "",
    "What went well",
    input.wentWell,
    "",
    "Next focus",
    input.nextFocus,
    "",
    "The session invoice is ready:",
    input.payUrl,
    "",
    `— ${input.tutorName}`,
    "Sent with Business OS",
  ].join("\n");
}

export function dunningBody(input: {
  parentName: string;
  studentName: string;
  invoiceNumber: string;
  amountCents: number;
  reason: string;
  payUrl: string;
  tutorName: string;
}) {
  return [
    `Hi ${input.parentName},`,
    "",
    `The payment for ${input.studentName}'s session didn't go through. Invoice ${input.invoiceNumber} is ${money(input.amountCents)}.`,
    input.reason ? `The card network said: ${input.reason}` : "The card was declined.",
    "This is a test-mode notice. No real charge was made, and nothing was retried.",
    "",
    "You can try another card here:",
    input.payUrl,
    "",
    `— ${input.tutorName}`,
    "Sent with Business OS",
  ].join("\n");
}

export function digestBody(input: {
  invoiceNumber: string;
  amountCents: number;
  parentName: string;
  reason: string;
}) {
  return `Payment failed for ${input.invoiceNumber} (${money(input.amountCents)}, ${input.parentName}). ${input.reason || "Card declined."} Standard dunning drafted. No refund and no second charge.`;
}
