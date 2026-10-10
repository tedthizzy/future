# future

A personal forecasting model of a Bitcoin-led economic and social transition.

The project has three views of one underlying model:

- A sourced written argument that explains the mechanisms and their alternatives.
- An interactive visualization that traces outcomes through their causes and evidence.
- A simulation that generates conditional forecasts from explicit relationships.

The interface is a visual-first scenario explorer. The written argument belongs in the underlying research and optional detail views.

## Run locally

Requires Python 3.13, uv, and Node 22.12 or newer. The model runs directly from this checkout. It does not require an editable package install.

```sh
uv sync --locked
npm ci --prefix apps/web
uv run python -m worldmodel dev
```

Open http://127.0.0.1:5173/. The reviewed exploratory starting scenario loads automatically. Changing assumptions calculates and records a new run, with an automatic comparison against the starting scenario. The Python API binds to 127.0.0.1:8000. Ctrl+C stops the processes started by the dev command. Existing port owners produce an explicit error.

Private phone access uses [Tailscale Serve](ops/hosting.md). On this tailnet, open https://macbook-air-7.taild8ef36.ts.net/. Three relevant controls sit below the chart. **Assumptions** opens the remaining inputs and saved scenarios. Select a result to inspect its causes; expand details for equations, evidence, and research gaps. Touch scrubbing selects a month without changing the simulation. The detached server continues after the agent session. Automatic startup at login remains pending.

The starting scenario is exploratory. It assumes transition onset after two years, a three-year duration, constant real GDP and planned spending, constant other real revenue, full collection at the cap, 5% shared annual inflation, 10% annual Bitcoin purchasing-power growth, and an 80% real asset-price decline. These values demonstrate relationships. They have no assigned probability.

Saved scenarios stay in this browser's local storage. Save each variation under a new name. **Inputs JSON** preserves a portable copy. CSV and Excel export current and compared runs, complete monthly trajectories, units, assumed/generated status, source references, research gaps, and provenance. Fiscal flows are annualized even though the model samples them monthly.

Runs stay outside the public repository at `~/.local/share/future/runs/<run-id>/`. Each directory preserves its scenario, definitions, and results. `FUTURE_STATE_DIR` selects a different private location, including an isolated directory for tests. The engine does not fetch data or call an LLM while running.

The CLI uses the same engine:

```sh
uv run python -m worldmodel run scenarios/exploratory.json
uv run python -m worldmodel export <run-id> --format csv --output /tmp/future-export.csv
```

Exports refuse to overwrite an existing file. Keep personal scenarios and outputs outside this public checkout.

## First release

The implemented model generates recurring fiscal funding gaps. It does not allocate service cuts or estimate policy-event probabilities. GDP and Bitcoin paths are imposed inputs. Stock and gross property prices share the imposed repricing path. Productive capacity remains separate.

The explorer includes 14 countries and an EU aggregate. Eight fiscal baselines have been accepted: United States, China, Japan, Germany, France, Brazil, Saudi Arabia, and EU27. United Kingdom, India, Russia, Switzerland, Singapore, Argentina, and Paraguay remain visible with unresolved source reconciliation. Their fiscal results stay null. Their imposed asset paths remain available.

The shared purchasing-power index starts at 100 and compounds an inflation input. Its measurement basis stays fixed across countries. It is a simulated denominator, not a measured universal CPI or a replication of ShadowStats. Dollar and Bitcoin displays are indices; they do not infer absolute prices.

The forecast origin is October 2026. Historical fiscal shares set the starting scale without a nowcast. Source years and government coverage remain visible. The EU view uses the published Eurostat aggregate, includes member general governments, and stays separate from member-country views.

The compulsory-revenue cap uses taxes plus a reported social-contribution proxy. It is a stipulated ceiling, not an estimated Laffer maximum. Dataset coverage does not establish every contribution's legal mandatory/voluntary classification. Debt maturities, reserves, asset sales, and arrears remain explicit gaps. See [the calculation and source review](research/model.md).

## Check the implementation

