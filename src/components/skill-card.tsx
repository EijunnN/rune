import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { Skill } from "@/lib/skills";

export function SkillCard({ skill }: { skill: Skill }) {
  return (
    <Link
      href={`/skills/${skill.slug}`}
      className="group relative flex flex-col border border-border bg-card p-5 transition-all duration-150 hover:-translate-x-1 hover:-translate-y-1 hover:border-primary hover:shadow-pixel focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
    >
      <div className="flex items-center justify-between">
        <Badge variant="muted" className="tracking-wide">
          {skill.category}
        </Badge>
        <span className="font-mono text-[0.65rem] uppercase tracking-wide text-muted-foreground">
          {skill.agents.join(" · ")}
        </span>
      </div>

      <h3 className="mt-4 text-lg font-semibold tracking-tight text-foreground">
        {skill.name}
      </h3>
      <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted-foreground">
        {skill.tagline}
      </p>

      <div className="mt-5 flex items-center justify-between">
        <div className="flex flex-wrap gap-1.5">
          {skill.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="font-mono text-[0.7rem] text-muted-foreground/80"
            >
              #{tag}
            </span>
          ))}
        </div>
        <ArrowUpRight className="size-4 text-muted-foreground transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" />
      </div>
    </Link>
  );
}
