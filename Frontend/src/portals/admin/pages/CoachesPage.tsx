// admin-portal/src/pages/CoachesPage.tsx

import React, { useState, useRef, MouseEvent } from "react";
import "../styles/pages/CoachesPage.css";

interface Passenger {
    pnr: string;
    name: string;
    age: number;
    gender: string;
    pnrStatus: string;
    Boarding_Station?: string;
    Deboarding_Station?: string;
    fromIdx?: number;
    toIdx?: number;
    boarded?: boolean;
    noShow?: boolean;
    class?: string;
    racStatus?: string;
    berthType?: string;
}

interface Berth {
    fullBerthNo: string;
    berthNo: number;
    coachNo?: string;
    type: string;
    status: string;
    passengers: Passenger[];
    segmentOccupancy?: (string | null)[] | string[][];
    segments?: (string | null)[];
}

interface Coach {
    coachNo: string;
    class: string;
    berths: Berth[];
    capacity: number;
}

interface Station {
    name: string;
    code: string;
}

interface RACQueuePassenger {
    pnr: string;
    name: string;
    coach?: string;
    seatNo?: number | string;
    fromIdx?: number;
    toIdx?: number;
    boarded?: boolean;
    noShow?: boolean;
    racStatus?: string;
}

interface TrainData {
    coaches?: Coach[];
    journeyStarted?: boolean;
    currentStationIdx?: number;
    stations?: Station[];
    racQueue?: RACQueuePassenger[];
}

interface CoachesPageProps {
    trainData: TrainData | null;
    onClose: () => void;
}

interface BerthDetailsModalProps {
    berth: Berth;
    onClose: () => void;
    currentStationIdx?: number;
    stations?: Station[];
    journeyStarted?: boolean;
    racQueue?: RACQueuePassenger[];
}

// ─────────────────────────────────────────────────────────────
// 2A Bay Layout Component
// Renders the realistic 2A coach berth layout:
//   Each "bay" = [ LB | UB ] facing [ LB | UB ]  +  [ SL | SU ] on the side
// The berths come from the DB ordered: 1-LB, 2-MB(unused in 2A), 2-UB, etc.
// We group them by bay (every 4 main + 2 side) visually.
// ─────────────────────────────────────────────────────────────
interface TwoACoachLayoutProps {
    coach: Coach;
    getBerthStatusClass: (berth: Berth) => string;
    onBerthClick: (berth: Berth) => void;
}

