"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export function ConfirmSubmit({
  fields,
  label,
  title,
  body,
  tone = "primary",
}: {
  fields: Record<string, string>;
  label: string;
  title: string;
  body: string;
  tone?: "primary" | "destructive";
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant={tone === "destructive" ? "destructive" : "primary"}>
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{body}</DialogDescription>
        <form action="/api/admin/action" method="POST" className="mt-6 flex justify-end gap-2">
          {Object.entries(fields).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </DialogClose>
          <Button type="submit" variant={tone === "destructive" ? "destructive" : "primary"}>
            Confirm
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
