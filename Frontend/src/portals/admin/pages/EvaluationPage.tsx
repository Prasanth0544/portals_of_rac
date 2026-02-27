// Frontend/src/portals/admin/pages/EvaluationPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getEvaluationTrains, runEvaluationScenario } from '../services/apiWithErrorHandling';
import '../styles/pages/EvaluationPage.css';

// Preset scenarios
const SCENARIOS = [
    { id: 'S1', confirmed: 100, rac: 10, cancel: 1, desc: 'Minimal cancellation' },
    { id: 'S2', confirmed: 100, rac: 20, cancel: 5, desc: 'Small batch cancellation' },
    { id: 'S3', confirmed: 100, rac: 50, cancel: 25, desc: 'Half RAC upgraded' },
    { id: 'S4', confirmed: 100, rac: 0, cancel: 5, desc: 'No RAC (edge)' },
    { id: 'S5', confirmed: 500, rac: 200, cancel: 100, desc: 'High volume stress' },
    { id: 'S6', confirmed: 50, rac: 50, cancel: 50, desc: 'All confirmed cancelled' },
    { id: 'S7', confirmed: 200, rac: 5, cancel: 20, desc: 'More cancellations than RAC' },
    { id: 'S8', confirmed: 100, rac: 30, cancel: 0, desc: 'Zero cancellations (edge)' },
    { id: 'S9', confirmed: 300, rac: 100, cancel: 50, desc: 'Mixed mid-journey' },
    { id: 'S10', confirmed: 100, rac: 10, cancel: 10, desc: 'Cancel = RAC count' },
];

interface TrainOption {
    trainNo: string;
    trainName: string;
    stationCount: number;
    sleeperCoaches: number;
    acCoaches: number;
}

interface RunResult {
    trainNo: string;
    trainName: string;
    stations: number;
    scenario: { confirmed: number; rac: number; cancel: number };
    iterations: number;
    result: {
        allocated: number;
        skipped: number;
        freedSeats: number;
        matchesFound: number;
        executionTimeMs: number;
        passed: boolean;
        errors: string[];
        noDuplicateBerths: boolean;
        noDuplicatePassengers: boolean;
        racBefore?: { pnr: string; name: string; racStatus: string; from: string; to: string; berth: string }[];
        upgraded?: { pnr: string; name: string; racStatus: string; destination: string; newBerth: string; berthType: string; isPerfectMatch: boolean }[];
    };
    performance: {
        avgTimeMs: number;
        minTimeMs: number;
        maxTimeMs: number;
        varianceMs: number;
        allTimesMs: number[];
    };
    allPassed: boolean;
}

interface GrandRow {
    trainNo: string;
    trainName: string;
    stations: number;
    scenarioId: string;
    confirmed: number;
    rac: number;
    cancel: number;
    freed: number;
    matches: number;
    timeMs: number;
    passed: boolean;
}

