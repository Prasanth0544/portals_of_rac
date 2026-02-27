import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import UpgradeOptionsCard from '../components/UpgradeOptionsCard';
import '../styles/pages/UpgradeOffersPage.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface UpgradeOffer {
    offerId?: string;
    id?: string;
    status: string;
    createdAt: string;
    berth: string;
    berthType: string;
    coach: string;
    berthNo: string;
    expiresAt?: string;
    expiresIn?: number; // milliseconds remaining
}

interface User {
    IRCTC_ID?: string;
    irctcId?: string;
}

const UpgradeOffersPage: React.FC = () => {
    const [offers, setOffers] = useState<UpgradeOffer[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [accepting, setAccepting] = useState<string | null>(null);
    const [denying, setDenying] = useState<string | null>(null);
    const [pnr, setPnr] = useState<string | null>(null);
    const [isRejected, setIsRejected] = useState<boolean>(false);
    const [passengerData, setPassengerData] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'offers' | 'class'>('offers');
    const lastRefetchRef = useRef<number>(0); // Throttle expired-offers refetch

    // Get IRCTC ID from logged-in user (handles both cases)
    const userStr = localStorage.getItem('user');
    const user: User | null = userStr ? JSON.parse(userStr) : null;
    const irctcId = user?.IRCTC_ID || user?.irctcId;

    useEffect(() => {
        if (irctcId) {
            fetchPassengerPNR(irctcId);
        } else {
            setLoading(false);
        }
    }, [irctcId]);

    // ✅ WebSocket for real-time offer delivery + polling fallback
    useEffect(() => {
        if (!pnr) return;

        const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:5000';
        const ws = new WebSocket(WS_URL);

        ws.onopen = (): void => {
            console.log('📡 UpgradeOffersPage: WebSocket connected');
            // Subscribe to PNR-specific offer updates
            ws.send(JSON.stringify({ type: 'subscribe:offers', payload: { pnr } }));
            // Identify as passenger
            ws.send(JSON.stringify({ type: 'IDENTIFY', role: 'PASSENGER', irctcId }));
        };

        ws.onmessage = (event: MessageEvent): void => {
            try {
                const data = JSON.parse(event.data);

                // New offer arrived
                if (data.type === 'upgrade:offer') {
                    console.log('🔔 New upgrade offer received via WebSocket:', data.payload);
                    fetchUpgradeOffers(pnr);
                }

                // Offer expired
                if (data.type === 'upgrade:expired') {
                    console.log('⏰ Offer expired:', data.payload);
                    fetchUpgradeOffers(pnr);
                }

                // Upgrade confirmed by TTE
                if (data.type === 'upgrade:confirmed') {
                    console.log('✅ Upgrade confirmed:', data.payload);
                    toast.success('✅ Your upgrade has been confirmed by the TTE!');
                    fetchUpgradeOffers(pnr);
                }

                // Upgrade rejected
                if (data.type === 'upgrade:rejected') {
                    console.log('❌ Upgrade rejected:', data.payload);
                    toast.error('Upgrade was not approved.');
                    fetchUpgradeOffers(pnr);
                }

                // Broadcast events that may affect offers
                if (data.type === 'RAC_REALLOCATION_APPROVED' || data.type === 'RAC_REALLOCATION') {
                    fetchUpgradeOffers(pnr);
                }

                // ✅ NEW: Station advanced — old offers are cleared, new ones may be created
                // Re-fetch offers AND re-check passenger eligibility (isRejected may change)
                if (data.type === 'STATION_ARRIVAL') {
                    console.log('🚉 Station advanced — refreshing upgrade offers');
                    if (irctcId) fetchPassengerPNR(irctcId);
                    fetchUpgradeOffers(pnr);
                }

                // ✅ NEW: Direct upgrade offer available for this passenger
                if (data.type === 'UPGRADE_OFFER_AVAILABLE') {
                    console.log('🔔 New upgrade offer available:', data);
                    if (irctcId) fetchPassengerPNR(irctcId);
                    fetchUpgradeOffers(pnr);
                }
            } catch (err) {
                console.error('WebSocket parse error:', err);
            }
        };

        ws.onerror = (error: Event): void => {
            console.error('UpgradeOffersPage WebSocket error:', error);
        };

        // Polling fallback every 30 seconds — also re-check passenger eligibility
        const pollInterval = setInterval(() => {
            if (irctcId) fetchPassengerPNR(irctcId);
            fetchUpgradeOffers(pnr);
        }, 30000);

        const handleLogoutEvent = () => {
            ws.close();
            clearInterval(pollInterval);
        };
        window.addEventListener('app:logout', handleLogoutEvent);

        return () => {
            ws.close();
            clearInterval(pollInterval);
            window.removeEventListener('app:logout', handleLogoutEvent);
        };
    }, [pnr]);

    // ✅ Countdown timer - updates every second for offer expiration
    useEffect(() => {
        if (offers.length === 0) return;

        const interval = setInterval(() => {
            const now = Date.now();
            let hasValid = false;

            setOffers(prevOffers => {
                const updated = prevOffers.map(offer => {
                    if (offer.expiresAt) {
                        const remaining = new Date(offer.expiresAt).getTime() - now;
                        if (remaining > 0) {
                            hasValid = true;
                            return { ...offer, expiresIn: remaining };
                        } else {
                            // ✅ Mark as expired client-side
                            return { ...offer, expiresIn: 0, status: 'expired' };
                        }
                    }
                    return offer;
                });

                // ✅ Remove expired offers from the list after a short delay
                // so the user briefly sees "Expired" before it disappears
                return updated.filter(o => o.expiresIn === undefined || o.expiresIn > 0);
            });

            // Refresh from server if all offers expired — throttle to max once per 30s
            if (!hasValid && pnr) {
                const now2 = Date.now();
                if (now2 - lastRefetchRef.current > 30000) {
                    lastRefetchRef.current = now2;
                    console.log('⏰ All offers expired — re-fetching for new offers');
                    fetchUpgradeOffers(pnr);
                }
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [offers.length, pnr]);

    const fetchPassengerPNR = async (irctcId: string): Promise<void> => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/passengers/by-irctc/${irctcId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();

            if (data.success && data.data) {
                const passengerPNR = data.data.PNR_Number;
                setPnr(passengerPNR);
                // ✅ Re-evaluate rejection status on EVERY fetch (not just mount)
                // At a new station, backend may have cleared old rejections or created new offers
                if (data.data.Upgrade_Status === 'REJECTED') {
                    setIsRejected(true);
                    setLoading(false);
                } else {
                    setIsRejected(false); // ✅ Clear rejection if status changed
                    fetchUpgradeOffers(passengerPNR);
                }
            } else {
                setLoading(false);
            }
        } catch (error) {
            console.error('Error fetching passenger PNR:', error);
            setLoading(false);
        }
    };

    const fetchUpgradeOffers = async (pnr: string): Promise<void> => {
        try {
            const response = await fetch(`${API_URL}/passenger/upgrade-notifications/${pnr}`);
            const data = await response.json();

            if (data.success) {
                // API returns { data: { pnr, count, notifications: [...] } }
                const notifications = data.data?.notifications || data.data || [];
                // ✅ Normalize status to lowercase (backend sends 'PENDING', frontend expects 'pending')
                const normalized = (Array.isArray(notifications) ? notifications : []).map((n: any) => ({
                    ...n,
                    status: (n.status || 'pending').toLowerCase(),
                }));
                setOffers(normalized);
            }
        } catch (error) {
            console.error('Error fetching upgrade offers:', error);
        } finally {
            setLoading(false);
        }
    };

    const acceptOffer = async (offer: UpgradeOffer): Promise<void> => {
        const offerId = offer.offerId || offer.id;
        if (!offerId) return;

        setAccepting(offerId);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/passenger/accept-upgrade`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    pnr: pnr,
                    notificationId: offerId  // backend expects notificationId
                })
            });

            const data = await response.json();

            if (data.success) {
                toast.success('🎉 Upgrade accepted! Your new berth has been assigned.');
                if (pnr) fetchUpgradeOffers(pnr);
            } else {
                toast.error(data.message || data.error || 'Failed to accept upgrade');
            }
        } catch (error) {
            toast.error('Error accepting upgrade');
        } finally {
            setAccepting(null);
        }
    };

    const denyOffer = async (offer: UpgradeOffer): Promise<void> => {
        const offerId = offer.offerId || offer.id;
        if (!offerId) return;

        setDenying(offerId);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/passenger/deny-upgrade`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    pnr: pnr,
                    offerId: offerId
                })
            });

            const data = await response.json();

            if (data.success) {
                toast.success('✅ Upgrade declined. You will not receive further upgrade offers for this journey.');
                if (pnr) fetchUpgradeOffers(pnr);
            } else {
                toast.error(data.message || 'Failed to decline upgrade');
            }
        } catch (error) {
            toast.error('❌ Error declining upgrade. Please try again.');
        } finally {
            setDenying(null);
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
                    <div className="empty-icon"></div>
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
            ) : isRejected ? (
                <div className="empty-state rejected-state">
                    <div className="empty-icon"></div>
                    <h3>Upgrade Not Available</h3>
                    <p>You previously declined an upgrade offer.</p>
                    <p className="hint">Passengers who decline upgrade offers are not eligible for further upgrades during this journey.</p>
                    <div className="pnr-badge">PNR: {pnr}</div>
                </div>
            ) : (
                <>
                    {/* ─── Tab Bar ─── */}
                    <div style={{
                        display: 'flex',
                        borderBottom: '2px solid #e2e8f0',
                        background: '#f8fafc',
                        borderRadius: '12px 12px 0 0',
                        marginBottom: '0',
                        overflow: 'hidden',
                    }}>
                        {([
                            { key: 'offers', label: '🎯 Upgrade Offers', color: '#f59e0b', badge: offers.length > 0 ? offers.length : undefined },
                            { key: 'class', label: '🚀 Class Upgrade', color: '#8b5cf6' },
                        ] as { key: string; label: string; color: string; badge?: number }[]).map(({ key, label, color, badge }) => {
                            const isActive = activeTab === key;
                            return (
                                <button
                                    key={key}
                                    onClick={() => setActiveTab(key as typeof activeTab)}
                                    style={{
                                        flex: 1,
                                        padding: '14px 20px',
                                        border: 'none',
                                        borderBottom: isActive ? `3px solid ${color}` : '3px solid transparent',
                                        background: isActive ? 'white' : 'transparent',
                                        color: isActive ? color : '#64748b',
                                        fontWeight: isActive ? 700 : 500,
                                        fontSize: '15px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                    }}
                                >
                                    {label}
                                    {badge !== undefined && (
                                        <span style={{
                                            background: color, color: 'white',
                                            borderRadius: '10px', padding: '1px 8px',
                                            fontSize: '12px', fontWeight: 700,
                                        }}>{badge}</span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* ─── Tab: Upgrade Offers ─── */}
                    {activeTab === 'offers' && (
                        <>
                            {/* Page Header */}
                            <div className="page-header">
                                <div className="header-content">
                                    <h1> Upgrade Offers</h1>
                                    <p className="header-subtitle">
                                        {offers.length > 0
                                            ? `You have ${offers.length} pending upgrade offer${offers.length > 1 ? 's' : ''}`
                                            : 'No pending offers at the moment'}
                                    </p>
                                </div>
                                <div className="header-stats">
                                    <div className="stat-badge">
                                        <span className="stat-label">PNR</span>
                                        <span className="stat-value">{pnr}</span>
                                    </div>
                                </div>
                            </div>

                            {/* ⚠️ OFFLINE STATUS Info Banner */}
                            {passengerData?.Online_Status === 'offline' && (
                                <div className="info-banner offline-banner" style={{
                                    backgroundColor: '#e3f2fd',
                                    border: '2px solid #1976d2',
                                    borderRadius: '12px',
                                    padding: '20px',
                                    margin: '20px 0',
                                    textAlign: 'center'
                                }}>
                                    <div style={{ fontSize: '32px', marginBottom: '12px' }}>ℹ️</div>
                                    <h3 style={{ color: '#1976d2', marginBottom: '12px', fontSize: '20px', fontWeight: '700' }}>
                                        Offline Passenger
                                    </h3>
                                    <p style={{ color: '#555', marginBottom: '8px', lineHeight: '1.6' }}>
                                        Your booking status is <strong>Offline</strong>. You are not eligible for automatic upgrade notifications through the Passenger Portal.
                                    </p>
                                    <p style={{ color: '#666', fontSize: '14px', lineHeight: '1.5' }}>
                                        For upgrade opportunities, please contact the <strong>Train Ticket Examiner (TTE)</strong> directly on board.
                                    </p>
                                </div>
                            )}

                            {offers.length === 0 ? (
                                <div className="empty-state">
                                    <div className="empty-icon">✉️</div>
                                    <h3>No Upgrade Offers Available</h3>
                                    <p>You don't have any pending upgrade offers at the moment.</p>
                                    <p className="hint">Offers will appear here when a confirmed berth becomes available.</p>
                                </div>
                            ) : (
                                <div className="offers-list">
                                    {offers.map((offer, index) => (
                                        <div
                                            key={offer.offerId || offer.id || `offer-${index}`}
                                            className={`offer-card-horizontal ${offer.status === 'expired' ? 'expired' : ''}`}
                                        >
                                            {/* Left Section - Status & Badge */}
                                            <div className="offer-left">
                                                <div className={`status-indicator ${offer.status}`}>
                                                    {offer.status === 'pending' ? '🔔' : '⏰'}
                                                </div>
                                                <div className="offer-meta">
                                                    <span className={`offer-badge ${offer.status}`}>
                                                        {offer.status === 'pending' ? 'New Offer' : 'Expired'}
                                                    </span>
                                                    {offer.expiresIn ? (
                                                        <span className={`countdown-timer ${offer.expiresIn < 60000 ? 'urgent' : ''}`}>
                                                            ⏱ {Math.floor(offer.expiresIn / 60000)}:{String(Math.floor((offer.expiresIn % 60000) / 1000)).padStart(2, '0')}
                                                        </span>
                                                    ) : (
                                                        <span className="offer-time">
                                                            {new Date(offer.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Center Section - Upgrade Visual */}
                                            <div className="offer-center">
                                                <div className="upgrade-visual">
                                                    <div className="from-status">
                                                        <span className="status-label">From</span>
                                                        <span className="status-badge rac">RAC</span>
                                                    </div>
                                                    <div className="upgrade-arrow">
                                                        <span>→</span>
                                                        <span className="arrow-label">UPGRADE</span>
                                                    </div>
                                                    <div className="to-status">
                                                        <span className="status-label">To</span>
                                                        <span className="status-badge cnf">CNF</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Right Section - Berth Details */}
                                            <div className="offer-right">
                                                <div className="berth-details">
                                                    <div className="berth-main">
                                                        <span className="berth-icon"></span>
                                                        <span className="berth-number">{offer.berth}</span>
                                                    </div>
                                                    <div className="berth-meta">
                                                        <span className="berth-type-badge">{offer.berthType}</span>
                                                        <span className="coach-info">Coach {offer.coach}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Actions Section */}
                                            <div className="offer-actions-section">
                                                {offer.status === 'pending' ? (
                                                    <>
                                                        <button
                                                            className="btn-accept"
                                                            onClick={() => acceptOffer(offer)}
                                                            disabled={accepting === (offer.offerId || offer.id) || !!denying}
                                                        >
                                                            {accepting === (offer.offerId || offer.id) ? '⏳ Accepting...' : '✅ Accept'}
                                                        </button>
                                                        <button
                                                            className="btn-deny"
                                                            onClick={() => denyOffer(offer)}
                                                            disabled={denying === (offer.offerId || offer.id) || !!accepting}
                                                        >
                                                            {denying === (offer.offerId || offer.id) ? '⏳ Declining...' : '❌ Decline'}
                                                        </button>
                                                    </>
                                                ) : (
                                                    <div className="expired-badge">Expired</div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}

                    {/* ─── Tab: Class Upgrade ─── */}
                    {activeTab === 'class' && (
                        <div style={{ padding: '20px 0' }}>
                            <UpgradeOptionsCard
                                irctcId={irctcId || ''}
                                pnr={pnr || ''}
                                passengerClass={passengerData?.Class}
                                pnrStatus={passengerData?.PNR_Status}
                                journeyStarted={true}
                            />
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default UpgradeOffersPage;
