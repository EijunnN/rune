import { cn } from "@/lib/utils";

/**
 * The Rune mark — a blocky, pixel-cut vermilion tile holding the Raido rune (ᚱ).
 * Square edges and square stroke caps to sit right in the 8-bit system.
 */
export function SealMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={cn("size-7", className)}
    >
      <rect x="1" y="1" width="30" height="30" className="fill-primary" />
      <g
        className="stroke-primary-foreground"
        strokeWidth="2.6"
        strokeLinecap="square"
        strokeLinejoin="miter"
      >
        {/* stave */}
        <path d="M11 8v16" />
        {/* bowl */}
        <path d="M11 8l9 4-9 3.5" />
        {/* leg */}
        <path d="M11 15.5l9.5 8.5" />
      </g>
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <SealMark className="size-6" />
      <span className="flex items-baseline gap-1.5 leading-none">
        <span className="font-pixel text-sm tracking-tight text-foreground">
          RUNE
        </span>
        <span className="text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
          by Fable 5
        </span>
      </span>
    </span>
  );
}
