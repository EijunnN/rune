import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type { Skill } from "@/lib/skills";

/**
 * A library entry rendered as a directory-listing row — the whole page is a
 * terminal session, so the catalog reads like `ls /library`. Hover inverts the
 * row into the vermilion accent: the signature interaction of the site.
 */
export function SkillCard({ skill, index }: { skill: Skill; index: number }) {
  return (
    <Link
      href={`/skills/${skill.slug}`}
      className="group relative grid grid-cols-[auto_1fr_auto] items-baseline gap-x-4 border-t border-border px-3 py-6 transition-colors last:border-b hover:bg-primary focus-visible:bg-primary focus-visible:outline-none md:grid-cols-[3.5rem_1fr_16rem_auto] md:gap-x-6 md:px-4"
    >
      <span className="font-pixel text-[0.65rem] text-primary group-hover:text-primary-foreground group-focus-visible:text-primary-foreground">
        {String(index).padStart(2, "0")}
      </span>

      <div className="min-w-0">
        <h3 className="font-mono text-xl font-bold tracking-tight text-foreground group-hover:text-primary-foreground group-focus-visible:text-primary-foreground md:text-2xl">
          {skill.name}
        </h3>
        <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted-foreground group-hover:text-primary-foreground/80 group-focus-visible:text-primary-foreground/80">
          {skill.tagline}
        </p>
        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[0.7rem] text-muted-foreground/80 group-hover:text-primary-foreground/70 group-focus-visible:text-primary-foreground/70">
          {skill.tags.slice(0, 4).map((tag) => (
            <span key={tag}>#{tag}</span>
          ))}
        </div>
      </div>

      <div className="col-start-2 mt-3 flex items-center gap-3 font-mono text-[0.65rem] uppercase tracking-wide text-muted-foreground group-hover:text-primary-foreground/80 group-focus-visible:text-primary-foreground/80 md:col-start-3 md:mt-0 md:flex-col md:items-end md:gap-1">
        <span>{skill.category}</span>
        <span>{skill.agents.join(" · ")}</span>
      </div>

      <ArrowUpRight className="hidden size-5 self-center text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary-foreground group-focus-visible:text-primary-foreground md:block" />
    </Link>
  );
}
