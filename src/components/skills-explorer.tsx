"use client";

import { Search, X } from "lucide-react";
import * as React from "react";
import { SealMark } from "@/components/logo";
import { SkillCard } from "@/components/skill-card";
import { Input } from "@/components/ui/input";
import { CATEGORIES, type Skill } from "@/lib/skills";
import { cn } from "@/lib/utils";

type Filter = "All" | (typeof CATEGORIES)[number];

const runeWord = (n: number) => (n === 1 ? "rune" : "runes");

export function SkillsExplorer({ skills }: { skills: Skill[] }) {
  const [query, setQuery] = React.useState("");
  const [active, setActive] = React.useState<Filter>("All");

  // Only offer categories that actually have runes — no dead filters.
  const present = new Set(skills.map((s) => s.category));
  const filters: Filter[] = [
    "All",
    ...CATEGORIES.filter((c) => present.has(c)),
  ];

  const filtered = skills.filter((skill) => {
    const matchesCategory = active === "All" || skill.category === active;
    if (!matchesCategory) return false;
    if (!query.trim()) return true;
    const haystack =
      `${skill.name} ${skill.tagline} ${skill.category} ${skill.tags.join(" ")}`.toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  });

  return (
    <div>
      <div className="flex flex-col gap-5">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search runes, tags, powers…"
            aria-label="Search runes"
            className="h-11 pl-9"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {filters.map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setActive(filter)}
              aria-pressed={active === filter}
              className={cn(
                "h-8 rounded-full px-3.5 text-sm transition-colors",
                active === filter
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {filtered.length === skills.length
            ? `${skills.length} ${runeWord(skills.length)}, forged by Fable 5`
            : `${filtered.length} of ${skills.length} ${runeWord(skills.length)}`}
        </p>
        {(query || active !== "All") && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setActive("All");
            }}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="size-3.5" />
            Clear
          </button>
        )}
      </div>

      {filtered.length > 0 ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((skill) => (
            <SkillCard key={skill.slug} skill={skill} />
          ))}
        </div>
      ) : (
        <div className="mt-6 flex flex-col items-center justify-center rounded-xl border border-dashed py-20 text-center">
          <SealMark className="size-8 opacity-40 grayscale" />
          <p className="mt-4 text-sm font-medium text-foreground">
            Nothing matches that yet
          </p>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">
            Try a broader term, or clear the filters to see the whole library.
          </p>
        </div>
      )}
    </div>
  );
}
