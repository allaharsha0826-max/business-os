import * as React from "react";
import { cn } from "@/lib/utils";

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "min-h-24 w-full rounded-sm border border-neutral-200 bg-white px-3 py-2 text-base text-neutral-900 outline-none placeholder:text-neutral-500 md:text-sm",
        className,
      )}
      {...props}
    />
  );
}
