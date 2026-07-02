#!/usr/bin/env node
/*
 * rune-add — write a rune (a curated agent skill) into your agent's skills
 * folder. The library ships inside this package: same files, same version,
 * every install.
 *
 *   npx rune-add <slug> [<slug> ...]   add rune(s) — asks where, if you don't say
 *   npx rune-add --list                what the library holds
 *
 * Targeting (skip the questions):
 *   --claude --codex   pick agent(s); pass both for both
 *   --global           user-wide (~) instead of this project
 *   --dir <path>       anywhere — any agent that reads Agent Skills
 * Other: --force (overwrite), --yes (defaults, no questions), --help
 */
import { cpSync, existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, relative, resolve, sep } from "node:path";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";
import { bold, canSelect, dim, red, select } from "./prompt.mjs";

const pkgRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
// Published: skills/ ships in the package. Dev checkout: fall back to repo root.
const skillsRoot = [join(pkgRoot, "skills"), resolve(pkgRoot, "..", "skills")]
  .find((p) => existsSync(p));

/* `> label ..... value` — the house voice. */
function line(label, value, valuePaint = (s) => s) {
  const dots = ".".repeat(Math.max(2, 42 - label.length));
  console.log(`${red(">")} ${label} ${dim(dots)} ${valuePaint(value)}`);
}

function fail(label, value) {
  line(label, value, red);
  process.exitCode = 1;
}

/*
 * Line source that never drops input: piped answers can arrive before their
 * question is asked (readline discards those), so queue every line ourselves.
 * EOF resolves pending/future reads with "" → the default option.
 */
function makeAsker() {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const queue = [];
  let pending = null;
  let closed = false;
  rl.on("line", (l) => {
    if (pending) {
      const p = pending;
      pending = null;
      p(l);
    } else queue.push(l);
  });
  rl.on("close", () => {
    closed = true;
    if (pending) {
      const p = pending;
      pending = null;
      p("");
    }
  });
  const nextLine = () => {
    if (queue.length) return Promise.resolve(queue.shift());
    if (closed) return Promise.resolve("");
    return new Promise((res) => {
      pending = res;
    });
  };
  return { rl, nextLine };
}

/*
 * Picker: real TTY → arrow-key selector (prompt.mjs); piped/CI stdin → the
 * numbered line reader, so scripts and tests stay drivable.
 */
async function ask(asker, question, options) {
  if (canSelect()) {
    console.log();
    return select(question, options);
  }
  console.log();
  console.log(`${red(">")} ${question}`);
  console.log();
  for (const [i, o] of options.entries()) {
    console.log(`  ${bold(`${i + 1})`)} ${o.label.padEnd(16)}${dim(o.hint ?? "")}`);
  }
  console.log();
  process.stdout.write(`${red("rune>")} `);
  const answer = (await asker.nextLine()).trim();
  const idx = Number.parseInt(answer, 10);
  const pick = idx >= 1 && idx <= options.length ? idx - 1 : 0;
  return options[pick].value;
}

function frontmatterDescription(skillDir) {
  try {
    const md = readFileSync(join(skillDir, "SKILL.md"), "utf8");
    const fm = md.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    const desc = fm?.[1].match(/^description:\s*(.+)$/m)?.[1] ?? "";
    return desc.length > 96 ? `${desc.slice(0, 93)}...` : desc;
  } catch {
    return "";
  }
}

function listRunes() {
  const slugsAvail = readdirSync(skillsRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(skillsRoot, d.name, "SKILL.md")))
    .map((d) => d.name);
  console.log();
  line("mount /library", `${slugsAvail.length} runes`);
  console.log();
  for (const slug of slugsAvail) {
    console.log(`  ${bold(slug)}`);
    const desc = frontmatterDescription(join(skillsRoot, slug));
    if (desc) console.log(`  ${dim(desc)}`);
    console.log();
  }
  console.log(dim(`  npx rune-add <slug> to add one. Library: https://github.com/EijunnN/rune`));
}

function help() {
  console.log(`
${bold("rune-add")} — add a curated agent skill (a rune) to your agent

${bold("usage")}
  npx rune-add <slug> [<slug> ...]     asks where it should go, then writes it
  npx rune-add --list                  every rune this version ships

${bold("targeting")} ${dim("(pass these to skip the questions)")}
  --claude       Claude Code    ./.claude/skills   (--global: ~/.claude/skills)
  --codex        Codex          ./.codex/skills    (--global: ~/.codex/skills)
                 pass both flags to install for both agents
  --global       user-wide — the rune is live in every project
  --dir <path>   anywhere — for any agent that reads Agent Skills

${bold("flags")}
  --yes          no questions: Claude Code, this project
  --force        overwrite an existing copy of the rune
  --help         this text

Every rune is plain files: SKILL.md + references/. Nothing global unless you
ask for it, nothing left behind — delete the folder and the rune is gone.
`);
}