```sh
uv run python -m pytest -q
npm run types --prefix apps/web
npm run build --prefix apps/web
```

Pydantic defines the contracts. The `types` command regenerates TypeScript from their JSON Schema. Tests check accounting, units, input validation, reproducibility, source coverage, immutable runs, and export agreement. They do not measure predictive performance. Browser interaction and screenshot checks are separate from these commands.

The model should inform financial allocations, career paths, location selections, cultural priorities, and skillsets to acquire. It should also help identify trends to pursue or avoid. Forecasts of future morality describe changing norms; personal moral judgments remain separate inputs to decisions.

## Assumptions and Causal Trajectory v0.1

This document records the supplied scenario and the first implementation. Unresolved mechanisms remain explicit. The engine generates conditional accounting results from reviewed baselines and exploratory inputs.

> Under the monetary transition stipulated here, how do productive activity, state power, private institutions, family life, and demographics change, and over what timescales?

### Core assumptions

Bitcoin's eventual success is an input. The model investigates its downstream consequences. Bitcoin failure, displacement by another monetary asset, and a durable fiat rescue are outside the core scenario.

- **Bitcoin:** Bitcoin displaces fiat and becomes the dominant monetary store of value. The scope of its use in payments and contracts remains to be defined.
- **Central banking:** Central banks cease to operate. Governments cannot restore their spending capacity through money creation or debt monetization.
- **Sovereign borrowing:** Sovereign bond markets collapse. Governments cannot fund spending or refinance debt through reliable voluntary borrowing. The treatment of other public borrowing remains unresolved.
- **Taxation:** Collected compulsory revenue cannot exceed its starting share of GDP. Collection effectiveness may fall. Statutory rates and a behavioral Laffer curve remain unmodeled.
- **Asset prices:** Stock-price and gross property-price indices lose at least 80% of real purchasing-power value from the scenario starting level of 100. Onset and duration are explicit inputs. The path applies to the selected countries.
- **Productive capacity:** Existing productive assets largely survive. Actual output can fall when financing, maintenance, institutional support, or coordination fails.

Bitcoin dominance, sovereign bond-market collapse, and the asset-price decline are separate imposed conditions. This draft does not claim that Bitcoin dominance alone establishes the other conditions.

Private borrowing, equity financing, retained earnings, and voluntary large-scale organization remain available for investigation. Profitable corporations can survive or reorganize. Corporate fragmentation and contraction in advanced semiconductors are candidate outcomes.

### Quantities and timescales

Every financial quantity needs a unit and a reference date. Track nominal dollars, Bitcoin, and real purchasing power separately. The first implementation represents purchasing power with one shared simulated index. Its basis stays fixed while its price level changes. It does not estimate local living-cost differences.

The initial asset paths describe stock-price indices and gross property-price indices. The reference point is the forecast-origin value. Individual companies, owners' equity after debt, and total returns require separate mechanisms.

Asset prices are the exchange values of claims or properties. Productive capacity is the ability to produce goods and services with existing assets and skills. Actual output is production over a defined period. An 80% price decline does not impose an 80% decline in productive capacity or actual output. Gross asset values and debt determine owners' net wealth separately.

Government financing capacity means resources available to fund spending over a period. State power includes the ability to enforce laws and control territory. A financing constraint can alter how governments allocate resources. The model must calculate what happens to coercive functions separately from civilian services.

The main decision horizon is the next 10 years from a versioned forecast origin. The initial origin is October 2026. Transition timing is a separate input. The scenario does not yet require the full transition to occur within those 10 years.

Family formation and demographic composition require additional timescales. Track births, deaths, migration, and changes in community membership. Track age structure and transmission to the next generation. Outcomes over generations must remain separate from outcomes within the 10-year horizon. All causal delays remain uncalibrated.

### Causal trajectory

Monetary displacement changes the financing and valuation of existing claims. The imposed borrowing and monetary-financing constraints reduce governments' available financing channels. Their response depends on surviving revenue, obligations, liquid reserves, and spending priorities. Defaults and spending cuts are possible responses. Their size and sequence require accounting for those quantities.

