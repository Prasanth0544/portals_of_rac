// frontend/src/pages/HomePage.tsx

import React, { useState, ChangeEvent } from 'react';
import './HomePage.css';

interface Station {
    code: string;
    name: string;
    sno?: number;
}

interface Stats {
    totalPassengers?: number;
    cnfPassengers?: number;
    racPassengers?: number;
    currentOnboard?: number;
    vacantBerths?: number;
    occupiedBerths?: number;
    totalDeboarded?: number;
}

interface TrainData {
    trainNo?: string;
    trainName?: string;
    journeyDate?: string;
    stations?: Station[];
    currentStationIdx?: number;
    stats?: Stats;
}

type PageType = 'config' | 'home' | 'rac-queue' | 'coaches' | 'passengers' | 'reallocation' | 'visualization' | 'add-passenger' | 'phase1' | 'diagnostics';

interface HomePageProps {
    trainData: TrainData | null;
    journeyStarted: boolean;
    loading: boolean;
    onStartJourney: () => void;
    onNextStation: () => void;
    onReset: () => void;
    onMarkNoShow: (pnr: string) => void;
    onNavigate: (page: PageType) => void;
}

function HomePage({
    trainData,
    journeyStarted,
    loading,
    onStartJourney,
    onNextStation,
    onReset,
    onMarkNoShow,
    onNavigate
}: HomePageProps): React.ReactElement | null {
    const [pnrInput, setPnrInput] = useState<string>('');

    if (!trainData) return null;

    const handleMarkNoShow = (): void => {
        if (!pnrInput.trim()) {
            alert("Please enter a PNR");
            return;
        }
        onMarkNoShow(pnrInput);
        setPnrInput('');
    };

    const currentStationIdx = trainData.currentStationIdx || 0;
    const stations = trainData.stations || [];
    const isLastStation = stations.length > 0 && currentStationIdx >= stations.length - 1;

    return (
        <div className="home-page">
            <div className="train-config-banner">
                <div className="config-item">
                    <span className="config-label">Train:</span>
                    <span className="config-value">{trainData.trainNo} - {trainData.trainName}</span>
                </div>
                <div className="config-item">
                    <span className="config-label">Journey Date:</span>
                    <span className="config-value">{trainData.journeyDate}</span>
                </div>
                <div className="config-item">
                    <span className="config-label">Route:</span>
                    <span className="config-value">
                        {stations.length > 0 ? `${stations[0]?.name} → ${stations[stations.length - 1]?.name}` : 'Loading route...'}
                    </span>
                </div>
            </div>

            <div className="journey-section">
                <h2>🚉 Train Simulation - Journey Progress</h2>

                <div className="timeline-container">
                    <div className="timeline-scroll">
                        {stations.map((station, idx) => (
                            <div key={station.code} className="timeline-station">
                                {idx > 0 && (
                                    <div className={`timeline-line ${idx <= currentStationIdx ? 'completed' : 'upcoming'
                                        }`}></div>
                                )}

                                <div className={`timeline-circle ${idx < currentStationIdx ? 'completed' :
                                    idx === currentStationIdx ? 'current' : 'upcoming'
                                    }`}>
                                    {idx < currentStationIdx ? '✓' : station.sno}
                                </div>

                                <div className="timeline-info">
                                    <div className="timeline-station-name">{station.name}</div>
                                    <div className="timeline-station-code">{station.code}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {!journeyStarted && (
                <button
                    onClick={onStartJourney}
                    disabled={loading}
                    className="btn-start-journey"
                >
                    {loading ? 'Starting...' : '🚀 Start Journey'}
                </button>
            )}

            <div className="main-actions-grid">
                <div className="action-card-compact simulation-card">
                    <div className="card-header">
                        <h4>Train Controls</h4>
                    </div>
                    <button
                        onClick={onNextStation}
                        disabled={loading || !journeyStarted || isLastStation}
                        className="btn-compact primary"
                    >
                        {loading ? 'Processing...' : isLastStation ? 'Complete' : 'Next Station'}
                    </button>
                    <button
                        onClick={onReset}
                        disabled={loading}
                        className="btn-compact secondary"
                    >
                        Reset
                    </button>
                </div>

                <div className="action-card-compact phase1-card" onClick={() => onNavigate('phase1')}>
                    <div className="card-header">
                        <h4>🎯 Current Station Matching</h4>
                    </div>
                    <p className="card-description">Phase 1: HashMap-based reallocation</p>
                    <div className="card-arrow">→</div>
                </div>

                <div
                    className="action-card-compact reallocation-card"
                    onClick={() => onNavigate('reallocation')}
                >
                    <div className="card-header">
                        <h4>Reallocation</h4>
                    </div>
                    <p className="card-description">Upgrade RAC passengers</p>
                    <div className="card-arrow">→</div>
                </div>
            </div>

            <div className="noshow-section">
                <h3>❌ Mark Passenger as No-Show</h3>
                <div className="noshow-input-row">
                    <input
                        type="text"
                        placeholder="Enter 10-digit PNR"
                        value={pnrInput}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setPnrInput(e.target.value)}
                        maxLength={10}
                        className="input-pnr"
                    />
                    <button
                        onClick={handleMarkNoShow}
                        disabled={loading || !pnrInput.trim()}
                        className="btn-noshow"
                    >
                        Mark No-Show
                    </button>
                </div>
            </div>

            <div className="action-cards-section">
                <h3 className="section-title">📊 Quick Statistics & Navigation</h3>

                <div className="stats-action-grid">
                    <div className="stat-box">
                        <div className="stat-label">Total Passengers</div>
                        <div className="stat-value">{journeyStarted && trainData?.stats ? trainData.stats.totalPassengers : '-'}</div>
                    </div>

                    <div className="stat-box">
                        <div className="stat-label">Confirmed (CNF)</div>
                        <div className="stat-value">{journeyStarted && trainData?.stats ? trainData.stats.cnfPassengers : '-'}</div>
                    </div>

                    <div
                        className="stat-box clickable"
                        onClick={() => onNavigate('rac-queue')}
                    >
                        <div className="stat-label">RAC Queue</div>
                        <div className="stat-value">{journeyStarted && trainData?.stats ? trainData.stats.racPassengers : '-'}</div>
                    </div>

                    <div className="stat-box">
                        <div className="stat-label">Currently Onboard</div>
                        <div className="stat-value">{journeyStarted && trainData?.stats ? trainData.stats.currentOnboard : '-'}</div>
                    </div>

                    <div className="stat-box">
                        <div className="stat-label">Vacant Berths</div>
                        <div className="stat-value">{journeyStarted && trainData?.stats ? trainData.stats.vacantBerths : '-'}</div>
                    </div>

                    <div className="stat-box">
                        <div className="stat-label">Occupied Berths</div>
                        <div className="stat-value">{journeyStarted && trainData?.stats ? trainData.stats.occupiedBerths : '-'}</div>
                    </div>

                    <div className="stat-box">
                        <div className="stat-label">Total Deboarded</div>
                        <div className="stat-value">{journeyStarted && trainData?.stats ? trainData.stats.totalDeboarded : '-'}</div>
                    </div>

                    <div className="nav-card add-passenger-nav-card" onClick={() => onNavigate('add-passenger')}>
                        <span className="nav-icon">👤➕</span>
                        <span className="nav-text">Add Passenger</span>
                    </div>

                    <div
                        className="nav-card"
                        onClick={() => onNavigate('coaches')}
                    >
                        <span className="nav-icon">🚂</span>
                        <span className="nav-text">Coaches & Berths</span>
                    </div>

                    <div
                        className="nav-card"
                        onClick={() => onNavigate('passengers')}
                    >
                        <span className="nav-icon">👥</span>
                        <span className="nav-text">Passenger List & Vacant Positions </span>
                    </div>

                    <div
                        className="nav-card"
                        onClick={() => onNavigate('visualization')}
                    >
                        <span className="nav-icon">📊</span>
                        <span className="nav-text">Segment View</span>
                    </div>

                    <div className="nav-card" onClick={() => onNavigate('config')}>
                        <span className="nav-icon">⚙️</span>
                        <span className="nav-text">Update Config</span>
                    </div>

                    <div className="nav-card" onClick={() => onNavigate('diagnostics')}>
                        <span className="nav-icon">🔍</span>
                        <span className="nav-text">Allocation Diagnostics</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default HomePage;
