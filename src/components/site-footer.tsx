import Link from "next/link";

import { SealMark } from "@/components/logo";
import { getAllSkills } from "@/lib/skills";

export function SiteFooter() {
  const columns = [
    {
      title: "The library",
      links: [
        { label: "All runes", href: "/#runes" },
        ...getAllSkills().map((skill) => ({
          label: skill.name,
          href: `/skills/${skill.slug}`,
        })),
      ],
    },
    {
      title: "Rune",
      links: [
        { label: "The ethos", href: "/#ethos" },
        { label: "Get started", href: "/#get-started" },
      ],
    },
  ];

  return (
    <footer className="mt-24 border-t border-border/70">
      <div className="mx-auto w-full max-w-6xl px-6 py-14">
        <div className="flex flex-col gap-12 md:flex-row md:justify-between">
          <div className="max-w-xs">
            <div className="flex items-center gap-2.5">
              <SealMark className="size-6" />
              <span className="font-pixel text-sm text-foreground">RUNE</span>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              A curated library of runes — small powers that make any agent
              capable of more. Every one forged by Fable 5.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-12 sm:gap-20">
            {columns.map((col) => (
              <div key={col.title}>
                <h3 className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  {col.title}
                </h3>
                <ul className="mt-4 space-y-3">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="text-sm text-foreground/80 transition-colors hover:text-primary"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-border/60 pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Rune. A quiet corner of the web.</p>
          <p className="flex items-center gap-1.5">
            <span className="inline-block size-1.5 bg-primary" />
            Crafted end to end by Fable 5
          </p>
        </div>
      </div>
    </footer>
  );
}
