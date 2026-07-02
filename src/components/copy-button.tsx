"use client";

import { Check, Copy } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

type CopyButtonProps = {
  value: string;
  className?: string;
  label?: string;
};

export function CopyButton({
  value,
  className,
  label = "Copy",
}: CopyButtonProps) {
  const [copied, setCopied] = React.useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard blocked (e.g. insecure context) — fail quietly.
    }
  }

  return (
    <button
      type="button"
      onClick={onCopy}
      aria-label={copied ? "Copied" : label}
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40",
        className,
      )}
    >
      {copied ? (
        <Check className="size-4 text-primary" />
      ) : (
        <Copy className="size-4" />
      )}
    </button>
  );
}
