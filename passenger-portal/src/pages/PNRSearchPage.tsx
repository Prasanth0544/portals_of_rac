// passenger-portal/src/pages/PNRSearchPage.tsx
import React, { useState, FormEvent, ChangeEvent } from 'react';
import { passengerAPI } from '../api';
import axios from 'axios';
import '../styles/pages/PNRSearchPage.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface Passenger {
    pnr: string;
    name: string;
    coach?: string;
    seatNo?: string;
    berthType?: string;
    class?: string;
    trainName?: string;
    trainNo?: string;
    boardingStation?: string;
    boardingStationFull?: string;
    destinationStation?: string;
    destinationStationFull?: string;
}

interface Station {
    code: string;
    name: string;
    arrivalTime?: string;
}

interface VerifyData {
    irctcId: string;
    pnr: string;
}

function PNRSearchPage(): React.ReactElement {
    const [pnr, setPnr] = useState<string>('');
    const [passenger, setPassenger] = useState<Passenger | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // Change Boarding Station Modal States
    const [showChangeModal, setShowChangeModal] = useState<boolean>(false);
    const [changeStep, setChangeStep] = useState<number>(1);
    const [verifyData, setVerifyData] = useState<VerifyData>({ irctcId: '', pnr: '' });
    const [changeOTP, setChangeOTP] = useState<string>('');
    const [availableStations, setAvailableStations] = useState<Station[]>([]);
    const [selectedStation, setSelectedStation] = useState<Station | null>(null);
    const [processing, setProcessing] = useState<boolean>(false);

    // Cancel Ticket Modal States
    const [showCancelModal, setShowCancelModal] = useState<boolean>(false);
    const [cancelStep, setCancelStep] = useState<number>(1);
    const [cancelVerifyData, setCancelVerifyData] = useState<VerifyData>({ irctcId: '', pnr: '' });
    const [cancelOTP, setCancelOTP] = useState<string>('');
    const [cancelProcessing, setCancelProcessing] = useState<boolean>(false);

    const handleSearch = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault();

        if (!pnr.trim()) {
            setError('Please enter a PNR number');
            return;
        }

        setLoading(true);
        setError(null);
        setPassenger(null);

        try {
            const response = await passengerAPI.getPNRDetails(pnr.trim());

            if (response.success) {
                setPassenger(response.data);
            } else {
                setError(response.message || 'PNR not found');
            }
        } catch (err: any) {
            console.error('Search error:', err);
            setError(err.response?.data?.message || 'Failed to fetch PNR details');
        } finally {
            setLoading(false);
        }
    };

    // ==================== CHANGE BOARDING STATION ====================
    const handleOpenChangeModal = (): void => {
        setShowChangeModal(true);
        setChangeStep(1);
        setVerifyData({ irctcId: '', pnr: passenger?.pnr || '' });
        setChangeOTP('');
        setSelectedStation(null);
        setAvailableStations([]);
    };

    const handleCloseChangeModal = (): void => {
        setShowChangeModal(false);
        setChangeStep(1);
        setVerifyData({ irctcId: '', pnr: '' });
        setChangeOTP('');
        setSelectedStation(null);
    };

    const handleVerifyForChange = async (): Promise<void> => {
        if (!verifyData.irctcId || !verifyData.pnr) {
            alert('Please enter both IRCTC ID and PNR Number');
            return;
        }

        setProcessing(true);
        try {
            const response = await axios.post(`${API_URL}/otp/send`, {
                irctcId: verifyData.irctcId,
                pnr: verifyData.pnr,
                purpose: 'Change Boarding Station'
            });

            if (response.data.success) {
                setChangeStep(2);
                alert(`✅ ${response.data.message}\n\nPlease check your email for the OTP.`);
            }
        } catch (err: any) {
            console.error('Error sending OTP:', err);
            alert(err.response?.data?.message || 'Failed to send OTP');
        } finally {
            setProcessing(false);
        }
    };

    const handleVerifyOTPForChange = async (): Promise<void> => {
        if (!changeOTP || changeOTP.length !== 6) {
            alert('Please enter the 6-digit OTP');
            return;
        }

        setProcessing(true);
        try {
            const otpResponse = await axios.post(`${API_URL}/otp/verify`, {
                irctcId: verifyData.irctcId,
                pnr: verifyData.pnr,
                otp: changeOTP
            });

            if (otpResponse.data.success) {
                const stationsResponse = await axios.get(`${API_URL}/passenger/available-boarding-stations/${verifyData.pnr}`);

                if (stationsResponse.data.success) {
                    if (stationsResponse.data.alreadyChanged) {
                        alert('Boarding station has already been changed once for this booking.');
                        handleCloseChangeModal();
                        return;
                    }

                    setAvailableStations(stationsResponse.data.availableStations || []);

                    if (stationsResponse.data.availableStations?.length === 0) {
                        alert('No forward stations available for change.');
                        handleCloseChangeModal();
                        return;
                    }

                    setChangeStep(3);
                }
            }
        } catch (err: any) {
            console.error('Error verifying OTP:', err);
            alert(err.response?.data?.message || 'Failed to verify OTP');
        } finally {
            setProcessing(false);
        }
    };

    const handleConfirmChange = async (): Promise<void> => {
        if (!selectedStation) {
            alert('Please select a station');
            return;
        }

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
                alert(`✅ Boarding station changed successfully to ${selectedStation.name}!`);
                handleCloseChangeModal();
                // Re-search to refresh data
                if (passenger?.pnr) {
                    const refreshResponse = await passengerAPI.getPNRDetails(passenger.pnr);
                    if (refreshResponse.success) {
                        setPassenger(refreshResponse.data);
                    }
                }
            }
        } catch (err: any) {
            console.error('Error changing station:', err);
            alert(err.response?.data?.message || 'Failed to change boarding station');
        } finally {
            setProcessing(false);
        }
    };

    // ==================== CANCEL TICKET ====================
    const handleOpenCancelModal = (): void => {
        setShowCancelModal(true);
        setCancelStep(1);
        setCancelVerifyData({ irctcId: '', pnr: passenger?.pnr || '' });
        setCancelOTP('');
    };

    const handleCloseCancelModal = (): void => {
        setShowCancelModal(false);
        setCancelStep(1);
        setCancelVerifyData({ irctcId: '', pnr: '' });
        setCancelOTP('');
    };

    const handleSendCancelOTP = async (): Promise<void> => {
        if (!cancelVerifyData.irctcId || !cancelVerifyData.pnr) {
            alert('Please enter both IRCTC ID and PNR Number');
            return;
        }

        setCancelProcessing(true);
        try {
            const response = await axios.post(`${API_URL}/otp/send`, {
                irctcId: cancelVerifyData.irctcId,
                pnr: cancelVerifyData.pnr,
                purpose: 'Cancel Ticket'
            });

            if (response.data.success) {
                setCancelStep(2);
                alert(`✅ ${response.data.message}\n\nPlease check your email for the OTP.`);
            }
        } catch (err: any) {
            console.error('Error sending OTP:', err);
            alert(err.response?.data?.message || 'Failed to send OTP');
        } finally {
            setCancelProcessing(false);
        }
    };

    const handleConfirmCancel = async (): Promise<void> => {
        if (!cancelOTP || cancelOTP.length !== 6) {
            alert('Please enter the 6-digit OTP');
            return;
        }

        setCancelProcessing(true);
        try {
            const otpResponse = await axios.post(`${API_URL}/otp/verify`, {
                irctcId: cancelVerifyData.irctcId,
                pnr: cancelVerifyData.pnr,
                otp: cancelOTP
            });

            if (!otpResponse.data.success) {
                alert(otpResponse.data.message || 'Invalid OTP');
                setCancelProcessing(false);
                return;
            }

            const confirmed = window.confirm(
                '⚠️ Are you sure you want to CANCEL your ticket?\n\n' +
                'This will mark you as NO-SHOW and your berth will be made available for other passengers.\n\n' +
                'This action cannot be undone!'
            );

            if (!confirmed) {
                setCancelProcessing(false);
                return;
            }

            const response = await axios.post(`${API_URL}/passenger/self-cancel`, {
                pnr: cancelVerifyData.pnr,
                irctcId: cancelVerifyData.irctcId
            });

            if (response.data.success) {
                alert('✅ Ticket cancelled successfully. Your berth is now available for other passengers.');
                handleCloseCancelModal();
                setPassenger(null);
                setPnr('');
            } else {
                throw new Error(response.data.message || 'Failed to cancel ticket');
            }
        } catch (err: any) {
            alert('❌ ' + (err.response?.data?.message || err.message || 'Failed to cancel ticket'));
        } finally {
            setCancelProcessing(false);
        }
    };

    return (
        <div className="pnr-search-page">
            <div className="page-header">
                <h2>🔍 PNR Status Search</h2>
            </div>

            <div className="search-container">
                <form className="search-form" onSubmit={handleSearch}>
                    <input
                        type="text"
                        className="search-input"
                        placeholder="Enter 10-digit PNR Number"
                        value={pnr}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setPnr(e.target.value)}
                        maxLength={10}
                    />
                    <button
                        type="submit"
                        className="search-btn"
                        disabled={loading}
                    >
                        {loading ? '⏳ Searching...' : '🔍 Search'}
                    </button>
                </form>
            </div>

            {error && (
                <div className="error-message">
                    ❌ {error}
                </div>
            )}

            {loading && (
                <div className="loading-container">
                    <div className="spinner"></div>
                    <p>Searching for PNR...</p>
                </div>
            )}

            {passenger && (
                <>
                    <div className="passenger-details-card">
                        <div className="card-header">
                            <h3>🎫 Passenger Details</h3>
                        </div>
                        <div className="card-body">
                            <div className="detail-grid">
                                <div className="detail-item">
                                    <span className="detail-label">PNR Number</span>
                                    <span className="detail-value">{passenger.pnr}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Passenger Name</span>
                                    <span className="detail-value">{passenger.name}</span>
                                </div>

                                <div className="detail-item">
                                    <span className="detail-label">Coach / Berth</span>
                                    <span className="detail-value">
                                        {passenger.coach || '-'} / {passenger.seatNo || '-'}
                                    </span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Berth Type</span>
                                    <span className="detail-value">{passenger.berthType || '-'}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Class</span>
                                    <span className="detail-value">{passenger.class || 'Sleeper'}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Train</span>
                                    <span className="detail-value">
                                        {passenger.trainName} ({passenger.trainNo})
                                    </span>
                                </div>
                            </div>

                            <div className="journey-section">
                                <div className="journey-path">
                                    <div className="station-info">
                                        <div className="station-code">{passenger.boardingStation || '-'}</div>
                                        <div className="station-name">{passenger.boardingStationFull || 'Boarding Station'}</div>
                                    </div>
                                    <div className="journey-arrow">→</div>
                                    <div className="station-info">
                                        <div className="station-code">{passenger.destinationStation || '-'}</div>
                                        <div className="station-name">{passenger.destinationStationFull || 'Destination'}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {!passenger && !loading && !error && (
                <div className="empty-state">
                    <div className="icon">🎫</div>
                    <h3>Enter PNR to Check Status</h3>
                    <p>Get complete passenger and journey details</p>
                </div>
            )}

            {/* Ticket Actions Section - Always Visible */}
            <div className="ticket-actions-card">
                <div className="card-header">
                    <h3>🎫 Ticket Actions</h3>
                </div>
                <div className="card-body">
                    <p className="actions-info">Manage your ticket by entering your IRCTC ID and PNR in the action dialogs below.</p>
                    <div className="actions-grid">
                        <div className="action-item">
                            <h4>🔄 Change Boarding Station</h4>
                            <p>Change to a forward station (allowed once)</p>
                            <button
                                className="action-btn change-btn"
                                onClick={handleOpenChangeModal}
                            >
                                Change Station
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Change Boarding Station Modal */}
            {showChangeModal && (
                <div className="modal-overlay" onClick={handleCloseChangeModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header change-header">
                            <h3>🔄 Change Boarding Station</h3>
                            <button className="modal-close" onClick={handleCloseChangeModal}>×</button>
                        </div>
                        <div className="modal-body">
                            {changeStep === 1 && (
                                <>
                                    <p className="modal-info">Please verify your IRCTC ID and PNR to proceed with changing your boarding station.</p>
                                    <div className="form-group">
                                        <label>IRCTC ID</label>
                                        <input
                                            type="text"
                                            value={verifyData.irctcId}
                                            onChange={(e) => setVerifyData({ ...verifyData, irctcId: e.target.value })}
                                            placeholder="Enter your IRCTC ID"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>PNR Number</label>
                                        <input
                                            type="text"
                                            value={verifyData.pnr}
                                            onChange={(e) => setVerifyData({ ...verifyData, pnr: e.target.value })}
                                            placeholder="Enter PNR Number"
                                        />
                                    </div>
                                </>
                            )}

                            {changeStep === 2 && (
                                <>
                                    <div className="info-alert">
                                        📧 OTP has been sent to your registered email address.
                                    </div>
                                    <div className="form-group">
                                        <label>Enter 6-digit OTP</label>
                                        <input
                                            type="text"
                                            value={changeOTP}
                                            onChange={(e) => setChangeOTP(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                            maxLength={6}
                                            placeholder="000000"
                                            autoFocus
                                        />
                                    </div>
                                </>
                            )}

                            {changeStep === 3 && (
                                <>
                                    <p className="modal-info">Select your new boarding station from the next 3 upcoming stations:</p>
                                    <div className="station-list">
                                        {availableStations.map((station, index) => (
                                            <div
                                                key={station.code}
                                                className={`station-option ${selectedStation?.code === station.code ? 'selected' : ''}`}
                                                onClick={() => setSelectedStation(station)}
                                            >
                                                <input
                                                    type="radio"
                                                    name="station"
                                                    checked={selectedStation?.code === station.code}
                                                    onChange={() => setSelectedStation(station)}
                                                />
                                                <div className="station-details">
                                                    <strong>{index + 1}. {station.name} ({station.code})</strong>
                                                    <span>Arrival: {station.arrivalTime || 'N/A'}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="warning-alert">
                                        ⚠️ <strong>Important:</strong> This change can only be made ONCE and cannot be undone.
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={handleCloseChangeModal} disabled={processing}>
                                Cancel
                            </button>
                            {changeStep === 1 && (
                                <button
                                    className="btn-primary"
                                    onClick={handleVerifyForChange}
                                    disabled={processing || !verifyData.irctcId || !verifyData.pnr}
                                >
                                    {processing ? 'Sending OTP...' : 'Send OTP'}
                                </button>
                            )}
                            {changeStep === 2 && (
                                <button
                                    className="btn-primary"
                                    onClick={handleVerifyOTPForChange}
                                    disabled={processing || changeOTP.length !== 6}
                                >
                                    {processing ? 'Verifying...' : 'Verify OTP'}
                                </button>
                            )}
                            {changeStep === 3 && (
                                <button
                                    className="btn-primary"
                                    onClick={handleConfirmChange}
                                    disabled={processing || !selectedStation}
                                >
                                    {processing ? 'Updating...' : 'Confirm Change'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Cancel Ticket Modal */}
            {showCancelModal && (
                <div className="modal-overlay" onClick={handleCloseCancelModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header cancel-header">
                            <h3>❌ Cancel Ticket</h3>
                            <button className="modal-close" onClick={handleCloseCancelModal}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="error-alert">
                                ⚠️ <strong>Warning:</strong> Cancelling your ticket will mark you as NO-SHOW and your berth will be made available for other passengers.
                            </div>

                            {cancelStep === 1 && (
                                <>
                                    <p className="modal-info">Please verify your IRCTC ID and PNR to proceed with ticket cancellation.</p>
                                    <div className="form-group">
                                        <label>IRCTC ID</label>
                                        <input
                                            type="text"
                                            value={cancelVerifyData.irctcId}
                                            onChange={(e) => setCancelVerifyData({ ...cancelVerifyData, irctcId: e.target.value })}
                                            placeholder="Enter your IRCTC ID"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>PNR Number</label>
                                        <input
                                            type="text"
                                            value={cancelVerifyData.pnr}
                                            onChange={(e) => setCancelVerifyData({ ...cancelVerifyData, pnr: e.target.value })}
                                            placeholder="Enter PNR Number"
                                        />
                                    </div>
                                </>
                            )}

                            {cancelStep === 2 && (
                                <>
                                    <div className="info-alert">
                                        📧 OTP has been sent to your registered email.
                                    </div>
                                    <div className="form-group">
                                        <label>Enter 6-digit OTP</label>
                                        <input
                                            type="text"
                                            value={cancelOTP}
                                            onChange={(e) => setCancelOTP(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                            maxLength={6}
                                            placeholder="000000"
                                            autoFocus
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={handleCloseCancelModal} disabled={cancelProcessing}>
                                Back
                            </button>
                            {cancelStep === 1 && (
                                <button
                                    className="btn-danger"
                                    onClick={handleSendCancelOTP}
                                    disabled={cancelProcessing || !cancelVerifyData.irctcId || !cancelVerifyData.pnr}
                                >
                                    {cancelProcessing ? 'Sending...' : 'Send OTP'}
                                </button>
                            )}
                            {cancelStep === 2 && (
                                <button
                                    className="btn-danger"
                                    onClick={handleConfirmCancel}
                                    disabled={cancelProcessing || cancelOTP.length !== 6}
                                >
                                    {cancelProcessing ? 'Cancelling...' : 'Confirm Cancellation'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default PNRSearchPage;
