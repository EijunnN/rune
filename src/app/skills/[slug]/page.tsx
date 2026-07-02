import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { InstallCommand } from "@/components/install-command";
import { SealMark } from "@/components/logo";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { getAllSkills, getSkill, skillSourceUrl } from "@/lib/skills";

export function generateStaticParams() {
  return getAllSkills().map((skill) => ({ slug: skill.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const skill = getSkill(slug);
  if (!skill) return { title: "Rune not found" };
  return {
    title: skill.name,
    description: skill.tagline,
  };
}

/* Section label in the house voice — vermilion square + tracked caps. */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-primary">
      <span className="inline-block size-2 bg-primary" />
      {children}
    </h2>
  );
}

/* Manifest entry: `key ....... value` with a dotted leader, like the boot log. */
function ManifestRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline gap-2 py-2 font-mono text-sm">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <span
        aria-hidden="true"
        className="flex-1 overflow-hidden whitespace-nowrap tracking-[0.35em] text-border"
      >
        ...................................................
      </span>
      <dd className="shrink-0 text-right text-foreground">{children}</dd>
    </div>
  );
}

/* Terminal window chrome shared by the manifest and the prompt block. */
function TerminalFrame({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`border border-border bg-card ${className ?? ""}`}>
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <div className="flex gap-1.5" aria-hidden="true">
          <span className="size-2.5 bg-primary" />
          <span className="size-2.5 bg-muted-foreground/40" />
          <span className="size-2.5 bg-muted-foreground/40" />
        </div>
        <span className="font-mono text-[0.65rem] text-muted-foreground">
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}

export default async function SkillPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const skill = getSkill(slug);

  if (!skill) notFound();

  return (
    <>
      <SiteHeader />

      <main className="flex-1">
        <div className="mx-auto w-full max-w-6xl px-6 py-12 md:py-16">
          <Link
            href="/#runes"
            className="inline-flex items-center gap-2 font-mono text-sm text-muted-foreground transition-colors hover:text-primary"
          >
            <ArrowLeft className="size-3.5" />
            cd /library
          </Link>

          {/* Inspect line + title */}
          <div className="mt-10 max-w-3xl">
            <p className="flex items-baseline gap-2 font-mono text-xs text-muted-foreground">
              <span className="text-primary">&gt;</span>
              <span>inspect {skill.slug}</span>
              <span
                aria-hidden="true"
                className="flex-1 overflow-hidden whitespace-nowrap tracking-[0.35em] text-border"
              >
                ...................................................
              </span>
              <span className="text-foreground">found</span>
            </p>

            <h1 className="mt-7 text-balance font-pixel text-lg uppercase leading-[1.8] text-foreground sm:text-xl md:text-3xl md:leading-[1.7]">
              {skill.name}
            </h1>

            <p className="mt-5 max-w-2xl text-balance text-lg leading-relaxed text-muted-foreground">
              {skill.tagline}
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Badge variant="muted" className="tracking-wide">
                {skill.category}
              </Badge>
              <span className="font-mono text-xs text-muted-foreground">
                v{skill.version}
              </span>
              <span className="font-mono text-[0.65rem] uppercase tracking-wide text-muted-foreground">
                {skill.agents.join(" · ")}
              </span>
            </div>
          </div>

          <InstallCommand slug={skill.slug} className="mt-9 max-w-xl" />
          <p className="mt-2 font-mono text-xs text-muted-foreground">
            No CLI to install — the rune is written straight into your
            agent&apos;s skills folder.
          </p>

          <div className="my-12 ink-rule" />

          <div className="grid gap-12 md:grid-cols-[1fr_19rem] md:gap-16">
            {/* Body */}
            <article>
              <section>
                <SectionLabel>Overview</SectionLabel>
                <p className="mt-5 leading-relaxed text-foreground/90">
                  {skill.overview}
                </p>
              </section>

              <section className="mt-12">
                <SectionLabel>What it grants</SectionLabel>
                <ul className="mt-5 space-y-0">
                  {skill.capabilities.map((cap, i) => (
                    <li
                      key={cap}
                      className="flex gap-4 border-t border-border/60 py-3.5 first:border-t-0"
                    >
                      <span className="select-none font-pixel text-[0.6rem] leading-6 text-primary">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="text-sm leading-relaxed text-foreground/90">
                        {cap}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="mt-12">
                <SectionLabel>Try it like this</SectionLabel>
                <TerminalFrame title="rune@fable5:~" className="mt-5">
                  <p className="p-5 font-mono text-sm leading-relaxed text-foreground">
                    <span className="select-none text-primary">agent&gt; </span>
                    {skill.usagePrompt}
                    <span className="ml-1 inline-block h-4 w-2 translate-y-0.5 bg-primary animate-blink align-middle" />
                  </p>
                </TerminalFrame>
              </section>
            </article>

            {/* Manifest */}
            <aside>
              <TerminalFrame title={`${skill.slug}/rune.manifest`}>
                <div className="p-5">
                  <dl>
                    <ManifestRow label="version">
                      v{skill.version}
                    </ManifestRow>
                    <ManifestRow label="updated">{skill.updated}</ManifestRow>
                    <ManifestRow label="category">
                      {skill.category}
                    </ManifestRow>
                    <ManifestRow label="agents">
                      {skill.agents.length}
                    </ManifestRow>
                    <ManifestRow label="source">
                      <a
                        href={skillSourceUrl(skill)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs underline decoration-border underline-offset-4 transition-colors hover:text-primary hover:decoration-primary"
                      >
                        {skill.sourcePath}
                      </a>
                    </ManifestRow>
                    <ManifestRow label="author">
                      <span className="inline-flex items-center gap-1.5">
                        <SealMark className="size-4" />
                        Fable 5
                      </span>
                    </ManifestRow>
                  </dl>

                  <p className="mt-1 font-mono text-xs text-muted-foreground">
                    works with {skill.agents.join(" and ")}
                  </p>

                  <div className="mt-5 border-t border-border/70 pt-4">
                    <h3 className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      Tags
                    </h3>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {skill.tags.map((tag) => (
                        <span
                          key={tag}
                          className="bg-muted px-2 py-0.5 font-mono text-[0.7rem] text-muted-foreground"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </TerminalFrame>
            </aside>
          </div>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