Asset sales, fees, compulsory transfers, and payment arrears need explicit treatment. Define which violate the tax or borrowing constraints before including them. Temporary capital controls and redistribution pressures remain candidate transition risks. They cannot serve as an unlabelled durable fiat rescue or a way around a core assumption.

Changes in financing and wealth affect firms through debt service, working capital, demand, and investment. Insolvency can transfer ownership while assets continue operating. Output contracts when a specified operating dependency fails. The model needs to distinguish a funding interruption from a lasting inability to coordinate production.

Private institutions compete to replace lost public provision. Their viability depends on payment, operating costs, membership, and enforcement. Smaller producers may gain opportunities. Concentrated owners or employers may also acquire assets and provide services. The ability to organize at large scale remains a question.

Reduced retirement and care provision creates unmet household needs. Family transfers, paid services, employers, and mutual-aid communities can meet different portions of those needs. Their affordability and reliability affect household dependence and living arrangements. Greater interdependence could support stable households. Financial insecurity could suppress marriage and fertility.

Changes in household arrangements can affect gender relations, religious participation, and community membership. Each connection requires its own mechanism and evidence. Religious demographic dominance, stronger families, and a reversal of feminism remain hypotheses. Birth rates alone cannot determine future composition without migration, mortality, membership retention, and cultural transmission.

Feedback matters. Changes in output alter the tax base and households' ability to pay for replacement services. Government responses can affect mobility and private investment. Ownership concentration can affect access to services and bargaining power. These relationships require explicit delays to avoid circular explanations.

Technological progress can enter as an imposed input or emerge from investment and institutional capacity. Record which role each component has. AI may change productivity and the viable scale of organizations. AI development and space travel may also depend on financing, energy, and complex coordination. Their trajectories remain questions for the model.

### Competing trajectories

The monetary assumptions stay fixed while replacement institutions vary.

- Smaller producers, local government, and voluntary communities could meet more needs if coordination and service costs permit.
- Concentrated private ownership and employer-provided services could expand if asset acquisition and financing support them.
- Governments could preserve coercive functions while sharply reducing civilian services if their resource allocation permits.
- Different regions could follow different trajectories because their productive capacity, fiscal obligations, and institutions differ.

These outcomes can coexist or succeed one another. They must emerge from relationships and inputs. They are not selectable end states.

An unexpected end state triggers an audit of the mechanism, evidence, units, and implementation. A discovered defect justifies a revision. A result that survives that audit remains a conditional forecast even when it conflicts with the expected trajectory.

### Evidence and simulation

Each proposed causal relationship needs a defined input and output. Record the mechanism, direction, geographic scope, time delay, and source. Distinguish evidence for the mechanism from evidence for its numerical strength. Record competing explanations and observations that would weaken the relationship.

An important relationship without defensible numbers stays uncalibrated and enters the research queue. Exploratory values can support labelled sensitivity analysis. They cannot support a claimed probability. Zero-shot LLM scores cannot supply measured causal strength or event probabilities.

The Laffer curve describes tax revenue as tax rates change and people respond. Its estimated shape depends on tax type and model assumptions. Trabandt and Uhlig's 2012 paper explores those differences, including the effect of human-capital assumptions. Its historical calibration does not establish a revenue limit for this transition. The stipulated tax constraint and any estimated revenue limit must remain separate. [How Do Laffer Curves Differ Across Countries?](https://www.federalreserve.gov/Pubs/IFDP/2012/1048/ifdp1048.htm)

*The Sovereign Individual* proposes mechanisms connecting information technology to taxation and organized power. The publisher's Chapter 1 excerpt is a reviewed starting source. The full book remains to be examined. Its proposed mechanisms require separate evidence and calibration before entering the simulation. [Publisher page and excerpt](https://www.simonandschuster.com/books/The-Sovereign-Individual/James-Dale-Davidson/9780684832722)

