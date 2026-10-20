import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("rounded-md border border-neutral-200 bg-white shadow-sm", className)} {...props} />;
}