function TwoACoachLayout({ coach, getBerthStatusClass, onBerthClick }: TwoACoachLayoutProps): React.ReactElement {
    const berths = coach.berths;

    // Separate main berths (LB/UB) from side berths (SL/SU)
    // Backend returns: "Lower Berth", "Upper Berth", "Side Lower", "Side Upper"
    const mainBerths = berths.filter(b => b.type === "Lower Berth" || b.type === "Upper Berth");
    const sideBerths = berths.filter(b => b.type === "Side Lower" || b.type === "Side Upper");

    // Group main berths into bays of 4 (2 LB + 2 UB per bay)
    const bays: Berth[][] = [];
    for (let i = 0; i < mainBerths.length; i += 4) {
        bays.push(mainBerths.slice(i, i + 4));
    }

    const berthTypeLabel = (type: string): string => {
        switch (type) {
            case "Lower Berth": return "LB";
            case "Upper Berth": return "UB";
            case "Side Lower": return "SL";
            case "Side Upper": return "SU";
            default: return type.substring(0, 2).toUpperCase();
        }
    };

    const sideUpper = sideBerths.find(b => b.type === "Side Upper");
    const sideLower = sideBerths.find(b => b.type === "Side Lower");

    return (
        <div className="coach-2a-layout">
            {/* Train-car shell top label */}
            <div className="coach-2a-label">
                <span>🚆 {coach.coachNo}</span>
                <span className="coach-2a-badge">2A · {coach.capacity} berths</span>
            </div>

            {/* Outer coach shell */}
            <div className="coach-2a-shell">
                {/* ── Bays (main section) ── */}
                <div className="coach-2a-main">
                    {bays.map((bay, bayIdx) => {
                        // Backend 2A: berths in each bay alternate LB(odd)/UB(even)
                        const lbs = bay.filter(b => b.type === "Lower Berth");
                        const ubs = bay.filter(b => b.type === "Upper Berth");
                        const lb1 = lbs[0] || bay[0];
                        const ub1 = ubs[0] || bay[1];
                        const lb2 = lbs[1] || bay[2];
                        const ub2 = ubs[1] || bay[3];

                        return (
                            <div key={bayIdx} className="coach-2a-bay">
                                <div className="bay-number">Bay {bayIdx + 1}</div>
                                {/* Upper row */}
                                <div className="bay-row bay-upper">
                                    {[ub1, ub2].filter(Boolean).map(b => b && (
                                        <div
                                            key={b.fullBerthNo}
                                            className={`berth-2a berth-2a-upper ${getBerthStatusClass(b)}`}
                                            onClick={() => onBerthClick(b)}
                                            title={`${b.fullBerthNo} · ${berthTypeLabel(b.type)} · ${b.passengers.length} pax`}
                                        >
                                            <span className="berth-2a-num">{b.berthNo}</span>
                                            <span className="berth-2a-type">{berthTypeLabel(b.type)}</span>
                                        </div>
                                    ))}
                                </div>
                                {/* Lower row */}
                                <div className="bay-row bay-lower">
                                    {[lb1, lb2].filter(Boolean).map(b => b && (
                                        <div
                                            key={b.fullBerthNo}
                                            className={`berth-2a berth-2a-lower ${getBerthStatusClass(b)}`}
                                            onClick={() => onBerthClick(b)}
                                            title={`${b.fullBerthNo} · ${berthTypeLabel(b.type)} · ${b.passengers.length} pax`}
                                        >
                                            <span className="berth-2a-num">{b.berthNo}</span>
                                            <span className="berth-2a-type">{berthTypeLabel(b.type)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* ── Side Section ── */}
                {sideBerths.length > 0 && (
                    <div className="coach-2a-side">
                        <div className="side-label">Side</div>
                        {sideUpper && (
                            <div
                                className={`berth-2a berth-2a-side ${getBerthStatusClass(sideUpper)}`}
                                onClick={() => onBerthClick(sideUpper)}
                                title={`${sideUpper.fullBerthNo} · SU · ${sideUpper.passengers.length} pax`}
                            >
                                <span className="berth-2a-num">{sideUpper.berthNo}</span>
                                <span className="berth-2a-type">SU</span>
                            </div>
                        )}
                        {sideLower && (
                            <div
                                className={`berth-2a berth-2a-side ${getBerthStatusClass(sideLower)}`}
                                onClick={() => onBerthClick(sideLower)}
                                title={`${sideLower.fullBerthNo} · SL · ${sideLower.passengers.length} pax`}
                            >
                                <span className="berth-2a-num">{sideLower.berthNo}</span>
                                <span className="berth-2a-type">SL</span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}


import ReactDOM from 'react-dom';

// ─────────────────────────────────────────────────────────────
// Berth Details Modal (Custom Popup)
// ─────────────────────────────────────────────────────────────
function BerthDetailsModal({ berth, onClose, currentStationIdx, stations, journeyStarted, racQueue }: BerthDetailsModalProps): React.ReactElement {
    const stationIdx = currentStationIdx ?? 0;
    const berthCoachNo = berth.coachNo || berth.fullBerthNo.split('-')[0];

    const stationName = (idx?: number): string => {
        if (idx === undefined || !stations) return '—';
        return stations[idx]?.name || stations[idx]?.code || `Station ${idx + 1}`;
    };

    // ── 1. Currently on board: boarded + not deboarded yet ──
    const currentPassengers = berth.passengers.filter(p =>
        p.boarded && !p.noShow && (p.toIdx === undefined || p.toIdx > stationIdx)
    );

    // ── 2. Upcoming: NOT boarded yet AND boards at a FUTURE station ──
    const upcomingPassengers = berth.passengers.filter(p =>
        !p.boarded && !p.noShow && (p.fromIdx ?? 0) > stationIdx
    );

    // ── 3. Missed boarding: should have boarded by now but didn't ──
    const missedPassengers = berth.passengers.filter(p =>
        !p.boarded && !p.noShow && (p.fromIdx ?? 0) <= stationIdx
    );

    // ── 4. Deboarded ──
    const deboardedPassengers = berth.passengers.filter(p =>
        p.boarded && !p.noShow && p.toIdx !== undefined && p.toIdx <= stationIdx
    );

    // ── 5. No-Show ──
    const noShowPassengers = berth.passengers.filter(p => p.noShow);

    const [activeTab, setActiveTab] = React.useState<'onboard' | 'upcoming' | 'history'>('onboard');

    const totalCurrent = currentPassengers.length;
    const totalUpcoming = upcomingPassengers.length;
    const isVacantNow = totalCurrent === 0;

    // ── Dynamic status ──
    const dynamicStatus = !journeyStarted ? 'NOT_STARTED'
        : totalCurrent >= 2 ? 'SHARED'
        : totalCurrent === 1 ? 'OCCUPIED'
        : 'VACANT';

    const statusStyles: Record<string, { text: string; bg: string; color: string }> = {
        NOT_STARTED: { text: '⏸ Not Started',    bg: '#ecf0f1', color: '#7f8c8d' },
        SHARED:      { text: '🔶 RAC Shared',     bg: '#fff3e0', color: '#e65100' },
        OCCUPIED:    { text: '🔵 Occupied',        bg: '#e3f2fd', color: '#1565c0' },
        VACANT:      { text: '🟢 Vacant',          bg: '#e8f5e9', color: '#2e7d32' },
    };
    const sStyle = statusStyles[dynamicStatus];

    const getClassBadge = (cls?: string) => {
        const c = (cls || 'SL').toUpperCase();
        const colorMap: Record<string, string> = {
            SL: '#3498db', '3A': '#e67e22', '3AC': '#e67e22',
            '2A': '#8b5cf6', '2AC': '#8b5cf6',
            '1A': '#e74c3c', '1AC': '#e74c3c',
        };
        return (
            <span style={{
                background: colorMap[c] || '#95a5a6', color: '#fff',
                padding: '2px 8px', borderRadius: '10px',
                fontSize: '10px', fontWeight: 700, marginLeft: '6px'
            }}>{c}</span>
        );
    };

    const isRAC = (p: any) => p.racStatus && p.racStatus !== '-';

    const renderCard = (p: any, type: string) => {
        const configs: Record<string, { border: string; statusEl: React.ReactNode }> = {
            current:      { border: '#27ae60', statusEl: <span className="status-icon boarded">✅ On Board Now</span> },
            'rac-current':{ border: '#f39c12', statusEl: <span className="status-icon boarded">✅ RAC On Board</span> },
            upcoming:     { border: '#3498db', statusEl: <span className="status-icon waiting">⏳ Boards at {p.Boarding_Station || stationName(p.fromIdx)}</span> },
            'rac-upcoming':{ border: '#9b59b6', statusEl: <span className="status-icon waiting">⏳ RAC Boards at {p.Boarding_Station || stationName(p.fromIdx)}</span> },
            missed:       { border: '#e67e22', statusEl: <span className="status-icon" style={{background:'#fff3e0',color:'#e65100'}}>⚠️ Missed Boarding at {p.Boarding_Station || stationName(p.fromIdx)}</span> },
            deboarded:    { border: '#95a5a6', statusEl: <span className="status-icon" style={{background:'#ecf0f1',color:'#7f8c8d'}}>🚪 Deboarded at {p.Deboarding_Station || stationName(p.toIdx)}</span> },
            noshow:       { border: '#e74c3c', statusEl: <span className="status-icon no-show">❌ No-Show</span> },
        };
        const cfg = configs[type] || configs.current;
        return (
            <div key={`${p.pnr}-${type}`} className="passenger-card" style={{ borderLeft: `4px solid ${cfg.border}`, flex: '1 1 250px' }}>
                <div className="passenger-header">
                    <strong>{p.name || 'Unknown'}</strong>
                    {p.age && p.gender && <span className="age-gender">({p.age} / {p.gender})</span>}
                    {getClassBadge(p.class)}
                    <span className={`pnr-badge ${(p.pnrStatus || 'cnf').toLowerCase()}`}>
                        {p.pnrStatus || 'CNF'}
                    </span>
                </div>
                <div className="journey-info">
                    🚉 {p.Boarding_Station || stationName(p.fromIdx)} → {p.Deboarding_Station || stationName(p.toIdx)}
                </div>
                <div className="passenger-status">{cfg.statusEl}</div>
                <div className="passenger-meta">
                    <div className="meta-item"><strong>PNR:</strong> <code>{p.pnr}</code></div>
                    {p.racStatus && p.racStatus !== '-' && <div className="meta-item"><strong>RAC#:</strong> {p.racStatus}</div>}
                    {p.berthType && <div className="meta-item"><strong>Berth Type:</strong> {p.berthType}</div>}
                </div>
            </div>
        );
    };

    return (
        <div style={{
            marginTop: '20px',
            background: '#ffffff',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            border: '1px solid #e0e6ed',
            position: 'relative'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '15px' }}>
                <h3 style={{ margin: 0, color: '#2c3e50', fontSize: '20px' }}>
                    🛏️ Status for Berth {berth.fullBerthNo} — {berth.type}
                </h3>
                <button onClick={onClose} style={{
                    background: '#f8f9fa', border: 'none', borderRadius: '50%',
                    width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', color: '#7f8c8d'
                }}>
                    ✕
                </button>
            </div>
            
            <div style={{ display:'flex', gap:12, marginBottom:16, flexWrap:'wrap' }}>
                <span style={{ background: sStyle.bg, color: sStyle.color, padding:'6px 14px', borderRadius:20, fontWeight:700, fontSize:13 }}>
                    {sStyle.text}
                </span>
                <span style={{ background:'#f8f9fa', color:'#5a6c7d', padding:'6px 14px', borderRadius:20, fontSize:12 }}>
                    📍 Now: {stationName(stationIdx)}
                </span>
            </div>

            {/* ── Navigation Tabs ── */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 20, borderBottom: '2px solid #f0f0f0', paddingBottom: 10 }}>
                <button 
                    onClick={() => setActiveTab('onboard')}
                    style={{
                        padding: '8px 16px', borderRadius: '20px', border: 'none', fontWeight: 600, cursor: 'pointer',
                        background: activeTab === 'onboard' ? '#3498db' : '#f8f9fa',
                        color: activeTab === 'onboard' ? 'white' : '#7f8c8d',
                        transition: '0.2s ease'
                    }}
                >
                    ✅ On Board Now ({totalCurrent})
                </button>
                <button 
                    onClick={() => setActiveTab('upcoming')}
                    style={{
                        padding: '8px 16px', borderRadius: '20px', border: 'none', fontWeight: 600, cursor: 'pointer',
                        background: activeTab === 'upcoming' ? '#3498db' : '#f8f9fa',
                        color: activeTab === 'upcoming' ? 'white' : '#7f8c8d',
                        transition: '0.2s ease'
                    }}
                >
                    ⏳ Upcoming ({totalUpcoming})
                </button>
                {(missedPassengers.length > 0 || deboardedPassengers.length > 0 || noShowPassengers.length > 0) && (
                    <button 
                        onClick={() => setActiveTab('history')}
                        style={{
                            padding: '8px 16px', borderRadius: '20px', border: 'none', fontWeight: 600, cursor: 'pointer',
                            background: activeTab === 'history' ? '#3498db' : '#f8f9fa',
                            color: activeTab === 'history' ? 'white' : '#7f8c8d',
                            transition: '0.2s ease'
                        }}
                    >
                        📜 History & Missed ({missedPassengers.length + deboardedPassengers.length + noShowPassengers.length})
                    </button>
                )}
            </div>

            {isVacantNow && journeyStarted && activeTab === 'onboard' && (
                <div style={{ background: 'linear-gradient(135deg, #e8f5e9, #c8e6c9)', border: '1px solid #81c784', borderRadius: 10, padding: '12px 16px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 24 }}>🟢</span>
                    <div>
                        <div style={{ fontWeight: 700, color: '#2e7d32' }}>Vacant at current station</div>
                        <div style={{ fontSize: 12, color: '#388e3c' }}>{totalUpcoming > 0 ? `${totalUpcoming} passenger(s) boarding later` : 'No passengers assigned for any upcoming segment'}</div>
                    </div>
                </div>
            )}

            <div style={{
                display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '20px', alignItems: 'flex-start'
            }}>
                {activeTab === 'onboard' && currentPassengers.length > 0 && (
                    <div style={{ width: '100%', display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                        {currentPassengers.map(p => renderCard(p, isRAC(p) ? 'rac-current' : 'current'))}
                    </div>
                )}
                
                {activeTab === 'onboard' && currentPassengers.length === 0 && journeyStarted && !isVacantNow && (
                    <div style={{ width: '100%', padding: '20px', textAlign: 'center', color: '#7f8c8d' }}>
                        No passengers are currently on board for this berth.
                    </div>
                )}

                {activeTab === 'upcoming' && upcomingPassengers.length > 0 && (
                    <div style={{ width: '100%', display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                        {upcomingPassengers.map(p => renderCard(p, isRAC(p) ? 'rac-upcoming' : 'upcoming'))}
                    </div>
                )}
                
                {activeTab === 'upcoming' && upcomingPassengers.length === 0 && (
                    <div style={{ width: '100%', padding: '20px', textAlign: 'center', color: '#7f8c8d' }}>
                        No upcoming passengers assigned for this berth.
                    </div>
                )}

                {activeTab === 'history' && (
                    <div style={{ width: '100%', display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                        {missedPassengers.map(p => renderCard(p, 'missed'))}
                        {deboardedPassengers.map(p => renderCard(p, 'deboarded'))}
                        {noShowPassengers.map(p => renderCard(p, 'noshow'))}
                    </div>
                )}
            </div>

            {!journeyStarted && activeTab === 'onboard' && (
                <div style={{ textAlign: 'center', padding: '20px', color: '#7f8c8d', width: '100%' }}>
                    <div style={{ fontSize: '30px', marginBottom: '10px' }}>🛏️</div>
                    <h4 style={{ margin: 0 }}>Journey not started yet</h4>
                    <p style={{ margin: '5px 0 0 0', fontSize: '13px' }}>Passenger boarding details will appear once the journey begins.</p>
                </div>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────
// Main CoachesPage
// ─────────────────────────────────────────────────────────────
function CoachesPage({ trainData, onClose }: CoachesPageProps): React.ReactElement | null {
    const [selectedBerth, setSelectedBerth] = useState<Berth | null>(null);
    const [selectedCoachType, setSelectedCoachType] = useState<string>("sleeper");
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    if (!trainData || !trainData.coaches) return null;

    const handleCoachTypeChange = (type: string): void => {
        setSelectedCoachType(type);
    };

    const scroll = (direction: "left" | "right"): void => {
        if (scrollContainerRef.current) {
            const scrollAmount = 400;
            const currentScroll = scrollContainerRef.current.scrollLeft;
            scrollContainerRef.current.scrollTo({
                left: currentScroll + (direction === "left" ? -scrollAmount : scrollAmount),
                behavior: "smooth",
            });
        }
    };

    const getBerthStatusClass = (berth: Berth): string => {
        if (!trainData.journeyStarted) return "vacant";

        const currentStationIdx = trainData.currentStationIdx || 0;
        // Extract coachNo from berth or from fullBerthNo (format: "S1-7")
        const berthCoachNo = berth.coachNo || berth.fullBerthNo.split('-')[0];

        // Check CNF passengers on this berth
        const currentlyOnBerth = berth.passengers.filter(p =>
            (p.fromIdx || 0) <= currentStationIdx &&
            (p.toIdx === undefined || p.toIdx > currentStationIdx) &&
            p.boarded &&
            !p.noShow
        );

        if (currentlyOnBerth.length > 0) {
            // Check if it's RAC shared
            if (currentlyOnBerth.length >= 2) return "shared";
            // RAC berths (Side Lower) can have RAC queue passengers too
            if (berth.type === "Side Lower") {
                const racOnBerth = (trainData.racQueue || []).filter(r =>
                    r.coach === berthCoachNo &&
                    Number(r.seatNo) === berth.berthNo &&
                    r.boarded &&
                    !r.noShow &&
                    (r.fromIdx || 0) <= currentStationIdx &&
                    (r.toIdx === undefined || r.toIdx > currentStationIdx)
                );
                if (racOnBerth.length > 0) return "shared";
            }
            return "occupied";
        }

        // Check RAC queue passengers on Side Lower berths
        if (berth.type === "Side Lower") {
            const racOnBerth = (trainData.racQueue || []).filter(r =>
                r.coach === berthCoachNo &&
                Number(r.seatNo) === berth.berthNo &&
                r.boarded &&
                !r.noShow &&
                (r.fromIdx || 0) <= currentStationIdx &&
                (r.toIdx === undefined || r.toIdx > currentStationIdx)
            );
            if (racOnBerth.length >= 2) return "shared";
            if (racOnBerth.length === 1) return "occupied";
        }

        return "vacant";
    };

    // Helper to check if segmentOccupancy slot is vacant (handles both null and [] formats)
    const isSegmentVacant = (seg: any): boolean => {
        if (seg === null || seg === undefined) return true;
        if (Array.isArray(seg)) return seg.length === 0;
        return false;
    };

    const sleeperCoaches = trainData.coaches.filter((c) => c.class === "SL");
    const ac3Coaches = trainData.coaches.filter((c) => c.class === "AC_3_Tier");
    const ac2Coaches = trainData.coaches.filter((c) => c.class === "AC_2_Tier");

    const filteredCoaches =
        selectedCoachType === "sleeper"
            ? sleeperCoaches
            : selectedCoachType === "3ac"
                ? ac3Coaches
                : ac2Coaches;

    return (
        <div className="coaches-page">
            <div className="page-header">
                <button className="back-btn" onClick={onClose}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                </button>
                <h2>🚂 Train Coaches &amp; Berths</h2>
            </div>

            {/* Legend */}
            <div className="legend">
                <span className="legend-item">
                    <span className="color-box vacant"></span> Vacant
                </span>
                <span className="legend-item">
                    <span className="color-box occupied"></span> Occupied
                </span>
                {selectedCoachType !== "2ac" && (
                    <span className="legend-item">
                        <span className="color-box shared"></span> Shared (RAC)
                    </span>
                )}
                {selectedCoachType === "2ac" && (
                    <span className="legend-item legend-info">
                        ℹ️ 2A class has no RAC seats
                    </span>
                )}
            </div>

            {/* Coach Type Selector */}
            <div className="coach-type-selector">
                <button
                    className={`coach-type-btn ${selectedCoachType === "sleeper" ? "active" : ""}`}
                    onClick={() => handleCoachTypeChange("sleeper")}
                >
                    🛏️ Sleeper
                    {sleeperCoaches.length > 0 && (
                        <span className="coach-count-badge">{sleeperCoaches.length}</span>
                    )}
                </button>
                <button
                    className={`coach-type-btn ${selectedCoachType === "3ac" ? "active" : ""}`}
                    onClick={() => handleCoachTypeChange("3ac")}
                >
                    ❄️ 3-Tier AC
                    {ac3Coaches.length > 0 && (
                        <span className="coach-count-badge">{ac3Coaches.length}</span>
                    )}
                </button>
                <button
                    className={`coach-type-btn ${selectedCoachType === "2ac" ? "active" : ""} coach-type-btn-2ac`}
                    onClick={() => handleCoachTypeChange("2ac")}
                >
                    ✨ 2nd AC (2A)
                    {ac2Coaches.length > 0 && (
                        <span className="coach-count-badge coach-count-badge-2ac">{ac2Coaches.length}</span>
                    )}
                </button>
            </div>

            {/* ── Unified Coach Scroll View (Sleeper / 3AC / 2AC) ── */}
            <div className="coaches-container">
                <button className="scroll-arrow scroll-left" onClick={() => scroll("left")}>
                    ‹
                </button>

                <div className="coaches-grid" ref={scrollContainerRef}>
                    {selectedCoachType === "2ac" && ac2Coaches.length === 0 ? (
                        <div className="no-coaches-msg">
                            <div className="no-coaches-icon">🚫</div>
                            <h3>No 2nd AC Coaches on This Train</h3>
                            <p>This train does not have any 2A (Second AC) coaches configured.</p>
                        </div>
                    ) : (
                        filteredCoaches.map((coach) => (
                            <div
                                key={coach.coachNo}
                                className={`coach-card${selectedCoachType === "3ac" ? " ac-3tier" :
                                        selectedCoachType === "2ac" ? " ac-2tier" : ""
                                    }`}
                            >
                                <div className="coach-header">
                                    <h4>{coach.coachNo}</h4>
                                    <span className="coach-class">{coach.class}</span>
                                </div>

                                <div className="berths-grid">
                                    {coach.berths.map((berth) => (
                                        <div
                                            key={berth.fullBerthNo}
                                            className={`berth ${getBerthStatusClass(berth)}`}
                                            onClick={() => setSelectedBerth(berth)}
                                            title={`${berth.fullBerthNo}\n${berth.type}\n${berth.passengers.length} passenger(s)`}
                                        >
                                            {berth.berthNo}
                                        </div>
                                    ))}
                                </div>

                                <div className="coach-summary">
                                    Vacant:{" "}
                                    {!trainData.journeyStarted
                                        ? coach.capacity
                                        : coach.berths.filter((b) => {
                                            const segments = b.segmentOccupancy || b.segments;
                                            const idx = trainData.currentStationIdx || 0;
                                            return segments && isSegmentVacant(segments[idx]);
                                        }).length}{" "}
                                    / {coach.capacity}
                                    {selectedCoachType === "2ac" && (
                                        <span className="summary-no-rac">&nbsp;· No RAC</span>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <button className="scroll-arrow scroll-right" onClick={() => scroll("right")}>
                    ›
                </button>
            </div>

            {selectedBerth && (
                <BerthDetailsModal
                    berth={selectedBerth}
                    onClose={() => setSelectedBerth(null)}
                    currentStationIdx={trainData.currentStationIdx}
                    stations={trainData.stations}
                    journeyStarted={trainData.journeyStarted}
                    racQueue={trainData.racQueue}
                />
            )}
        </div>
    );
}

export default CoachesPage;



