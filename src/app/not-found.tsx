import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <>
      <SiteHeader />

      <main className="flex flex-1 items-center">
        <div className="mx-auto w-full max-w-6xl px-6 py-24">
          <p className="font-mono text-xs text-muted-foreground">
            <span className="text-primary">&gt;</span> resolve page
            .......................... <span className="text-primary">err</span>
          </p>

          <h1 className="glow-primary mt-8 font-pixel text-2xl uppercase leading-[1.6] text-primary md:text-4xl">
            404 — rune not found
          </h1>

          <p className="mt-6 max-w-md leading-relaxed text-muted-foreground">
            The page you seek was never forged. Whatever glyph led you here, it
            doesn&apos;t resolve in this library.
          </p>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button asChild size="lg">
              <Link href="/">cd /</Link>
            </Button>
            <Button asChild size="lg" variant="ghost">
              <Link href="/#runes">Browse the runes</Link>
            </Button>
          </div>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
