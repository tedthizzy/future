# Verification / 2026-10-09

The v0.1 engine, API, interface, and exports passed the checks below. Desktop rendering and mobile touch emulation were inspected in an already-running Chrome browser. Physical iPhone Safari remains unverified.

- `uv run python -m pytest -q`: `24 passed in 5.98s`.
- `npm run build --prefix apps/web`: TypeScript passed; Vite reported `228 modules transformed` and `built in 175ms`.
- JSON Schema generation followed by `json2ts` and `diff`: no difference from `apps/web/src/contracts.ts`.
- `uv run python -m worldmodel run scenarios/exploratory.json`: recorded a complete run outside Git.
- CLI CSV and Excel exports: completed without overwriting existing files.
- Live HTTP requests through Vite's `/api` proxy: definitions and calculations returned 200; missing inflation returned 422.
- Browser downloads: CSV and Excel each matched all 3,630 monthly trajectory rows for two runs, across 15 countries/blocs. Inputs JSON matched the recorded scenario. Excel numbers matched within 1e-13 relative or 1e-12 absolute tolerance.
- Earlier recorded runs remained exportable after the causal-registry change.
- `git diff --check`: no whitespace errors.

Eight fiscal baselines are accepted. Seven remain explicit research gaps. Missing fiscal quantities and debt-refinancing requirements remain null.

The browser checks used direct touch and keyboard events, actual downloads, and controlled request failures. They covered:

- Touch month selection, chart inspection, mobile input editing, and comparison inspection using each run's recorded assumptions.
- Saving names longer than 100 characters with Arabic, CJK, and emoji; loading 1,000 saved scenarios; preserving storage after duplicate names or malformed JSON.
- Home, End, arrow keys, Enter, Escape, and dialog focus trapping. Enter keeps the inspector open. Escape returns focus to the chart. Done returns focus to Inputs and restores page scrolling.
- Definitions and calculation failures, empty country data, offline edits, throttled recovery, evidence-version changes, and export failures. Edited inputs remain intact. Stale results disable exports. Export retry downloads the export without rerunning the model. Ten rapid export clicks produce one request.
- Mismatched forecast origins cannot overlay. A rejected evidence version creates no run artifacts. Reloading definitions preserves edited inputs.
- Input inspection after a failed calculation shows the edited value. Inspection from the plotted result shows that run's recorded value. The regression check used 99% edited collection against 100% recorded collection.
- Widths of 320, 393, 430, 760, 768, and 1,280 pixels showed no horizontal page overflow. Fiscal data gaps remain visible; imposed asset paths remain available for those countries.
- No uncaught JavaScript exceptions occurred in the completed browser checks.

Viewed screenshots cover the desktop overview, mobile overview, mobile input panel, save form, fiscal inspector, asset units, and failure states. Computed styles gave a minimum text contrast of 5.31:1 in the checked overview viewports and 8.03:1 in the checked inspector and input panels. The save placeholder passed. These measurements cover the inspected states. Reduced-motion emulation returned a computed transition duration of `0s`.

The specified Chrome CDP port 9222 was closed. Existing CDP browsers were inspected instead. The first browser stopped responding during native keyboard handling; its sample and logs were preserved. No browser process was restarted. Remaining checks completed in an isolated context in another already-running Chrome process. Physical Safari rendering, its native selection menus, and its download handling remain unverified.

Local screenshots, reports, and downloaded files are preserved outside Git under `.cache/browser-verification/`. Completed interaction evidence is in `2026-10-09T22-42-18.755Z/`; failure checks are in `edges-2026-10-09T23-04-19.470Z/`; final rendering, focus, and contrast evidence is in `final-2026-10-09T23-12-23.463Z/`. The input-inspection regression is in `inputs-2026-10-09T23-11-51.077Z/`. Export agreement is recorded in `download-agreement-20261009T231257652009Z.json`. Directory timestamps use UTC.

Private access at https://macbook-air-7.taild8ef36.ts.net/ returned HTTP 200. The explicit Vite host entry fixes the rejected Tailscale hostname. The detached host controller's stop/start cycle released and restored ports 8000 and 5173. Tailscale route disable/reapply was also verified. Logs and prior host records were preserved. See [the hosting runbook](../ops/hosting.md).

Automatic startup at login remains pending. A macOS Documents permission dialog blocked the LaunchAgent trial while the desktop was locked. The trial was stopped and its plist was preserved outside `~/Library/LaunchAgents/`. The running detached server requires this Mac to stay awake and online. Public deployment remains future work.

Software checks establish accounting and export agreement. Predictive calibration, policy-event probabilities, Bitcoin volatility, and downstream institutional mechanisms remain research work.
