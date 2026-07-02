import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { InstallCommand } from "@/components/install-command";
import { SealMark } from "@/components/logo";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SkillsExplorer } from "@/components/skills-explorer";
import { Button } from "@/components/ui/button";
import { getAllSkills } from "@/lib/skills";

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-primary">
      <span className="inline-block size-2 bg-primary" />
      {children}
    </span>
  );
}

/* A boot-log line: `> label ..... value` with the dots filling the gap. */
function BootLine({
  label,
  value,
  delay,
}: {
  label: string;
  value: string;
  delay: number;
}) {
  return (
    <p
      className="animate-rise flex items-baseline gap-2 font-mono text-xs text-muted-foreground"
      style={{ animationDelay: `${delay}ms` }}
    >
      <span className="text-primary">&gt;</span>
      <span>{label}</span>
      <span
        aria-hidden="true"
        className="flex-1 overflow-hidden whitespace-nowrap tracking-[0.35em] text-border"
      >
        ...................................................
      </span>
      <span className="text-foreground">{value}</span>
    </p>
  );
}

const ETHOS = [
  {
    n: "01",
    title: "One voice, all the way down",
    body: "The same hand forges every rune. Conventions, tone, and quality don't drift between the first rune and the fiftieth.",
  },
  {
    n: "02",
    title: "Curation over volume",
    body: "Not every power is worth granting. Each rune earns its place in the library, or it never ships.",
  },
  {
    n: "03",
    title: "Maintained, not abandoned",
    body: "Every rune has an owner who still cares. Updates land together and deliberately — never at random.",
  },
];

const SESSION = [
  { cmd: true, text: "npx rune-add react-mastery" },
  { cmd: false, text: "> resolve react-mastery ....... found" },
  { cmd: false, text: "> write .claude/skills/ ....... ok" },
  { cmd: false, text: "> done. reload your agent ..... ok" },
];

