import { useEffect, useRef, useState } from 'react';
import { scaleLinear } from 'd3-scale';
import { area, line } from 'd3-shape';
import type { Country, CountryResult, Definitions, Point, Run, Scenario } from './contracts';

const format = (value: number, digits = 1) => value.toLocaleString('en-US', { maximumFractionDigits: digits, minimumFractionDigits: digits });
const colors = { current: 'var(--cyan)', comparison: 'var(--yellow)', muted: 'var(--muted)' };
const savedKey = 'future.scenarios.v1';
type View = 'fiscal' | 'assets';
type Unit = 'real' | 'dollar' | 'bitcoin';
type Curve = { key: keyof Point; label: string; color: string; status: string; dashed?: boolean };

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, options);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Model request failed (${response.status}): ${text}`);
  }
  return response.json() as Promise<T>;
}

function calculate(scenario: Scenario, signal?: AbortSignal) {
  return request<Run>('/api/runs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(scenario), signal });
}

function App() {
  const [definitions, setDefinitions] = useState<Definitions | null>(null);
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [saved, setSaved] = useState<Scenario[]>([]);
  const [accepted, setAccepted] = useState(false);
  const [run, setRun] = useState<Run | null>(null);
  const [comparison, setComparison] = useState<Run | null>(null);
  const [compareName, setCompareName] = useState('');
  const [comparisonBusy, setComparisonBusy] = useState(false);
  const [countryId, setCountryId] = useState('USA');
  const [view, setView] = useState<View>('fiscal');
  const [unit, setUnit] = useState<Unit>('real');
  const [month, setMonth] = useState(120);
  const [inspected, setInspected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    request<Definitions>('/api/definitions', { signal: controller.signal }).then(d => {
      setDefinitions(d); setScenario(d.default_scenario);
      const raw = localStorage.getItem(savedKey);
      if (raw !== null) {
        const records: unknown = JSON.parse(raw);
        const fields = Object.entries(d.default_scenario);
        if (!Array.isArray(records) || records.some(s => typeof s !== 'object' || s === null
          || Object.keys(s).length !== fields.length
          || fields.some(([key, value]) => !(key in s) || typeof s[key] !== typeof value
            || (typeof s[key] === 'number' && !Number.isFinite(s[key])))
          || typeof s.name !== 'string' || !s.name.trim() || s.name.length > 200)
          || new Set(records.map(s => s.name)).size !== records.length) {
          throw new Error('Saved scenarios are invalid. Export or inspect browser storage before changing it.');
        }
        setSaved(records as Scenario[]);
      }
    }).catch(e => { if (e.name !== 'AbortError') setError(e.message); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!scenario || !accepted) return;
    const controller = new AbortController();
    setBusy(true); setError(null);
    const timer = setTimeout(() => {
      calculate(scenario, controller.signal).then(result => {
        if (!controller.signal.aborted) { setRun(result); setBusy(false); }
      }).catch(e => { if (e.name !== 'AbortError') { setError(e.message); setBusy(false); } });
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [scenario, accepted]);

  useEffect(() => {
    setComparison(null); setComparisonBusy(false);
    if (!compareName || !definitions) return;
    const selected = compareName === '__starting' ? definitions.default_scenario : saved[Number(compareName.slice(6))];
    if (!selected) { setError('Comparison scenario is missing.'); return; }
    const controller = new AbortController();
    setComparisonBusy(true);
    calculate(selected, controller.signal).then(result => {
      if (!controller.signal.aborted) { setComparison(result); setComparisonBusy(false); }
    }).catch(e => { if (e.name !== 'AbortError') { setError(e.message); setComparisonBusy(false); } });
    return () => controller.abort();
  }, [compareName, definitions, saved]);

  const current = run?.countries.find(c => c.country_id === countryId);
  const compared = comparison?.countries.find(c => c.country_id === countryId);
  const country = definitions?.countries.find(c => c.id === countryId);
  const point = current?.points[month];
  const stale = busy || (run !== null && scenario !== null && JSON.stringify(run.scenario) !== JSON.stringify(scenario));
  const comparisonPending = Boolean(compareName) && (comparisonBusy || comparison === null);
  const savedIndex = saved.findIndex(s => JSON.stringify(s) === JSON.stringify(scenario));
  const selectedInputs = savedIndex >= 0 ? `saved:${savedIndex}`
    : JSON.stringify(scenario) === JSON.stringify(definitions?.default_scenario) ? '__starting' : '__draft';

  function update(key: keyof Scenario, value: number) {
    if (scenario) setScenario({ ...scenario, [key]: value });
  }

  function save() {
    if (!scenario || !saveName.trim()) return;
    if (saved.some(s => s.name === saveName.trim())) { setError('A scenario with this name already exists. Choose a new name.'); return; }
    const named = { ...scenario, name: saveName.trim() };
    const next = [...saved, named];
    try {
      localStorage.setItem(savedKey, JSON.stringify(next));
      setSaved(next); setScenario(named); setSaveName(''); setSaving(false); setNotice('Scenario saved on this browser.');
    } catch { setError('Browser storage could not save the scenario. Download its inputs to preserve it.'); }
  }

  async function download(format: 'csv' | 'xlsx' | 'json') {
    if (!run || stale || comparisonPending) return;
    try {
      const blob = format === 'json' ? new Blob([JSON.stringify(run.scenario, null, 2)], { type: 'application/json' })
        : await fetch(`/api/runs/${run.run_id}/export?format=${format}${comparison ? `&comparison_run_id=${comparison.run_id}` : ''}`).then(r => {
          if (!r.ok) throw new Error(`Export failed (${r.status}).`);
          return r.blob();
        });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob); link.download = `future-${run.run_id}.${format}`; link.click();
      URL.revokeObjectURL(link.href);
    } catch (e) { setError(e instanceof Error ? e.message : 'Export failed.'); }
  }

  return <div className="app">
    <header className="site-header">
      <a className="wordmark" href="/" aria-label="future home">future<span className="wordmark-dot">.</span></a>
      <span className="header-note">A MONETARY TRANSITION EXPLORER</span>
      <span className="version">MODEL {definitions?.model_version ?? '0.1'} <span className="status-dot" /> LOCAL</span>
    </header>
    {error && <div className="error" role="alert">{error}<button onClick={() => setError(null)} aria-label="Dismiss error">Close</button></div>}
    {!definitions || !scenario ? <main className="loading"><p>Loading reviewed model definitions...</p>{error && <p>Start the local Python model with <code>uv run python -m worldmodel serve</code>.</p>}</main> : <>
      {!accepted && <div className="entry-banner">
        <div><strong>A conditional scenario.</strong> <span>Bitcoin succeeds by assumption. Downstream results depend on the inputs.</span></div>
        <button className="primary-button" onClick={() => setAccepted(true)}>Explore starting scenario <span aria-hidden="true">&gt;</span></button>
      </div>}
      <div className="workspace">
        <aside className="controls">
          <div className="section-label">01 / SCENARIO</div>
          <label className="field-label" htmlFor="scenario-select">Saved inputs</label>
          <select id="scenario-select" value={selectedInputs} onChange={e => {
            const selected = e.target.value === '__starting' ? definitions.default_scenario : saved[Number(e.target.value.slice(6))];
            if (selected) { setScenario({ ...selected }); setAccepted(true); setNotice(''); }
          }}>
            <option value="__starting">Exploratory starting scenario</option>
            {selectedInputs === '__draft' && <option value="__draft" disabled>Edited inputs</option>}
            {saved.map((s, i) => <option key={s.name} value={`saved:${i}`}>{s.name}</option>)}
          </select>
          <div className="scenario-actions"><button onClick={() => setSaving(!saving)}>Save inputs</button><button onClick={() => { setScenario({ ...definitions.default_scenario }); setNotice('Starting inputs restored.'); }}>Reset inputs</button></div>
          {saving && <form className="save-form" onSubmit={e => { e.preventDefault(); save(); }}>
            <label className="field-label" htmlFor="save-name">Scenario name</label>
            <input id="save-name" value={saveName} maxLength={200} dir="auto" onChange={e => setSaveName(e.target.value)} required autoFocus placeholder="e.g. Slower transition" />
            <button className="primary-button" type="submit">Save</button>
          </form>}
          {notice && <p className="notice" role="status">{notice}</p>}
          <div className="rule" />
          <div className="section-label">TRANSITION TIMING <span>ASSUMED</span></div>
          <Slider name="Begins after" value={scenario.transition_onset_month / 12} min={0} max={10} step={0.25} suffix="years" onChange={v => update('transition_onset_month', Math.round(v * 12))} />
          <Slider name="Duration" value={scenario.transition_duration_months / 12} min={0.25} max={10} step={0.25} suffix="years" onChange={v => update('transition_duration_months', Math.round(v * 12))} />
          <div className="rule" />
          <div className="section-label">REVENUE AND OUTPUT <span>ASSUMED</span></div>
          <Slider name="Real GDP growth" value={scenario.real_gdp_growth * 100} min={-10} max={10} step={0.5} suffix="% / yr" onChange={v => update('real_gdp_growth', v / 100)} />
          <Slider name="Collection after transition" value={scenario.collection_effectiveness * 100} min={0} max={100} step={1} suffix="% of cap" onChange={v => update('collection_effectiveness', v / 100)} />
          <button className="text-link" onClick={() => setInspected('tax')}>What constrains revenue? <span aria-hidden="true">&gt;</span></button>
          <details className="advanced">
            <summary>More assumptions <span aria-hidden="true">+</span></summary>
            <Slider name="Real spending growth" value={scenario.real_spending_growth * 100} min={-10} max={10} step={0.5} suffix="% / yr" onChange={v => update('real_spending_growth', v / 100)} />
            <Slider name="Other revenue growth" value={scenario.other_revenue_growth * 100} min={-10} max={10} step={0.5} suffix="% / yr" onChange={v => update('other_revenue_growth', v / 100)} />
            <Slider name="Shared inflation" value={scenario.annual_inflation * 100} min={-10} max={30} step={0.5} suffix="% / yr" onChange={v => update('annual_inflation', v / 100)} />
            <Slider name="Bitcoin real growth" value={scenario.bitcoin_real_growth * 100} min={-10} max={50} step={1} suffix="% / yr" onChange={v => update('bitcoin_real_growth', v / 100)} />
            <Slider name="Real asset decline" value={scenario.asset_decline * 100} min={80} max={100} step={1} suffix="%" onChange={v => update('asset_decline', v / 100)} />
            <button className="text-link" onClick={() => setInspected('prices')}>Inspect purchasing power <span aria-hidden="true">&gt;</span></button>
          </details>
          <div className="fixed-assumptions"><span className="section-label">FIXED CONDITIONS</span><p>Bitcoin dominance<br />No durable monetary financing<br />No sovereign refinancing<br />Compulsory revenue / GDP capped</p><button className="text-link" onClick={() => setInspected('financing')}>Inspect the transition <span aria-hidden="true">&gt;</span></button></div>
        </aside>
        <main className="main-view">
          <div className="view-topline"><div className="view-switch" role="group" aria-label="Visualization">
            <button className={view === 'fiscal' ? 'active' : ''} onClick={() => setView('fiscal')}>Fiscal capacity</button>
            <button className={view === 'assets' ? 'active' : ''} onClick={() => setView('assets')}>Asset repricing</button>
          </div><span className="run-status" role="status">{busy ? 'Recalculating / results stale' : stale ? 'Inputs changed / results stale' : run ? 'Calculated from your inputs' : 'Select a scenario to calculate'}</span></div>
          <div className="chart-heading"><div><span className="section-label">{view === 'fiscal' ? 'FINANCING ENDS. THE GAP EMERGES.' : 'PRICES CHANGE. CAPACITY IS SEPARATE.'}</span><h1>{view === 'fiscal' ? 'What can governments fund?' : 'What does an asset buy?'}</h1></div>
            <label className="country-selector"><span className="sr-only">Selected country</span><select aria-label="Selected country" value={countryId} onChange={e => setCountryId(e.target.value)}>{definitions.countries.map(c => <option value={c.id} key={c.id}>{c.name}</option>)}</select></label>
          </div>
          <div className="chart-meta"><span>{scenario.forecast_origin.slice(0, 4)} - {Number(scenario.forecast_origin.slice(0, 4)) + 10}</span><span>{country?.baseline ? `${country.baseline.year} fiscal baseline / ${country.baseline.government_scope}` : 'Fiscal baseline pending review'}</span><button onClick={() => setInspected('evidence')}>Sources <span aria-hidden="true">&gt;</span></button></div>
          {view === 'assets' && <div className="unit-switch" role="group" aria-label="Asset measurement unit">{(['real', 'dollar', 'bitcoin'] as Unit[]).map(u => <button key={u} className={u === unit ? 'active' : ''} onClick={() => setUnit(u)}>{u === 'real' ? 'Purchasing power' : u === 'dollar' ? 'Dollar index' : 'Bitcoin index'}</button>)}</div>}
          <section className={`chart-section ${stale ? 'stale' : ''}`} aria-label="Trajectory">
            {current && (view === 'assets' || current.baseline !== null) ? <Trajectory current={current} comparison={compared} scenario={run!.scenario} view={view} unit={unit} month={month} onMonth={setMonth} onInspect={setInspected} /> : <div className="empty-chart"><div className="empty-grid" aria-hidden="true" /><p>{!accepted ? 'Choose inputs. Explore their consequences.' : current ? 'This fiscal baseline needs further source review.' : 'Calculating the scenario...'}</p>{current?.research_gaps.map(g => <p key={g}>{g}</p>)}</div>}
          </section>
          <div className="chart-bottom">
            <span>{view === 'fiscal' ? 'Annualized real units / starting annual GDP = 100' : 'Index / scenario starting value = 100'}</span>
            <div className="exports"><button disabled={!run || stale || comparisonPending} onClick={() => download('csv')}>CSV</button><button disabled={!run || stale || comparisonPending} onClick={() => download('xlsx')}>Excel</button><button disabled={!run || stale || comparisonPending} onClick={() => download('json')}>Inputs JSON</button></div>
          </div>
          <div className="lower-view">
            <section className="country-comparison">
              <div className="lower-heading"><h2>Countries at year 10</h2><span>Funding gap / % GDP</span></div>
              <Comparison countries={definitions.countries} results={run?.countries ?? []} comparison={comparison?.countries ?? []} selected={countryId} onSelect={setCountryId} />
              <p className="footnote">Government coverage and baseline years differ. EU is a separate aggregate; member views are not added to it.</p>
            </section>
            <section className="comparison-controls">
              <div className="section-label">02 / COMPARE INPUTS</div>
              <label className="field-label" htmlFor="comparison-select">Compare current inputs with</label>
              {comparisonBusy && <p className="notice" role="status">Calculating comparison...</p>}
              <select id="comparison-select" value={compareName} disabled={!accepted} onChange={e => setCompareName(e.target.value)}>
                <option value="">No comparison</option><option value="__starting">Exploratory starting scenario</option>{saved.map((s, i) => <option key={s.name} value={`saved:${i}`}>{s.name}</option>)}
              </select>
              <div className="comparison-key"><span><i style={{ background: colors.current }} />Current</span>{compareName && <span><i style={{ background: colors.comparison }} />Comparison</span>}</div>
              {comparison && <p className="footnote">Both scenarios are calculated by the same model. Differences are conditional, not probabilities.</p>}
              <div className="research-summary"><span className="section-label">NEXT MECHANISMS / UNCALIBRATED</span><div>{definitions.mechanisms.filter(m => m.status === 'qualitative').map(m => <button key={m.id} onClick={() => setInspected(m.id)}>{m.name}<span aria-hidden="true">&gt;</span></button>)}</div></div>
            </section>
          </div>
        </main>
      </div>
      {inspected && <Inspector id={inspected} definitions={definitions} country={country} point={point} scenario={run ? run.scenario : scenario} onSelect={setInspected} onClose={() => setInspected(null)} />}
      <footer><span>Conditional scenarios. No assigned real-world probabilities.</span><button onClick={() => setInspected('evidence')}>Evidence and model limits <span aria-hidden="true">&gt;</span></button></footer>
    </>}
  </div>;
}

function Slider({ name, value, min, max, step, suffix, onChange }: { name: string; value: number; min: number; max: number; step: number; suffix: string; onChange: (v: number) => void }) {
  return <label className="slider-field"><span>{name}<output>{format(value, Number.isInteger(value) ? 0 : 2)} <small>{suffix}</small></output></span><input type="range" aria-label={name} value={value} min={min} max={max} step={step} onChange={e => onChange(e.currentTarget.valueAsNumber)} style={{ backgroundSize: `${(value - min) / (max - min) * 100}% 100%` }} /></label>;
}

function Trajectory({ current, comparison, scenario, view, unit, month, onMonth, onInspect }: { current: CountryResult; comparison?: CountryResult; scenario: Scenario; view: View; unit: Unit; month: number; onMonth: (v: number) => void; onInspect: (id: string) => void }) {
  const svg = useRef<SVGSVGElement>(null);
  const [width, setWidth] = useState(960);
  useEffect(() => {
    const observer = new ResizeObserver(entries => setWidth(Math.max(300, entries[0].contentRect.width)));
    observer.observe(svg.current!);
    return () => observer.disconnect();
  }, []);
  const height = width < 600 ? 275 : 370, left = 42, right = 25, top = 40, bottom = 40;
  const curves: Curve[] = view === 'fiscal' ? [
    { key: 'planned_spending', label: 'Planned spending', color: colors.muted, status: 'Assumed', dashed: true },
    { key: 'funded_spending', label: 'Funded spending', color: colors.current, status: 'Generated' },
    { key: 'sustainable_spending', label: 'Recurring revenue', color: colors.current, status: 'Generated', dashed: true },
  ] : [
    { key: `stock_${unit}_index`, label: 'Stocks + property', color: colors.current, status: 'Assumed' },
    { key: `bitcoin_${unit}_index`, label: 'Bitcoin', color: colors.muted, status: 'Assumed', dashed: true },
  ];
  const allValues = [...current.points, ...(comparison?.points ?? [])].flatMap(p => curves.map(c => p[c.key] as number));
  const x = scaleLinear().domain([0, 120]).range([left, width - right]);
  const y = scaleLinear().domain([0, Math.max(...allValues, 1) * 1.18]).nice().range([height - bottom, top]);
  const lineFor = (key: keyof Point) => line<Point>().x(p => x(p.month)).y(p => y(p[key] as number));
  const gapArea = area<Point>().x(p => x(p.month)).y0(p => y(p.funded_spending!)).y1(p => y(p.planned_spending!));
  const selected = current.points[month];
  const firstYear = Number(scenario.forecast_origin.slice(0, 4));
  const inspectedId = view === 'fiscal' ? 'budget' : 'assets';
  return <>
    <div className="trajectory-readout"><button onClick={() => onInspect(inspectedId)}><strong>{format(view === 'fiscal' ? selected.funding_gap_pct_gdp! : selected[curves[0].key] as number)}</strong><span>{view === 'fiscal' ? '% GDP unfunded' : `${unit === 'real' ? 'real' : unit} asset index`}<small>{selected.date.slice(0, 7)} / {view === 'fiscal' ? 'GENERATED' : 'ASSUMED'} <span aria-hidden="true">&gt;</span></small></span></button></div>
    <svg ref={svg} className="trajectory" viewBox={`0 0 ${width} ${height}`} role="group" aria-label={`${view === 'fiscal' ? 'Planned spending, funded spending, and recurring revenue' : 'Asset prices and Bitcoin'} over ten years. Select a month to inspect its values.`}>
      <defs><pattern id="gap-hatch" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M-2,2 l4,-4 M0,8 l8,-8 M6,10 l4,-4" stroke={colors.muted} strokeOpacity="0.35" strokeWidth="1" /></pattern></defs>
      {y.ticks(5).map(t => <g key={t}><line x1={left} x2={width - right} y1={y(t)} y2={y(t)} stroke="var(--rule)" /><text x={left - 13} y={y(t) + 4} textAnchor="end" fill={colors.muted}>{format(t, 0)}</text></g>)}
      <rect x={x(scenario.transition_onset_month)} y={top} width={Math.max(0, x(Math.min(120, scenario.transition_onset_month + scenario.transition_duration_months)) - x(scenario.transition_onset_month))} height={height - top - bottom} fill="#ffffff" fillOpacity="0.025" />
      {scenario.transition_onset_month < 110 && <text x={x(scenario.transition_onset_month) + 8} y={top - 12} fill={colors.muted}>TRANSITION</text>}
      {view === 'fiscal' && <path d={gapArea(current.points) ?? ''} fill="url(#gap-hatch)" />}
      {comparison && comparison.points.length > 0 && <path d={lineFor(curves[view === 'fiscal' ? 1 : 0].key)(comparison.points) ?? ''} stroke={colors.comparison} strokeWidth="2" fill="none" strokeDasharray="5 5" />}
      {curves.map(c => <path key={c.key} d={lineFor(c.key)(current.points) ?? ''} fill="none" stroke={c.color} strokeWidth={c.dashed ? 1.5 : 2.5} strokeDasharray={c.dashed ? '5 5' : undefined} />)}
      {[0, 24, 48, 72, 96, 120].map(t => <text key={t} x={x(t)} y={height - 9} fill={colors.muted} textAnchor="middle">{firstYear + t / 12}</text>)}
      <line x1={x(month)} x2={x(month)} y1={top} y2={height - bottom} stroke="var(--secondary)" strokeDasharray="2 4" />
      {curves.map(c => <circle key={c.key} cx={x(month)} cy={y(selected[c.key] as number)} r="3.5" fill={c.color} stroke="#000" strokeWidth="2" />)}
      <rect x={left} y={top} width={width - left - right} height={height - top - bottom} fill="transparent" tabIndex={0} role="slider" aria-label="Inspect month" aria-valuemin={0} aria-valuemax={120} aria-valuenow={month} onKeyDown={e => {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); onMonth(Math.max(0, Math.min(120, month + (e.key === 'ArrowLeft' ? -1 : 1)))); }
        if (e.key === 'Home') { e.preventDefault(); onMonth(0); }
        if (e.key === 'End') { e.preventDefault(); onMonth(120); }
        if (e.key === 'Enter') onInspect(inspectedId);
      }} onPointerMove={e => {
        const bounds = e.currentTarget.ownerSVGElement!.getBoundingClientRect();
        onMonth(Math.max(0, Math.min(120, Math.round(x.invert((e.clientX - bounds.left) / bounds.width * width)))));
      }} onClick={() => onInspect(inspectedId)} />
    </svg>
    {view === 'assets' && <p className="footnote">Productive capacity: {format(selected.productive_capacity_index, 0)} / real GDP: {format(selected.gdp_index, 0)}. Separate indices; both assumed.</p>}
    <div className="chart-legend">{curves.map(c => <button key={c.key} onClick={() => onInspect(c.key === 'planned_spending' ? 'spending' : c.key === 'sustainable_spending' ? 'tax' : c.key.startsWith('bitcoin_') ? 'bitcoin' : inspectedId)}><i style={{ borderColor: c.color, borderTopStyle: c.dashed ? 'dashed' : 'solid' }} />{c.label}<small>{c.status}</small></button>)}{view === 'fiscal' && <button onClick={() => onInspect('budget')}><i className="gap-key" />Funding gap<small>Generated</small></button>}</div>
  </>;
}

function Comparison({ countries, results, comparison, selected, onSelect }: { countries: Country[]; results: CountryResult[]; comparison: CountryResult[]; selected: string; onSelect: (id: string) => void }) {
  const maximum = Math.max(1, ...[...results, ...comparison].map(r => r.points.at(-1)?.funding_gap_pct_gdp ?? 0));
  return <div className="country-bars">{countries.map(c => {
    const result = results.find(r => r.country_id === c.id);
    const last = result?.points.at(-1);
    const previous = comparison.find(r => r.country_id === c.id)?.points.at(-1);
    return <button key={c.id} className={`country-row ${selected === c.id ? 'selected' : ''}`} onClick={() => onSelect(c.id)} aria-label={`Select ${c.name}${last?.funding_gap_pct_gdp != null ? `, funding gap ${format(last.funding_gap_pct_gdp)} percent of GDP` : ', fiscal data gap'}`}>
      <span className="country-name">{c.name}<small>{c.baseline?.year ?? 'GAP'}</small></span>
      <span className="bar-track"><i style={{ width: `${(last?.funding_gap_pct_gdp ?? 0) / maximum * 100}%` }} />{previous?.funding_gap_pct_gdp != null && <b style={{ left: `${previous.funding_gap_pct_gdp / maximum * 100}%` }} />}</span>
      <span className="bar-value">{last?.funding_gap_pct_gdp != null ? format(last.funding_gap_pct_gdp) : c.baseline ? '--' : 'gap'}</span>
    </button>;
  })}</div>;
}

function Inspector({ id, definitions, country, point, scenario, onSelect, onClose }: { id: string; definitions: Definitions; country?: Country; point?: Point; scenario: Scenario; onSelect: (id: string | null) => void; onClose: () => void }) {
  const closeButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    closeButton.current?.focus();
    return () => previous.focus();
  }, []);
  const mechanism = definitions.mechanisms.find(m => m.id === id);
  const isEvidence = id === 'evidence';
  const sourceIds = new Set([...(mechanism?.source_ids ?? []), ...(country?.baseline?.source_ids ?? [])]);
  const relevant = isEvidence ? definitions.sources : definitions.sources.filter(s => sourceIds.has(s.id));
  return <div className="inspector-backdrop" onClick={onClose}><aside className="inspector" role="dialog" aria-modal="true" aria-labelledby="inspector-title" onClick={e => e.stopPropagation()} onKeyDown={e => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'Tab') {
      const focusable = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('button, a, input, summary, select')).filter(el => !el.hasAttribute('disabled') && el.getClientRects().length > 0);
      const index = focusable.indexOf(document.activeElement as HTMLElement);
      if (e.shiftKey && index === 0) { e.preventDefault(); focusable.at(-1)?.focus(); }
      if (!e.shiftKey && index === focusable.length - 1) { e.preventDefault(); focusable[0]?.focus(); }
    }
  }}>
    <div className="inspector-top"><span className="section-label">INSPECT THE MODEL</span><button ref={closeButton} onClick={onClose} aria-label="Close inspector">Close <span aria-hidden="true">x</span></button></div>
    <span className={`badge ${mechanism?.status === 'implemented' ? 'generated' : ''}`}>{isEvidence ? 'REVIEWED SOURCES' : mechanism?.status === 'implemented' ? 'GENERATED' : mechanism?.status.toUpperCase()}</span>
    <h2 id="inspector-title">{isEvidence ? 'Evidence and limits' : mechanism?.name}</h2>
    {mechanism && <>
      <p>{mechanism.description}</p>
      {id === 'budget' && point?.funding_gap != null && <div className="accounting"><span>Planned spending<b>{format(point.planned_spending!)}</b></span><span>Recurring revenue<b>{format(point.sustainable_spending!)}</b></span><span>Financing<b>{format(point.financing!)}</b></span><span className="accounting-result">Funding gap<b>{format(point.funding_gap!)}</b></span><small>Annualized real units / starting GDP = 100 / {point.date.slice(0, 7)}</small></div>}
      {mechanism.equation && <details open><summary>Calculation</summary><code className="equation">{mechanism.equation}</code></details>}
      {mechanism.inputs.length > 0 && <div className="causal-inputs"><span className="section-label">DEPENDS ON</span>{mechanism.inputs.map(input => {
        const source = definitions.mechanisms.find(m => m.id === input);
        return source ? <button key={input} onClick={() => onSelect(input)}><span>{source.name}</span><small>{source.status === 'implemented' ? 'GENERATED' : source.status.toUpperCase()}</small><span aria-hidden="true">&gt;</span></button> : <span key={input} className="input-detail">{input}</span>;
      })}</div>}
      {id === 'prices' && <p>The shared index starts at 100. Annual inflation is {format(scenario.annual_inflation * 100)}%. The measurement basis stays fixed across countries. Local living-cost differences are unmodeled.</p>}
      {id === 'bitcoin' && <p>Real purchasing-power growth is {format(scenario.bitcoin_real_growth * 100)}% per year. Bubbles and volatility are unmodeled.</p>}
      {id === 'transition' && <p>Transition begins after {format(scenario.transition_onset_month / 12)} years and lasts {format(scenario.transition_duration_months / 12)} years. Timing is an input.</p>}
    </>}
    {country?.baseline && <details open={isEvidence}><summary>{country.name} / {country.baseline.year} baseline</summary><p>{country.baseline.government_scope}</p><div className="accounting"><span>Compulsory revenue / GDP<b>{format(country.baseline.compulsory_revenue_pct_gdp)}%</b></span><span>Other revenue / GDP<b>{format(country.baseline.other_revenue_pct_gdp)}%</b></span><span>Expenditure / GDP<b>{format(country.baseline.expenditure_pct_gdp)}%</b></span></div>{country.baseline.notes.map(n => <p key={n}>{n}</p>)}</details>}
    {relevant.length > 0 && <div className="source-list"><span className="section-label">SOURCE BASIS</span>{relevant.map(s => <a key={s.id} href={s.url} target="_blank" rel="noreferrer"><strong>{s.title} <span aria-hidden="true">&gt;</span></strong><small>Published {s.publication_date} / retrieved {s.retrieval_date}</small><span>{s.notes}</span></a>)}</div>}
    <div className="gap-list"><span className="section-label">RESEARCH GAPS</span>{[...(mechanism?.research_gaps ?? []), ...(isEvidence ? definitions.limitations : []), ...(country?.research_gaps ?? [])].map(g => <p key={g}>{g}</p>)}</div>
  </aside></div>;
}

export default App;
