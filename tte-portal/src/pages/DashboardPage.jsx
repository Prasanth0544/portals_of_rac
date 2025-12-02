// tte-portal/src/pages/DashboardPage.jsx
import React, { useState, useEffect } from 'react';
import { tteAPI } from '../api';
import './DashboardPage.css';

function DashboardPage() {
    const [trainState, setTrainState] = useState(null);
    const [passengers, setPassengers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
        // Refresh every 30 seconds
        const interval = setInterval(loadData, 30000);
        return () => clearInterval(interval);
    }, []);

    const loadData = async () => {
        try {
            const [trainRes, passengersRes] = await Promise.all([
                tteAPI.getTrainState(),
                tteAPI.getPassengers({})
            ]);

            console.log('🔍 TTE Dashboard - Train Response:', trainRes);
            console.log('🔍 TTE Dashboard - Passengers Response:', passengersRes);

            if (trainRes.success) {
                setTrainState(trainRes.data);
                console.log('✅ Train state set:', trainRes.data);
            }

            if (passengersRes.success) {
                const pax = passengersRes.data.passengers || [];
                console.log('✅ Setting passengers count:', pax.length);
                setPassengers(pax);
            }
        } catch (error) {
            console.error('❌ Error loading dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="dashboard-loading">
                <p>Loading dashboard...</p>
            </div>
        );
    }

    // Calculate statistics
    const stats = {
        total: passengers.length,
        boarded: passengers.filter(p => p.boarded && !p.noShow).length,
        noShow: passengers.filter(p => p.noShow).length,
        pending: passengers.filter(p => !p.boarded && !p.noShow).length,
        cnf: passengers.filter(p => p.pnrStatus === 'CNF').length,
        rac: passengers.filter(p => p.pnrStatus === 'RAC').length,
        online: passengers.filter(p => p.passengerStatus?.toLowerCase() === 'online').length,
    };

    const currentStation = trainState?.stations?.[trainState.currentStationIdx];
    const nextStation = trainState?.stations?.[trainState.currentStationIdx + 1];
    const journeyStarted = trainState?.journeyStarted || false;

    return (
        <div className="tte-dashboard">
            {/* Header */}
            <div className="dashboard-header">
                <h1>TTE Dashboard</h1>
                <p className="dashboard-subtitle">Real-time overview of train journey and passenger status</p>
            </div>

            {/* Train Status Banner */}
            {trainState && (
                <div className="train-status-banner">
                    <div className="train-status-grid">
                        <div className="train-status-item">
                            <div className="train-icon">🚂</div>
                            <div className="train-status-content">
                                <h3>{trainState.trainNo || 'N/A'}</h3>
                                <p>{trainState.trainName || 'Train Status'}</p>
                            </div>
                        </div>
                        <div className="train-status-item">
                            <div className="train-status-content">
                                <div className="train-status-label">Current Station</div>
                                <h3>{currentStation?.name || 'N/A'}</h3>
                                <p>{currentStation?.code || ''}</p>
                            </div>
                        </div>
                        <div className="train-status-item">
                            <div className="train-status-content">
                                <div className="train-status-label">Next Station</div>
                                <h3>{nextStation?.name || 'End of Journey'}</h3>
                                <p>{nextStation?.code || ''}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Statistics Grid */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon primary">👥</div>
                    <div className="stat-value">{stats.total}</div>
                    <div className="stat-label">Total Passengers</div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon success">✅</div>
                    <div className="stat-value success">{stats.boarded}</div>
                    <div className="stat-label">Boarded</div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon warning">⏳</div>
                    <div className="stat-value warning">{stats.pending}</div>
                    <div className="stat-label">Pending</div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon danger">❌</div>
                    <div className="stat-value danger">{stats.noShow}</div>
                    <div className="stat-label">No-Show</div>
                </div>

                <div className="stat-card">
                    <div className="stat-value">{stats.cnf}</div>
                    <div className="stat-label">CNF</div>
                </div>

                <div className="stat-card">
                    <div className="stat-value">{stats.rac}</div>
                    <div className="stat-label">RAC</div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon success">⬆️</div>
                    <div className="stat-value success">{trainState?.stats?.totalRACUpgraded || 0}</div>
                    <div className="stat-label">Upgraded</div>
                </div>
            </div>

            {/* Journey Progress & Passenger Status */}
            <div className="dashboard-content-grid">
                {/* Journey Status Card */}
                <div className="journey-card">
                    <h3>Journey Status</h3>
                    <div className="card-divider"></div>

                    {journeyStarted ? (
                        <div>
                            <div className="journey-status-header">
                                <div className="status-chip">Journey In Progress</div>
                                <div className="journey-progress-text">
                                    Station {trainState.currentStationIdx + 1} of {trainState.stations?.length || 0}
                                </div>
                            </div>

                            <div className="current-station-row">
                                <span className="current-station-label">🚉 Current Station:</span>
                                <span className="current-station-value">{currentStation?.name || 'N/A'}</span>
                            </div>

                            <p className="journey-route">
                                Route: {trainState.originStation?.code} → {trainState.destinationStation?.code}
                            </p>

                            <div className="stations-covered-box">
                                <span className="stations-covered-label">Stations Covered</span>
                                <p className="stations-covered-list">
                                    {trainState.stations?.slice(0, trainState.currentStationIdx + 1)
                                        .map(s => s.code).join(' → ')}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="journey-not-started">
                            <p>Journey not started yet</p>
                            <p>Train will depart from {trainState?.originStation?.name || 'N/A'}</p>
                        </div>
                    )}
                </div>

                {/* Passenger Status Card */}
                <div className="passenger-status-card">
                    <h3>Passenger Status</h3>
                    <div className="card-divider"></div>

                    <div className="status-row">
                        <span className="status-row-label">Online Passengers:</span>
                        <span className="status-badge">{stats.online}</span>
                    </div>

                    <div className="status-row">
                        <span className="status-row-label">Offline Passengers:</span>
                        <span className="status-badge neutral">{stats.total - stats.online}</span>
                    </div>

                    <div className="card-divider"></div>

                    <div className="boarding-rate-section">
                        <span className="boarding-rate-label">Boarding Rate</span>
                        <div className="boarding-rate-value">
                            {stats.total > 0 ? Math.round((stats.boarded / stats.total) * 100) : 0}%
                        </div>
                        <p className="boarding-rate-description">
                            {stats.boarded} of {stats.total} passengers boarded
                        </p>
                    </div>
                </div>
            </div>

            {/* Quick Actions & Navigation - Matching Homepage Style */}
            <div className="action-cards-section">
                <h3 className="section-title">📊 Quick Statistics & Navigation</h3>

                <div className="stats-action-grid">
                    {/* Navigation Cards matching homepage */}
                    <div className="nav-card" onClick={() => window.location.href = '#/passengers'}>
                        <span className="nav-icon">👤➕</span>
                        <span className="nav-text">Add Passenger</span>
                    </div>

                    <div className="nav-card" onClick={() => window.location.href = '#/passengers'}>
                        <span className="nav-icon">🚂</span>
                        <span className="nav-text">Coaches & Berths</span>
                    </div>

                    <div className="nav-card" onClick={() => window.location.href = '#/passengers'}>
                        <span className="nav-icon">👥</span>
                        <span className="nav-text">Passenger List & Vacant Positions</span>
                    </div>

                    <div className="nav-card" onClick={() => window.location.href = '#/offline-upgrades'}>
                        <span className="nav-icon">📊</span>
                        <span className="nav-text">Segment View</span>
                    </div>

                    <div className="nav-card" onClick={() => window.location.href = '#/action-history'}>
                        <span className="nav-icon">⚙️</span>
                        <span className="nav-text">Update Config</span>
                    </div>

                    <div className="nav-card" onClick={() => window.location.href = '#/action-history'}>
                        <span className="nav-icon">🔍</span>
                        <span className="nav-text">Allocation Diagnostics</span>
                    </div>
                </div>
            </div>

            {/* Quick Tip */}
            <div className="quick-tip-box">
                <p>
                    💡 <strong>Quick Tip:</strong> Use the "Passenger Management" tab to view detailed passenger list,
                    "Offline Upgrades" for RAC reallocation, and "Action History" to review all TTE actions.
                </p>
            </div>
        </div>
    );
}

export default DashboardPage;
