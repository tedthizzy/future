# Verification / 2026-10-09

The engine, API, generated contract, and exports passed the checks below. Browser interaction and screenshots remain unverified.

- `uv run python -m pytest -q`: `23 passed in 4.23s`.
- `npm run build --prefix apps/web`: TypeScript passed; Vite built 228 modules.
- JSON Schema generation followed by `json2ts` and `diff`: no difference from `apps/web/src/contracts.ts`.
- `uv run python -m worldmodel run scenarios/exploratory.json`: recorded a complete run outside Git.
- CLI CSV and Excel exports: completed without overwriting existing files.
- Live HTTP requests through Vite's `/api` proxy: definitions and calculations returned 200; missing inflation returned 422.
- Combined CSV and Excel exports: 3,630 monthly trajectory rows for two runs, across 15 countries/blocs. Exported values matched recorded funding gaps and price indices.
- Earlier recorded runs remained exportable after the causal-registry change.
- `git diff --check`: no whitespace errors.

Eight fiscal baselines are accepted. Seven remain explicit research gaps. Missing fiscal quantities and debt-refinancing requirements remain null.

The palette's text colors have at least 4.82:1 contrast against the defined black and dark panel backgrounds. This calculation checks color tokens. It does not verify rendered layouts or computed browser styles. CSS includes a reduced-motion alternative.

Chrome's specified CDP port, 9222, did not accept a connection. Browser-control confirmation remains pending under the supplied AGENTS.md instructions. No browser navigation or screenshots were performed. Saved-scenario interaction, keyboard interaction, narrow-screen layout, and browser download behavior require that verification.

Software checks establish accounting and export agreement. Predictive calibration, policy-event probabilities, Bitcoin volatility, and downstream institutional mechanisms remain research work.
