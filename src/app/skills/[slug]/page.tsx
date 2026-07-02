import { ArrowLeft, Check } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { InstallCommand } from "@/components/install-command";
import { SealMark } from "@/components/logo";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { getAllSkills, getSkill } from "@/lib/skills";

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

function MetaRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium text-foreground">{children}</dd>
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
        <div className="mx-auto w-full max-w-5xl px-6 py-12 md:py-16">
          <Link
            href="/#runes"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            All runes
          </Link>

          {/* Title block */}
          <div className="mt-8 flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3">
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
            <h1 className="font-mono text-3xl font-bold tracking-tight text-foreground md:text-5xl">
              {skill.name}
            </h1>
            <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">
              {skill.tagline}
            </p>
          </div>

          {/* Install — zero global install, pick your runner */}
          <InstallCommand slug={skill.slug} className="mt-8 max-w-xl" />
          <p className="mt-2 text-xs text-muted-foreground">
            No CLI to install — the rune is written straight into your
            agent&apos;s skills folder.
          </p>

          <div className="my-12 ink-rule" />

          <div className="grid gap-12 md:grid-cols-[1fr_16rem]">
            {/* Body */}
            <article>
              <section>
                <h2 className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Overview
                </h2>
                <p className="mt-4 leading-relaxed text-foreground/90">
                  {skill.overview}
                </p>
              </section>

              <section className="mt-10">
                <h2 className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  What it does
                </h2>
                <ul className="mt-4 space-y-3">
                  {skill.capabilities.map((cap) => (
                    <li key={cap} className="flex gap-3">
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                      <span className="text-sm leading-relaxed text-foreground/90">
                        {cap}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="mt-10">
                <h2 className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Try it like this
                </h2>
                <div className="mt-4 border border-border bg-secondary/30 p-5">
                  <p className="font-mono text-sm leading-relaxed text-foreground">
                    <span className="select-none text-primary">agent&gt; </span>
                    {skill.usagePrompt}
                    <span className="ml-1 inline-block h-4 w-2 translate-y-0.5 bg-primary animate-blink align-middle" />
                  </p>
                </div>
              </section>
            </article>

            {/* Sidebar */}
            <aside className="md:pl-2">
              <div className="rounded-xl border bg-card p-5">
                <dl className="divide-y divide-border/70">
                  <MetaRow label="Version">
                    <span className="font-mono">{skill.version}</span>
                  </MetaRow>
                  <MetaRow label="Updated">{skill.updated}</MetaRow>
                  <MetaRow label="Category">{skill.category}</MetaRow>
                  <MetaRow label="Works with">
                    {skill.agents.join(", ")}
                  </MetaRow>
                  <MetaRow label="Source">
                    <span className="font-mono text-xs">
                      {skill.sourcePath}
                    </span>
                  </MetaRow>
                  <MetaRow label="Author">
                    <span className="inline-flex items-center gap-1.5">
                      <SealMark className="size-4" />
                      Fable 5
                    </span>
                  </MetaRow>
                </dl>

                <div className="mt-4 border-t border-border/70 pt-4">
                  <h3 className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    Tags
                  </h3>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {skill.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-md bg-muted px-2 py-0.5 font-mono text-[0.7rem] text-muted-foreground"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
