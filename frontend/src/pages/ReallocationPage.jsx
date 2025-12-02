import React, { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import * as api from '../services/apiWithErrorHandling';
import apiClient from '../services/apiWithErrorHandling';
import './ReallocationPage.css';

const ReallocationPage = ({ trainData, loadTrainState, onClose }) => {
    const [trainState, setTrainState] = useState(null);
    const [eligibilityMatrix, setEligibilityMatrix] = useState([]);
    const [loading, setLoading] = useState(true);
    const [applying, setApplying] = useState(null); // Track which card is being upgraded

    // Fetch all data
    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 10000); // Refresh every 10 seconds
        return () => clearInterval(interval);
    }, []);

    const fetchData = async () => {
        await Promise.all([
            fetchTrainState(),
            fetchEligibilityMatrix()
        ]);
        setLoading(false);
    };

    const fetchTrainState = async () => {
        try {
            const res = await api.getTrainState();
            setTrainState(res.data);
        } catch (error) {
            console.error('Error fetching train state:', error);
            toast.error('Failed to load train state');
        }
    };

    const fetchEligibilityMatrix = async () => {
        try {
            const res = await api.getEligibilityMatrix();
            const matrixData = res.data?.eligibility || res.data;
            setEligibilityMatrix(Array.isArray(matrixData) ? matrixData : []);
        } catch (error) {
            console.error('Error fetching eligibility matrix:', error);
            toast.error('Failed to load eligibility matrix');
        }
    };

    /**
     * Send upgrade offer to passenger (instead of auto-applying)
     * For online passengers: Send WebSocket notification
     * For offline passengers: Add to TTE offline upgrades queue
     */
    const sendUpgradeOffer = async (matrixItem, index) => {
        // Validate top candidate exists
        if (!matrixItem?.topCandidate && !matrixItem?.topEligible) {
            toast.error('No eligible candidate for this berth');
            return;
        }

        const candidate = matrixItem.topCandidate || matrixItem.topEligible;
        const isOnline = candidate.passengerStatus === 'Online';

        setApplying(index); // Set loading state for this specific card

        try {
            if (isOnline) {
                // Send upgrade offer to online passenger
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

                    // Refresh matrix after a delay
                    setTimeout(() => {
                        fetchEligibilityMatrix();
                    }, 1000);
                }
            } else {
                // Add to offline upgrades queue for TTE
                const res = await apiClient.post('/tte/offline-upgrades/add', {
                    pnr: candidate.pnr,
                    berthDetails: {
                        coach: matrixItem.coach,
                        berthNo: matrixItem.berthNo,
                        type: matrixItem.type || matrixItem.berthType
                    }
                });

                if (res.data.success) {
                    toast.info(
                        `📋 ${candidate.name} added to TTE offline upgrades. TTE confirmation required.`,
                        { duration: 4000, icon: 'ℹ️' }
                    );

                    setTimeout(() => {
                        fetchEligibilityMatrix();
                    }, 1000);
                }
            }
        } catch (error) {
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
            {/* Toast Notifications Container */}
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
                    success: {
                        style: {
                            background: '#10b981',
                        },
                    },
                    error: {
                        style: {
                            background: '#ef4444',
                        },
                    },
                }}
            />

            {/* Page Header */}
            <div className="page-header">
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

            {/* Eligibility Matrix Section */}
            <div className="matrix-section">
                <div className="section-header">
                    <div>
                        <h2>✨ Eligibility Matrix</h2>
                        <p className="matrix-description">
                            Shows eligible RAC passengers for vacant berths based on journey overlap and eligibility rules
                        </p>
                    </div>
                    <button
                        className="btn-refresh"
                        onClick={fetchEligibilityMatrix}
                        title="Refresh matrix"
                    >
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
                                <div
                                    key={index}
                                    className={`matrix-card ${hasCandidate ? 'has-candidate' : 'no-candidate'}`}
                                >
                                    {/* Card Header */}
                                    <div className="card-header">
                                        <div className="berth-info">
                                            <h3>🛏️ {item.coach}-{item.berthNo}</h3>
                                            <span className="berth-type">{item.type || item.berthType}</span>
                                        </div>
                                        <span className={`class-badge ${item.class}`}>
                                            {item.class || 'SL'}
                                        </span>
                                    </div>

                                    {/* Vacancy Information */}
                                    <div className="vacancy-section">
                                        <p className="section-label">📍 Vacant Route</p>
                                        <div className="route">
                                            <span className="station">{item.vacantFrom}</span>
                                            <span className="arrow">→</span>
                                            <span className="station">{item.vacantTo}</span>
                                        </div>
                                    </div>

                                    {/* Candidate Information */}
                                    {hasCandidate ? (
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

                                            {/* Send Offer Button */}
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
                                                    <>
                                                        📤 Send Offer
                                                    </>
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
        </div>
    );
};

export default ReallocationPage;
