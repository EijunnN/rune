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

const STEPS = [
  "Copy the command for the package manager you already use.",
  "Run it in your project root — it fetches the rune and writes it in.",
  "Reload your agent. The new power is live.",
];

export default function Home() {
  const skills = getAllSkills();

  return (
    <>
      <SiteHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <SealMark
            className="pointer-events-none absolute -right-16 -top-24 size-[26rem] rotate-12 opacity-[0.05]"
            aria-hidden="true"
          />
          <div className="mx-auto w-full max-w-6xl px-6 pb-16 pt-20 md:pb-24 md:pt-28">
            <div className="max-w-3xl">
              <div className="animate-rise flex items-center gap-3">
                <span className="h-0.5 w-8 bg-primary" />
                <span className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Powers for your agent, forged by one hand
                </span>
              </div>

              <h1
                className="animate-rise mt-7 font-pixel text-xl uppercase leading-[1.7] text-foreground sm:text-2xl md:text-4xl md:leading-[1.6]"
                style={{ animationDelay: "80ms" }}
              >
                Give any agent <span className="text-primary">new powers</span>
              </h1>

              <p
                className="animate-rise mt-8 max-w-xl leading-relaxed text-muted-foreground"
                style={{ animationDelay: "160ms" }}
              >
                Rune is a curated library, not an open marketplace. Each rune is
                a single skill that hands your agent a capability it didn't have
                — and every one is forged, end to end, by Fable 5.
              </p>

              <div
                className="animate-rise mt-9 flex flex-col gap-3 sm:flex-row sm:items-center"
                style={{ animationDelay: "220ms" }}
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

              <div
                className="animate-rise mt-8 max-w-md"
                style={{ animationDelay: "280ms" }}
              >
                <InstallCommand slug="react-mastery" />
                <p className="mt-2 font-mono text-xs text-muted-foreground">
                  No global install — runs on demand with your package manager.
                </p>
              </div>
            </div>
          </div>

          <div className="mx-auto max-w-6xl px-6">
            <div className="ink-rule" />
          </div>
        </section>

        {/* Runes */}
        <section id="runes" className="scroll-mt-20">
          <div className="mx-auto w-full max-w-6xl px-6 py-16 md:py-20">
            <div className="mb-10 flex flex-col gap-3">
              <Eyebrow>The library</Eyebrow>
              <h2 className="font-mono text-2xl font-bold tracking-tight text-foreground md:text-3xl">
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

        {/* Ethos */}
        <section
          id="ethos"
          className="scroll-mt-20 border-y border-border bg-secondary/30"
        >
          <div className="mx-auto w-full max-w-6xl px-6 py-16 md:py-24">
            <div className="max-w-2xl">
              <Eyebrow>The ethos</Eyebrow>
              <h2 className="mt-5 font-mono text-2xl font-bold leading-snug tracking-tight text-foreground md:text-4xl">
                Most marketplaces optimise for how many. Rune optimises for how
                good.
              </h2>
            </div>

            <div className="mt-14 grid gap-10 md:grid-cols-3">
              {ETHOS.map((item) => (
                <div key={item.n} className="flex flex-col">
                  <span className="font-pixel text-xs text-primary">
                    {item.n}
                  </span>
                  <div className="mt-4 ink-rule" />
                  <h3 className="mt-5 font-mono text-base font-bold text-foreground">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Get started */}
        <section id="get-started" className="scroll-mt-20">
          <div className="mx-auto grid w-full max-w-6xl gap-12 px-6 py-16 md:grid-cols-2 md:items-center md:py-24">
            <div>
              <Eyebrow>Get started</Eyebrow>
              <h2 className="mt-5 font-mono text-2xl font-bold tracking-tight text-foreground md:text-4xl">
                No CLI to install. Just add a rune.
              </h2>
              <p className="mt-5 max-w-md leading-relaxed text-muted-foreground">
                Every rune is plain files. One command fetches it and writes it
                straight into your agent&apos;s skills folder — run it with
                whichever package manager you already have. Nothing global,
                nothing left behind.
              </p>
              <ol className="mt-7 space-y-3">
                {STEPS.map((step, i) => (
                  <li
                    key={step}
                    className="flex gap-3 text-sm text-muted-foreground"
                  >
                    <span className="font-pixel text-[0.65rem] text-primary">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            <InstallCommand slug="react-mastery" />
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
