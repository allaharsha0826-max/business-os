import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-sm border border-neutral-200 bg-white px-3 text-base text-neutral-900 outline-none placeholder:text-neutral-500 md:text-sm",
        className,
      )}
      {...props}
    />
  );
}
