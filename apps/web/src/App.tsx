import { useEffect, useRef, useState, type KeyboardEvent, type RefObject } from 'react';
import { scaleLinear } from 'd3-scale';
import { area, line } from 'd3-shape';
import type { Country, CountryResult, Definitions, Point, Run, Scenario } from './contracts';

const format = (value: number, digits = 1) => value.toLocaleString('en-US', value !== 0 && Math.abs(value) < 10 ** -digits ? { maximumSignificantDigits: 2 } : { maximumFractionDigits: digits, minimumFractionDigits: digits });
const compact = (value: number, digits = 1) => Math.abs(value) >= 1000 ? value.toLocaleString('en-US', { notation: 'compact', maximumFractionDigits: 1 }) : format(value, digits);
const colors = { current: 'var(--cyan)', comparison: 'var(--yellow)', muted: 'var(--muted)' };
const savedKey = 'future.scenarios.v1';
type View = 'fiscal' | 'assets';
type Unit = 'real' | 'dollar' | 'bitcoin';
type Curve = { key: keyof Point; label: string; color: string; status: string; dashed?: boolean };
type AssumptionKey = 'transition_onset_month' | 'transition_duration_months' | 'real_gdp_growth' | 'collection_effectiveness' | 'real_spending_growth' | 'other_revenue_growth' | 'annual_inflation' | 'bitcoin_real_growth' | 'asset_decline';
type AssumptionField = { key: AssumptionKey; label: string; min: number; max: number; step: number; scale: number; suffix: string };
const assumptionFields: AssumptionField[] = [
  { key: 'transition_onset_month', label: 'Transition starts', min: 0, max: 120, step: 1, scale: 1, suffix: 'months' },
  { key: 'transition_duration_months', label: 'Transition duration', min: 1, max: 120, step: 1, scale: 1, suffix: 'months' },
  { key: 'collection_effectiveness', label: 'Collection after transition', min: 0, max: 100, step: 1, scale: 100, suffix: '% of cap' },
  { key: 'real_gdp_growth', label: 'Real GDP growth', min: -50, max: 100, step: 0.5, scale: 100, suffix: '% / yr' },
  { key: 'real_spending_growth', label: 'Real spending growth', min: -50, max: 100, step: 0.5, scale: 100, suffix: '% / yr' },
  { key: 'other_revenue_growth', label: 'Other revenue growth', min: -50, max: 100, step: 0.5, scale: 100, suffix: '% / yr' },
  { key: 'annual_inflation', label: 'Shared inflation', min: -50, max: 100, step: 0.5, scale: 100, suffix: '% / yr' },
  { key: 'bitcoin_real_growth', label: 'Bitcoin real growth', min: -50, max: 100, step: 1, scale: 100, suffix: '% / yr' },
  { key: 'asset_decline', label: 'Real asset decline', min: 80, max: 100, step: 1, scale: 100, suffix: '%' },
];
const sameInputs = (a: Scenario, b: Scenario) => Object.entries(a).every(([key, value]) => key === 'name' || value === b[key as keyof Scenario]);
const sameScenario = (a: Scenario, b: Scenario) => sameInputs(a, b) && a.name === b.name;
const dateLabel = (date: string) => new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
function onsetLabel(scenario: Scenario) {
  const date = new Date(`${scenario.forecast_origin}T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + scenario.transition_onset_month);
  return dateLabel(date.toISOString().slice(0, 10));
}

class RequestError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

async function request<T>(path: string, options?: RequestInit): Promise<{ data: T; etag: string | null }> {
  const response = await fetch(path, options);
  if (!response.ok) {
    const text = await response.text();
    throw new RequestError(`Model request failed (${response.status}): ${text}`, response.status);
  }
  return { data: await response.json() as T, etag: response.headers.get('ETag') };
}

async function calculate(scenario: Scenario, registry: string, signal?: AbortSignal) {
  return (await request<Run>('/api/runs', { method: 'POST', headers: { 'Content-Type': 'application/json', 'If-Match': registry }, body: JSON.stringify(scenario), signal })).data;
}

function useDialogFocus(panel: RefObject<HTMLElement | null>, open: boolean, returnFocus: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!open) return;
    const previous = returnFocus.current;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panel.current?.querySelector<HTMLElement>('button')?.focus();
    return () => { document.body.style.overflow = overflow; previous?.focus(); };
  }, [panel, open, returnFocus]);
}

function dialogKeyDown(event: KeyboardEvent<HTMLElement>, close: () => void) {
  if (event.key === 'Escape') { event.preventDefault(); close(); }
  if (event.key !== 'Tab') return;
  const focusable = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button, a, input, summary, select'))
    .filter(el => !el.hasAttribute('disabled') && el.getClientRects().length > 0);
  const index = focusable.indexOf(document.activeElement as HTMLElement);
  if (event.shiftKey && index <= 0) { event.preventDefault(); focusable.at(-1)?.focus(); }
  if (!event.shiftKey && index === focusable.length - 1) { event.preventDefault(); focusable[0]?.focus(); }
}

function App() {
  const [definitions, setDefinitions] = useState<Definitions | null>(null);
  const [registry, setRegistry] = useState('');
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [saved, setSaved] = useState<Scenario[]>([]);
  const [storageReady, setStorageReady] = useState(false);
  const [storageProblem, setStorageProblem] = useState('');
  const [run, setRun] = useState<Run | null>(null);
  const [comparison, setComparison] = useState<Run | null>(null);
  const [compareName, setCompareName] = useState('__starting');
  const [comparisonBusy, setComparisonBusy] = useState(false);
  const [countryId, setCountryId] = useState('USA');
  const [view, setView] = useState<View>('fiscal');
  const [unit, setUnit] = useState<Unit>('real');
  const [month, setMonth] = useState(120);
  const [inspected, setInspected] = useState<string | null>(null);
  const [inspectionComparison, setInspectionComparison] = useState(false);
  const [inspectionInputs, setInspectionInputs] = useState(false);
  const [error, setError] = useState<{ message: string; action?: { label: string; run: () => void } } | null>(null);
  const [busy, setBusy] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [inputsOpen, setInputsOpen] = useState(false);
  const [retry, setRetry] = useState(0);
  const [definitionsRetry, setDefinitionsRetry] = useState(0);
  const [exporting, setExporting] = useState(false);
  const controls = useRef<HTMLElement>(null);
  const inputsTrigger = useRef<HTMLButtonElement>(null);
  const inspectorReturn = useRef<HTMLElement>(null);
  const exportBusy = useRef(false);
  useDialogFocus(controls, inputsOpen, inputsTrigger);

  useEffect(() => {
    const controller = new AbortController();
    setStorageReady(false);
    request<Definitions>('/api/definitions', { signal: controller.signal }).then(({ data: d, etag }) => {
      if (!etag) throw new Error('Model definitions have no version. Reload after the API is updated.');
      if (!d.countries.length) throw new Error('The model has no countries. Review its definitions before calculating.');
      setRegistry(etag);
      setCountryId(c => d.countries.some(country => country.id === c) ? c : d.countries[0].id);
      setDefinitions(d); setScenario(s => s ?? d.default_scenario);
      try {
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
        setStorageReady(true);
        setStorageProblem('');
      } catch {
        setSaved([]);
        setStorageProblem('Saved scenarios need review. Their original data is preserved; saving is disabled.');
      }
    }).catch(e => { if (e.name !== 'AbortError') setError({ message: e.message, action: { label: 'Retry', run: () => setDefinitionsRetry(r => r + 1) } }); });
    return () => controller.abort();
  }, [definitionsRetry]);

  useEffect(() => {
    if (!definitions || !scenario) return;
    const controller = new AbortController();
    setBusy(true); setError(null);
    const timer = setTimeout(() => {
      calculate(scenario, registry, controller.signal).then(result => {
        if (!controller.signal.aborted) { setRun(result); setBusy(false); }
      }).catch(e => { if (e.name !== 'AbortError') { modelError(e); setBusy(false); } });
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [scenario, retry, registry, definitions]);

  const comparisonScenario = compareName === '__starting' ? definitions?.default_scenario : saved[Number(compareName.slice(6))];
  const comparisonNeeded = Boolean(compareName && (!comparisonScenario || scenario && !sameInputs(comparisonScenario, scenario)));

  useEffect(() => {
    setComparison(null); setComparisonBusy(false);
    if (!compareName || !definitions || !comparisonNeeded) return;
    const selected = compareName === '__starting' ? definitions.default_scenario : saved[Number(compareName.slice(6))];
    if (!selected) { setError({ message: 'Comparison scenario is missing.' }); return; }
    if (selected.forecast_origin !== scenario?.forecast_origin) {
      setError({ message: 'Comparison scenarios must have the same forecast origin.' }); return;
    }
    const controller = new AbortController();
    setComparisonBusy(true);
    calculate(selected, registry, controller.signal).then(result => {
      if (!controller.signal.aborted) { setComparison(result); setComparisonBusy(false); }
    }).catch(e => { if (e.name !== 'AbortError') { modelError(e); setComparisonBusy(false); } });
    return () => controller.abort();
  }, [compareName, definitions, saved, retry, registry, scenario?.forecast_origin, comparisonNeeded]);

  const current = run?.countries.find(c => c.country_id === countryId);
  const compared = comparisonNeeded ? comparison?.countries.find(c => c.country_id === countryId) : undefined;
  const country = definitions?.countries.find(c => c.id === countryId);
  const point = current?.points[month];
  const stale = busy || (run !== null && scenario !== null && !sameScenario(run.scenario, scenario));
  const comparisonPending = comparisonNeeded && (comparisonBusy || comparison === null);
  const savedIndex = scenario ? saved.findIndex(s => sameScenario(s, scenario)) : -1;
  const selectedInputs = savedIndex >= 0 ? `saved:${savedIndex}`
    : scenario && definitions && sameScenario(scenario, definitions.default_scenario) ? '__starting' : '__draft';

  function update(key: keyof Scenario, value: number) {
    if (scenario) setScenario({ ...scenario, [key]: value });
  }

  function inspect(id: string | null, fromComparison = false, fromInputs = false) {
    inspectorReturn.current = inputsOpen ? inputsTrigger.current : document.activeElement as HTMLElement;
    setInputsOpen(false); setInspectionComparison(fromComparison); setInspectionInputs(fromInputs); setInspected(id);
  }

  function reloadDefinitions() {
    setInputsOpen(false); setInspected(null);
    setRun(null); setComparison(null); setDefinitions(null); setError(null);
    setDefinitionsRetry(r => r + 1);
  }

  function modelError(failure: Error) {
    const changed = failure instanceof RequestError && failure.status === 412;
    setError({ message: failure.message, action: { label: changed ? 'Reload definitions' : 'Retry', run: changed ? reloadDefinitions : () => setRetry(r => r + 1) } });
  }

  function save() {
    if (!scenario || !saveName.trim() || !storageReady) return;
    if (saved.some(s => s.name === saveName.trim())) { setError({ message: 'A scenario with this name already exists. Choose a new name.' }); return; }
    const named = { ...scenario, name: saveName.trim() };
    const next = [...saved, named];
    try {
      localStorage.setItem(savedKey, JSON.stringify(next));
      setSaved(next); setScenario(named); setSaveName(''); setSaving(false); setNotice('Scenario saved on this browser.');
    } catch { setError({ message: 'Browser storage could not save the scenario. Download its inputs to preserve it.' }); }
  }

  async function download(format: 'csv' | 'xlsx' | 'json') {
    if (!run || stale || comparisonPending || exportBusy.current) return;
    exportBusy.current = true; setExporting(true);
    try {
      const blob = format === 'json' ? new Blob([JSON.stringify(run.scenario, null, 2)], { type: 'application/json' })
        : await fetch(`/api/runs/${run.run_id}/export?format=${format}${comparisonNeeded && comparison ? `&comparison_run_id=${comparison.run_id}` : ''}`).then(r => {
          if (!r.ok) throw new Error(`Export failed (${r.status}).`);
          return r.blob();
        });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob); link.download = `future-${run.run_id}.${format}`; link.click();
      URL.revokeObjectURL(link.href);
    } catch (e) { setError({ message: e instanceof Error ? e.message : 'Export failed.', action: { label: 'Retry', run: () => download(format) } }); }
    finally { exportBusy.current = false; setExporting(false); }
  }

  const errorBanner = error && <div className="error" role="alert" inert={Boolean(inspected)}><span>{error.message}</span><div>{error.action && <button onClick={() => { setError(null); error.action!.run(); }}>{error.action.label}</button>}<button onClick={() => setError(null)} aria-label="Dismiss error">Close</button></div></div>;

  const quickKeys: AssumptionKey[] = view === 'fiscal'
    ? ['transition_onset_month', 'transition_duration_months', 'collection_effectiveness']
    : ['transition_onset_month', 'asset_decline', 'bitcoin_real_growth'];

  return <div className="app">
    <header className="site-header" inert={inputsOpen || Boolean(inspected)}>
      <a className="wordmark" href="/" aria-label="future home">future<span className="wordmark-dot">.</span></a>
      <div className="view-switch" role="group" aria-label="Visualization">
        <button aria-pressed={view === 'fiscal'} onClick={() => setView('fiscal')}>Government funding</button>
        <button aria-pressed={view === 'assets'} onClick={() => setView('assets')}>Asset prices</button>
      </div>
      <div className="header-actions"><button ref={inputsTrigger} className="inputs-button" onClick={() => setInputsOpen(true)} aria-expanded={inputsOpen} aria-controls="scenario-inputs">Assumptions</button><button onClick={() => inspect('evidence')}>Model</button></div>
    </header>
    {!inputsOpen && errorBanner}
    {!definitions || !scenario ? <main className="loading"><p>{error ? 'Could not load the model.' : 'Loading the model...'}</p></main> : <>
      <main className="canvas" inert={inputsOpen || Boolean(inspected)}>
        <h1 className="sr-only">{view === 'fiscal' ? 'Government funding' : 'Asset prices'}</h1>
        <div className="context-row">
          <label className="country-selector"><span className="sr-only">Selected country</span><select aria-label="Selected country" value={countryId} onChange={e => setCountryId(e.target.value)}>{definitions.countries.map(c => <option value={c.id} key={c.id}>{c.name}</option>)}</select></label>
          <span className="scenario-label">Exploratory</span>
          <span className="run-status" role="status">{busy ? 'Updating / previous result' : stale ? 'Previous result' : comparisonBusy ? 'Comparing...' : run ? '' : 'Calculating...'}</span>
          <button className="baseline-link" onClick={() => inspect('evidence')}>{country?.baseline ? `${country.baseline.year} baseline` : 'Data gap'}</button>
        </div>
        {view === 'assets' && <div className="unit-switch" role="group" aria-label="Asset measurement unit">{(['real', 'dollar', 'bitcoin'] as Unit[]).map(u => <button key={u} aria-pressed={u === unit} onClick={() => setUnit(u)}>{u === 'real' ? 'Purchasing power' : u === 'dollar' ? 'Dollar index' : 'Bitcoin index'}</button>)}</div>}
        <section className={`chart-section ${stale ? 'stale' : ''}`} aria-label="Trajectory">
          {current && (view === 'assets' || current.baseline !== null) ? <Trajectory current={current} comparison={compared} comparisonLabel={compareName === '__starting' ? 'Starting scenario' : 'Comparison'} scenario={run!.scenario} view={view} unit={unit} month={month} onMonth={setMonth} onInspect={inspect} /> : <div className="empty-chart"><div className="empty-grid" aria-hidden="true" /><p>{current ? 'Fiscal data needs review.' : error ? 'Calculation failed.' : 'Calculating...'}</p>{current && <button onClick={() => setView('assets')}>View asset prices &gt;</button>}</div>}
        </section>
        <div className="quick-assumptions" aria-label="Assumed inputs">{!inputsOpen && assumptionFields.filter(f => quickKeys.includes(f.key)).map(f => <AssumptionSlider key={f.key} field={f} scenario={scenario} onChange={update} />)}</div>
        <div className="chart-bottom">
          <span>{view === 'fiscal' ? 'Annualized real units / starting GDP = 100' : 'Index / starting value = 100'}</span>
          <div className="exports" aria-busy={exporting}><button disabled={!run || stale || comparisonPending || exporting} onClick={() => download('csv')}>CSV</button><button disabled={!run || stale || comparisonPending || exporting} onClick={() => download('xlsx')}>Excel</button><button disabled={!run || stale || comparisonPending || exporting} onClick={() => download('json')}>Inputs JSON</button></div>
        </div>
        {view === 'fiscal' && <details className="countries-detail"><summary>Compare countries <span>% GDP unfunded / year 10</span></summary><Comparison countries={definitions.countries} results={run?.countries ?? []} comparison={comparisonNeeded ? comparison?.countries ?? [] : []} selected={countryId} onSelect={setCountryId} /><p className="footnote">Baseline years and government coverage differ. EU includes member countries.</p></details>}
      </main>
      {inputsOpen && <div className="inputs-backdrop" onClick={() => setInputsOpen(false)}><aside id="scenario-inputs" ref={controls} className="controls" role="dialog" aria-modal="true" aria-labelledby="inputs-title" onClick={e => e.stopPropagation()} onKeyDown={e => dialogKeyDown(e, () => setInputsOpen(false))}>
        <div className="panel-heading"><h2 id="inputs-title">Assumptions</h2><button className="inputs-close" onClick={() => setInputsOpen(false)} aria-label="Close assumptions">Done</button></div>
        {errorBanner}
        <label className="field-label" htmlFor="scenario-select">Scenario</label>
        <select id="scenario-select" value={selectedInputs} onChange={e => {
          const selected = e.target.value === '__starting' ? definitions.default_scenario : saved[Number(e.target.value.slice(6))];
          if (selected) { setScenario({ ...selected }); setNotice(''); }
        }}><option value="__starting">Starting scenario</option>{selectedInputs === '__draft' && <option value="__draft" disabled>Edited inputs</option>}{saved.map((s, i) => <option key={s.name} value={`saved:${i}`}>{s.name}</option>)}</select>
        <div className="scenario-actions"><button disabled={!storageReady} onClick={() => setSaving(!saving)}>Save scenario</button><button onClick={() => { setScenario({ ...definitions.default_scenario }); setNotice('Starting inputs restored.'); }}>Reset</button></div>
        {saving && <form className="save-form" onSubmit={e => { e.preventDefault(); save(); }}><label className="field-label" htmlFor="save-name">Name</label><input id="save-name" value={saveName} maxLength={200} dir="auto" onChange={e => setSaveName(e.target.value)} required autoFocus placeholder="Scenario name" /><button className="primary-button" type="submit">Save</button></form>}
        {storageProblem && <p className="notice" role="alert">{storageProblem}</p>}
        {notice && <p className="notice" role="status">{notice}</p>}
        <label className="field-label" htmlFor="comparison-select">Compare with</label>
        <select id="comparison-select" value={compareName} onChange={e => setCompareName(e.target.value)}><option value="__starting">Starting scenario / automatic</option><option value="">No comparison</option>{saved.map((s, i) => <option key={s.name} value={`saved:${i}`}>{s.name}</option>)}</select>
        <div className="rule" />
        <span className="section-label">EXPLORATORY INPUTS</span>
        {assumptionFields.map(f => <AssumptionSlider key={f.key} field={f} scenario={scenario} onChange={update} />)}
        <button className="text-link" onClick={() => inspect('evidence', false, true)}>Core scenario and evidence &gt;</button>
      </aside></div>}
      {inspected && <Inspector id={inspected} definitions={definitions} country={country} point={inspectionInputs ? undefined : inspectionComparison ? compared?.points[month] : point} scenario={inspectionComparison && comparison ? comparison.scenario : inspectionInputs || !run ? scenario : run.scenario} comparison={inspectionComparison} inputs={inspectionInputs} returnFocus={inspectorReturn} onSelect={setInspected} onClose={() => setInspected(null)} />}
    </>}
  </div>;
}

function AssumptionSlider({ field, scenario, onChange }: { field: AssumptionField; scenario: Scenario; onChange: (key: AssumptionKey, value: number) => void }) {
  const months = field.key === 'transition_onset_month' || field.key === 'transition_duration_months';
  const duration = scenario.transition_duration_months;
  const durationLabel = duration % 12 === 0 ? `${duration / 12} ${duration === 12 ? 'year' : 'years'}` : `${duration} ${duration === 1 ? 'month' : 'months'}`;
  const displayValue = field.key === 'transition_onset_month' ? onsetLabel(scenario) : field.key === 'transition_duration_months' ? durationLabel : undefined;
  return <Slider name={field.label} value={scenario[field.key] * field.scale} min={field.min} max={field.max} step={field.step} suffix={months ? '' : field.suffix} displayValue={displayValue} onChange={v => onChange(field.key, months ? Math.round(v / field.scale) : v / field.scale)} />;
}

function Slider({ name, value, min, max, step, suffix, displayValue, onChange }: { name: string; value: number; min: number; max: number; step: number; suffix: string; displayValue?: string; onChange: (v: number) => void }) {
  return <label className="slider-field"><span>{name}<output>{displayValue ?? value.toLocaleString('en-US', { maximumFractionDigits: 2 })} <small>{suffix}</small></output></span><input type="range" aria-label={name} aria-valuetext={displayValue ?? `${value} ${suffix}`} value={value} min={min} max={max} step={step} onChange={e => onChange(e.currentTarget.valueAsNumber)} style={{ backgroundSize: `${(value - min) / (max - min) * 100}% 2px, 100% 2px` }} /></label>;
}

function Trajectory({ current, comparison, comparisonLabel, scenario, view, unit, month, onMonth, onInspect }: { current: CountryResult; comparison?: CountryResult; comparisonLabel: string; scenario: Scenario; view: View; unit: Unit; month: number; onMonth: (v: number) => void; onInspect: (id: string, fromComparison?: boolean) => void }) {
  const svg = useRef<SVGSVGElement>(null);
  const [width, setWidth] = useState(960);
  useEffect(() => {
    const observer = new ResizeObserver(entries => setWidth(Math.max(300, entries[0].contentRect.width)));
    observer.observe(svg.current!);
    return () => observer.disconnect();
  }, []);
  const height = width < 600 ? 230 : 350, left = 37, right = 25, top = 30, bottom = 35;
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
    <div className="trajectory-readout"><button className="main-readout" onClick={() => onInspect(inspectedId)}><span className="readout-label">{view === 'fiscal' ? 'Funding gap' : 'Stocks + property'}</span><span className="readout-value"><strong>{compact(view === 'fiscal' ? selected.funding_gap_pct_gdp! : selected[curves[0].key] as number)}</strong><span>{view === 'fiscal' ? '% of GDP' : 'index'}</span></span><small>{view === 'fiscal' ? 'Generated' : 'Assumed'} <span className="inspect-hint">Why? &gt;</span></small></button>{comparison && <button className="comparison-readout" onClick={() => onInspect(inspectedId, true)} aria-label="Inspect comparison result"><span>{comparisonLabel}</span><strong>{compact(view === 'fiscal' ? comparison.points[month].funding_gap_pct_gdp! : comparison.points[month][curves[0].key] as number)}<small>{view === 'fiscal' ? '% GDP' : 'index'}</small></strong></button>}<span className="selected-date">{dateLabel(selected.date)}</span></div>
    <svg ref={svg} className="trajectory" viewBox={`0 0 ${width} ${height}`} role="group" aria-label={`${view === 'fiscal' ? 'Planned spending, funded spending, and recurring revenue' : 'Asset prices and Bitcoin'} over ten years. Select a month to inspect its values.`}>
      <defs><pattern id="gap-hatch" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M-2,2 l4,-4 M0,8 l8,-8 M6,10 l4,-4" stroke={colors.muted} strokeOpacity="0.35" strokeWidth="1" /></pattern></defs>
      {y.ticks(5).map(t => <g key={t}><line x1={left} x2={width - right} y1={y(t)} y2={y(t)} stroke="var(--rule)" /><text x={left - 13} y={y(t) + 4} textAnchor="end" fill={colors.muted}>{compact(t, 0)}</text></g>)}
      <rect x={x(scenario.transition_onset_month)} y={top} width={Math.max(0, x(Math.min(120, scenario.transition_onset_month + scenario.transition_duration_months)) - x(scenario.transition_onset_month))} height={height - top - bottom} fill="#ffffff" fillOpacity="0.025" />
      {scenario.transition_onset_month < 110 && <text x={x(scenario.transition_onset_month) + 8} y={top - 12} fill={colors.muted}>Transition</text>}
      {view === 'fiscal' && <path d={gapArea(current.points) ?? ''} fill="url(#gap-hatch)" />}
      {comparison && comparison.points.length > 0 && <path d={lineFor(curves[view === 'fiscal' ? 1 : 0].key)(comparison.points) ?? ''} stroke={colors.comparison} strokeWidth="2" fill="none" strokeDasharray="5 5" />}
      {curves.map(c => <path key={c.key} d={lineFor(c.key)(current.points) ?? ''} fill="none" stroke={c.color} strokeWidth={c.dashed ? 1.5 : 2.5} strokeDasharray={c.dashed ? '5 5' : undefined} />)}
      {[0, 24, 48, 72, 96, 120].map(t => <text key={t} x={x(t)} y={height - 9} fill={colors.muted} textAnchor="middle">{firstYear + t / 12}</text>)}
      <line x1={x(month)} x2={x(month)} y1={top} y2={height - bottom} stroke="var(--secondary)" strokeDasharray="2 4" />
      {curves.map(c => <circle key={c.key} cx={x(month)} cy={y(selected[c.key] as number)} r="3.5" fill={c.color} stroke="#000" strokeWidth="2" />)}
      <rect x={left} y={top} width={width - left - right} height={height - top - bottom} fill="transparent" tabIndex={0} role="slider" aria-label="Inspect month" aria-valuemin={0} aria-valuemax={120} aria-valuenow={month} aria-valuetext={selected.date.slice(0, 7)} onKeyDown={e => {
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) { e.preventDefault(); onMonth(Math.max(0, Math.min(120, month + (e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -1 : 1)))); }
        if (e.key === 'Home') { e.preventDefault(); onMonth(0); }
        if (e.key === 'End') { e.preventDefault(); onMonth(120); }
        if (e.key === 'Enter') { e.preventDefault(); onInspect(inspectedId); }
      }} onPointerMove={e => {
        if (e.pointerType === 'touch') return;
        const bounds = e.currentTarget.ownerSVGElement!.getBoundingClientRect();
        onMonth(Math.max(0, Math.min(120, Math.round(x.invert((e.clientX - bounds.left) / bounds.width * width)))));
      }} onClick={e => {
        const bounds = e.currentTarget.ownerSVGElement!.getBoundingClientRect();
        if (e.detail > 0) onMonth(Math.max(0, Math.min(120, Math.round(x.invert((e.clientX - bounds.left) / bounds.width * width)))));
        onInspect(inspectedId);
      }} />
    </svg>
    <div className="month-control"><input type="range" aria-label="Inspect month" aria-valuetext={dateLabel(selected.date)} value={month} min={0} max={120} step={1} onChange={e => onMonth(e.currentTarget.valueAsNumber)} style={{ backgroundSize: `${month / 120 * 100}% 2px, 100% 2px` }} /></div>
    <div className="chart-legend">{curves.map(c => <button key={c.key} onClick={() => onInspect(c.key === 'planned_spending' ? 'spending' : c.key === 'sustainable_spending' ? 'budget' : c.key.startsWith('bitcoin_') ? 'bitcoin' : inspectedId)}><i style={{ borderColor: c.color, borderTopStyle: c.dashed ? 'dashed' : 'solid' }} />{c.label}<small>{c.status}</small></button>)}{comparison && <span className="comparison-key"><i />Comparison</span>}</div>
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

function Inspector({ id, definitions, country, point, scenario, comparison, inputs, returnFocus, onSelect, onClose }: { id: string; definitions: Definitions; country?: Country; point?: Point; scenario: Scenario; comparison: boolean; inputs: boolean; returnFocus: RefObject<HTMLElement | null>; onSelect: (id: string | null) => void; onClose: () => void }) {
  const panel = useRef<HTMLElement>(null);
  useDialogFocus(panel, true, returnFocus);
  const mechanism = definitions.mechanisms.find(m => m.id === id);
  const isEvidence = id === 'evidence';
  const sourceIds = new Set([...(mechanism?.source_ids ?? []), ...(country?.baseline?.source_ids ?? [])]);
  const relevant = isEvidence ? definitions.sources : definitions.sources.filter(s => sourceIds.has(s.id));
  const gaps = [...(mechanism?.research_gaps ?? []), ...(isEvidence ? definitions.limitations : []), ...(country?.research_gaps ?? [])];
  return <div className="inspector-backdrop" onClick={onClose}><aside ref={panel} className="inspector" role="dialog" aria-modal="true" aria-labelledby="inspector-title" onClick={e => e.stopPropagation()} onKeyDown={e => dialogKeyDown(e, onClose)}>
    <div className="inspector-top"><span className="section-label">{inputs ? 'Edited inputs' : comparison ? 'Comparison' : 'Model'}</span><button onClick={onClose} aria-label="Close inspector">Close <span aria-hidden="true">x</span></button></div>
    <span className={`badge ${mechanism?.status === 'implemented' ? 'generated' : ''}`}>{isEvidence ? `Version ${definitions.model_version} / exploratory` : mechanism?.status === 'implemented' ? 'Generated' : mechanism?.status === 'assumed' ? 'Assumed' : 'Uncalibrated'}</span>
    <h2 id="inspector-title">{isEvidence ? 'Model and evidence' : mechanism?.name}</h2>
    {isEvidence && <><p>Bitcoin dominance is assumed. Money creation and sovereign refinancing end. Compulsory revenue / GDP stays capped.</p><p>Stocks and property lose at least 80% of their purchasing-power value. Productive capacity stays separate.</p><details><summary>Not yet modeled</summary><div className="causal-inputs">{definitions.mechanisms.filter(m => m.status === 'qualitative').map(m => <button key={m.id} onClick={() => onSelect(m.id)}>{m.name}<span aria-hidden="true">&gt;</span></button>)}</div></details></>}
    {mechanism && <>
      {id === 'budget' && point?.funding_gap != null && <div className="accounting"><span>Planned spending<b>{format(point.planned_spending!)}</b></span><span>Recurring revenue<b>{format(point.sustainable_spending!)}</b></span><span>Financing<b>{format(point.financing!)}</b></span><span className="accounting-result">Funding gap<b>{format(point.funding_gap!)}</b></span><small>Annualized real units / starting GDP = 100 / {point.date.slice(0, 7)}</small></div>}
      <details><summary>How it works</summary><p>{mechanism.description}</p>{mechanism.equation && <code className="equation">{mechanism.equation}</code>}</details>
      {mechanism.inputs.length > 0 && <div className="causal-inputs"><span className="section-label">DEPENDS ON</span>{mechanism.inputs.map(input => {
        const source = definitions.mechanisms.find(m => m.id === input);
        return source ? <button key={input} onClick={() => onSelect(input)}><span>{source.name}</span><small>{source.status === 'implemented' ? 'GENERATED' : source.status.toUpperCase()}</small><span aria-hidden="true">&gt;</span></button> : <span key={input} className="input-detail">{input}</span>;
      })}</div>}
      {id === 'prices' && <p>The shared index starts at 100. Annual inflation is {format(scenario.annual_inflation * 100)}%. The measurement basis stays fixed across countries. Local living-cost differences are unmodeled.</p>}
      {id === 'tax' && <p>Collection after transition: {format(scenario.collection_effectiveness * 100)}% of the cap.</p>}
      {id === 'gdp' && <p>Real GDP growth: {format(scenario.real_gdp_growth * 100)}% per year.</p>}
      {id === 'spending' && <p>Real spending growth: {format(scenario.real_spending_growth * 100)}% per year.</p>}
      {id === 'other' && <p>Other revenue growth: {format(scenario.other_revenue_growth * 100)}% per year.</p>}
      {id === 'assets' && <p>Real asset decline after complete transition: {format(scenario.asset_decline * 100)}%.</p>}
      {id === 'bitcoin' && <p>Real purchasing-power growth is {format(scenario.bitcoin_real_growth * 100)}% per year. Bubbles and volatility are unmodeled.</p>}
      {id === 'transition' && <p>Transition begins after {format(scenario.transition_onset_month / 12)} years and lasts {format(scenario.transition_duration_months / 12)} years. Timing is an input.</p>}
    </>}
    {id === 'assets' && point && <div className="accounting"><span>Productive capacity index<b>{format(point.productive_capacity_index, 0)}</b></span><span>Real GDP index<b>{format(point.gdp_index, 0)}</b></span><small>Separate assumed indices / starting value = 100</small></div>}
    {country?.baseline && <details><summary>{country.name} / {country.baseline.year} baseline</summary><p>{country.baseline.government_scope}</p><div className="accounting"><span>Compulsory revenue / GDP<b>{format(country.baseline.compulsory_revenue_pct_gdp)}%</b></span><span>Other revenue / GDP<b>{format(country.baseline.other_revenue_pct_gdp)}%</b></span><span>Expenditure / GDP<b>{format(country.baseline.expenditure_pct_gdp)}%</b></span></div>{country.baseline.notes.map(n => <p key={n}>{n}</p>)}</details>}
    {relevant.length > 0 && <details className="source-list"><summary>Sources / {relevant.length}</summary>{relevant.map(s => <details key={s.id}><summary>{s.title}</summary><a href={s.url} target="_blank" rel="noreferrer"><strong>Open source &gt;</strong><small>{!isEvidence && `${mechanism?.source_ids.includes(s.id) ? 'Mechanism' : 'Baseline'} source / `}Published {s.publication_date} / retrieved {s.retrieval_date}</small><span>{s.notes}</span></a></details>)}</details>}
    {gaps.length > 0 && <details><summary>Research gaps / {gaps.length}</summary>{gaps.map(g => <p key={g}>{g}</p>)}</details>}
  </aside></div>;
}

export default App;
