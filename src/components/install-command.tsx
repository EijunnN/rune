"use client";

import * as React from "react";

import { CopyButton } from "@/components/copy-button";
import { installCommand, RUNNERS } from "@/lib/skills";
import { cn } from "@/lib/utils";

/**
 * Zero-install command block. No global CLI — the user picks a package runner
 * (npx / bunx / pnpm dlx) and runs the rune on demand.
 */
export function InstallCommand({
  slug,
  className,
}: {
  slug: string;
  className?: string;
}) {
  const [active, setActive] = React.useState<string>(RUNNERS[0].id);
  const runner = RUNNERS.find((r) => r.id === active) ?? RUNNERS[0];
  const command = installCommand(slug, runner.prefix);

  return (
    <div className={cn("overflow-hidden border bg-card", className)}>
      <div
        role="tablist"
        aria-label="Package runner"
        className="flex items-center gap-0.5 border-b border-border/70 bg-secondary/30 px-1.5 pt-1.5"
      >
        {RUNNERS.map((r) => (
          <button
            key={r.id}
            type="button"
            role="tab"
            aria-selected={r.id === active}
            onClick={() => setActive(r.id)}
            className={cn(
              "-mb-px border border-transparent px-3 py-1.5 font-mono text-xs transition-colors",
              r.id === active
                ? "border-border/70 border-b-card bg-card text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {r.label}
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between gap-3 py-2 pl-4 pr-2">
        <code className="overflow-x-auto whitespace-nowrap font-mono text-sm text-foreground">
          <span className="select-none text-muted-foreground">$ </span>
          {command}
        </code>
        <CopyButton value={command} label={`Copy: ${command}`} />
      </div>
    </div>
  );
}
