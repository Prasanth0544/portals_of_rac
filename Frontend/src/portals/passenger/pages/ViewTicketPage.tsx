// passenger-portal/src/pages/ViewTicketPage.tsx
import React, { useState, useEffect } from 'react';
import BoardingPass from '../components/BoardingPass';
import '../styles/pages/ViewTicketPage.css';
import api from '../api';

interface Station {
    code: string;
    name: string;
    arrivalTime?: string;
    idx?: number;
}

interface TrainState {
    journeyStarted?: boolean;
    currentStationIdx?: number;
    currentStationIndex?: number;
    stations?: Station[];
}

interface Passenger {
    PNR_Number?: string;
    Boarding_Station?: string;
    From?: string;
    boardingStationChanged?: boolean;
    NO_show?: boolean;
    [key: string]: unknown;
}

interface VerifyData {
    irctcId: string;
    pnr: string;
}

function ViewTicketPage(): React.ReactElement {
    const [passenger, setPassenger] = useState<Passenger | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [showChangeModal, setShowChangeModal] = useState<boolean>(false);
    const [showCancelModal, setShowCancelModal] = useState<boolean>(false);
    const [modalStep, setModalStep] = useState<number>(1);
    const [verifyData, setVerifyData] = useState<VerifyData>({ irctcId: '', pnr: '' });
    const [cancelData, setCancelData] = useState<VerifyData>({ irctcId: '', pnr: '' });
    const [availableStations, setAvailableStations] = useState<Station[]>([]);
    const [selectedStation, setSelectedStation] = useState<Station | null>(null);
    const [alreadyChanged, setAlreadyChanged] = useState<boolean>(false);
    const [isCancelled, setIsCancelled] = useState<boolean>(false);
    const [processing, setProcessing] = useState<boolean>(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [trainState, setTrainState] = useState<TrainState | null>(null);

    // OTP state — shared for both modals
    const [otp, setOtp] = useState<string>('');
    const [devOtp, setDevOtp] = useState<string>('');
    const [maskedEmail, setMaskedEmail] = useState<string>('');

    useEffect(() => {
        fetchPassengerData();
    }, []);

    const fetchPassengerData = async (): Promise<void> => {
        try {
            setLoading(true);
            const userData = JSON.parse(localStorage.getItem('user') || '{}');

            if (!userData.irctcId) {
                setError('User not logged in');
                return;
            }

            const response = await api.get(`/passengers/by-irctc/${userData.irctcId}`);

            if (response.data.success) {
                setPassenger(response.data.data);
                setAlreadyChanged(response.data.data.boardingStationChanged || false);
                setIsCancelled(response.data.data.NO_show || false);
            }

            // Fetch train state for journey status
            const trainRes = await api.get('/train/state');
            if (trainRes.data.success && trainRes.data.data) {
                setTrainState(trainRes.data.data);
            }
        } catch (err) {
            console.error('Error fetching passenger:', err);
            const axiosError = err as { response?: { data?: { message?: string } } };
            setError(axiosError.response?.data?.message || 'Failed to fetch ticket details');
        } finally {
            setLoading(false);
        }
    };

    // ========== Shared OTP helpers ==========
    const resetOtpState = (): void => {
        setOtp('');
        setDevOtp('');
        setMaskedEmail('');
    };

    const sendOtpRequest = async (irctcId: string, pnr: string, purpose: string): Promise<boolean> => {
        try {
            const response = await api.post('/otp/send', { irctcId, pnr, purpose });
            const data = response.data;

            if (data.success) {
                setMaskedEmail(data.maskedEmail || 'your registered email');
                if (data.devOtp) {
                    setDevOtp(data.devOtp);
                }
                return true;
            } else {
                alert(data.message || 'Failed to send OTP');
                return false;
            }
        } catch {
            alert('Error sending OTP. Please try again.');
            return false;
        }
    };

    const verifyOtpRequest = async (irctcId: string, pnr: string): Promise<boolean> => {
        if (!otp || otp.length !== 6) {
            alert('Please enter the 6-digit OTP');
            return false;
        }
        try {
            const response = await api.post('/otp/verify', { irctcId, pnr, otp });
            if (response.data.success) {
                return true;
            } else {
                alert(response.data.message || 'Invalid OTP');
                return false;
            }
        } catch {
            alert('Error verifying OTP');
            return false;
        }
    };

    // ========== Change Boarding Station Handlers ==========
    const handleOpenChangeModal = (): void => {
        setShowChangeModal(true);
        setModalStep(1);
        setVerifyData({ irctcId: '', pnr: '' });
        setSelectedStation(null);
        setAvailableStations([]);
        resetOtpState();
    };

    const handleCloseChangeModal = (): void => {
        setShowChangeModal(false);
        setModalStep(1);
        setVerifyData({ irctcId: '', pnr: '' });
        setSelectedStation(null);
        resetOtpState();
    };

    // Step 1 → 2: Verify IRCTC/PNR and send OTP
    const handleVerifyAndSendOtp = async (): Promise<void> => {
        if (!verifyData.irctcId || !verifyData.pnr) {
            alert('Please enter both IRCTC ID and PNR Number');
            return;
        }

        setProcessing(true);
        try {
            const sent = await sendOtpRequest(verifyData.irctcId, verifyData.pnr, 'Change Boarding Station');
            if (sent) {
                setModalStep(2); // → OTP input step
            }
        } finally {
            setProcessing(false);
        }
    };

    // Step 2 → 3: Verify OTP and fetch stations
    const handleVerifyOtpAndFetchStations = async (): Promise<void> => {
        setProcessing(true);
        try {
            const verified = await verifyOtpRequest(verifyData.irctcId, verifyData.pnr);
            if (!verified) {
                setProcessing(false);
                return;
            }

            // OTP verified — now fetch available stations
            const response = await api.get(`/passenger/available-boarding-stations/${verifyData.pnr}`);

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

                setModalStep(3); // → station selection
            }
        } catch (err) {
            console.error('Error:', err);
            const axiosError = err as { response?: { data?: { message?: string } } };
            alert(axiosError.response?.data?.message || 'Failed to fetch stations');
        } finally {
            setProcessing(false);
        }
    };

    const handleSelectStation = (station: Station): void => {
        setSelectedStation(station);
    };

    const handleProceedToConfirm = (): void => {
        if (!selectedStation) {
            alert('Please select a station');
            return;
        }
        setModalStep(4); // → confirm
    };

    const handleConfirmChange = async (): Promise<void> => {
        if (!selectedStation) return;

        const confirmResult = window.confirm(
            `Are you sure you want to change your boarding station to ${selectedStation.name} (${selectedStation.code})?\n\nThis action can only be done ONCE and cannot be undone.`
        );

        if (!confirmResult) return;

        setProcessing(true);
        try {
            const response = await api.post('/passenger/change-boarding-station', {
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
            const axiosError = err as { response?: { data?: { message?: string } } };
            alert(axiosError.response?.data?.message || 'Failed to change boarding station');
        } finally {
            setProcessing(false);
        }
    };

    // ========== Cancel Ticket Handlers ==========
    const handleOpenCancelModal = (): void => {
        setShowCancelModal(true);
        setModalStep(1);
        setCancelData({ irctcId: '', pnr: '' });
        resetOtpState();
    };

    const handleCloseCancelModal = (): void => {
        setShowCancelModal(false);
        setModalStep(1);
        setCancelData({ irctcId: '', pnr: '' });
        resetOtpState();
    };

    // Step 1 → 2: Send OTP for cancel
    const handleCancelSendOtp = async (): Promise<void> => {
        if (!cancelData.irctcId || !cancelData.pnr) {
            alert('Please enter both IRCTC ID and PNR Number');
            return;
        }

        setProcessing(true);
        try {
            const sent = await sendOtpRequest(cancelData.irctcId, cancelData.pnr, 'Cancel Ticket');
            if (sent) {
                setModalStep(2); // → OTP input
            }
        } finally {
            setProcessing(false);
        }
    };

    // Step 2 → 3: Verify OTP and cancel
    const handleCancelVerifyAndExecute = async (): Promise<void> => {
        setProcessing(true);
        try {
            const verified = await verifyOtpRequest(cancelData.irctcId, cancelData.pnr);
            if (!verified) {
                setProcessing(false);
                return;
            }

            // OTP verified — now confirm and cancel
            const confirmResult = window.confirm(
                '⚠️ Are you sure you want to CANCEL your ticket?\n\nThis will mark you as NO-SHOW and your berth will be made available for other passengers.\n\nThis action cannot be undone!'
            );

            if (!confirmResult) {
                setProcessing(false);
                return;
            }

            const response = await api.post('/passenger/self-cancel', {
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
            const axiosError = err as { response?: { data?: { message?: string } } };
            alert(axiosError.response?.data?.message || 'Failed to cancel ticket');
        } finally {
            setProcessing(false);
        }
    };

    // ========== OTP Input Component ==========
    const renderOtpStep = (email: string): React.ReactElement => (
        <>
            <p style={{ color: '#5a6c7d', marginBottom: 12 }}>
                ✉️ OTP sent to: <strong>{email}</strong>
            </p>

            {/* Always show OTP on screen */}
            {devOtp && (
                <div style={{
                    background: '#fff3cd',
                    border: '2px solid #ffc107',
                    borderRadius: '8px',
                    padding: '16px',
                    marginBottom: '16px',
                    textAlign: 'center'
                }}>
                    <p style={{ margin: '0 0 8px', fontWeight: 600, color: '#856404' }}>
                        🔐 Your OTP (also sent to email):
                    </p>
                    <div style={{
                        fontSize: '32px',
                        fontWeight: 'bold',
                        letterSpacing: '8px',
                        color: '#2c3e50',
                        fontFamily: 'monospace',
                        background: '#fff',
                        padding: '10px 20px',
                        borderRadius: '6px',
                        display: 'inline-block',
                        border: '1px solid #ffc107'
                    }}>{devOtp}</div>
                    <p style={{ margin: '8px 0 0', fontSize: '13px', color: '#856404' }}>
                        Enter this 6-digit OTP in the field below
                    </p>
                </div>
            )}

            <div className="form-group">
                <label>Enter 6-digit OTP</label>
                <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter OTP"
                    maxLength={6}
                    style={{ letterSpacing: '4px', fontSize: '18px', textAlign: 'center' }}
                />
            </div>
        </>
    );

    if (loading) {
        return (
            <div className="view-ticket-page">
                <div className="page-header">
                    <h2> View Your Tickets</h2>
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
                    <h2> View Your Tickets</h2>
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
                <h2> View Your Tickets</h2>
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
                     Ticket Actions
                </div>

                {isCancelled ? (
                    <div className="already-changed-notice">
                        ❌ This ticket has been cancelled and no further actions are available.
                    </div>
                ) : (
                    <div className="action-buttons-row">
                        {/* Change Boarding Station */}
                        <div className="action-card">
                            <h4>📌 Change Boarding Station</h4>
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
            {passenger && (
                <BoardingPass
                    passenger={passenger}
                    journeyStarted={trainState?.journeyStarted || false}
                    currentStation={
                        trainState?.stations?.[
                            trainState?.currentStationIdx ?? trainState?.currentStationIndex ?? 0
                        ]?.name || 'Unknown'
                    }
                />
            )}

            {/* ========== Change Station Modal (with OTP) ========== */}
            {showChangeModal && (
                <div className="modal-overlay" onClick={handleCloseChangeModal}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>🔄 Change Boarding Station</h3>
                        </div>

                        <div className="step-indicator" style={{ padding: '20px 0' }}>
                            {[1, 2, 3, 4].map((s, i) => (
                                <React.Fragment key={s}>
                                    {i > 0 && <div className={`step-line ${modalStep >= s ? 'active' : ''}`}></div>}
                                    <div className="step">
                                        <div className={`step-number ${modalStep >= s ? 'active' : ''}`}>{s}</div>
                                    </div>
                                </React.Fragment>
                            ))}
                        </div>

                        <div className="modal-body">
                            {/* Step 1: Enter IRCTC ID + PNR */}
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

                            {/* Step 2: OTP Verification */}
                            {modalStep === 2 && renderOtpStep(maskedEmail)}

                            {/* Step 3: Select Station */}
                            {modalStep === 3 && (
                                <>
                                    <p style={{ marginBottom: 15, color: '#5a6c7d' }}>
                                        ✅ OTP verified! Select your new boarding station:
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

                            {/* Step 4: Confirm */}
                            {modalStep === 4 && selectedStation && (
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
                                <button className="btn-confirm" onClick={handleVerifyAndSendOtp} disabled={processing || !verifyData.irctcId || !verifyData.pnr}>
                                    {processing ? 'Sending OTP...' : 'Send OTP'}
                                </button>
                            )}
                            {modalStep === 2 && (
                                <button className="btn-confirm" onClick={handleVerifyOtpAndFetchStations} disabled={processing || otp.length !== 6}>
                                    {processing ? 'Verifying...' : '✅ Verify OTP'}
                                </button>
                            )}
                            {modalStep === 3 && (
                                <button className="btn-confirm" onClick={handleProceedToConfirm} disabled={!selectedStation}>
                                    Continue
                                </button>
                            )}
                            {modalStep === 4 && (
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

            {/* ========== Cancel Ticket Modal (with OTP) ========== */}
            {showCancelModal && (
                <div className="modal-overlay" onClick={handleCloseCancelModal}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header" style={{ background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)' }}>
                            <h3>❌ Cancel Ticket</h3>
                        </div>

                        <div className="step-indicator" style={{ padding: '20px 0' }}>
                            {[1, 2].map((s, i) => (
                                <React.Fragment key={s}>
                                    {i > 0 && <div className={`step-line ${modalStep >= s ? 'active' : ''}`}></div>}
                                    <div className="step">
                                        <div className={`step-number ${modalStep >= s ? 'active' : ''}`}>{s}</div>
                                    </div>
                                </React.Fragment>
                            ))}
                        </div>

                        <div className="modal-body">
                            {/* Step 1: Enter IRCTC ID + PNR */}
                            {modalStep === 1 && (
                                <>
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
                                </>
                            )}

                            {/* Step 2: OTP Verification + Cancel */}
                            {modalStep === 2 && renderOtpStep(maskedEmail)}
                        </div>

                        <div className="modal-footer">
                            <button className="btn-cancel" onClick={handleCloseCancelModal}>
                                Go Back
                            </button>
                            {modalStep === 1 && (
                                <button
                                    className="btn-confirm"
                                    onClick={handleCancelSendOtp}
                                    disabled={processing || !cancelData.irctcId || !cancelData.pnr}
                                    style={{ background: 'linear-gradient(135deg, #e67e22 0%, #d35400 100%)' }}
                                >
                                    {processing ? 'Sending OTP...' : '✉️ Send OTP'}
                                </button>
                            )}
                            {modalStep === 2 && (
                                <button
                                    className="btn-confirm"
                                    onClick={handleCancelVerifyAndExecute}
                                    disabled={processing || otp.length !== 6}
                                    style={{ background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)' }}
                                >
                                    {processing ? 'Cancelling...' : '❌ Verify & Cancel Ticket'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ViewTicketPage;