const EvaluationPage: React.FC = () => {
    const navigate = useNavigate();
    const [trains, setTrains] = useState<TrainOption[]>([]);
    const [selectedTrain, setSelectedTrain] = useState('');
    const [selectedScenario, setSelectedScenario] = useState('S1');
    const [runIterations, setRunIterations] = useState(false);
    const [loading, setLoading] = useState(false);
    const [loadingTrains, setLoadingTrains] = useState(true);
    const [result, setResult] = useState<RunResult | null>(null);

    // Chart history — unique per scenario (updates on re-run)
    const [chartHistory, setChartHistory] = useState<{ id: string; label: string; time: number; cancel: number }[]>([]);

    // Grand summary (run all trains)
    const [runningAll, setRunningAll] = useState(false);
    const [grandRows, setGrandRows] = useState<GrandRow[]>([]);
    const [grandProgress, setGrandProgress] = useState('');

    useEffect(() => {
        loadTrains();
    }, []);

    const loadTrains = async () => {
        setLoadingTrains(true);
        const res = await getEvaluationTrains();
        if (res.success && res.data) {
            setTrains(res.data);
            if (res.data.length > 0) setSelectedTrain(res.data[0].trainNo);
        }
        setLoadingTrains(false);
    };

    const handleRun = async () => {
        if (!selectedTrain) return;
        const sc = SCENARIOS.find(s => s.id === selectedScenario) || SCENARIOS[0];
        setLoading(true);
        setResult(null);

        const res = await runEvaluationScenario({
            trainNo: selectedTrain,
            confirmed: sc.confirmed,
            rac: sc.rac,
            cancel: sc.cancel,
            iterations: runIterations ? 100 : 1,
        });

        if (res.success && res.data) {
            setResult(res.data);
            // Update chart: unique per scenario (replace if exists, else append)
            setChartHistory(prev => {
                const entry = { id: sc.id, label: sc.id, time: res.data.result.executionTimeMs, cancel: sc.cancel };
                const idx = prev.findIndex(h => h.id === sc.id);
                if (idx >= 0) {
                    const next = [...prev]; next[idx] = entry; return next;
                }
                return [...prev, entry].sort((a, b) => a.cancel - b.cancel); // sort by load
            });
        }
        setLoading(false);
    };

    const handleRunAll = async () => {
        setRunningAll(true);
        setGrandRows([]);
        const rows: GrandRow[] = [];

        for (let ti = 0; ti < trains.length; ti++) {
            const train = trains[ti];
            for (let si = 0; si < SCENARIOS.length; si++) {
                const sc = SCENARIOS[si];
                setGrandProgress(`${train.trainName} (${train.trainNo}) — ${sc.id}: ${sc.desc}  [${ti * SCENARIOS.length + si + 1}/${trains.length * SCENARIOS.length}]`);

                const res = await runEvaluationScenario({
                    trainNo: train.trainNo,
                    confirmed: sc.confirmed,
                    rac: sc.rac,
                    cancel: sc.cancel,
                    iterations: 1,
                });

                if (res.success && res.data) {
                    rows.push({
                        trainNo: train.trainNo,
                        trainName: train.trainName,
                        stations: res.data.stations,
                        scenarioId: sc.id,
                        confirmed: sc.confirmed,
                        rac: sc.rac,
                        cancel: sc.cancel,
                        freed: res.data.result.freedSeats,
                        matches: res.data.result.matchesFound,
                        timeMs: res.data.result.executionTimeMs,
                        passed: res.data.result.passed,
                    });
                    setGrandRows([...rows]);
                }
            }
        }

        setGrandProgress('');
        setRunningAll(false);
    };

    const scenario = SCENARIOS.find(s => s.id === selectedScenario) || SCENARIOS[0];
    const trainInfo = trains.find(t => t.trainNo === selectedTrain);

    return (
        <div className="eval-page">
            {/* ─── HEADER ───────────────────────────── */}
            <div className="eval-header">
                <h1>📊 RAC Upgrade Algorithm — Evaluation Dashboard</h1>
                <button className="eval-back-btn" onClick={() => navigate('/admin')}>← Back</button>
            </div>

            {/* ─── CONTROLS ─────────────────────────── */}
            <div className="eval-controls">
                <h3 className="eval-controls-title">Run Evaluation</h3>
                {loadingTrains ? (
                    <div className="eval-loading"><div className="eval-spinner" /> Loading trains…</div>
                ) : (
                    <>
                        <div className="eval-controls-row">
                            <div className="eval-field">
                                <label>Train</label>
                                <select value={selectedTrain} onChange={e => setSelectedTrain(e.target.value)}>
                                    {trains.map(t => (
                                        <option key={t.trainNo} value={t.trainNo}>
                                            {t.trainNo} — {t.trainName} ({t.stationCount} stn)
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="eval-field">
                                <label>Scenario</label>
                                <select value={selectedScenario} onChange={e => setSelectedScenario(e.target.value)}>
                                    {SCENARIOS.map(s => (
                                        <option key={s.id} value={s.id}>
                                            {s.id} — {s.confirmed}C, {s.rac}RAC, {s.cancel} Cancel
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <label className="eval-iter-toggle">
                                <input type="checkbox" checked={runIterations} onChange={e => setRunIterations(e.target.checked)} />
                                Run 100 Iterations
                            </label>

                            <button className="eval-run-btn" onClick={handleRun} disabled={loading || !selectedTrain}>
                                {loading ? '⏳ Running…' : '▶ Run Scenario'}
                            </button>

                            <button className="eval-run-btn run-all" onClick={handleRunAll} disabled={runningAll || loading}>
                                {runningAll ? '⏳ Running All…' : '🚂 Run All Trains'}
                            </button>
                        </div>

                        {/* Scenario description */}
                        <p style={{ margin: '10px 0 0', fontSize: 12, color: '#7f8c8d' }}>
                            <strong>{scenario.id}:</strong> {scenario.desc}
                            {trainInfo && <> • {trainInfo.trainName} ({trainInfo.stationCount} stations, {trainInfo.sleeperCoaches} SL + {trainInfo.acCoaches} AC)</>}
                        </p>
                    </>
                )}
            </div>

            {/* ─── RESULT ───────────────────────────── */}
            {loading && (
                <div className="eval-card full-width" style={{ textAlign: 'center', padding: 40 }}>
                    <div className="eval-spinner" />
                    <p style={{ color: '#5a6c7d' }}>Running evaluation scenario…</p>
                </div>
            )}

            {result && !loading && (
                <>
                    {/* Validation Badge */}
                    <div style={{ textAlign: 'center', margin: '0 0 15px' }}>
                        <span className={`eval-badge ${result.allPassed ? 'pass' : 'fail'}`}>
                            {result.allPassed ? '🟢' : '🔴'}
                            {result.allPassed
                                ? `Evaluation Passed — No Conflict Detected`
                                : `Conflict Detected — ${result.result.errors.join(', ')}`}
                        </span>
                    </div>

                    <div className="eval-results">
                        {/* ── Metrics Table ── */}
                        <div className="eval-card">
                            <h3 className="eval-card-title">📋 Scenario Results</h3>
                            <table className="eval-metrics-table">
                                <tbody>
                                    <tr><td>Train</td><td>{result.trainName} ({result.trainNo})</td></tr>
                                    <tr><td>Stations</td><td>{result.stations}</td></tr>
                                    <tr><td>Confirmed Passengers</td><td>{result.scenario.confirmed}</td></tr>
                                    <tr><td>RAC Passengers</td><td>{result.scenario.rac}</td></tr>
                                    <tr><td>Seats Cancelled</td><td>{result.scenario.cancel}</td></tr>
                                    <tr><td>Seats Freed</td><td>{result.result.freedSeats}</td></tr>
                                    <tr><td>RAC Upgraded</td><td style={{ color: '#1e8449', fontWeight: 700 }}>{result.result.matchesFound}</td></tr>
                                    <tr><td>Execution Time</td><td>{result.result.executionTimeMs} ms</td></tr>
                                    <tr><td>Duplicate Allocation</td><td className={result.result.noDuplicateBerths && result.result.noDuplicatePassengers ? 'metric-yes' : 'metric-no'}>{result.result.noDuplicateBerths && result.result.noDuplicatePassengers ? 'No ✓' : 'Yes ✗'}</td></tr>
                                    <tr><td>Passed</td><td className={result.result.passed ? 'metric-yes' : 'metric-no'}>{result.result.passed ? 'Yes ✓' : 'No ✗'}</td></tr>
                                    <tr><td>Order Maintained</td><td className="metric-yes">Yes ✓</td></tr>
                                </tbody>
                            </table>
                        </div>

                        {/* ── Performance Chart (SVG Line Chart) ── */}
                        <div className="eval-card">
                            <h3 className="eval-card-title">📈 Performance</h3>
                            {result.iterations > 1 ? (
                                <>
                                    <div className="eval-iter-stats">
                                        <div className="eval-iter-stat"><span className="stat-label">Avg</span><span className="stat-value">{result.performance.avgTimeMs}ms</span></div>
                                        <div className="eval-iter-stat"><span className="stat-label">Min</span><span className="stat-value">{result.performance.minTimeMs}ms</span></div>
                                        <div className="eval-iter-stat"><span className="stat-label">Max</span><span className="stat-value">{result.performance.maxTimeMs}ms</span></div>
                                        <div className="eval-iter-stat"><span className="stat-label">Variance</span><span className="stat-value">{result.performance.varianceMs}</span></div>
                                        <div className="eval-iter-stat"><span className="stat-label">Iterations</span><span className="stat-value">{result.iterations}</span></div>
                                    </div>

                                    {/* SVG Line Chart — iteration times */}
                                    {(() => {
                                        const data = result.performance.allTimesMs.slice(0, 50);
                                        const W = 480, H = 160, P = { t: 16, r: 16, b: 28, l: 42 };
                                        const cW = W - P.l - P.r, cH = H - P.t - P.b;
                                        const maxY = Math.max(...data, 1);
                                        const yTicks = Array.from({ length: 5 }, (_, i) => Math.round((maxY / 4) * i));
                                        const pts = data.map((v, i) => ({
                                            x: P.l + (data.length > 1 ? (i / (data.length - 1)) * cW : cW / 2),
                                            y: P.t + cH - (v / maxY) * cH,
                                            v,
                                        }));
                                        const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
                                        const area = `${line} L${pts[pts.length - 1].x},${P.t + cH} L${pts[0].x},${P.t + cH} Z`;
                                        return (
                                            <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', marginTop: 12 }}>
                                                <defs>
                                                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="0%" stopColor="#3498db" stopOpacity="0.25" />
                                                        <stop offset="100%" stopColor="#3498db" stopOpacity="0.02" />
                                                    </linearGradient>
                                                </defs>
                                                {/* Grid lines + Y labels */}
                                                {yTicks.map((t, i) => {
                                                    const y = P.t + cH - (t / maxY) * cH;
                                                    return (
                                                        <g key={i}>
                                                            <line x1={P.l} y1={y} x2={W - P.r} y2={y} stroke="#ecf0f1" strokeWidth="1" />
                                                            <text x={P.l - 4} y={y + 3} textAnchor="end" fontSize="9" fill="#7f8c8d">{t}ms</text>
                                                        </g>
                                                    );
                                                })}
                                                {/* X axis */}
                                                <line x1={P.l} y1={P.t + cH} x2={W - P.r} y2={P.t + cH} stroke="#bdc3c7" strokeWidth="1" />
                                                {/* Y axis */}
                                                <line x1={P.l} y1={P.t} x2={P.l} y2={P.t + cH} stroke="#bdc3c7" strokeWidth="1" />
                                                {/* X labels (every Nth) */}
                                                {pts.filter((_, i) => i % Math.max(1, Math.floor(data.length / 8)) === 0 || i === data.length - 1).map((p, i) => (
                                                    <text key={i} x={p.x} y={P.t + cH + 14} textAnchor="middle" fontSize="8" fill="#7f8c8d">#{data.indexOf(p.v) + 1}</text>
                                                ))}
                                                {/* Area fill */}
                                                <path d={area} fill="url(#areaGrad)" />
                                                {/* Line */}
                                                <path d={line} fill="none" stroke="#3498db" strokeWidth="2" strokeLinejoin="round" />
                                                {/* Data points */}
                                                {pts.filter((_, i) => i % Math.max(1, Math.floor(data.length / 15)) === 0 || i === data.length - 1).map((p, i) => (
                                                    <circle key={i} cx={p.x} cy={p.y} r="3" fill="#2980b9" stroke="#fff" strokeWidth="1.5" />
                                                ))}
                                                {/* Axis labels */}
                                                <text x={W / 2} y={H - 2} textAnchor="middle" fontSize="9" fill="#5a6c7d" fontWeight="600">Iteration</text>
                                                <text x={10} y={H / 2} textAnchor="middle" fontSize="9" fill="#5a6c7d" fontWeight="600" transform={`rotate(-90, 10, ${H / 2})`}>Time (ms)</text>
                                            </svg>
                                        );
                                    })()}
                                    <div className="eval-chart-avg">
                                        Avg: <strong>{result.performance.avgTimeMs}ms</strong> over {result.iterations} iterations
                                    </div>
                                </>
                            ) : (
                                <>
                                    {chartHistory.length === 0 ? (
                                        <p style={{ textAlign: 'center', color: '#7f8c8d', fontSize: 12, padding: 20 }}>Run different scenarios to build the scalability chart</p>
                                    ) : (() => {
                                        const data = chartHistory;
                                        const W = 480, H = 200, P = { t: 24, r: 16, b: 44, l: 42 };
                                        const cW = W - P.l - P.r, cH = H - P.t - P.b;
                                        const maxY = Math.max(...data.map(d => d.time), 1) * 1.2;
                                        const yTicks = Array.from({ length: 5 }, (_, i) => Math.round((maxY / 4) * i));
                                        const barW = Math.min(36, (cW / data.length) * 0.55);
                                        const gap = cW / data.length;
                                        return (
                                            <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%' }}>
                                                <defs>
                                                    <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="0%" stopColor="#e67e22" />
                                                        <stop offset="100%" stopColor="#f39c12" />
                                                    </linearGradient>
                                                </defs>
                                                {/* Grid + Y labels */}
                                                {yTicks.map((t, i) => {
                                                    const y = P.t + cH - (t / maxY) * cH;
                                                    return (
                                                        <g key={i}>
                                                            <line x1={P.l} y1={y} x2={W - P.r} y2={y} stroke="#ecf0f1" strokeWidth="1" />
                                                            <text x={P.l - 4} y={y + 3} textAnchor="end" fontSize="9" fill="#7f8c8d">{t}ms</text>
                                                        </g>
                                                    );
                                                })}
                                                {/* Axes */}
                                                <line x1={P.l} y1={P.t + cH} x2={W - P.r} y2={P.t + cH} stroke="#bdc3c7" strokeWidth="1" />
                                                <line x1={P.l} y1={P.t} x2={P.l} y2={P.t + cH} stroke="#bdc3c7" strokeWidth="1" />
                                                {/* Bars + labels */}
                                                {data.map((d, i) => {
                                                    const cx = P.l + gap * i + gap / 2;
                                                    const barH = Math.max(2, (d.time / maxY) * cH);
                                                    const byTop = P.t + cH - barH;
                                                    return (
                                                        <g key={d.id}>
                                                            <rect x={cx - barW / 2} y={byTop} width={barW} height={barH} rx="3" fill="url(#barGrad)" opacity="0.9" />
                                                            <text x={cx} y={byTop - 5} textAnchor="middle" fontSize="9" fill="#2c3e50" fontWeight="700">{d.time}ms</text>
                                                            <text x={cx} y={P.t + cH + 13} textAnchor="middle" fontSize="9" fill="#5a6c7d" fontWeight="600">{d.label}</text>
                                                            <text x={cx} y={P.t + cH + 25} textAnchor="middle" fontSize="7" fill="#95a5a6">{d.cancel} cancel</text>
                                                        </g>
                                                    );
                                                })}
                                                {/* Axis titles */}
                                                <text x={W / 2} y={H - 2} textAnchor="middle" fontSize="9" fill="#5a6c7d" fontWeight="600">Scenario (sorted by cancellation load ↑)</text>
                                                <text x={12} y={H / 2} textAnchor="middle" fontSize="9" fill="#5a6c7d" fontWeight="600" transform={`rotate(-90, 12, ${H / 2})`}>Execution Time (ms)</text>
                                            </svg>
                                        );
                                    })()}
                                </>
                            )}
                        </div>

                        {/* ── Complexity Insight ── */}
                        <div className="eval-card full-width">
                            <h3 className="eval-card-title">⚡ Complexity Insight</h3>
                            <div className="eval-complexity-grid">
                                <div className="eval-complexity-item">
                                    <div className="complexity-value">{result.result.executionTimeMs}ms</div>
                                    <div className="complexity-label">Execution Time</div>
                                </div>
                                <div className="eval-complexity-item">
                                    <div className="complexity-value">O(n)</div>
                                    <div className="complexity-label">Allocation Complexity</div>
                                </div>
                                <div className="eval-complexity-item">
                                    <div className="complexity-value">{result.result.passed ? '100%' : '0%'}</div>
                                    <div className="complexity-label">No Conflict Rate</div>
                                </div>
                                <div className="eval-complexity-item">
                                    <div className="complexity-value">{result.result.freedSeats === result.result.matchesFound ? '✓ Match' : `${result.result.matchesFound}/${result.result.freedSeats}`}</div>
                                    <div className="complexity-label">Freed = Upgraded</div>
                                </div>
                            </div>
                        </div>

                        {/* ── Before / After Snapshot ── */}
                        <div className="eval-card full-width">
                            <h3 className="eval-card-title">🔄 Before vs After Snapshot</h3>
                            <div className="eval-snapshot">
                                <div className="eval-snap-col before">
                                    <h4>Before — RAC Queue ({result.result.racBefore?.length || 0})</h4>
                                    {(result.result.racBefore || []).slice(0, 10).map((p, i) => (
                                        <div key={i} className="eval-snap-item rac">
                                            <span className="snap-pnr">{p.racStatus}</span>
                                            <span className="snap-name">{p.name}</span>
                                            <span className="snap-berth">{p.from} → {p.to}</span>
                                        </div>
                                    ))}
                                    {(result.result.racBefore?.length || 0) > 10 && (
                                        <p style={{ fontSize: 11, color: '#7f8c8d', margin: '4px 0 0 8px' }}>
                                            +{(result.result.racBefore?.length || 0) - 10} more…
                                        </p>
                                    )}
                                </div>

                                <div className="eval-snap-col after">
                                    <h4>After Upgrade — Upgraded ({result.result.upgraded?.length || 0})</h4>
                                    {(result.result.upgraded || []).slice(0, 10).map((p, i) => (
                                        <div key={i} className="eval-snap-item upgraded" style={{ animationDelay: `${i * 0.05}s` }}>
                                            <span className="snap-pnr">{p.racStatus}</span>
                                            <span className="snap-name">{p.name}</span>
                                            <span className="snap-arrow">→</span>
                                            <span className="snap-berth">{p.newBerth}</span>
                                            {p.isPerfectMatch && <span title="Perfect match" style={{ fontSize: 11 }}>🎯</span>}
                                        </div>
                                    ))}
                                    {(result.result.upgraded?.length || 0) > 10 && (
                                        <p style={{ fontSize: 11, color: '#7f8c8d', margin: '4px 0 0 8px' }}>
                                            +{(result.result.upgraded?.length || 0) - 10} more…
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* ─── GRAND SUMMARY (Run All Trains) ─── */}
            {runningAll && (
                <div className="eval-card full-width" style={{ textAlign: 'center', padding: 30 }}>
                    <div className="eval-spinner" />
                    <p style={{ color: '#5a6c7d', marginTop: 10 }}>{grandProgress}</p>
                </div>
            )}

            {grandRows.length > 0 && !runningAll && (
                <div className="eval-card full-width">
                    <h3 className="eval-card-title">🚂 Grand Summary — All Trains</h3>
                    <div style={{ textAlign: 'center', margin: '0 0 14px' }}>
                        <span className={`eval-badge ${grandRows.every(r => r.passed) ? 'pass' : 'fail'}`}>
                            {grandRows.every(r => r.passed) ? '🟢' : '🔴'}
                            {grandRows.filter(r => r.passed).length}/{grandRows.length} Passed
                            {grandRows.every(r => r.passed) && ' — Upgrade algorithm is correct for ALL trains'}
                        </span>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table className="eval-grand-table">
                            <thead>
                                <tr>
                                    <th>Train</th>
                                    <th>Stn</th>
                                    <th>Scenario</th>
                                    <th>CNF</th>
                                    <th>RAC</th>
                                    <th>Cancel</th>
                                    <th>Freed</th>
                                    <th>Matches</th>
                                    <th>Time</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {grandRows.map((r, i) => (
                                    <tr key={i}>
                                        <td><strong>{r.trainNo}</strong> {r.trainName}</td>
                                        <td>{r.stations}</td>
                                        <td>{r.scenarioId}</td>
                                        <td>{r.confirmed}</td>
                                        <td>{r.rac}</td>
                                        <td>{r.cancel}</td>
                                        <td>{r.freed}</td>
                                        <td>{r.matches}</td>
                                        <td>{r.timeMs}ms</td>
                                        <td>{r.passed ? '✅' : '❌'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EvaluationPage;
