# End-to-End with Playwright — Few, Ruthless, User-Shaped

E2E tests answer one question: *does the assembled system do the job a user came to do?* They are the most expensive tests you own — every one must correspond to a flow whose breakage would page someone. Signup, login, checkout, the core creation loop, the money settings. Not "every button".

## Locators — the doctrine is accessibility-first

```ts
await page.getByRole("button", { name: "Add to cart" }).click();
await page.getByLabel("Email").fill("test@example.com");
await expect(page.getByRole("alert")).toContainText("expired");
```

Priority: `getByRole` (name included!) > `getByLabel` > `getByPlaceholder`/`getByText` for content > `getByTestId` as the escape hatch for genuinely semantic-free nodes. CSS/XPath selectors are prohibited in app tests — they pin the DOM, and they don't fail when accessibility breaks (role-based locators double as a11y smoke tests).

If a locator is hard to write, the UI is hard to use with a screen reader — fix the component (a real `<button>`, a real `<label>`), not the selector.

## Auto-waiting — never sleep

Playwright's actions and `expect` retry until actionable/true (default 5s). Therefore:

- `await page.waitForTimeout(2000)` is banned. It's either too short (flake) or too long (waste), and always both eventually.
- Assert on the *user-visible outcome* of async work: `await expect(page.getByRole("row")).toHaveCount(3)` — the retrying assertion IS the wait.
- Web-first assertions (`toBeVisible`, `toHaveText`, `toHaveURL`) retry; `expect(await page.title()).toBe(...)` does not — keep the locator/page inside the expect.
- Race conditions on navigation: prefer asserting the destination state over `waitForNavigation`; for downloads/popups use the event-promise pattern *before* the click (`const dl = page.waitForEvent("download"); await button.click(); await dl`).

## Isolation & state

- Each test: fresh context (Playwright default) = fresh cookies/storage. Tests never depend on another test's leftovers or ordering — parallel workers make order illusions explode.
- **Auth once, reuse everywhere**: log in inside a setup project, save `storageState` to a file, every test project `use`s it. Per-worker accounts (`user-${workerIndex}@test`) prevent cross-test data collisions on shared backends.
- Data setup via **API/DB, not UI**: creating the tested precondition through 12 UI clicks makes every test also a test of those 12 clicks. `await api.post("/orders", ...)` then navigate. The UI path is tested once, in ITS test.
- Cleanup: prefer disposable environments/DB reset per run over per-test janitorial code that itself flakes.

## Configuration that matters

```ts
// playwright.config.ts — the load-bearing options
export default defineConfig({
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    { name: "chromium", use: { ...devices["Desktop Chrome"], storageState: "pw/.auth/user.json" }, dependencies: ["setup"] },
  ],
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",          // the debugging goldmine — traces only when needed
    video: "on-first-retry",
  },
  webServer: { command: "npm run start:test", url: "http://localhost:3000", reuseExistingServer: !process.env.CI },
  retries: process.env.CI ? 1 : 0,    // 1 CI retry as flake TELEMETRY (flaky-tests.md), 0 locally
  fullyParallel: true,
});
```

- `webServer` makes tests self-hosting — no "remember to start the app".
- Cross-browser: run the full suite on Chromium; a smoke subset on WebKit/Firefox unless your users say otherwise. Browser-matrix-everything triples cost for marginal signal.
- Mobile: `devices["iPhone 15"]` project for the flows where the layout truly forks.

## Network policy inside E2E

Default: real backend (that's the point of E2E). Two sanctioned exceptions via `page.route()`: third parties you don't control in CI (payments → their sandbox or a stub; analytics → block), and forcing rare states (a 500 from one endpoint to test the error page). If you find yourself mocking your *own* API broadly, you wanted a component/integration test.

## Debugging & maintenance

- Local: `npx playwright test --ui` (watch mode + time-travel), `--debug` (inspector), `--headed`.
- CI failure: download the trace, `npx playwright show-trace trace.zip` — DOM snapshots per action, console, network. This is why traces-on-retry is configured; "cannot reproduce locally" mostly dies here.
- Structure: extract *flows* as plain functions (`await checkout(page, { sku })`) over class-heavy Page Object Models — POMs earn their ceremony only in very large suites with dedicated owners.
- Visual regression (`toHaveScreenshot`): reserve for genuinely visual surfaces (charts, editors, marketing pages), mask dynamic regions, fixed viewport/fonts in CI via the official container image. Screenshot-everything suites drown in noise-diffs.
- Component testing (Vitest browser mode / PW component tests) covers "one widget, real browser" cheaper than full E2E — use it before promoting a widget concern to E2E.

## The E2E budget

Suite ≤ ~10 min wall-clock with sharding (`--shard=i/n` across CI jobs) or it stops being run pre-merge, and an unrun suite protects nothing. When a new flow test arrives, ask which existing one it demotes — the count is a budget, not a trophy shelf.
