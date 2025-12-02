import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import './UpgradeNotificationsPage.css';

const UpgradeNotificationsPage = () => {
    const [sentOffers, setSentOffers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSentOffers();

        // Refresh every 15 seconds
        const interval = setInterval(fetchSentOffers, 15000);
        return () => clearInterval(interval);
    }, []);

    const fetchSentOffers = async () => {
        try {
            // This would fetch from a TTE-specific endpoint showing all sent offers
            // For now, we'll use a placeholder
            // TODO: Create backend endpoint GET /api/tte/sent-offers
            const response = await fetch(`${process.env.REACT_APP_API_URL}/api/tte/sent-offers`);
            const data = await response.json();

            if (data.success) {
                setSentOffers(data.data || []);
            }
        } catch (error) {
            console.error('Error fetching sent offers:', error);
            setSentOffers([]); // Fallback to empty for now
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status) => {
        const badges = {
            'pending': { class: 'status-pending', text: '⏳ Pending', emoji: '⏳' },
            'accepted': { class: 'status-accepted', text: '✅ Accepted', emoji: '✅' },
            'denied': { class: 'status-denied', text: '❌ Denied', emoji: '❌' },
            'expired': { class: 'status-expired', text: '⏰ Expired', emoji: '⏰' },
        };
        return badges[status] || badges['pending'];
    };

    if (loading) {
        return (
            <div className="upgrade-notifications-page">
                <div className="loading-container">
                    <div className="spinner"></div>
                    <p>Loading sent upgrade offers...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="upgrade-notifications-page">
            <div className="page-header">
                <div className="header-content">
                    <h1>📤 Sent Upgrade Offers</h1>
                    <p className="header-subtitle">
                        Track RAC upgrade offers sent to online passengers via Passenger Portal
                    </p>
                </div>
                <button className="btn-refresh" onClick={fetchSentOffers}>
                    🔄 Refresh
                </button>
            </div>

            <div className="stats-bar">
                <div className="stat-card">
                    <div className="stat-value">{sentOffers.length}</div>
                    <div className="stat-label">Total Sent</div>
                </div>
                <div className="stat-card pending">
                    <div className="stat-value">
                        {sentOffers.filter(o => o.status === 'pending').length}
                    </div>
                    <div className="stat-label">Pending</div>
                </div>
                <div className="stat-card accepted">
                    <div className="stat-value">
                        {sentOffers.filter(o => o.status === 'accepted').length}
                    </div>
                    <div className="stat-label">Accepted</div>
                </div>
                <div className="stat-card denied">
                    <div className="stat-value">
                        {sentOffers.filter(o => o.status === 'denied').length}
                    </div>
                    <div className="stat-label">Denied</div>
                </div>
            </div>

            {sentOffers.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">📭</div>
                    <h3>No Upgrade Offers Sent</h3>
                    <p>Offers sent to online passengers will appear here.</p>
                    <p className="hint">
                        Use the Reallocation page to send upgrade offers to eligible RAC passengers.
                    </p>
                </div>
            ) : (
                <div className="offers-table-container">
                    <table className="offers-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>PNR</th>
                                <th>Passenger Name</th>
                                <th>Current Status</th>
                                <th>Offered Berth</th>
                                <th>Berth Type</th>
                                <th>Sent At</th>
                                <th>Expires At</th>
                                <th>Status</th>
                                <th>Response Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sentOffers.map((offer, index) => {
                                const statusBadge = getStatusBadge(offer.status);
                                return (
                                    <tr key={offer.pnr || offer.id || `offer-${index}`} className={`row-${offer.status}`}>
                                        <td>{index + 1}</td>
                                        <td className="pnr-cell">{offer.pnr}</td>
                                        <td className="name-cell">{offer.passengerName}</td>
                                        <td>
                                            <span className="badge badge-rac">RAC</span>
                                        </td>
                                        <td className="berth-cell">{offer.offeredBerth}</td>
                                        <td>{offer.berthType}</td>
                                        <td className="time-cell">
                                            {new Date(offer.sentAt).toLocaleString()}
                                        </td>
                                        <td className="time-cell">
                                            {offer.expiresAt
                                                ? new Date(offer.expiresAt).toLocaleTimeString()
                                                : '-'
                                            }
                                        </td>
                                        <td>
                                            <span className={`status-badge ${statusBadge.class}`}>
                                                {statusBadge.text}
                                            </span>
                                        </td>
                                        <td className="time-cell">
                                            {offer.respondedAt
                                                ? new Date(offer.respondedAt).toLocaleString()
                                                : '-'
                                            }
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default UpgradeNotificationsPage;
