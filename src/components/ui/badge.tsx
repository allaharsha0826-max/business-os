import { cn } from "@/lib/utils";

const tones: Record<string, string> = {
  booked: "bg-primary-50 text-primary-700",
  done: "bg-success-50 text-success-600",
  paid: "bg-success-50 text-success-600",
  approved: "bg-success-50 text-success-600",
  won: "bg-success-50 text-success-600",
  answered: "bg-success-50 text-success-600",
  open: "bg-warn-50 text-warn-600",
  pending: "bg-warn-50 text-warn-600",
  contacted: "bg-warn-50 text-warn-600",
  needs_approval: "bg-warn-50 text-warn-600",
  failed: "bg-error-50 text-error-600",
  escalated: "bg-error-50 text-error-600",
  lost: "bg-neutral-100 text-neutral-700",
  rejected: "bg-neutral-100 text-neutral-700",
  draft: "bg-neutral-100 text-neutral-700",
  canceled: "bg-neutral-100 text-neutral-700",
  new: "bg-primary-50 text-primary-700",
  trial: "bg-accent-100 text-neutral-900",
  interview: "bg-accent-100 text-neutral-900",
  scheduled: "bg-primary-50 text-primary-700",
};

export function StatusBadge({ status }: { status: string }) {
  const tone = tones[status] ?? "bg-neutral-100 text-neutral-700";
  const label = status.replaceAll("_", " ");
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium capitalize", tone)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {label}
    </span>
  );
}
