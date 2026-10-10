# Verification / 2026-10-09

## Interface revision

The starting scenario opens automatically. Edits calculate a new run and compare it with the starting scenario. Three relevant inputs stay below the chart. Remaining inputs, saved scenarios, evidence, and equations open on selection. The default screen's rendered text decreased from 291 to 100 words.

Changed files: `apps/web/src/App.tsx`, `apps/web/src/style.css`, `worldmodel/api.py`, `readme.md`, and `research/verification.md`.

- `uv run python -m pytest -q -p no:cacheprovider`: `24 passed in 5.95s`.
- `npm run build --prefix apps/web`: TypeScript passed; Vite reported `228 modules transformed` and `built in 184ms`.
- `git diff --check`: no whitespace errors.
- Browser CSV and Excel downloads matched all 3,630 monthly rows for two runs. Inputs JSON matched the recorded scenario. Excel retained the previous 1e-13 relative or 1e-12 absolute tolerance.
- A compressed calculation response transferred 156,687 bytes for 1,357,790 decoded bytes. The browser still received all 15 country/bloc trajectories with 121 monthly points each.

Completed browser interactions covered automatic comparison, comparison-specific assumptions, dialog focus and dismissal, saved scenarios, asset units, country data gaps, and widths from 320 to 1,280 pixels. Touch events changed the selected date without opening an inspector or requesting another calculation. Reduced-motion emulation returned `0s` transitions.

Failure checks covered definitions errors, offline edits, recovery with 160 KB/s throughput and 200 ms latency, evidence-version rejection, reordered scenario fields, and malformed saved scenarios. Recovery preserved edited inputs. Malformed storage preserved the original bytes and disabled saving while leaving the reviewed starting scenario available. Export buttons stayed disabled while results were stale or comparison was incomplete.

Boundary checks loaded 1,002 saved scenarios, including names longer than 100 characters with Arabic, CJK, and emoji. Valid growth inputs up to 100% remained editable. A one-month duration displayed `1 month`. Large indices used compact axis labels without horizontal overflow. A positive dollar index of approximately 0.0195 displayed `0.02`, preserving its nonzero value.

Desktop, phone overview, assumptions, and inspector screenshots were rendered and viewed. The checked overview text had a minimum contrast of 5.31:1. Inspector, assumptions, and placeholder text had a minimum of 8.03:1. The completed interaction checks recorded no uncaught JavaScript exceptions. Physical iPhone Safari remains unverified.

Evidence is preserved outside Git under `.cache/browser-redesign/`. Interaction records are in `interactions-2026-10-10T01-24-25.081Z/`; failure checks are in `failures-2026-10-10T02-17-28.521Z/`; final rendering, contrast, and touch checks are in `visual-2026-10-10T02-35-34.853Z/`; boundary checks are in `bounds-2026-10-10T02-34-56.275Z/`. `export-agreement.json` records download agreement. `compression.json` records response sizes. Earlier unsuccessful check attempts and snapshots remain preserved. These filenames use UTC; these checks ran on October 9 in Pacific time.

The revision changes exploration and response compression. Reviewed source updates still require deliberate review. Model calibration and the unimplemented domains remain research work.

## Previous v0.1 checks

The following record describes the implementation before this interface revision.

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
