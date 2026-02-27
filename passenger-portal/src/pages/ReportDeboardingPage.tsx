// passenger-portal/src/pages/ReportDeboardingPage.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import '../styles/pages/ReportDeboardingPage.css';
import api from '../api';

interface Passenger {
    Name: string;
    PNR_Number: string;
    IRCTC_ID: string;
    Coach: string;
    Berth_Number: string;
    Boarding_Station: string;
    Deboarding_Station: string;  // This is the destination
    Email?: string;
}

interface Station {
    code: string;
    name: string;
}

const ReportDeboardingPage: React.FC = () => {
    const navigate = useNavigate();

    // Step tracking
    const [step, setStep] = useState<number>(1);

    // Step 1: PNR input
    const [pnr, setPnr] = useState<string>('');
    const [passengers, setPassengers] = useState<Passenger[]>([]);
    const [validStations, setValidStations] = useState<Station[]>([]);

    // Step 2: Passenger selection - now supports multiple
    const [selectedPassengers, setSelectedPassengers] = useState<Passenger[]>([]);

    // Step 3: OTP verification
    const [otp, setOtp] = useState<string>('');
    const [otpSent, setOtpSent] = useState<boolean>(false);
    const [maskedEmail, setMaskedEmail] = useState<string>('');
    const [devOtp, setDevOtp] = useState<string>(''); // fallback when email fails

    // Step 4: Station selection
    const [selectedStation, setSelectedStation] = useState<string>('');

    // Loading states
    const [loading, setLoading] = useState<boolean>(false);
    const [processing, setProcessing] = useState<boolean>(false);

    // Toggle passenger selection
    const togglePassenger = (passenger: Passenger): void => {
        setSelectedPassengers(prev => {
            const isSelected = prev.some(p => p.Name === passenger.Name);
            if (isSelected) {
                return prev.filter(p => p.Name !== passenger.Name);
            } else {
                return [...prev, passenger];
            }
        });
    };

    // Select All / Deselect All
    const toggleSelectAll = (): void => {
        if (selectedPassengers.length === passengers.length) {
            setSelectedPassengers([]);
        } else {
            setSelectedPassengers([...passengers]);
        }
    };

    // For backward compatibility - get first selected passenger
    const selectedPassenger = selectedPassengers.length > 0 ? selectedPassengers[0] : null;

    // Normalize API response fields (camelCase) to component fields (PascalCase)
    const normalizePassenger = (p: any): Passenger => ({
        Name: p.Name || p.name || '',
        PNR_Number: p.PNR_Number || p.pnr || '',
        IRCTC_ID: p.IRCTC_ID || p.irctcId || '',
        Coach: p.Coach || p.coach || p.Assigned_Coach || '',
        Berth_Number: p.Berth_Number || p.seatNo || p.Assigned_berth || '',
        Boarding_Station: p.Boarding_Station || p.boardingStation || p.boardingStationFull || '',
        Deboarding_Station: p.Deboarding_Station || p.destinationStation || p.destinationStationFull || '',
        Email: p.Email || p.email || '',
    });

    // Step 1: Fetch passengers by PNR
    const fetchPassengers = async (): Promise<void> => {
        if (!pnr || pnr.length < 10) {
            toast.error('Please enter a valid 10-digit PNR number');
            return;
        }

        setLoading(true);
        try {
            const response = await api.get(`/passenger/pnr/${pnr}`);
            const data = response.data;

            if (data.success && data.data) {
                // Handle both single and array responses
                const rawList = Array.isArray(data.data) ? data.data : [data.data];
                const passengerList = rawList.map(normalizePassenger);
                setPassengers(passengerList);

                // Get valid deboarding stations (between boarding and destination)
                if (passengerList.length > 0) {
                    const first = passengerList[0];
                    const stationsRes = await api.get('/train/state');
                    const trainData = stationsRes.data;

                    // Stations are at data.stations (not data.journey.stations)
                    if (trainData.success && trainData.data?.stations) {
                        const allStations = trainData.data.stations;

                        // Match by code OR name (case-insensitive)
                        const boardingStation = first.Boarding_Station || first.boarding_station;
                        const destStation = first.Deboarding_Station || first.deboarding_station;

                        const boardingIdx = allStations.findIndex((s: Station) =>
                            s.code?.toUpperCase() === boardingStation?.toUpperCase() ||
                            s.name?.toUpperCase() === boardingStation?.toUpperCase()
                        );
                        const destIdx = allStations.findIndex((s: Station) =>
                            s.code?.toUpperCase() === destStation?.toUpperCase() ||
                            s.name?.toUpperCase() === destStation?.toUpperCase()
                        );

                        console.log('Stations:', { boardingStation, destStation, boardingIdx, destIdx, total: allStations.length });

                        // Get current station index (how far the train has traveled)
                        const currentStationIdx = trainData.data.currentStationIdx || 0;
                        const journeyStarted = trainData.data.journeyStarted || false;

                        // Get stations between boarding and destination that train has already passed
                        if (boardingIdx !== -1 && destIdx !== -1 && destIdx > boardingIdx) {
                            // Filter: after boarding, before destination, AND train has passed it
                            const stationsBetween = allStations.filter((s: Station, idx: number) =>
                                idx > boardingIdx &&
                                idx < destIdx &&
                                idx <= currentStationIdx  // Only stations train has passed
                            );
                            setValidStations(stationsBetween);

                            if (!journeyStarted || stationsBetween.length === 0) {
                                console.log('Journey not started or train has not passed any stations after boarding yet');
                            }
                            console.log('Valid deboarding stations (up to current station):', stationsBetween);
                        } else {
                            console.warn('Could not determine valid stations range');
                        }
                    }
                }

                setStep(2);
                toast.success(`Found ${passengerList.length} passenger(s) on this PNR`);
            } else {
                toast.error(data.message || 'No passengers found for this PNR');
            }
        } catch (error) {
            console.error('Error fetching passengers:', error);
            toast.error('Failed to fetch passengers');
        } finally {
            setLoading(false);
        }
    };

    // Step 2: Send OTP to selected passenger's email
    const sendOTP = async (): Promise<void> => {
        if (!selectedPassenger) {
            toast.error('Please select a passenger first');
            return;
        }

        setProcessing(true);
        try {
            const response = await api.post('/otp/send', {
                irctcId: selectedPassenger.IRCTC_ID,
                pnr: selectedPassenger.PNR_Number,
                purpose: 'Report Deboarding'
            });
            const data = response.data;

            if (data.success) {
                setOtpSent(true);
                // Mask email for display
                const email = selectedPassenger.Email || 'registered email';
                const masked = data.maskedEmail || email.replace(/(.{2})(.*)(@.*)/, '$1***$3');
                setMaskedEmail(masked);
                // Store devOtp if email failed
                if (data.devOtp) {
                    setDevOtp(data.devOtp);
                    toast.success(`📋 OTP: ${data.devOtp} (email delivery failed — copy this!)`, { duration: 15000 });
                } else {
                    setDevOtp('');
                    toast.success(`OTP sent to ${masked}`);
                }
                setStep(3);
            } else {
                toast.error(data.message || 'Failed to send OTP');
            }
        } catch (error) {
            toast.error('Error sending OTP');
        } finally {
            setProcessing(false);
        }
    };

    // Step 3: Verify OTP
    const verifyOTP = async (): Promise<void> => {
        if (!otp || otp.length !== 6) {
            toast.error('Please enter the 6-digit OTP');
            return;
        }

        setProcessing(true);
        try {
            const response = await api.post('/otp/verify', {
                irctcId: selectedPassenger?.IRCTC_ID,
                pnr: selectedPassenger?.PNR_Number,
                otp: otp
            });
            const data = response.data;

            if (data.success) {
                setStep(4);
                toast.success('OTP verified successfully');
            } else {
                toast.error(data.message || 'Invalid OTP');
            }
        } catch (error) {
            toast.error('Error verifying OTP');
        } finally {
            setProcessing(false);
        }
    };

    // Step 4: Confirm deboarding for ALL selected passengers
    const confirmDeboarding = async (): Promise<void> => {
        if (!selectedStation) {
            toast.error('Please select a deboarding station');
            return;
        }

        const passengerNames = selectedPassengers.map(p => p.Name).join(', ');
        const confirmed = window.confirm(
            `⚠️ Confirm Deboarding\n\n` +
            `Passengers (${selectedPassengers.length}):\n${passengerNames}\n\n` +
            `Deboarding at: ${selectedStation}\n\n` +
            `Their berths will be made available for other passengers.\n\n` +
            `This action cannot be undone. Continue?`
        );

        if (!confirmed) return;

        setProcessing(true);
        try {
            let successCount = 0;
            let failCount = 0;

            for (const passenger of selectedPassengers) {
                try {
                    const response = await api.post('/passenger/report-deboarding', {
                        pnr: passenger.PNR_Number,
                        irctcId: passenger.IRCTC_ID,
                        passengerName: passenger.Name,
                        deboardingStation: selectedStation
                    });
                    const data = response.data;

                    if (data.success) {
                        successCount++;
                    } else {
                        failCount++;
                    }
                } catch {
                    failCount++;
                }
            }

            if (successCount > 0) {
                toast.success(`🚉 ${successCount} passenger(s) deboarding reported successfully!`);
                if (failCount > 0) {
                    toast.error(`${failCount} passenger(s) failed to report`);
                }
                navigate('/');
            } else {
                toast.error('Failed to report deboarding');
            }
        } catch (error) {
            toast.error('Error reporting deboarding');
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="report-deboarding-page">
            <div className="deboarding-container">
                <div className="page-header">
                    <button className="back-btn" onClick={() => navigate('/')}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M19 12H5M12 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <div>
                        <h1>🚉 Report Deboarding</h1>
                        <p className="subtitle">Report that you have left the train before your destination</p>
                    </div>
                </div>

                {/* Progress Steps */}
                <div className="progress-steps">
                    <div className={`step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>
                        <span className="step-number">1</span>
                        <span className="step-label">Enter PNR</span>
                    </div>
                    <div className={`step ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>
                        <span className="step-number">2</span>
                        <span className="step-label">Select Passenger</span>
                    </div>
                    <div className={`step ${step >= 3 ? 'active' : ''} ${step > 3 ? 'completed' : ''}`}>
                        <span className="step-number">3</span>
                        <span className="step-label">Verify OTP</span>
                    </div>
                    <div className={`step ${step >= 4 ? 'active' : ''}`}>
                        <span className="step-number">4</span>
                        <span className="step-label">Select Station</span>
                    </div>
                </div>

                {/* Step 1: Enter PNR */}
                {step === 1 && (
                    <div className="step-content">
                        <h2>Step 1: Enter Your PNR Number</h2>
                        <div className="input-group">
                            <label>PNR Number</label>
                            <input
                                type="text"
                                value={pnr}
                                onChange={(e) => setPnr(e.target.value)}
                                placeholder="Enter 10-digit PNR"
                                maxLength={10}
                            />
                        </div>
                        <button
                            className="btn-primary"
                            onClick={fetchPassengers}
                            disabled={loading || pnr.length < 10}
                        >
                            {loading ? 'Fetching...' : 'Fetch Passengers'}
                        </button>
                    </div>
                )}

                {/* Step 2: Select Passengers */}
                {step === 2 && (
                    <div className="step-content">
                        <h2>Step 2: Select Passengers</h2>
                        <p className="hint">Select one or more passengers who are deboarding. OTP will be sent to the first passenger's email.</p>

                        {/* Select All Checkbox */}
                        <div
                            className="select-all-option"
                            style={{
                                padding: '12px 16px',
                                background: '#f0f4f8',
                                borderRadius: '8px',
                                marginBottom: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                cursor: 'pointer'
                            }}
                            onClick={toggleSelectAll}
                        >
                            <input
                                type="checkbox"
                                checked={selectedPassengers.length === passengers.length && passengers.length > 0}
                                readOnly
                                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                            />
                            <span style={{ fontWeight: 600 }}>
                                {selectedPassengers.length === passengers.length ? 'Deselect All' : 'Select All'}
                                ({passengers.length} passengers)
                            </span>
                        </div>

                        <div className="passenger-list">
                            {passengers.map((p, idx) => (
                                <div
                                    key={idx}
                                    className={`passenger-card ${selectedPassengers.some(sp => sp.Name === p.Name) ? 'selected' : ''}`}
                                    onClick={() => togglePassenger(p)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <div className="passenger-info" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <input
                                            type="checkbox"
                                            checked={selectedPassengers.some(sp => sp.Name === p.Name)}
                                            readOnly
                                            style={{ width: '18px', height: '18px' }}
                                        />
                                        <div>
                                            <span className="passenger-name">{p.Name}</span>
                                            <span className="passenger-berth">{p.Coach}-{p.Berth_Number}</span>
                                        </div>
                                    </div>
                                    <div className="passenger-route">
                                        {p.Boarding_Station} → {p.Deboarding_Station}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div style={{ marginTop: '12px', color: '#6b7280', fontSize: '14px' }}>
                            Selected: {selectedPassengers.length} passenger(s)
                        </div>

                        <button
                            className="btn-primary"
                            onClick={sendOTP}
                            disabled={selectedPassengers.length === 0 || processing}
                        >
                            {processing ? 'Sending OTP...' : `📧 Send OTP (${selectedPassengers.length} passenger${selectedPassengers.length !== 1 ? 's' : ''})`}
                        </button>
                        <button className="btn-secondary" onClick={() => setStep(1)}>
                            ← Back
                        </button>
                    </div>
                )}

                {/* Step 3: Verify OTP */}
                {step === 3 && (
                    <div className="step-content">
                        <h2>Step 3: Verify OTP</h2>
                        <p className="hint">OTP sent to: {maskedEmail}</p>

                        {/* Show OTP inline if email delivery failed */}
                        {devOtp && (
                            <div style={{
                                background: '#fff3cd',
                                border: '2px solid #ffc107',
                                borderRadius: '8px',
                                padding: '16px',
                                marginBottom: '16px',
                                textAlign: 'center'
                            }}>
                                <p style={{ margin: '0 0 8px', fontWeight: 600, color: '#856404' }}>⚠️ Email delivery failed — use this OTP:</p>
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
                                <p style={{ margin: '8px 0 0', fontSize: '13px', color: '#856404' }}>Copy this 6-digit OTP and enter it below</p>
                            </div>
                        )}

                        <div className="input-group">
                            <label>Enter 6-digit OTP</label>
                            <input
                                type="text"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                placeholder="Enter OTP"
                                maxLength={6}
                            />
                        </div>
                        <button
                            className="btn-primary"
                            onClick={verifyOTP}
                            disabled={otp.length !== 6 || processing}
                        >
                            {processing ? 'Verifying...' : '✓ Verify OTP'}
                        </button>
                        <button className="btn-secondary" onClick={() => setStep(2)}>
                            ← Back
                        </button>
                    </div>
                )}

                {/* Step 4: Select Deboarding Station */}
                {step === 4 && (
                    <div className="step-content">
                        <h2>Step 4: Select Deboarding Station</h2>
                        <p className="hint">Select the station where you left the train</p>

                        <div className="station-info">
                            <div className="route-display">
                                <span className="station-badge boarding">{selectedPassenger?.Boarding_Station}</span>
                                <span className="arrow">→</span>
                                <span className="deboarding-zone">Select Below</span>
                                <span className="arrow">→</span>
                                <span className="station-badge destination">{selectedPassenger?.Deboarding_Station}</span>
                            </div>
                        </div>

                        <div className="input-group">
                            <label>Change the Deboarding Station by selecting one of the below stations</label>
                            {validStations.length === 0 ? (
                                <div className="no-stations-message" style={{
                                    padding: '20px',
                                    background: '#fff3cd',
                                    border: '1px solid #ffc107',
                                    borderRadius: '8px',
                                    textAlign: 'center',
                                    color: '#856404'
                                }}>
                                    <p>⚠️ <strong>Cannot report deboarding yet</strong></p>
                                    <p>The train has not passed any stations after your boarding station. Please wait until the train reaches a station where you can deboard.</p>
                                </div>
                            ) : (
                                <select
                                    value={selectedStation}
                                    onChange={(e) => setSelectedStation(e.target.value)}
                                >
                                    <option value="">-- Select Station --</option>
                                    {validStations.map((s, idx) => (
                                        <option key={idx} value={s.code}>{s.name} ({s.code})</option>
                                    ))}
                                </select>
                            )}
                        </div>

                        <button
                            className="btn-danger"
                            onClick={confirmDeboarding}
                            disabled={!selectedStation || processing}
                        >
                            {processing ? 'Processing...' : '🚉 Confirm Deboarding'}
                        </button>
                        <button className="btn-secondary" onClick={() => setStep(3)}>
                            ← Back
                        </button>
                    </div>
                )}

                {/* Info Section */}
                <div className="info-section">
                    <h3>ℹ️ Important Information</h3>
                    <ul>
                        <li>Report deboarding only if you have left the train before your destination</li>
                        <li>Your berth will be made available for RAC passengers to upgrade</li>
                        <li>This action cannot be undone</li>
                        <li>Make sure to collect any belongings before reporting</li>
                    </ul>
                </div>
            </div>
        </div >
    );
};

export default ReportDeboardingPage;
