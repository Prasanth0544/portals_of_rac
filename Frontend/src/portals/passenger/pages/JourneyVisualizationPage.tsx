// passenger-portal/src/pages/JourneyVisualizationPage.tsx
// Train Journey Visualization — simulation + station schedule

import React, { useState, useEffect, useRef } from 'react';
import { passengerAPI } from '../api';
import { Station } from '../types';
import '../styles/pages/JourneyVisualizationPage.css';

interface TrainState {
    trainNo?: string;
    trainName?: string;
    journeyStarted?: boolean;
    currentStationIdx?: number;
    currentStationIndex?: number;
    stations?: StationSchedule[];
}

interface StationSchedule extends Station {
    sno?: number;
    zone?: string;
    division?: string;
    arrival?: string;
    departure?: string;
    halt?: number;
    platform?: string;
    remarks?: string;
}

function JourneyVisualizationPage(): React.ReactElement {
    const [stations, setStations] = useState<StationSchedule[]>([]);
    const [trainState, setTrainState] = useState<TrainState | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const currentRef = useRef<HTMLDivElement>(null);
    const passengerPnr = (() => {
        try { return (JSON.parse(localStorage.getItem('user') || '{}') as { pnr?: string }).pnr || ''; } catch { return ''; }
    })();

    useEffect(() => {
        loadAll();
        // Auto-refresh every 30 s to stay in sync with station advances
        const t = setInterval(loadAll, 30000);
        return () => clearInterval(t);
    }, []);

    // Scroll current station into view on load
    useEffect(() => {
        currentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    }, [trainState]);

    const loadAll = async (): Promise<void> => {
        try {
            setLoading(true);
            const response = await passengerAPI.getTrainState();
            if (response.success && response.data) {
                const data = response.data as TrainState & { stations?: StationSchedule[] };
                setTrainState(data);
                setStations(data.stations || []);
            }
        } catch (error) {
            console.error('Error loading journey data:', error);
            setStations([]);
        } finally {
            setLoading(false);
        }
    };

    const currentIdx = trainState?.currentStationIdx ?? trainState?.currentStationIndex ?? 0;
    const totalStations = stations.length;
    const progressPct = totalStations > 1 ? Math.round((currentIdx / (totalStations - 1)) * 100) : 0;
    const kmCovered = stations[currentIdx]?.distance ?? 0;
    const kmTotal = stations[totalStations - 1]?.distance ?? 0;
    const stationsLeft = Math.max(0, totalStations - 1 - currentIdx);

    const getTotalDistance = (): number => stations[stations.length - 1]?.distance || 0;
    const calculateJourneyTime = (): number => {
        if (stations.length < 2) return 0;
        const first = stations[0];
        const last = stations[stations.length - 1];
        const firstHour = parseInt(first.departure?.split(':')[0] || '0');
        const lastHour = parseInt(last.arrival?.split(':')[0] || '0');
        const hours = ((last.day || 1) - 1) * 24 + lastHour - firstHour;
        return hours > 0 ? hours : 0;
    };

    if (loading) {
        return (
            <div className="visualization-page">
                <div className="loading-container">
                    <div className="spinner"></div>
                    <p>Loading journey data…</p>
                </div>
            </div>
        );
    }

    return (
        <div className="visualization-page">
            {/* ─── Header ─── */}
            <div className="page-header">
                <h2>🚂 Journey Progress</h2>
            </div>

            {/* ─── Train Info Banner ─── */}
            {trainState?.trainNo && (
                <div style={{
                    background: 'linear-gradient(135deg, #1e3a5f 0%, #2d6a9f 100%)',
                    color: 'white',
                    borderRadius: '12px',
                    padding: '16px 24px',
                    marginBottom: '20px',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '24px',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: '0 4px 15px rgba(30,58,95,0.3)',
                }}>
                    <div>
                        <div style={{ fontSize: '11px', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '1px' }}>Train</div>
                        <div style={{ fontWeight: 700, fontSize: '18px' }}>
                            {trainState.trainName} <span style={{ opacity: 0.7, fontSize: '14px' }}>(#{trainState.trainNo})</span>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                        {[
                            { label: 'Journey Started', value: trainState.journeyStarted ? '✅ Yes' : '⏳ Not yet' },
                            { label: 'Stations Left', value: `${stationsLeft}` },
                            { label: 'Distance Covered', value: `${kmCovered} / ${kmTotal} km` },
                            { label: 'Progress', value: `${progressPct}%` },
                        ].map(({ label, value }) => (
                            <div key={label} style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '11px', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '1px' }}>{label}</div>
                                <div style={{ fontWeight: 700, fontSize: '16px' }}>{value}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ─── Train Simulation: Station Bubbles ─── */}
            <div style={{
                background: 'white',
                borderRadius: '14px',
                border: '1px solid #e2e8f0',
                padding: '24px',
                marginBottom: '24px',
                boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
            }}>
                <div style={{ fontWeight: 700, fontSize: '16px', color: '#1e293b', marginBottom: '20px' }}>
                    🗺️ Train Simulation — Journey Progress
                </div>

                {/* Progress Bar */}
                <div style={{ position: 'relative', marginBottom: '8px' }}>
                    <div style={{
                        height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden',
                    }}>
                        <div style={{
                            height: '100%',
                            width: `${progressPct}%`,
                            background: 'linear-gradient(90deg, #16a34a, #22c55e)',
                            borderRadius: '4px',
                            transition: 'width 1s ease',
                        }} />
                    </div>
                    {/* Train icon on the bar */}
                    <div style={{
                        position: 'absolute',
                        top: '-12px',
                        left: `${Math.min(progressPct, 96)}%`,
                        fontSize: '22px',
                        transform: 'translateX(-50%)',
                        transition: 'left 1s ease',
                        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
                    }}>🚂</div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b', marginBottom: '24px' }}>
                    <span>{stations[0]?.name}</span>
                    <span style={{ fontWeight: 600, color: '#16a34a' }}>{progressPct}% complete</span>
                    <span>{stations[totalStations - 1]?.name}</span>
                </div>

                {/* Scrollable station bubbles */}
                <div style={{ overflowX: 'auto', paddingBottom: '12px' }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0',
                        minWidth: `${Math.max(stations.length * 90, 600)}px`,
                        padding: '10px 20px',
                    }}>
                        {stations.map((station, idx) => {
                            const isPast = idx < currentIdx;
                            const isCurrent = idx === currentIdx;
                            const isFuture = idx > currentIdx;
                            const bgColor = isCurrent ? '#16a34a' : isPast ? '#3b82f6' : '#e2e8f0';
                            const textColor = isCurrent || isPast ? 'white' : '#94a3b8';
                            const lineColor = isPast || isCurrent ? '#3b82f6' : '#e2e8f0';

                            return (
                                <div key={station.code} style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: '80px' }}>
                                    {/* Station */}
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: '0 0 auto' }}>
                                        {/* Bubble */}
                                        <div
                                            ref={isCurrent ? currentRef : undefined}
                                            style={{
                                                width: isCurrent ? 52 : 38,
                                                height: isCurrent ? 52 : 38,
                                                borderRadius: '50%',
                                                background: bgColor,
                                                color: textColor,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontWeight: 700,
                                                fontSize: isCurrent ? '15px' : '12px',
                                                boxShadow: isCurrent ? '0 0 0 4px rgba(22,163,74,0.25), 0 4px 12px rgba(22,163,74,0.3)' : 'none',
                                                border: isFuture ? '2px solid #e2e8f0' : 'none',
                                                transition: 'all 0.3s ease',
                                                position: 'relative',
                                                flexShrink: 0,
                                            }}
                                        >
                                            {isCurrent ? '📍' : idx + 1}
                                        </div>
                                        {/* Station code */}
                                        <div style={{
                                            fontSize: '10px',
                                            fontWeight: isCurrent ? 700 : 500,
                                            color: isCurrent ? '#16a34a' : isPast ? '#3b82f6' : '#94a3b8',
                                            marginTop: '6px',
                                            textAlign: 'center',
                                            maxWidth: '80px',
                                            lineHeight: '1.2',
                                        }}>
                                            {station.name?.split(' ').slice(0, 2).join(' ')}
                                        </div>
                                        <div style={{ fontSize: '9px', color: '#cbd5e1' }}>{station.code}</div>
                                        {isCurrent && (
                                            <div style={{
                                                fontSize: '9px',
                                                background: '#dcfce7',
                                                color: '#16a34a',
                                                padding: '2px 6px',
                                                borderRadius: '6px',
                                                fontWeight: 700,
                                                marginTop: '2px',
                                            }}>CURRENT</div>
                                        )}
                                    </div>
                                    {/* Connector line — skip after last */}
                                    {idx < stations.length - 1 && (
                                        <div style={{
                                            flex: 1,
                                            height: '3px',
                                            background: lineColor,
                                            minWidth: '20px',
                                            marginTop: isCurrent ? '-32px' : '-24px',
                                            transition: 'background 0.3s ease',
                                            borderRadius: '2px',
                                        }} />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Current station info card */}
                {stations[currentIdx] && (
                    <div style={{
                        marginTop: '16px',
                        background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
                        border: '2px solid #86efac',
                        borderRadius: '10px',
                        padding: '14px 20px',
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '20px',
                        alignItems: 'center',
                    }}>
                        <div>
                            <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>
                                📍 Current Station
                            </div>
                            <div style={{ fontSize: '20px', fontWeight: 800, color: '#15803d' }}>
                                {stations[currentIdx].name}
                            </div>
                            <div style={{ fontSize: '12px', color: '#4ade80' }}>
                                Station Code: <strong>{stations[currentIdx].code}</strong> · {stations[currentIdx].distance} km from origin
                            </div>
                        </div>
                        {currentIdx < stations.length - 1 && (
                            <div style={{ borderLeft: '1px solid #86efac', paddingLeft: '20px' }}>
                                <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>Next Station</div>
                                <div style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>
                                    {stations[currentIdx + 1].name}
                                </div>
                                <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                                    {stations[currentIdx + 1].code} · {stations[currentIdx + 1].distance} km
                                </div>
                            </div>
                        )}
                        {currentIdx === stations.length - 1 && (
                            <div style={{ borderLeft: '1px solid #86efac', paddingLeft: '20px' }}>
                                <div style={{ fontSize: '16px', fontWeight: 700, color: '#15803d' }}>
                                    🎉 Journey Complete!
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ─── Stats Row ─── */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '24px' }}>
                {[
                    { icon: '📍', label: 'Total Stations', value: totalStations },
                    { icon: '📏', label: 'Total Distance', value: `${getTotalDistance()} km` },
                    { icon: '⏱️', label: 'Journey Time', value: `${calculateJourneyTime()} hrs` },
                    { icon: '✅', label: 'Stations Covered', value: currentIdx },
                    { icon: '⏳', label: 'Stations Remaining', value: stationsLeft },
                ].map(({ icon, label, value }) => (
                    <div key={label} style={{
                        flex: '1 1 140px',
                        background: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px',
                        padding: '14px',
                        textAlign: 'center',
                        boxShadow: '0 1px 6px rgba(0,0,0,0.04)',
                    }}>
                        <div style={{ fontSize: '22px', marginBottom: '4px' }}>{icon}</div>
                        <div style={{ fontSize: '20px', fontWeight: 800, color: '#1e293b' }}>{value}</div>
                        <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
                    </div>
                ))}
            </div>

            {/* ─── Station Schedule Table ─── */}
            <div className="station-schedule-section">
                <div className="section-header">
                    <h3>📌 Full Station Schedule</h3>
                    <div className="schedule-stats">
                        <span className="stat-badge">🟢 Past</span>
                        <span className="stat-badge">📍 Current</span>
                        <span className="stat-badge">⬜ Upcoming</span>
                    </div>
                </div>

                <div className="table-container">
                    <table className="station-schedule-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>CODE</th>
                                <th>STATION NAME</th>
                                <th>ZONE</th>
                                <th>ARRIVAL</th>
                                <th>DEPARTURE</th>
                                <th>HALT</th>
                                <th>DISTANCE (KM)</th>
                                <th>DAY</th>
                                <th>PLATFORM</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stations.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="no-data">
                                        No stations loaded.{' '}
                                        <button onClick={loadAll} className="retry-btn">Retry</button>
                                    </td>
                                </tr>
                            ) : (
                                stations.map((station, idx) => {
                                    const isPast = idx < currentIdx;
                                    const isCurrent = idx === currentIdx;
                                    return (
                                        <tr
                                            key={station.code}
                                            style={{
                                                background: isCurrent
                                                    ? 'linear-gradient(90deg, #dcfce7, #f0fdf4)'
                                                    : isPast ? '#f8fafc' : 'white',
                                                borderLeft: isCurrent ? '4px solid #16a34a' : '4px solid transparent',
                                                opacity: isPast ? 0.7 : 1,
                                                fontWeight: isCurrent ? 700 : 400,
                                            }}
                                        >
                                            <td className="td-center">
                                                {isCurrent ? '📍' : isPast ? '✅' : station.sno || idx + 1}
                                            </td>
                                            <td className="td-code">{station.code}</td>
                                            <td className="td-name">
                                                {idx === 0 && <span className="station-badge origin">Origin</span>}
                                                {idx === stations.length - 1 && <span className="station-badge destination">Destination</span>}
                                                {isCurrent && <span style={{ background: '#16a34a', color: 'white', borderRadius: '4px', padding: '1px 6px', fontSize: '10px', marginRight: '6px', fontWeight: 700 }}>CURRENT</span>}
                                                {station.name}
                                            </td>
                                            <td className="td-center">{station.zone || 'SCR'}</td>
                                            <td className="td-center">{station.arrival === '-' ? 'First' : station.arrival}</td>
                                            <td className="td-center">{station.departure === '-' ? 'Last' : station.departure}</td>
                                            <td className="td-right">{station.halt || 0} min</td>
                                            <td className="td-right">{station.distance}</td>
                                            <td className="td-center">{station.day}</td>
                                            <td className="td-center">{station.platform || '-'}</td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default JourneyVisualizationPage;