The background refers to power-law Bitcoin paths and ShadowStats-style inflation paths from Context 2. Their formulas, datasets, and fit methods were not supplied. If adopted, they must remain named scenario inputs with their assumptions exposed. Bitcoin bubbles and volatility require a separate mechanism or an explicitly imposed process. Bitcoin's dollar price and its purchasing power require separate outputs.

Every result must distinguish imposed inputs from model-generated outcomes. Simulated frequencies describe the selected inputs and model. They become real-world probabilities only with a defensible basis for the model and input distributions. Forecasts also need checks against observed outcomes as evidence accumulates.

### Decision outputs and interface

The 10-year view should cover financial risks such as capital controls affecting Roth IRA access, redistribution pressures in relevant jurisdictions, and war exposure by location. These are requested risk categories. This draft makes no claim about current law or any event's likelihood.

Bitcoin projections should expose bubbles, volatility, and purchasing power. Other views should cover AI, space travel, dating norms, and changes relevant to careers and skillsets. Location comparisons need regional differences in institutions and exposure.

Decision outputs should show which choices remain viable across generated scenarios and which depend on a specific assumption. Personal objectives and constraints enter the decision separately from the forecast. No financial allocation or location recommendation has been calculated.

The final interface should use a small number of clear visualizations. Selecting an outcome should reveal its inputs, intermediate steps, time delays, and sources. The written argument and simulation should use those same definitions and relationships. Saved scenarios should preserve input values and model versions so results can be reproduced.

CSV and Excel exports should include outcomes with units and time periods. They should also identify the scenario inputs and model version. New evidence initially enters through deliberate review in the coding process. Automated collection can follow later, with review recorded before collected evidence changes an active model.

Public hosting remains open. Private Tailscale hosting is documented in `ops/hosting.md`. Private credentials and personal account data belong outside the public repository. `.env` and `.env.*` are ignored by Git.

### Visual direction

