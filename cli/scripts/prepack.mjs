/*
 * Runs on `npm pack` / `npm publish`. Copies the repo's skills/ into the
 * package so every published version ships the exact library it advertises —
 * updates land together, never at random.
 *
 * Eval scaffolding (evals/) is QA material for forging runes; it never ships.
 */
import { cpSync, existsSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const pkgRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = resolve(pkgRoot, "..", "skills");
const dest = join(pkgRoot, "skills");

if (!existsSync(source)) {
  console.error(`prepack: skills directory not found at ${source}`);
  process.exit(1);
}

rmSync(dest, { recursive: true, force: true });
cpSync(source, dest, {
  recursive: true,
  filter: (src) => !src.split(/[\\/]/).includes("evals"),
});

console.log(`prepack: bundled skills from ${source}`);
