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
    boarded?: boolean;
    noShow?: boolean;
    class?: string;
    racStatus?: string;
    berthType?: string;
}

interface Berth {
    fullBerthNo: string;
    berthNo: number;
    type: string;
    status: string;
    passengers: Passenger[];
    segmentOccupancy?: (string | null)[];
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

interface TrainData {
    coaches?: Coach[];
    journeyStarted?: boolean;
    currentStationIdx?: number;
    stations?: Station[];
}

interface CoachesPageProps {
    trainData: TrainData | null;
    onClose: () => void;
}

interface BerthDetailsModalProps {
    berth: Berth;
    onClose: () => void;
    currentStationIdx?: number;
    stations?: Station[]
    journeyStarted?: boolean;
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

        const currentlyOnBerth = berth.passengers.filter(p =>
            (p.fromIdx || 0) <= currentStationIdx &&
            p.boarded &&
            !p.noShow
        );

        if (currentlyOnBerth.length === 0) return "vacant";

        // 2A has no RAC — all occupied berths show as "occupied"
        return "occupied";
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
                                            return segments && segments[idx] === null;
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
                />
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────
// Berth Details Modal (unchanged from original)
// ─────────────────────────────────────────────────────────────
function BerthDetailsModal({ berth, onClose, currentStationIdx, stations, journeyStarted }: BerthDetailsModalProps): React.ReactElement {
    if (!journeyStarted) {
        return (
            <div className="modal-overlay" onClick={onClose}>
                <div className="modal-content" onClick={(e: MouseEvent) => e.stopPropagation()}>
                    <div className="modal-header">
                        <h3> Berth Details: {berth.fullBerthNo}</h3>
                        <button className="back-btn" onClick={onClose}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18">
                                <path d="M19 12H5M12 19l-7-7 7-7" />
                            </svg>
                        </button>
                    </div>
                    <div className="modal-body">
                        <div className="info-row">
                            <strong>Type:</strong> {berth.type}
                        </div>
                        <div className="info-row">
                            <strong>Status:</strong>
                            <span className="status-tag vacant">VACANT</span>
                        </div>
                        <div className="vacant-message">
                            <div className="vacant-icon"></div>
                            <h4>This berth is currently vacant</h4>
                            <p>Journey has not started yet. Passenger details will be available once the journey begins.</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e: MouseEvent) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3> Berth Details: {berth.fullBerthNo}</h3>
                    <button className="back-btn" onClick={onClose}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18">
                            <path d="M19 12H5M12 19l-7-7 7-7" />
                        </svg>
                    </button>
                </div>
                <div className="modal-body">
                    <div className="info-row">
                        <strong>Type:</strong> {berth.type}
                    </div>
                    <div className="info-row">
                        <strong>Status:</strong>
                        <span className={`status-tag ${berth.status.toLowerCase()}`}>{berth.status}</span>
                    </div>
                    <div className="info-row">
                        <strong>Passengers:</strong> {berth.passengers.length}
                    </div>

                    {berth.passengers.length > 0 && (
                        <div className="passengers-list">
                            <h4>Passenger Details:</h4>
                            {berth.passengers.map((p, idx) => (
                                <div key={`${p.pnr}-${idx}`} className="passenger-card">
                                    <div className="passenger-header">
                                        <strong>{p.name}</strong>
                                        <span className="age-gender">({p.age}/{p.gender})</span>
                                        <span className={`pnr-badge ${(p.pnrStatus || "").toLowerCase().replace(" ", "-")}`}>
                                            {p.pnrStatus}
                                        </span>
                                    </div>
                                    <div className="journey-info"> {p.Boarding_Station} → {p.Deboarding_Station}</div>
                                    <div className="passenger-status">
                                        {p.noShow ? (
                                            <span className="status-icon no-show">❌ No-Show</span>
                                        ) : p.boarded ? (
                                            <span className="status-icon boarded">✅ Boarded</span>
                                        ) : (p.fromIdx || 0) <= (currentStationIdx ?? 0) ? (
                                            <span className="status-icon missed">⚠️ Missed Boarding</span>
                                        ) : (
                                            <span className="status-icon waiting">⏳ Not Yet Boarded</span>
                                        )}
                                    </div>
                                    <div className="passenger-meta">
                                        <div className="meta-item">
                                            <strong>PNR:</strong> <code>{p.pnr}</code>
                                        </div>
                                        <div className="meta-item">
                                            <strong>Class:</strong> {p.class}
                                        </div>
                                        {p.berthType && (
                                            <div className="meta-item">
                                                <strong>Berth Type:</strong> {p.berthType}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {berth.status === "VACANT" && (
                        <div className="vacant-message">
                            <div className="vacant-icon"></div>
                            <h4>This berth is currently vacant</h4>
                            <p>Available for allocation</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default CoachesPage;