export default function Home() {
  const skills = getAllSkills();

  return (
    <>
      <SiteHeader />

      <main className="flex-1">
        {/* Hero — the system boots */}
        <section className="relative overflow-hidden">
          <div className="mx-auto grid w-full max-w-6xl gap-14 px-6 pb-16 pt-16 md:grid-cols-[1fr_auto] md:items-center md:pb-24 md:pt-24">
            <div className="max-w-2xl">
              <div className="max-w-sm space-y-1.5">
                <BootLine label="boot rune.sys" value="ok" delay={0} />
                <BootLine
                  label="mount /library"
                  value={`${skills.length} runes`}
                  delay={120}
                />
                <BootLine label="author" value="fable-5" delay={240} />
              </div>

              <h1
                className="animate-rise mt-10 text-balance font-pixel text-xl uppercase leading-[1.7] text-foreground sm:text-2xl md:text-4xl md:leading-[1.6]"
                style={{ animationDelay: "360ms" }}
              >
                Give any agent{" "}
                <span className="glow-primary text-primary">new powers</span>
                <span className="ml-3 inline-block h-[0.9em] w-[0.5em] translate-y-[0.12em] bg-primary animate-blink" />
              </h1>

              <p
                className="animate-rise mt-8 max-w-xl leading-relaxed text-muted-foreground"
                style={{ animationDelay: "440ms" }}
              >
                Rune is a curated library, not an open marketplace. Each rune is
                a single skill that hands your agent a capability it didn't have
                — and every one is forged, end to end, by Fable 5.
              </p>

              <div
                className="animate-rise mt-9 flex flex-col gap-3 sm:flex-row sm:items-center"
                style={{ animationDelay: "520ms" }}
              >
                <Button asChild size="lg">
                  <Link href="#runes">
                    Browse the runes
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="ghost">
                  <Link href="#ethos">Why one author?</Link>
                </Button>
              </div>
            </div>

            {/* The artifact — a solid tile, deliberately off-grid */}
            <div
              className="animate-rise hidden md:block"
              style={{ animationDelay: "600ms" }}
            >
              <div className="relative -rotate-3">
                <SealMark className="size-44 shadow-pixel lg:size-52" />
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[0.65rem] uppercase tracking-[0.3em] text-muted-foreground">
                  raidō — the journey
                </div>
              </div>
            </div>
          </div>

          <div className="mx-auto max-w-6xl px-6">
            <div className="ink-rule" />
          </div>
        </section>

        {/* Library — `ls /library` */}
        <section id="runes" className="scroll-mt-20">
          <div className="mx-auto w-full max-w-6xl px-6 py-16 md:py-20">
            <div className="mb-10 flex flex-col gap-3">
              <Eyebrow>ls /library</Eyebrow>
              <h2 className="text-balance font-mono text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                {skills.length} {skills.length === 1 ? "rune" : "runes"}. One
                author.
              </h2>
              <p className="max-w-lg text-muted-foreground">
                The library opens small and grows deliberately. Read exactly
                what each rune grants before you install it — no surprises.
              </p>
            </div>

            <SkillsExplorer skills={skills} />
          </div>
        </section>

        {/* Ethos — the vermilion interrupt */}
        <section
          id="ethos"
          className="on-primary scroll-mt-20 bg-primary text-primary-foreground"
        >
          <div className="mx-auto w-full max-w-6xl px-6 py-16 md:py-24">
            <div className="grid gap-12 md:grid-cols-[auto_1fr] md:gap-20">
              <span className="font-pixel text-xs uppercase leading-loose tracking-[0.3em] [writing-mode:vertical-rl] max-md:hidden">
                // The ethos
              </span>

              <div>
                <span className="font-mono text-xs uppercase tracking-[0.2em] md:hidden">
                  // The ethos
                </span>
                <h2 className="max-w-3xl text-balance font-pixel text-base uppercase leading-[1.9] max-md:mt-4 md:text-xl md:leading-[1.8]">
                  Most marketplaces optimise for how many. Rune optimises for
                  how good.
                </h2>

                <div className="mt-14 space-y-10">
                  {ETHOS.map((item) => (
                    <div
                      key={item.n}
                      className="grid gap-4 border-t border-primary-foreground/25 pt-8 md:grid-cols-[6rem_16rem_1fr] md:gap-8"
                    >
                      <span className="font-pixel text-sm">{item.n}</span>
                      <h3 className="font-mono text-base font-bold">
                        {item.title}
                      </h3>
                      <p className="max-w-xl text-sm leading-relaxed text-primary-foreground/90">
                        {item.body}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Get started — a live session */}
        <section id="get-started" className="scroll-mt-20">
          <div className="mx-auto grid w-full max-w-6xl gap-12 px-6 py-16 md:grid-cols-2 md:items-center md:py-24">
            <div>
              <Eyebrow>Get started</Eyebrow>
              <h2 className="mt-5 text-balance font-mono text-2xl font-bold tracking-tight text-foreground md:text-4xl">
                No CLI to install. Just add a rune.
              </h2>
              <p className="mt-5 max-w-md leading-relaxed text-muted-foreground">
                Every rune is plain files. One command writes it straight into
                your agent&apos;s skills folder — Claude Code, Codex, or both,
                project-local or global, your call. Run it with whichever
                package manager you already have; nothing left behind.
              </p>
              <div className="mt-8 max-w-md">
                <InstallCommand slug="react-mastery" />
              </div>
            </div>

            {/* Terminal window */}
            <div className="border border-border bg-card shadow-pixel">
              <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
                <div className="flex gap-1.5" aria-hidden="true">
                  <span className="size-2.5 bg-primary" />
                  <span className="size-2.5 bg-muted-foreground/40" />
                  <span className="size-2.5 bg-muted-foreground/40" />
                </div>
                <span className="font-mono text-[0.65rem] text-muted-foreground">
                  rune@fable5:~
                </span>
              </div>
              <div className="space-y-2 p-5 font-mono text-sm">
                {SESSION.map((line) => (
                  <p
                    key={line.text}
                    className={
                      line.cmd ? "text-foreground" : "text-muted-foreground"
                    }
                  >
                    {line.cmd && (
                      <span className="select-none text-primary">$ </span>
                    )}
                    {line.text}
                  </p>
                ))}
                <p className="flex items-center gap-1 text-foreground">
                  <span className="select-none text-primary">$</span>
                  <span className="inline-block h-4 w-2 bg-primary animate-blink" />
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
