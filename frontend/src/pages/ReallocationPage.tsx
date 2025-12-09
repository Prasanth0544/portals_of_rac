// frontend/src/pages/ReallocationPage.tsx

import React, { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import * as api from '../services/apiWithErrorHandling';
import apiClient from '../services/apiWithErrorHandling';
import '../styles/pages/ReallocationPage.css';

interface Station {
    name: string;
    code: string;
}

interface TrainState {
    trainName: string;
    trainNo: string;
    currentStationIdx: number;
    stations: Station[];
}

interface Candidate {
    pnr: string;
    name: string;
    racStatus: string;
    from: string;
    to: string;
    passengerStatus?: string;
}

interface MatrixItem {
    coach: string;
    berthNo: number;
    type?: string;
    berthType?: string;
    class?: string;
    vacantFrom: string;
    vacantTo: string;
    topCandidate?: Candidate;
    topEligible?: Candidate;
}

interface StationWiseStats {
    boardedRACCount: number;
    vacantBerthsCount: number;
    pendingCount: number;
}

interface RACPassenger {
    name: string;
    pnr: string;
    racStatus: string;
    from: string;
    to: string;
    passengerStatus: string;
}

interface VacantBerthItem {
    berth: string;
    type: string;
    class: string;
    vacantFrom: string;
    vacantTo: string;
}

interface PendingReallocation {
    passengerName: string;
    passengerPNR: string;
    passengerFrom: string;
    passengerTo: string;
    currentBerth: string;
    currentRAC: string;
    proposedBerthFull: string;
    status: string;
}

interface StationWiseData {
    currentStation: Station;
    boardedRAC: RACPassenger[];
    vacantBerths: VacantBerthItem[];
    pendingReallocations: PendingReallocation[];
    stats: StationWiseStats;
}

interface HashMapRACPassenger {
    destination: string;
    name: string;
    racStatus: string;
    from?: string;
    to?: string;
}

interface HashMapVacantBerth {
    lastVacantStation: string;
    type: string;
    class: string;
}

interface MatchBerth {
    type: string;
    class: string;
}

interface MatchPassenger {
    name: string;
    pnr: string;
    racStatus: string;
    currentBerth?: string;
    isPerfectMatch: boolean;
}

interface MatchItem {
    berthId: string;
    berth: MatchBerth;
    topMatch: MatchPassenger;
    eligiblePassengers: any[];
}

interface MatchingStats {
    racPassengersCount: number;
    vacantBerthsCount: number;
    matchesCount: number;
}

interface MatchingData {
    currentStation: Station;
    racPassengersHashMap: Record<string, HashMapRACPassenger>;
    vacantBerthsHashMap: Record<string, HashMapVacantBerth>;
    matches: MatchItem[];
    stats: MatchingStats;
}

type TabType = 'global' | 'station-wise' | 'hashmap' | 'matching';

interface TrainData {
    trainNo?: string;
    trainName?: string;
}

interface ReallocationPageProps {
    trainData: TrainData | null;
    loadTrainState: () => Promise<void>;
    onClose: () => void;
}

interface StationWiseViewProps {
    stationWiseData: StationWiseData | null;
    trainState: TrainState | null;
    onRefresh: () => Promise<void>;
}

interface HashMapViewProps {
    stationWiseData: StationWiseData | null;
    trainState: TrainState | null;
    onRefresh: () => Promise<void>;
}

const ReallocationPage = ({ trainData, loadTrainState, onClose }: ReallocationPageProps): React.ReactElement => {
    const [trainState, setTrainState] = useState<TrainState | null>(null);
    const [eligibilityMatrix, setEligibilityMatrix] = useState<MatrixItem[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [applying, setApplying] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState<TabType>('global');
    const [stationWiseData, setStationWiseData] = useState<StationWiseData | null>(null);

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchData = async (): Promise<void> => {
        await Promise.all([
            fetchTrainState(),
            fetchEligibilityMatrix(),
            fetchStationWiseData()
        ]);
        setLoading(false);
    };

    const fetchStationWiseData = async (): Promise<void> => {
        try {
            const res = await apiClient.get('/reallocation/station-wise');
            setStationWiseData(res.data.data);
        } catch (error) {
            console.error('Error fetching station-wise data:', error);
        }
    };

    const fetchTrainState = async (): Promise<void> => {
        try {
            const res = await api.getTrainState();
            setTrainState(res.data);
        } catch (error) {
            console.error('Error fetching train state:', error);
            toast.error('Failed to load train state');
        }
    };

    const fetchEligibilityMatrix = async (): Promise<void> => {
        try {
            const res = await api.getEligibilityMatrix();
            const matrixData = res.data?.eligibility || res.data;
            setEligibilityMatrix(Array.isArray(matrixData) ? matrixData : []);
        } catch (error) {
            console.error('Error fetching eligibility matrix:', error);
            toast.error('Failed to load eligibility matrix');
        }
    };

    const sendUpgradeOffer = async (matrixItem: MatrixItem, index: number): Promise<void> => {
        if (!matrixItem?.topCandidate && !matrixItem?.topEligible) {
            toast.error('No eligible candidate for this berth');
            return;
        }

        const candidate = matrixItem.topCandidate || matrixItem.topEligible;
        if (!candidate) return;

        const isOnline = candidate.passengerStatus === 'Online';

        setApplying(index);

        try {
            if (isOnline) {
                const res = await apiClient.post('/reallocation/send-offer', {
                    pnr: candidate.pnr,
                    berthDetails: {
                        coach: matrixItem.coach,
                        berthNo: matrixItem.berthNo,
                        type: matrixItem.type || matrixItem.berthType
                    }
                });

                if (res.data.success) {
                    toast.success(
                        `📤 Upgrade offer sent to ${candidate.name}! Waiting for acceptance...`,
                        { duration: 4000, icon: '🔔' }
                    );

                    setTimeout(() => {
                        fetchEligibilityMatrix();
                    }, 1000);
                }
            } else {
                const res = await apiClient.post('/tte/offline-upgrades/add', {
                    pnr: candidate.pnr,
                    berthDetails: {
                        coach: matrixItem.coach,
                        berthNo: matrixItem.berthNo,
                        type: matrixItem.type || matrixItem.berthType
                    }
                });

                if (res.data.success) {
                    toast(`📋 ${candidate.name} added to TTE offline upgrades. TTE confirmation required.`,
                        { duration: 4000, icon: 'ℹ️' }
                    );

                    setTimeout(() => {
                        fetchEligibilityMatrix();
                    }, 1000);
                }
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to send upgrade offer');
        } finally {
            setApplying(null);
        }
    };

    if (loading) {
        return (
            <div className="reallocation-page">
                <div className="loading-container">
                    <div className="spinner"></div>
                    <p>Loading reallocation data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="reallocation-page">
            <Toaster
                position="top-right"
                reverseOrder={false}
                toastOptions={{
                    duration: 4000,
                    style: {
                        background: '#333',
                        color: '#fff',
                        borderRadius: '10px',
                        padding: '16px',
                        fontSize: '14px',
                        fontWeight: '500',
                    },
                    success: { style: { background: '#10b981' } },
                    error: { style: { background: '#ef4444' } },
                }}
            />

            <div className="page-header">
                <div className="header-left">
                    <button className="back-btn" onClick={onClose} title="Go back">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M19 12H5M12 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <h1>🔄 Dynamic RAC Reallocation System</h1>
                    <div className="train-info">
                        {trainState && (
                            <>
                                <span className="train-name">{trainState.trainName}</span>
                                <span className="train-no">#{trainState.trainNo}</span>
                                <span className="current-station">
                                    📍 {trainState.stations[trainState.currentStationIdx]?.name}
                                </span>
                            </>
                        )}
                    </div>
                </div>

                <div className="tabs-container">
                    <button className={`tab ${activeTab === 'global' ? 'active' : ''}`} onClick={() => setActiveTab('global')}>
                        🌍 Global Matrix
                    </button>
                    <button className={`tab ${activeTab === 'station-wise' ? 'active' : ''}`} onClick={() => setActiveTab('station-wise')}>
                        🚉 Station-Wise
                    </button>
                    <button className={`tab ${activeTab === 'hashmap' ? 'active' : ''}`} onClick={() => setActiveTab('hashmap')}>
                        🗺️ HashMap (PNR→Destination)
                    </button>
                    <button className={`tab ${activeTab === 'matching' ? 'active' : ''}`} onClick={() => setActiveTab('matching')}>
                        🎯 Current Station Matching
                    </button>
                </div>
            </div>

            {activeTab === 'global' && (
                <div className="matrix-section">
                    <div className="section-header">
                        <div>
                            <h2>✨ Eligibility Matrix</h2>
                            <p className="matrix-description">
                                Shows eligible RAC passengers for vacant berths based on journey overlap and eligibility rules
                            </p>
                        </div>
                        <button className="btn-refresh" onClick={fetchEligibilityMatrix} title="Refresh matrix">
                            🔄 Refresh
                        </button>
                    </div>

                    {eligibilityMatrix.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon">📭</div>
                            <h3>No Eligible Matches Found</h3>
                            <p>There are currently no RAC passengers eligible for vacant berths.</p>
                            <button className="btn-primary" onClick={fetchEligibilityMatrix}>
                                🔄 Refresh Matrix
                            </button>
                        </div>
                    ) : (
                        <div className="matrix-grid">
                            {eligibilityMatrix.map((item, index) => {
                                const candidate = item.topCandidate || item.topEligible;
                                const hasCandidate = !!candidate;

                                return (
                                    <div key={index} className={`matrix-card ${hasCandidate ? 'has-candidate' : 'no-candidate'}`}>
                                        <div className="card-header">
                                            <div className="berth-info">
                                                <h3>🛏️ {item.coach}-{item.berthNo}</h3>
                                                <span className="berth-type">{item.type || item.berthType}</span>
                                            </div>
                                            <span className={`class-badge ${item.class}`}>
                                                {item.class || 'SL'}
                                            </span>
                                        </div>

                                        <div className="vacancy-section">
                                            <p className="section-label">📍 Vacant Route</p>
                                            <div className="route">
                                                <span className="station">{item.vacantFrom}</span>
                                                <span className="arrow">→</span>
                                                <span className="station">{item.vacantTo}</span>
                                            </div>
                                        </div>

                                        {hasCandidate && candidate ? (
                                            <>
                                                <div className="candidate-section">
                                                    <p className="section-label">👤 Top Candidate</p>
                                                    <h4 className="candidate-name">{candidate.name}</h4>
                                                    <div className="candidate-details">
                                                        <span className="detail-item">
                                                            <strong>PNR:</strong> {candidate.pnr}
                                                        </span>
                                                        <span className="detail-item rac-badge">
                                                            {candidate.racStatus || 'RAC'}
                                                        </span>
                                                    </div>
                                                    <div className="candidate-journey">
                                                        <span className="journey-label">Journey:</span>
                                                        <span className="journey-route">
                                                            {candidate.from} → {candidate.to}
                                                        </span>
                                                    </div>
                                                </div>

                                                <button
                                                    className={`btn-apply ${applying === index ? 'applying' : ''}`}
                                                    onClick={() => sendUpgradeOffer(item, index)}
                                                    disabled={applying === index}
                                                >
                                                    {applying === index ? (
                                                        <>
                                                            <div className="btn-spinner"></div>
                                                            Sending...
                                                        </>
                                                    ) : (
                                                        <>📤 Send Offer</>
                                                    )}
                                                </button>
                                            </>
                                        ) : (
                                            <div className="no-candidate-section">
                                                <p className="no-candidate-text">
                                                    ℹ️ No eligible passengers for this berth segment
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'station-wise' && (
                <div className="station-wise-section">
                    <StationWiseView
                        stationWiseData={stationWiseData}
                        trainState={trainState}
                        onRefresh={fetchStationWiseData}
                    />
                </div>
            )}

            {activeTab === 'hashmap' && (
                <div className="hashmap-tab-content">
                    <HashMapView
                        stationWiseData={stationWiseData}
                        trainState={trainState}
                        onRefresh={fetchStationWiseData}
                    />
                </div>
            )}

            {activeTab === 'matching' && (
                <div className="matching-tab-content">
                    <CurrentStationMatchingView />
                </div>
            )}
        </div>
    );
};

const StationWiseView = ({ stationWiseData, trainState, onRefresh }: StationWiseViewProps): React.ReactElement => {
    if (!stationWiseData) {
        return (
            <div className="empty-state">
                <div className="empty-icon">⏳</div>
                <h3>Loading Station Data...</h3>
                <button className="btn-primary" onClick={onRefresh}>
                    🔄 Refresh
                </button>
            </div>
        );
    }

    const { currentStation, boardedRAC, vacantBerths, pendingReallocations, stats } = stationWiseData;

    return (
        <div className="station-wise-content">
            <div className="station-info-card">
                <h2>📍 Current Station: {currentStation.name} ({currentStation.code})</h2>
                <div className="station-stats">
                    <span className="stat-badge">🧑 Boarded RAC: {stats.boardedRACCount}</span>
                    <span className="stat-badge">🛏️ Vacant Berths: {stats.vacantBerthsCount}</span>
                    <span className="stat-badge">⏳ Pending: {stats.pendingCount}</span>
                </div>
                <button className="btn-refresh" onClick={onRefresh} title="Refresh data">
                    🔄 Refresh
                </button>
            </div>

            <div className="three-column-layout">
                <div className="column">
                    <h3>🧑 Boarded RAC Passengers</h3>
                    {boardedRAC.length === 0 ? (
                        <p className="no-data">No boarded RAC passengers</p>
                    ) : (
                        <div className="table-container">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>PNR</th>
                                        <th>RAC#</th>
                                        <th>Journey</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {boardedRAC.map((rac, idx) => (
                                        <tr key={idx}>
                                            <td>{rac.name}</td>
                                            <td>{rac.pnr}</td>
                                            <td><span className="rac-badge">{rac.racStatus}</span></td>
                                            <td>{rac.from} → {rac.to}</td>
                                            <td><span className={`status-badge ${rac.passengerStatus}`}>{rac.passengerStatus}</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div className="column">
                    <h3>🛏️ Vacant Berths</h3>
                    {vacantBerths.length === 0 ? (
                        <p className="no-data">No vacant berths from this station</p>
                    ) : (
                        <div className="table-container">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Berth</th>
                                        <th>Type</th>
                                        <th>Class</th>
                                        <th>Vacant Range</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {vacantBerths.map((berth, idx) => (
                                        <tr key={idx}>
                                            <td><strong>{berth.berth}</strong></td>
                                            <td>{berth.type}</td>
                                            <td><span className={`class-badge ${berth.class}`}>{berth.class}</span></td>
                                            <td>{berth.vacantFrom} → {berth.vacantTo}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div className="column">
                    <h3>⏳ Pending Reallocations</h3>
                    {pendingReallocations.length === 0 ? (
                        <p className="no-data">No pending reallocations</p>
                    ) : (
                        <div className="reallocations-list">
                            {pendingReallocations.map((realloc, idx) => (
                                <div key={idx} className="reallocation-card">
                                    <div className="realloc-header">
                                        <strong>{realloc.passengerName}</strong>
                                        <span className={`status-pill ${realloc.status}`}>{realloc.status}</span>
                                    </div>
                                    <div className="realloc-details">
                                        <p>📋 PNR: {realloc.passengerPNR}</p>
                                        <p>📍 Journey: {realloc.passengerFrom} → {realloc.passengerTo}</p>
                                        <p>🛏️ Current: {realloc.currentBerth} ({realloc.currentRAC})</p>
                                        <p className="proposed">✨ Proposed: {realloc.proposedBerthFull}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const HashMapView = ({ stationWiseData, trainState, onRefresh }: HashMapViewProps): React.ReactElement => {
    if (!stationWiseData) {
        return (
            <div className="empty-state">
                <div className="empty-icon">⏳</div>
                <h3>Loading HashMap Data...</h3>
                <button className="btn-primary" onClick={onRefresh}>
                    🔄 Refresh
                </button>
            </div>
        );
    }

    const { boardedRAC, stats } = stationWiseData;

    return (
        <div className="hashmap-view-content">
            <div className="hashmap-header">
                <div className="header-content">
                    <h2>🗺️ RAC Passenger HashMap</h2>
                    <p className="header-description">
                        Optimized data structure using JavaScript Map for O(1) constant-time lookups.
                        Key: PNR Number → Value: Destination & Journey Details
                    </p>
                </div>
                <button className="btn-refresh" onClick={onRefresh}>
                    🔄 Refresh
                </button>
            </div>

            <div className="hashmap-stats">
                <div className="stat-card">
                    <div className="stat-icon">📊</div>
                    <div className="stat-content">
                        <div className="stat-label">Total Entries</div>
                        <div className="stat-value">{boardedRAC.length}</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">⚡</div>
                    <div className="stat-content">
                        <div className="stat-label">Lookup Time</div>
                        <div className="stat-value">O(1)</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">🧮</div>
                    <div className="stat-content">
                        <div className="stat-label">Data Structure</div>
                        <div className="stat-value">HashMap</div>
                    </div>
                </div>
            </div>

            {boardedRAC.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">📭</div>
                    <h3>No RAC Passengers Boarded</h3>
                    <p>HashMap will populate when RAC passengers board the train</p>
                </div>
            ) : (
                <div className="hashmap-section">
                    <div className="section-header">
                        <h3>PNR → Destination Mapping</h3>
                        <span className="hashmap-badge">O(1) Lookup</span>
                    </div>
                    <div className="hashmap-grid">
                        {boardedRAC.map((passenger, idx) => (
                            <div key={idx} className="hashmap-card">
                                <div className="hashmap-key">
                                    <span className="key-label">Key:</span>
                                    <span className="key-value">{passenger.pnr}</span>
                                </div>
                                <div className="hashmap-arrow">→</div>
                                <div className="hashmap-value">
                                    <div className="value-destination">
                                        <span className="dest-label">Destination:</span>
                                        <span className="dest-value">{passenger.to}</span>
                                    </div>
                                    <div className="value-details">
                                        <span className="detail-item">From: {passenger.from}</span>
                                        <span className="detail-item rac-number">{passenger.racStatus}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const CurrentStationMatchingView = (): React.ReactElement => {
    const [matchingData, setMatchingData] = useState<MatchingData | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [creating, setCreating] = useState<boolean>(false);

    useEffect(() => {
        fetchMatchingData();
    }, []);

    const fetchMatchingData = async (): Promise<void> => {
        try {
            setLoading(true);
            const res = await apiClient.get('/reallocation/current-station-matching');
            setMatchingData(res.data.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching matching data:', error);
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
                <p>Loading current station matching data...</p>
            </div>
        );
    }

    if (!matchingData) {
        return (
            <div className="empty-state">
                <div className="empty-icon">⚠️</div>
                <h3>No Data Available</h3>
                <button className="btn-primary" onClick={fetchMatchingData}>
                    🔄 Retry
                </button>
            </div>
        );
    }

    const { currentStation, racPassengersHashMap, vacantBerthsHashMap, matches, stats } = matchingData;
    const racPassengers = Object.entries(racPassengersHashMap);
    const vacantBerths = Object.entries(vacantBerthsHashMap);

    const handleCreatePendingReallocations = async (): Promise<void> => {
        if (matches.length === 0) {
            alert('No matches available to create reallocations');
            return;
        }

        if (!window.confirm(`Create ${matches.length} pending reallocations for TTE approval?`)) {
            return;
        }

        try {
            setCreating(true);
            const res = await apiClient.post('/reallocation/create-from-matches');
            alert(`✅ Created ${res.data.created} pending reallocations!\nTTE can now approve them in the TTE Portal.`);
            fetchMatchingData();
        } catch (error: any) {
            console.error('Error creating pending reallocations:', error);
            alert('❌ Error creating reallocations: ' + error.message);
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="matching-view-content">
            <div className="matching-header">
                <div className="header-content">
                    <h2>🎯 Current Station Matching</h2>
                    <p className="header-description">
                        Station: <strong>{currentStation.name}</strong> |
                        RAC: {stats.racPassengersCount} |
                        Vacant: {stats.vacantBerthsCount} |
                        Matches: {stats.matchesCount}
                    </p>
                </div>
                <div className="header-actions">
                    <button
                        className="btn-primary"
                        onClick={handleCreatePendingReallocations}
                        disabled={creating || matches.length === 0}
                    >
                        {creating ? '⏳ Creating...' : '📤 Send to TTE for Approval'}
                    </button>
                    <button className="btn-refresh" onClick={fetchMatchingData}>
                        🔄 Refresh
                    </button>
                </div>
            </div>

            <div className="dual-hashmap-container">
                <div className="hashmap-column">
                    <div className="column-header">
                        <h3>👥 RAC Passengers (PNR → Destination)</h3>
                        <span className="count-badge">{stats.racPassengersCount}</span>
                    </div>
                    <div className="hashmap-list">
                        {racPassengers.length === 0 ? (
                            <div className="empty-message">No RAC passengers at current station</div>
                        ) : (
                            racPassengers.map(([pnr, passenger]) => (
                                <div key={pnr} className="hashmap-item rac-item">
                                    <div className="item-key">
                                        <span className="key-label">PNR:</span>
                                        <span className="key-value">{pnr}</span>
                                    </div>
                                    <div className="item-arrow">→</div>
                                    <div className="item-value">
                                        <div className="value-main">{passenger.destination}</div>
                                        <div className="value-meta">
                                            <span>{passenger.name}</span>
                                            <span className="rac-badge">{passenger.racStatus}</span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="hashmap-column">
                    <div className="column-header">
                        <h3>🛏️ Vacant Berths (Berth → Last Vacant Station)</h3>
                        <span className="count-badge">{stats.vacantBerthsCount}</span>
                    </div>
                    <div className="hashmap-list">
                        {vacantBerths.length === 0 ? (
                            <div className="empty-message">No vacant berths from current station</div>
                        ) : (
                            vacantBerths.map(([berthId, berth]) => (
                                <div key={berthId} className="hashmap-item berth-item">
                                    <div className="item-key">
                                        <span className="key-label">Berth:</span>
                                        <span className="key-value">{berthId}</span>
                                    </div>
                                    <div className="item-arrow">→</div>
                                    <div className="item-value">
                                        <div className="value-main">{berth.lastVacantStation}</div>
                                        <div className="value-meta">
                                            <span>{berth.type}</span>
                                            <span className="class-badge">{berth.class}</span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {matches && matches.length > 0 && (
                <div className="matches-section">
                    <div className="section-header">
                        <h3>✅ Eligible Matches</h3>
                        <span className="count-badge">{matches.length}</span>
                    </div>
                    <div className="matches-grid">
                        {matches.map((match, idx) => (
                            <div key={idx} className="match-card">
                                <div className="match-berth">
                                    <strong>{match.berthId}</strong>
                                    <span className="berth-type">{match.berth.type}</span>
                                </div>
                                <div className="match-arrow">⭐</div>
                                <div className="match-passengers">
                                    <div className="top-match">
                                        <strong>Top Match:</strong> {match.topMatch.name} ({match.topMatch.pnr})
                                    </div>
                                    {match.eligiblePassengers.length > 1 && (
                                        <div className="other-matches">
                                            +{match.eligiblePassengers.length - 1} other eligible
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReallocationPage;

