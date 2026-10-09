# Monetary and fiscal transition / v0.1

The model generates a recurring fiscal funding gap from accounting. It does not determine which public services disappear or which private institutions replace them.

## Calculation

All fiscal flows are annualized real quantities sampled monthly. Starting annual GDP is 100. This normalization allows within-country comparisons without inventing absolute currency levels.

Compulsory revenue equals its baseline share of GDP times the GDP index times collection effectiveness. The baseline share is the imposed ceiling. Collection falls linearly toward the selected effectiveness during transition. Other revenue follows its separate real-growth input.

Planned expenditure follows the selected real-growth input. Before transition, financing covers any recurring deficit. The fraction it covers falls linearly to zero over the selected duration. Financing does not become negative when revenue exceeds expenditure.

```text
R = compulsory revenue + other revenue
F = max(E - R, 0) * (1 - transition)
Gap = max(E - R - F, 0)
Funded spending = min(E, R + F)
```

The financing coverage fraction is imposed. The amount covered and the resulting gap are generated. The model does not derive the collapse of borrowing from Bitcoin adoption.

Debt principal, liquid reserves, asset sales, arrears, and default choices need stock and maturity information. The recurring chart excludes these mechanisms. Debt refinancing remains null. A zero recurring gap does not establish that a government can meet its refinancing obligations.

## Evidence and baseline review

[WoRLD's methodology](https://www.imf.org/-/media/files/publications/tnm/2025/english/tnmea2025004.pdf) defines the revenue categories and describes central-government, general-government, and public-sector coverage. The reviewed 2026 workbook omits a per-row government-scope field. Its totals therefore need reconciliation before combination with expenditure.

[The Fiscal Monitor statistical appendix](https://www.imf.org/-/media/files/publications/fiscal-monitor/2026/april/english/text.pdf) documents subsector coverage. [The WEO country appendix](https://data.imf.org/-/media/iData/External-Storage/Documents/4AA1F4D0624C46E98F95988F1F83E770/en/April-2026-WEO-Database-Appendix.pdf) records latest actual fiscal years. Fiscal Monitor revenue is used as a reconciliation check; accepted revenue components remain WoRLD's values without rescaling.

The accepted mixed-source records are US 2024, China 2023, Japan 2023, Brazil 2024, and Saudi Arabia 2024. Residual revenue differences are recorded in each baseline. China's 2023 totals reconcile across the sources. Its 2024 totals do not. Japan's latest complete social-contribution row is 2023. These choices are manual review decisions, not a runtime search for alternative data.

France, Germany, and EU27 use the same Eurostat government-account release for all components. Government sector is S13. Units are percent of GDP. The compulsory-revenue proxy sums tax receipts and actual employer/household social contributions. It excludes imputed contributions. Published figures are rounded to 0.1 percentage points.

The EU view uses the published EU27_2020 aggregate. It represents member general governments. It does not add Germany or France again and does not model the separate EU institutional budget.

Seven country baselines remain unaccepted. Their latest complete WoRLD and Fiscal Monitor revenue totals disagree. The registry preserves the exact values and research gaps. No imputation supplies missing fiscal outcomes.

These historical shares establish a starting scale. They do not supply behavioral parameters for the transition. Social contributions are a proxy for compulsory receipts; a legal mandatory/voluntary split remains unresolved. Central-government coverage, such as Saudi Arabia's, cannot be treated as comprehensive national fiscal capacity.

## What would change the result

Output growth changes the capped revenue base. Collection effectiveness changes the portion collected. Spending commitments and other revenue have independent paths. Each response is explicit and inspectable.

Private financing, reserves, or asset sales could sustain activity despite lost sovereign financing. The current recurring-flow model cannot establish the size or duration of that support. Evidence for those channels would justify additional mechanisms.

The model would overstate a recurring gap if it counted temporary expenditure as permanent commitments. It would understate a gap if it treated temporary receipts as recurring. Category-level data are needed to test those hypotheses.

## Prices and output

The shared purchasing-power index starts at 100 and compounds the inflation assumption monthly. It is a simulated denominator with a fixed measurement basis. It does not measure geographic price levels or implement ShadowStats' adjustments.

Bitcoin purchasing power grows at an imposed rate. Dollar and Bitcoin indices follow explicit conversion identities. Bitcoin bubbles and volatility remain unmodeled.

Stock and gross property prices share the imposed real decline. GDP and productive capacity do not inherit that decline. A physical productive-capacity index of 100 is an exploratory assumption, not evidence that every industry survives.

## Review new data

```sh
uv run python -m py_compile scripts/collect_fiscal_sources.py
uv run python scripts/collect_fiscal_sources.py
```

The collector preserves raw source files and a proposal under a new timestamped directory in `.cache/fiscal-review/`. It never edits accepted definitions. Review units, observation year, publication vintage, coverage, and reconciliation before changing `registry/definitions.json`. Preserve data hashes and explain every accepted change.

Software tests establish accounting and export correctness. Historical evaluation and predictive calibration remain separate work. No scenario frequency becomes a real-world probability.
