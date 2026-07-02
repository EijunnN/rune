import type * as React from "react";

import { cn } from "@/lib/utils";

/** A purely decorative divider. Not exposed to the accessibility tree. */
function Separator({
  className,
  orientation = "horizontal",
  ...props
}: React.ComponentProps<"div"> & {
  orientation?: "horizontal" | "vertical";
}) {
  return (
    <div
      data-slot="separator"
      data-orientation={orientation}
      aria-hidden="true"
      className={cn(
        "bg-border shrink-0",
        orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
        className,
      )}
      {...props}
    />
  );
}

export { Separator };
