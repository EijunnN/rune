/*
 * Arrow-key selector in the house voice — zero dependencies.
 * ↑/↓ (or j/k) move, Enter confirms, 1-9 jumps and confirms, Esc/Ctrl+C aborts.
 * On confirm the menu collapses into a single boot-log line, so the
 * interaction leaves the same trace as the rest of the output.
 */
import { emitKeypressEvents } from "node:readline";

const useColor =
  process.stdout.isTTY && !("NO_COLOR" in process.env) && process.env.TERM !== "dumb";
const paint = (code) => (s) => (useColor ? `\x1b[${code}m${s}\x1b[0m` : s);
export const red = paint("38;5;203");
export const dim = paint("2");
export const bold = paint("1");

export const canSelect = () =>
  Boolean(process.stdin.isTTY && process.stdout.isTTY);

/* The collapsed `> label ..... value` line — same shape as the boot log. */
export function traceLine(label, value) {
  const dots = ".".repeat(Math.max(2, 42 - label.length));
  return `${red(">")} ${label} ${dim(dots)} ${value}`;
}

export function select(question, options, io = {}) {
  const stdin = io.stdin ?? process.stdin;
  const out = io.stdout ?? process.stdout;

  return new Promise((resolve) => {
    let index = 0;
    let rendered = 0;

    const frame = () => [
      `${red(">")} ${question}`,
      "",
      ...options.map((o, i) => {
        const active = i === index;
        const cursor = active ? red("▮") : " ";
        const label = (active ? bold : dim)(o.label.padEnd(16));
        return `  ${cursor} ${label}${dim(o.hint ?? "")}`;
      }),
      "",
      dim(`  ↑↓ move · enter select · 1-${options.length} jump`),
    ];

    const render = () => {
      if (rendered > 0) out.write(`\x1b[${rendered}A`);
      const lines = frame();
      for (const l of lines) out.write(`\x1b[2K${l}\n`);
      rendered = lines.length;
    };

    const teardown = () => {
      stdin.off("keypress", onKey);
      stdin.setRawMode?.(false);
      stdin.pause?.();
      out.write("\x1b[?25h"); // show cursor
    };

    const eraseMenu = () => {
      out.write(`\x1b[${rendered}A`);
      for (let i = 0; i < rendered; i++) out.write("\x1b[2K\n");
      out.write(`\x1b[${rendered}A`);
    };

    const confirm = () => {
      const choice = options[index];
      teardown();
      eraseMenu();
      out.write(`${traceLine(question.replace(/\?\s*$/, ""), choice.label)}\n`);
      resolve(choice.value);
    };

    const onKey = (str, key = {}) => {
      if ((key.ctrl && key.name === "c") || key.name === "escape") {
        teardown();
        out.write("\n");
        process.exit(130);
      } else if (key.name === "up" || key.name === "k") {
        index = (index - 1 + options.length) % options.length;
        render();
      } else if (key.name === "down" || key.name === "j" || key.name === "tab") {
        index = (index + 1) % options.length;
        render();
      } else if (key.name === "return" || key.name === "enter") {
        confirm();
      } else if (/^[1-9]$/.test(str ?? "") && Number(str) <= options.length) {
        index = Number(str) - 1;
        render();
        confirm();
      }
    };

    emitKeypressEvents(stdin);
    stdin.setRawMode?.(true);
    stdin.resume?.();
    out.write("\x1b[?25l"); // hide cursor while the menu owns the screen
    render();
    stdin.on("keypress", onKey);
  });
}
