import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import './UpgradeOffersPage.css';

const UpgradeOffersPage = () => {
    const [offers, setOffers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [accepting, setAccepting] = useState(null);
    const [pnr, setPnr] = useState(null);

    // Get IRCTC ID from logged-in user
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    const irctcId = user?.irctcId;

    useEffect(() => {
        if (irctcId) {
            fetchPassengerPNR(irctcId);
        } else {
            setLoading(false); // Stop loading if no IRCTC ID
        }
    }, [irctcId]);

    // Fetch PNR using IRCTC ID
    const fetchPassengerPNR = async (irctcId) => {
        setLoading(true);
        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}/api/passenger/pnr-by-irctc/${irctcId}`);
            const data = await response.json();

            if (data.success && data.data) {
                const passengerPNR = data.data.PNR_Number;
                setPnr(passengerPNR);
                fetchUpgradeOffers(passengerPNR);
            } else {
                setLoading(false);
            }
        } catch (error) {
            console.error('Error fetching passenger PNR:', error);
            setLoading(false);
        }
    };

    const fetchUpgradeOffers = async (pnr) => {
        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}/api/passenger/upgrade-notifications/${pnr}`);
            const data = await response.json();

            if (data.success) {
                setOffers(data.data || []);
            }
        } catch (error) {
            console.error('Error fetching upgrade offers:', error);
        } finally {
            setLoading(false);
        }
    };

    const acceptOffer = async (offer) => {
        setAccepting(offer.offerId);
        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}/api/passenger/accept-upgrade`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pnr: pnr,
                    offerId: offer.offerId,
                    berth: offer.berth
                })
            });

            const data = await response.json();

            if (data.success) {
                toast.success('🎉 Upgrade accepted! Your new berth has been assigned.');
                fetchUpgradeOffers(pnr);
            } else {
                toast.error(data.message || 'Failed to accept upgrade');
            }
        } catch (error) {
            toast.error('Error accepting upgrade');
        } finally {
            setAccepting(null);
        }
    };

    const denyOffer = async (offer) => {
        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}/api/passenger/deny-upgrade`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pnr: pnr,
                    offerId: offer.offerId
                })
            });

            const data = await response.json();

            if (data.success) {
                toast.success('Upgrade offer declined');
                fetchUpgradeOffers(pnr);
            } else {
                toast.error(data.message || 'Failed to decline upgrade');
            }
        } catch (error) {
            toast.error('Error declining upgrade');
        }
    };

    if (loading) {
        return (
            <div className="upgrade-offers-page">
                <div className="loading-container">
                    <div className="spinner"></div>
                    <p className="header-subtitle">
                        Loading your upgrade opportunities...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="upgrade-offers-page">
            {!irctcId ? (
                <div className="empty-state">
                    <div className="empty-icon">🔐</div>
                    <h3>Login Required</h3>
                    <p>Please log in with your IRCTC ID to view upgrade offers.</p>
                    <p className="hint">You need to be logged in to see available upgrade opportunities.</p>
                </div>
            ) : !pnr ? (
                <div className="empty-state">
                    <div className="empty-icon">❌</div>
                    <h3>No Booking Found</h3>
                    <p>We couldn't find a booking associated with your IRCTC ID.</p>
                    <p className="hint">Please make sure you have a valid train booking.</p>
                </div>
            ) : offers.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">📭</div>
                    <h3>No Upgrade Offers Available</h3>
                    <p>You don't have any pending upgrade offers at the moment.</p>
                    <p className="hint">Offers will appear here when a confirmed berth becomes available.</p>
                </div>
            ) : (
                <div className="offers-grid">
                    {offers.map((offer, index) => (
                        <div
                            key={offer.offerId || offer.id || `offer-${index}`}
                            className={`offer-card ${offer.status === 'expired' ? 'expired' : ''}`}
                        >
                            <div className="offer-header">
                                <div className="offer-badge">
                                    {offer.status === 'pending' ? '🔔 New Offer' : '⏰ Expired'}
                                </div>
                                <div className="offer-time">
                                    {new Date(offer.createdAt).toLocaleString()}
                                </div>
                            </div>

                            <div className="offer-body">
                                <div className="berth-info">
                                    <h3>🛏️ {offer.berth}</h3>
                                    <span className="berth-type">{offer.berthType}</span>
                                </div>

                                <div className="upgrade-details">
                                    <div className="detail-row">
                                        <span className="label">Current Status:</span>
                                        <span className="value status-rac">RAC</span>
                                    </div>
                                    <div className="detail-row">
                                        <span className="label">New Status:</span>
                                        <span className="value status-cnf">Confirmed (CNF)</span>
                                    </div>
                                    <div className="detail-row">
                                        <span className="label">Coach:</span>
                                        <span className="value">{offer.coach}</span>
                                    </div>
                                    <div className="detail-row">
                                        <span className="label">Berth Number:</span>
                                        <span className="value">{offer.berthNo}</span>
                                    </div>
                                </div>

                                {offer.expiresAt && (
                                    <div className="expiry-info">
                                        <span className="expiry-label">⏱️ Expires:</span>
                                        <span className="expiry-time">
                                            {new Date(offer.expiresAt).toLocaleTimeString()}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {offer.status === 'pending' && (
                                <div className="offer-actions">
                                    <button
                                        className="btn-accept"
                                        onClick={() => acceptOffer(offer)}
                                        disabled={accepting === offer.offerId}
                                    >
                                        {accepting === offer.offerId ? 'Accepting...' : '✅ Accept Upgrade'}
                                    </button>
                                    <button
                                        className="btn-deny"
                                        onClick={() => denyOffer(offer)}
                                        disabled={accepting === offer.offerId}
                                    >
                                        ❌ Decline
                                    </button>
                                </div>
                            )}

                            {offer.status === 'expired' && (
                                <div className="expired-message">
                                    This offer has expired
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default UpgradeOffersPage;
