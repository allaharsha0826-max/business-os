"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

export function Flash() {
  const params = useSearchParams();
  const message = params.get("toast");
  const error = params.get("error");

  useEffect(() => {
    if (!message && !error) return;
    if (message) toast.success(message);
    if (error) toast.error(error);
    const url = new URL(window.location.href);
    url.searchParams.delete("toast");
    url.searchParams.delete("error");
    const next = `${url.pathname}${url.search}${url.hash}`;
    window.history.replaceState(null, "", next);
  }, [message, error]);

  return null;
}