Use an ultra-simplified, minimal adaptation of [The Globe of Economic Complexity](http://globe.cid.harvard.edu/). Its preview image and source were inspected. Its live interactive behavior remains unverified.

Use a black canvas (`#000000`) with light primary text (`#E0E0E0`) and gray secondary text (`#808080`). Reserve cyan (`#17becf`) and yellow (`#FFC41C`) for meaningful data distinctions. These colors appear in the reference's [stylesheet](http://globe.cid.harvard.edu/style.css) and [visualization source](http://globe.cid.harvard.edu/scripts/script.js).

The default view has one dominant visualization and a compact scenario selector. Add one or two supporting views when they help explain the result. Use short labels and annotations. Keep units, dates, uncertainty, and whether a result is assumed or generated visible.

Selecting an outcome reveals its relevant intermediate steps and assumptions beside the visualization. Show the causal relationships needed to explain that outcome. The complete model graph stays outside the default view.

Selecting a mechanism or assumption reveals its definition, evidence, uncertainty, and research gaps. Longer explanations and equations belong here. For example, selecting a projected Bitcoin drawdown exposes its responsible assumptions and calculations.

Keep the dissertation in the underlying research and optional detail views. Avoid an introductory essay, a grid of metric cards, dozens of simultaneous controls, and paragraphs that repeat a chart. Inspecting a result must not require reading the monetary thesis first.

Assign color consistently to scenarios or variables. Keep each color's meaning clear within a view and preserve its assignment across views. Choose chart types from the question being explained. Geography belongs in views where location affects an outcome. A 3D globe and particle animation are not required.

Borrow these interaction patterns while keeping the minimal dark color scheme:

- [Seeing Theory](https://seeing-theory.brown.edu/basic-probability/index.html): focused visual experiments where changing an input demonstrates one relationship.
- [AI Futures Model](https://www.aifuturesmodel.com/): connections between forecasts, parameters, and an inspectable model diagram. Its [model overview](https://blog.aifutures.org/p/ai-futures-model-dec-2025-update) explains those connections.
- [En-ROADS](https://en-roads.climateinteractive.org/scenario.html?v=26.9.0): outputs beside scenario controls, with detailed settings available on selection. Its [tutorial](https://docs.climateinteractive.org/projects/en-roads/en/latest/guide/tutorial.html) documents this interaction.
- [AI 2027](https://ai-2027.com/): progression through time, concrete milestones, and alternative trajectories.
- [Probable Futures](https://probablefutures.org/maps): geographic exploration of consequences across scenarios. Its [maps explanation](https://probablefutures.org/science/our-maps/) describes how to interpret the results.

These are interface references. Numerical assumptions and forecasts follow the evidence requirements above.

Use legible sans-serif text. Body text and placeholders must reach 4.5:1 contrast. Large text must reach 3:1. Transitions must preserve the identity of the data and provide a reduced-motion alternative. Verify the rendered interface when it exists.

### Implementation direction

Use a Python simulation engine and a React/TypeScript frontend with Vite in this repository. Organize implemented mechanisms as independently testable Python modules in one codebase. This is the modular monolith described in the architecture suggestion.

Run the simulation from the command line or the local FastAPI control surface. The website requests calculations through the same engine. Store immutable JSON results and generate CSV/Excel exports from those recorded values. React owns the SVG elements; selected D3 utilities can supply scales and shapes. [Vite production builds](https://vite.dev/guide/build), [D3 and React](https://d3js.org/what-is-d3)

Define the canonical data contract in Python with Pydantic. Generate JSON Schema and frontend types from that contract. Python performs authoritative validation. Evidence relationships record support or challenges to a claim. Computational dependencies record implemented calculations. An evidence relationship becomes executable only after its mechanism and parameters have been established. [Pydantic JSON Schema](https://docs.pydantic.dev/latest/concepts/json_schema/)

Each run records the fully resolved inputs, code revision, dependency versions, data hashes, random seeds where used, and numerical settings. Preserve complete results. Choose time resolution per mechanism. Declare whether feedback acts in a later period or requires a simultaneous solution. Execution order must follow that declaration.

Calculate world trajectories before evaluating personal decisions against them. View controls select or display existing results. Changing a causal parameter requires a new run. Model calculations receive their inputs explicitly and perform no live data collection or LLM calls during execution.

Keep one direct execution path per operation. Missing required inputs produce an explicit error. Unknown effects stay unknown. Add a dependency or abstraction only when an implemented requirement needs it. Create domain modules as their mechanisms are implemented. Skip speculative additions and record useful future options here.

The first implementation should connect one reviewed mechanism to a saved scenario, a reproducible run, an inspectable chart, and a matching export. Check numerical invariants and reproduction separately from predictive performance.

Potential future additions include Parquet storage and DuckDB analysis for larger results, a separate worker for expensive calculations, and EMA Workbench for sensitivity analysis. Hosting can use the Mac mini or a selected static host. These options do not require scaffolding now.

### Research queue

- Calibrate separate stock and property paths, debt effects, total returns, and regional differences. The initial shared real-price decline is imposed.
- Estimate collectible revenue under mobility, avoidance, enforcement, and changes in the tax base. Review mandatory and voluntary contributions separately. The initial revenue/GDP ceiling is imposed.
- Define the scope of the public-borrowing ban, central-bank disappearance, and Bitcoin use in payments. Determine transition timing and overlap between monetary systems.
- Establish government financing accounts and spending priorities by jurisdiction. Quantify the dependencies of civilian services and coercive functions. IMF and Eurostat records have been reviewed for the first release. Seven country baselines still need reconciliation; the exact conflicting totals are recorded in the registry.
- Investigate how private financing can sustain working capital and capital-intensive production after sovereign debt markets fail.
- Investigate whether replacement care and security arrangements change household formation, fertility, and community retention. Separate evidence for each connection.
- Establish regional mechanisms and source data for capital controls, redistribution pressures, and war exposure. Preserve the distinction between a generated event and an imposed shock.
- Obtain the referenced Bitcoin and inflation methods. Determine how AI progress and organizational capacity affect one another without counting the same effect twice.

No transition timing, behavioral causal magnitude, or event probability has been calibrated in v0.1. Historical fiscal observations establish the initial scale.
