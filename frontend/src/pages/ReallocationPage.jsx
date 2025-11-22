// frontend/src/pages/ReallocationPage.jsx
import React, { useState, useEffect } from 'react';
import api from '../services/api';
import './ReallocationPage.css';

const ReallocationPage = () => {
    const [trainState, setTrainState] = useState(null);
    const [vacantBerths, setVacantBerths] = useState([]);
    const [racQueue, setRacQueue] = useState([]);
    const [eligibilityMatrix, setEligibilityMatrix] = useState([]);
    const [upgradeNotifications, setUpgradeNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('vacant');
    const [selectedPNR, setSelectedPNR] = useState('');
    const [pnrDetails, setPnrDetails] = useState(null);

    // Fetch all data
    useEffect(() => {
        fetchAllData();
        const interval = setInterval(fetchAllData, 5000); // Refresh every 5 seconds
        return () => clearInterval(interval);
    }, []);

    const fetchAllData = async () => {
        try {
            const [stateRes, vacantRes, queueRes] = await Promise.all([
                api.get('/train/state'),
                api.get('/train/vacant-berths'),
                api.get('/train/rac-queue')
            ]);

            setTrainState(stateRes.data.data);
            setVacantBerths(vacantRes.data.data || []);
            setRacQueue(queueRes.data.data || []);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching data:', error);
            setLoading(false);
        }
    };

    const fetchEligibilityMatrix = async () => {
        try {
            const res = await api.get('/reallocation/eligibility');
            setEligibilityMatrix(res.data.data || []);
        } catch (error) {
            console.error('Error fetching eligibility matrix:', error);
        }
    };

    const searchPNR = async (e) => {
        e.preventDefault();
        if (!selectedPNR) return;

        try {
            const res = await api.get(`/passenger/pnr/${selectedPNR}`);
            setPnrDetails(res.data.data);
        } catch (error) {
            alert(error.response?.data?.message || 'PNR not found');
            setPnrDetails(null);
        }
    };

    const markNoShow = async (pnr) => {
        if (!window.confirm(`Mark passenger ${pnr} as No-Show?`)) return;

        try {
            await api.post('/passenger/cancel', { pnr });
            alert('Passenger marked as No-Show successfully');
            fetchAllData();
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to mark no-show');
        }
    };

    if (loading) {
        return (
            <div className="reallocation-page">
                <div className="loading">Loading reallocation data...</div>
            </div>
        );
    }

    return (
        <div className="reallocation-page">
            <div className="page-header">
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

            {/* Tab Navigation */}
            <div className="tab-navigation">
                <button
                    className={`tab ${activeTab === 'vacant' ? 'active' : ''}`}
                    onClick={() => setActiveTab('vacant')}
                >
                    Vacant Berths ({vacantBerths.length})
                </button>
                <button
                    className={`tab ${activeTab === 'rac' ? 'active' : ''}`}
                    onClick={() => setActiveTab('rac')}
                >
                    RAC Queue ({racQueue.length})
                </button>
                <button
                    className={`tab ${activeTab === 'eligibility' ? 'active' : ''}`}
                    onClick={() => {
                        setActiveTab('eligibility');
                        fetchEligibilityMatrix();
                    }}
                >
                    Eligibility Matrix
                </button>
                <button
                    className={`tab ${activeTab === 'pnr' ? 'active' : ''}`}
                    onClick={() => setActiveTab('pnr')}
                >
                    PNR Lookup
                </button>
            </div>

            {/* Vacant Berths Tab */}
            {activeTab === 'vacant' && (
                <div className="tab-content">
                    <h2>🛏️ Vacant Berths</h2>
                    {vacantBerths.length === 0 ? (
                        <div className="empty-state">No vacant berths available</div>
                    ) : (
                        <div className="berths-grid">
                            {vacantBerths.map((berth, index) => (
                                <div key={index} className="berth-card vacant">
                                    <div className="berth-header">
                                        <span className="berth-id">
                                            {berth.coachName}-{berth.berthNo}
                                        </span>
                                        <span className={`berth-type ${berth.berthType.toLowerCase()}`}>
                                            {berth.berthType}
                                        </span>
                                    </div>
                                    <div className="vacant-segments">
                                        <h4>Vacant Segments:</h4>
                                        {berth.vacantSegments.map((seg, idx) => (
                                            <div key={idx} className="segment">
                                                <span className="segment-route">
                                                    {seg.startStation} → {seg.endStation}
                                                </span>
                                                <span className="segment-range">
                                                    ({seg.startStationName} to {seg.endStationName})
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* RAC Queue Tab */}
            {activeTab === 'rac' && (
                <div className="tab-content">
                    <h2>📋 RAC Queue (Priority Order)</h2>
                    {racQueue.length === 0 ? (
                        <div className="empty-state">RAC queue is empty</div>
                    ) : (
                        <div className="rac-table">
                            <table>
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>PNR</th>
                                        <th>Name</th>
                                        <th>RAC Status</th>
                                        <th>Journey</th>
                                        <th>Current Berth</th>
                                        <th>Boarded</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {racQueue.map((passenger, index) => (
                                        <tr key={passenger.pnr} className={passenger.boarded ? 'boarded' : 'pending'}>
                                            <td>{index + 1}</td>
                                            <td className="pnr">{passenger.pnr}</td>
                                            <td>{passenger.name}</td>
                                            <td>
                                                <span className="rac-badge">{passenger.racStatus}</span>
                                            </td>
                                            <td className="journey">
                                                {passenger.from} → {passenger.to}
                                            </td>
                                            <td>{passenger.berth || 'N/A'}</td>
                                            <td>
                                                <span className={`status-badge ${passenger.boarded ? 'yes' : 'no'}`}>
                                                    {passenger.boarded ? '✓ Yes' : '✗ No'}
                                                </span>
                                            </td>
                                            <td>
                                                {!passenger.noShow && (
                                                    <button
                                                        className="btn-danger btn-small"
                                                        onClick={() => markNoShow(passenger.pnr)}
                                                    >
                                                        Mark No-Show
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Eligibility Matrix Tab */}
            {activeTab === 'eligibility' && (
                <div className="tab-content">
                    <h2>✅ Eligibility Matrix</h2>
                    <p className="matrix-description">
                        Shows which RAC passengers are eligible for which vacant berths based on journey coverage
                    </p>
                    {eligibilityMatrix.length === 0 ? (
                        <div className="empty-state">No eligibility data available. Click "Refresh" to check.</div>
                    ) : (
                        <div className="eligibility-grid">
                            {eligibilityMatrix.map((item, index) => (
                                <div key={index} className={`eligibility-card ${item.eligible ? 'eligible' : 'not-eligible'}`}>
                                    <div className="eligibility-header">
                                        <h4>{item.passenger.name} ({item.passenger.pnr})</h4>
                                        <span className={`status ${item.eligible ? 'eligible' : 'not-eligible'}`}>
                                            {item.eligible ? '✓ ELIGIBLE' : '✗ NOT ELIGIBLE'}
                                        </span>
                                    </div>
                                    <div className="eligibility-details">
                                        <p><strong>Berth:</strong> {item.berth.coachName}-{item.berth.berthNo}</p>
                                        <p><strong>Passenger Journey:</strong> {item.passenger.from} → {item.passenger.to}</p>
                                        <p><strong>Vacant Segment:</strong> {item.vacantSegment.from} → {item.vacantSegment.to}</p>
                                        {!item.eligible && item.reason && (
                                            <p className="reason"><strong>Reason:</strong> {item.reason}</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    <button className="btn-primary" onClick={fetchEligibilityMatrix}>
                        🔄 Refresh Matrix
                    </button>
                </div>
            )}

            {/* PNR Lookup Tab */}
            {activeTab === 'pnr' && (
                <div className="tab-content">
                    <h2>🔍 PNR Lookup</h2>
                    <form onSubmit={searchPNR} className="pnr-search-form">
                        <input
                            type="text"
                            placeholder="Enter PNR Number"
                            value={selectedPNR}
                            onChange={(e) => setSelectedPNR(e.target.value.toUpperCase())}
                            className="pnr-input"
                        />
                        <button type="submit" className="btn-primary">Search</button>
                    </form>

                    {pnrDetails && (
                        <div className="pnr-result-card">
                            <div className="pnr-header">
                                <h3>PNR: {pnrDetails.pnr}</h3>
                                <span className={`status-badge ${pnrDetails.pnrStatus.toLowerCase()}`}>
                                    {pnrDetails.pnrStatus}
                                </span>
                            </div>
                            <div className="pnr-details-grid">
                                <div className="detail-item">
                                    <span className="label">Name:</span>
                                    <span className="value">{pnrDetails.name}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="label">Age:</span>
                                    <span className="value">{pnrDetails.age}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="label">Gender:</span>
                                    <span className="value">{pnrDetails.gender}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="label">Train:</span>
                                    <span className="value">{pnrDetails.trainName} ({pnrDetails.trainNo})</span>
                                </div>
                                <div className="detail-item">
                                    <span className="label">Berth:</span>
                                    <span className="value">{pnrDetails.berth}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="label">Class:</span>
                                    <span className="value">{pnrDetails.class}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="label">RAC Status:</span>
                                    <span className="value">{pnrDetails.racStatus}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="label">Boarding:</span>
                                    <span className="value">{pnrDetails.boardingStation}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="label">Destination:</span>
                                    <span className="value">{pnrDetails.destinationStation}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="label">Boarded:</span>
                                    <span className="value">
                                        {pnrDetails.boarded ? '✓ Yes' : '✗ No'}
                                    </span>
                                </div>
                                <div className="detail-item">
                                    <span className="label">No-Show:</span>
                                    <span className="value">
                                        {pnrDetails.noShow ? '✓ Yes' : '✗ No'}
                                    </span>
                                </div>
                            </div>
                            {!pnrDetails.noShow && (
                                <button
                                    className="btn-danger"
                                    onClick={() => markNoShow(pnrDetails.pnr)}
                                >
                                    Mark as No-Show
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ReallocationPage;
