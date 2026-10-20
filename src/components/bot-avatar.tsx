import { cn } from "@/lib/utils";

const COLORS: Record<string, string> = {
  sales: "bg-primary-600",
  support: "bg-accent-500",
  ops: "bg-success-600",
  marketing: "bg-primary-900",
  hr: "bg-warn-600",
  system: "bg-neutral-700",
};

export function BotAvatar({ bot, size = "md" }: { bot: string; size?: "sm" | "md" }) {
  const dim = size === "sm" ? "h-8 w-8 text-[10px]" : "h-10 w-10 text-xs";
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-full font-semibold text-white",
        dim,
        COLORS[bot] ?? "bg-neutral-700",
      )}
      aria-hidden
    >
      {bot.slice(0, 2).toUpperCase()}
    </span>
  );
}
