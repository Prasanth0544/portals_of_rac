// passenger-portal/src/pages/ViewTicketPage.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import BoardingPass from '../components/BoardingPass';
import './ViewTicketPage.css';

const API_URL = 'http://localhost:5000/api';

function ViewTicketPage() {
    const [passenger, setPassenger] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showChangeModal, setShowChangeModal] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [modalStep, setModalStep] = useState(1);
    const [verifyData, setVerifyData] = useState({ irctcId: '', pnr: '' });
    const [cancelData, setCancelData] = useState({ irctcId: '', pnr: '' });
    const [availableStations, setAvailableStations] = useState([]);
    const [selectedStation, setSelectedStation] = useState(null);
    const [alreadyChanged, setAlreadyChanged] = useState(false);
    const [isCancelled, setIsCancelled] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [successMessage, setSuccessMessage] = useState(null);

    useEffect(() => {
        fetchPassengerData();
    }, []);

    const fetchPassengerData = async () => {
        try {
            setLoading(true);
            const userData = JSON.parse(localStorage.getItem('user') || '{}');

            if (!userData.irctcId) {
                setError('User not logged in');
                return;
            }

            const response = await axios.get(`${API_URL}/passengers/by-irctc/${userData.irctcId}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });

            if (response.data.success) {
                setPassenger(response.data.data);
                setAlreadyChanged(response.data.data.boardingStationChanged || false);
                setIsCancelled(response.data.data.NO_show || false);
            }
        } catch (err) {
            console.error('Error fetching passenger:', err);
            setError(err.response?.data?.message || 'Failed to fetch ticket details');
        } finally {
            setLoading(false);
        }
    };

    // ========== Change Boarding Station Handlers ==========
    const handleOpenChangeModal = () => {
        setShowChangeModal(true);
        setModalStep(1);
        setVerifyData({ irctcId: '', pnr: '' });
        setSelectedStation(null);
        setAvailableStations([]);
    };

    const handleCloseChangeModal = () => {
        setShowChangeModal(false);
        setModalStep(1);
        setVerifyData({ irctcId: '', pnr: '' });
        setSelectedStation(null);
    };

    const handleVerify = async () => {
        if (!verifyData.irctcId || !verifyData.pnr) {
            alert('Please enter both IRCTC ID and PNR Number');
            return;
        }

        setProcessing(true);
        try {
            const response = await axios.get(`${API_URL}/passenger/available-boarding-stations/${verifyData.pnr}`);

            if (response.data.success) {
                if (response.data.alreadyChanged) {
                    alert('Boarding station has already been changed once for this booking.');
                    handleCloseChangeModal();
                    return;
                }

                setAvailableStations(response.data.availableStations || []);

                if (response.data.availableStations?.length === 0) {
                    alert('No forward stations available for change.');
                    handleCloseChangeModal();
                    return;
                }

                setModalStep(2);
            }
        } catch (err) {
            console.error('Error verifying:', err);
            alert(err.response?.data?.message || 'Failed to verify PNR');
        } finally {
            setProcessing(false);
        }
    };

    const handleSelectStation = (station) => {
        setSelectedStation(station);
    };

    const handleProceedToConfirm = () => {
        if (!selectedStation) {
            alert('Please select a station');
            return;
        }
        setModalStep(3);
    };

    const handleConfirmChange = async () => {
        if (!selectedStation) return;

        const confirmResult = window.confirm(
            `Are you sure you want to change your boarding station to ${selectedStation.name} (${selectedStation.code})?\n\nThis action can only be done ONCE and cannot be undone.`
        );

        if (!confirmResult) return;

        setProcessing(true);
        try {
            const response = await axios.post(`${API_URL}/passenger/change-boarding-station`, {
                pnr: verifyData.pnr,
                irctcId: verifyData.irctcId,
                newStationCode: selectedStation.code
            });

            if (response.data.success) {
                setSuccessMessage(`Boarding station changed successfully to ${selectedStation.name}!`);
                setAlreadyChanged(true);
                handleCloseChangeModal();
                fetchPassengerData();
                setTimeout(() => setSuccessMessage(null), 5000);
            }
        } catch (err) {
            console.error('Error changing station:', err);
            alert(err.response?.data?.message || 'Failed to change boarding station');
        } finally {
            setProcessing(false);
        }
    };

    // ========== Cancel Ticket Handlers ==========
    const handleOpenCancelModal = () => {
        setShowCancelModal(true);
        setCancelData({ irctcId: '', pnr: '' });
    };

    const handleCloseCancelModal = () => {
        setShowCancelModal(false);
        setCancelData({ irctcId: '', pnr: '' });
    };

    const handleCancelTicket = async () => {
        if (!cancelData.irctcId || !cancelData.pnr) {
            alert('Please enter both IRCTC ID and PNR Number');
            return;
        }

        const confirmResult = window.confirm(
            '⚠️ Are you sure you want to CANCEL your ticket?\n\nThis will mark you as NO-SHOW and your berth will be made available for other passengers.\n\nThis action cannot be undone!'
        );

        if (!confirmResult) return;

        setProcessing(true);
        try {
            const response = await axios.post(`${API_URL}/passenger/self-cancel`, {
                pnr: cancelData.pnr,
                irctcId: cancelData.irctcId
            });

            if (response.data.success) {
                setSuccessMessage('Ticket cancelled successfully. Your berth is now available for other passengers.');
                setIsCancelled(true);
                handleCloseCancelModal();
                fetchPassengerData();
                setTimeout(() => setSuccessMessage(null), 5000);
            }
        } catch (err) {
            console.error('Error cancelling ticket:', err);
            alert(err.response?.data?.message || 'Failed to cancel ticket');
        } finally {
            setProcessing(false);
        }
    };

    if (loading) {
        return (
            <div className="view-ticket-page">
                <div className="page-header">
                    <h2>🎫 View Your Tickets</h2>
                </div>
                <div className="loading-container">
                    <p>Loading ticket details...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="view-ticket-page">
                <div className="page-header">
                    <h2>🎫 View Your Tickets</h2>
                </div>
                <div className="error-message">
                    ❌ {error}
                </div>
            </div>
        );
    }

    return (
        <div className="view-ticket-page">
            <div className="page-header">
                <h2>🎫 View Your Tickets</h2>
            </div>

            {successMessage && (
                <div className="success-message">
                    ✅ {successMessage}
                </div>
            )}

            {/* Cancelled Ticket Warning */}
            {isCancelled && (
                <div className="cancelled-notice">
                    ❌ This ticket has been cancelled. Your berth is no longer reserved.
                </div>
            )}

            {/* Action Buttons Section */}
            <div className="change-station-section">
                <div className="section-title">
                    🎫 Ticket Actions
                </div>

                {isCancelled ? (
                    <div className="already-changed-notice">
                        ❌ This ticket has been cancelled and no further actions are available.
                    </div>
                ) : (
                    <div className="action-buttons-row">
                        {/* Change Boarding Station */}
                        <div className="action-card">
                            <h4>📍 Change Boarding Station</h4>
                            {alreadyChanged ? (
                                <p className="notice-text">⚠️ Already changed once (limit reached)</p>
                            ) : (
                                <>
                                    <p className="info-text">
                                        Change to any of the next 3 upcoming stations. <strong>One-time only.</strong>
                                    </p>
                                    <button
                                        className="change-station-btn"
                                        onClick={handleOpenChangeModal}
                                    >
                                        🔄 Change Boarding Station
                                    </button>
                                </>
                            )}
                        </div>

                        {/* Cancel Ticket */}
                        <div className="action-card">
                            <h4>❌ Cancel Ticket</h4>
                            <p className="info-text">
                                Cancel your ticket and free up your berth for other passengers.
                            </p>
                            <button
                                className="cancel-ticket-btn"
                                onClick={handleOpenCancelModal}
                            >
                                ❌ Cancel Ticket
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* E-Boarding Pass */}
            {passenger && <BoardingPass passenger={passenger} />}

            {/* Change Station Modal */}
            {showChangeModal && (
                <div className="modal-overlay" onClick={handleCloseChangeModal}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>🔄 Change Boarding Station</h3>
                        </div>

                        <div className="step-indicator" style={{ padding: '20px 0' }}>
                            <div className="step">
                                <div className={`step-number ${modalStep >= 1 ? 'active' : ''}`}>1</div>
                            </div>
                            <div className={`step-line ${modalStep >= 2 ? 'active' : ''}`}></div>
                            <div className="step">
                                <div className={`step-number ${modalStep >= 2 ? 'active' : ''}`}>2</div>
                            </div>
                            <div className={`step-line ${modalStep >= 3 ? 'active' : ''}`}></div>
                            <div className="step">
                                <div className={`step-number ${modalStep >= 3 ? 'active' : ''}`}>3</div>
                            </div>
                        </div>

                        <div className="modal-body">
                            {modalStep === 1 && (
                                <>
                                    <div className="form-group">
                                        <label>IRCTC ID</label>
                                        <input
                                            type="text"
                                            placeholder="Enter your IRCTC ID"
                                            value={verifyData.irctcId}
                                            onChange={e => setVerifyData({ ...verifyData, irctcId: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>PNR Number</label>
                                        <input
                                            type="text"
                                            placeholder="Enter 10-digit PNR"
                                            value={verifyData.pnr}
                                            onChange={e => setVerifyData({ ...verifyData, pnr: e.target.value })}
                                            maxLength={10}
                                        />
                                    </div>
                                </>
                            )}

                            {modalStep === 2 && (
                                <>
                                    <p style={{ marginBottom: 15, color: '#5a6c7d' }}>
                                        Select your new boarding station (next 3 upcoming stations):
                                    </p>
                                    {availableStations.map((station, idx) => (
                                        <div
                                            key={station.code}
                                            className={`station-option ${selectedStation?.code === station.code ? 'selected' : ''}`}
                                            onClick={() => handleSelectStation(station)}
                                        >
                                            <div className="station-option-name">
                                                {idx + 1}. {station.name} ({station.code})
                                            </div>
                                            {station.arrivalTime && (
                                                <div className="station-option-time">
                                                    Arrival: {station.arrivalTime}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </>
                            )}

                            {modalStep === 3 && selectedStation && (
                                <div className="confirm-dialog">
                                    <div className="confirm-icon">⚠️</div>
                                    <div className="confirm-message">
                                        Are you sure you want to change your boarding station?
                                    </div>
                                    <div className="confirm-details">
                                        <div className="from-to">
                                            <span>{passenger?.Boarding_Station || passenger?.From}</span>
                                            <span className="arrow">→</span>
                                            <span style={{ color: '#27ae60' }}>{selectedStation.name}</span>
                                        </div>
                                    </div>
                                    <p style={{ color: '#e74c3c', fontSize: 14 }}>
                                        ⚠️ This action can only be done ONCE and cannot be undone.
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="modal-footer">
                            <button className="btn-cancel" onClick={handleCloseChangeModal}>
                                Cancel
                            </button>
                            {modalStep === 1 && (
                                <button className="btn-confirm" onClick={handleVerify} disabled={processing}>
                                    {processing ? 'Verifying...' : 'Verify & Continue'}
                                </button>
                            )}
                            {modalStep === 2 && (
                                <button className="btn-confirm" onClick={handleProceedToConfirm} disabled={!selectedStation}>
                                    Continue
                                </button>
                            )}
                            {modalStep === 3 && (
                                <button
                                    className="btn-confirm"
                                    onClick={handleConfirmChange}
                                    disabled={processing}
                                    style={{ background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)' }}
                                >
                                    {processing ? 'Processing...' : 'Confirm Change'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Cancel Ticket Modal */}
            {showCancelModal && (
                <div className="modal-overlay" onClick={handleCloseCancelModal}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header" style={{ background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)' }}>
                            <h3>❌ Cancel Ticket</h3>
                        </div>

                        <div className="modal-body">
                            <div className="confirm-dialog">
                                <div className="confirm-icon">⚠️</div>
                                <div className="confirm-message" style={{ color: '#e74c3c' }}>
                                    You are about to cancel your ticket
                                </div>
                                <p style={{ color: '#7f8c8d', marginBottom: 20 }}>
                                    This will mark you as NO-SHOW and your berth will be made available for other passengers.
                                </p>
                            </div>

                            <div className="form-group">
                                <label>IRCTC ID</label>
                                <input
                                    type="text"
                                    placeholder="Enter your IRCTC ID"
                                    value={cancelData.irctcId}
                                    onChange={e => setCancelData({ ...cancelData, irctcId: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>PNR Number</label>
                                <input
                                    type="text"
                                    placeholder="Enter 10-digit PNR"
                                    value={cancelData.pnr}
                                    onChange={e => setCancelData({ ...cancelData, pnr: e.target.value })}
                                    maxLength={10}
                                />
                            </div>

                            <div style={{ background: '#fef2f2', padding: 15, borderRadius: 8, marginTop: 15 }}>
                                <p style={{ color: '#e74c3c', fontSize: 14, margin: 0 }}>
                                    ⚠️ <strong>Warning:</strong> This action cannot be undone. Your berth will be permanently released.
                                </p>
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button className="btn-cancel" onClick={handleCloseCancelModal}>
                                Go Back
                            </button>
                            <button
                                className="btn-confirm"
                                onClick={handleCancelTicket}
                                disabled={processing || !cancelData.irctcId || !cancelData.pnr}
                                style={{ background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)' }}
                            >
                                {processing ? 'Cancelling...' : 'Confirm Cancellation'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ViewTicketPage;