// ---- parse ----
const args = process.argv.slice(2);
const flags = new Set();
const slugs = [];
let customDir = null;

for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === "--dir") customDir = args[++i];
  else if (a.startsWith("--")) flags.add(a.slice(2));
  else slugs.push(a);
}

if (!skillsRoot) {
  fail("mount /library", "err — package is missing its skills");
  process.exit(1);
}
if (flags.has("help") || (slugs.length === 0 && !flags.has("list"))) {
  help();
  process.exit(flags.has("help") ? 0 : 1);
}
if (flags.has("list")) {
  listRunes();
  process.exit(0);
}

// ---- choose targets: flags first, questions second, safe default last ----
const agents = [];
if (flags.has("claude")) agents.push("claude");
if (flags.has("codex")) agents.push("codex");
let global = flags.has("global");

const canAsk =
  !customDir &&
  !flags.has("yes") &&
  (process.stdin.isTTY || process.env.RUNE_ADD_INTERACTIVE === "1");

if (agents.length === 0 && !customDir) {
  if (canAsk) {
    const asker = canSelect() ? null : makeAsker(); // line reader only when stdin is piped
    agents.push(
      ...(await ask(asker, "which agent gets this rune?", [
        { label: "Claude Code", hint: ".claude/skills", value: ["claude"] },
        { label: "Codex", hint: ".codex/skills", value: ["codex"] },
        { label: "Both", hint: "one command, two agents", value: ["claude", "codex"] },
      ])),
    );
    if (!global) {
      global = await ask(asker, "scope?", [
        { label: "This project", hint: displayHome(process.cwd()), value: false },
        { label: "Global", hint: "your home directory — live in every project", value: true },
      ]);
    }
    asker?.rl.close();
  } else {
    agents.push("claude"); // non-interactive default: the least surprising target
  }
}

function displayHome(p) {
  const home = homedir();
  return p.startsWith(home) ? `~${p.slice(home.length).split(sep).join("/")}` : p;
}

function destRootFor(agent) {
  if (customDir) return resolve(customDir);
  if (agent === "codex") {
    return global
      ? join(process.env.CODEX_HOME || join(homedir(), ".codex"), "skills")
      : join(process.cwd(), ".codex", "skills");
  }
  return global
    ? join(homedir(), ".claude", "skills")
    : join(process.cwd(), ".claude", "skills");
}

const destRoots = customDir
  ? [resolve(customDir)]
  : [...new Set(agents.map(destRootFor))];

// ---- add ----
/* Show `.claude/skills/x` for in-project writes, `~/...` for home writes. */
function displayPath(p) {
  const rel = relative(process.cwd(), p);
  if (rel && !rel.startsWith("..")) return rel.split(sep).join("/");
  return displayHome(p);
}

console.log();
for (const slug of slugs) {
  const source = join(skillsRoot, slug);
  if (!existsSync(join(source, "SKILL.md"))) {
    fail(`resolve ${slug}`, "not found");
    console.log(dim(`  no rune by that name — try: npx rune-add --list`));
    continue;
  }
  line(`resolve ${slug}`, "found");

  for (const destRoot of destRoots) {
    const dest = join(destRoot, slug);
    const shown = displayPath(dest);
    if (existsSync(dest) && !flags.has("force")) {
      fail(`write ${shown}`, "exists");
      console.log(dim(`  already installed — pass --force to overwrite`));
      continue;
    }

    try {
      cpSync(source, dest, {
        recursive: true,
        force: true,
        // evals/ is QA scaffolding for forging runes; agents never need it
        filter: (src) => !src.split(/[\\/]/).includes("evals"),
      });
      const count = readdirSync(dest, { recursive: true })
        .filter((f) => statSync(join(dest, String(f))).isFile()).length;
      line(`write ${shown}`, `ok (${count} files)`);
    } catch (err) {
      fail(`write ${shown}`, `err — ${err.message}`);
    }
  }
}

if (process.exitCode !== 1) {
  line("done. reload your agent", "ok");
  console.log();
}
