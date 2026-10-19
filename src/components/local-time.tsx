"use client";

import { useEffect, useState } from "react";

export function LocalTime({ iso }: { iso: string }) {
  const [label, setLabel] = useState("");
  useEffect(() => {
    setLabel(new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(iso)));
  }, [iso]);
  if (!label) return null;
  return <span className="text-neutral-500"> · {label} your time</span>;
}
