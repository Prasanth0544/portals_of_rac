// frontend/src/pages/TrainDashboard.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getTrainConfig, setupConfig, initializeTrain } from '../services/apiWithErrorHandling';
import { errorToast, successToast } from '../services/toastNotification';
import TrainApp from '../TrainApp';
import '../styles/pages/ConfigPage.css';

interface TrainConfig {
    mongoUri?: string;
    stationsDb?: string;
    stationsCollection?: string;
    passengersDb?: string;
    passengersCollection?: string;
    trainDetailsDb?: string;
    trainDetailsCollection?: string;
    trainNo?: string;
    trainName?: string;
    journeyDate?: string;
}

const TrainDashboard: React.FC<{ initialPage?: string }> = ({ initialPage }) => {
    const { trainNo } = useParams<{ trainNo?: string }>();
    const navigate = useNavigate();

    // Setup step state
    const [trainConfig, setTrainConfig] = useState<TrainConfig | null>(null);
    const [loadingConfig, setLoadingConfig] = useState(true);
    const [journeyDate, setJourneyDate] = useState(new Date().toISOString().split('T')[0]);
    const [applying, setApplying] = useState(false);
    const [configured, setConfigured] = useState(false);
    const [configError, setConfigError] = useState<string | null>(null);

    // Skip setup for manual config page
    useEffect(() => {
        if (initialPage === 'config') {
            setConfigured(true);
            setLoadingConfig(false);
            return;
        }

        // Fetch train details from backend
        if (trainNo && !configured) {
            fetchTrainConfig(trainNo);
        }
    }, [trainNo, initialPage]);

    const fetchTrainConfig = async (trainNumber: string) => {
        setLoadingConfig(true);
        setConfigError(null);
        try {
            const result = await getTrainConfig(trainNumber);
            if (result.success && result.data) {
                setTrainConfig(result.data);
                // Pre-fill journey date from config if available
                if (result.data.journeyDate) {
                    setJourneyDate(result.data.journeyDate);
                }
            } else {
                setConfigError('Failed to load train configuration. Train may not be registered.');
            }
        } catch (error: any) {
            setConfigError(error.message || 'Failed to fetch train configuration');
        } finally {
            setLoadingConfig(false);
        }
    };

    const handleApplyConfig = async () => {
        if (!trainConfig) return;

        setApplying(true);
        setConfigError(null);
        try {
            // Setup backend with train config + user-selected date
            const setupPayload = {
                ...trainConfig,
                journeyDate: journeyDate,
            };
            const setupResult = await setupConfig(setupPayload);
            if (!setupResult.success) {
                throw new Error('Failed to apply configuration');
            }

            // Initialize train state
            const initResult = await initializeTrain(trainConfig.trainNo || trainNo || '', journeyDate);
            if (!initResult.success) {
                throw new Error('Failed to initialize train');
            }

            console.log(`✅ Configured & initialized train ${trainConfig.trainNo}`);
            successToast('Train Ready', `Train ${trainConfig.trainNo} configured successfully!`);

            // Small delay then show TrainApp
            await new Promise(resolve => setTimeout(resolve, 400));
            setConfigured(true);
        } catch (error: any) {
            setConfigError(error.message || 'Configuration failed');
            errorToast('Error', error.message || 'Failed to configure train');
        } finally {
            setApplying(false);
        }
    };

    // After configuration is applied, render TrainApp
    if (configured) {
        return <TrainApp />;
    }

    // Loading train details
    if (loadingConfig) {
        return (
            <div className="App">
                <div className="app-header">
                    <div className="header-content">
                        <h1>🚂 RAC Reallocation System</h1>
                        <h2>Loading Train {trainNo}...</h2>
                    </div>
                </div>
                <div className="app-content">
                    <div className="initialization-screen">
                        <div className="init-card">
                            <h3>Fetching Train Details</h3>
                            <div className="spinner-large"></div>
                            <p>Loading configuration for train {trainNo}...</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Setup screen — show train details + date input
    return (
        <div className="App">
            <div className="app-header">
                <div className="header-content">
                    <h1>🚂 RAC Reallocation System</h1>
                    <h2>Train Setup</h2>
                </div>
            </div>
            <div className="app-content">
                <div className="config-page">
                    <div className="page-header">
                        <button className="back-btn" onClick={() => navigate('/')} disabled={applying}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                                <path d="M19 12H5M12 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <h2>⚙️ Train Configuration</h2>
                    </div>

                    {configError && (
                        <div className="error-banner">{configError}</div>
                    )}

                    <div className="config-form">
                        {/* Train Info — auto-filled, read-only */}
                        <div className="form-section">
                            <h3>🚂 Train Details</h3>
                            <div className="train-info-grid">
                                <div className="info-row">
                                    <span className="info-label">Train Number</span>
                                    <span className="info-value">{trainConfig?.trainNo || trainNo}</span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label">Train Name</span>
                                    <span className="info-value">{trainConfig?.trainName || '—'}</span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label">Stations Collection</span>
                                    <span className="info-value">{trainConfig?.stationsCollection || '—'}</span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label">Passengers Collection</span>
                                    <span className="info-value">{trainConfig?.passengersCollection || '—'}</span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label">Stations DB</span>
                                    <span className="info-value">{trainConfig?.stationsDb || '—'}</span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label">Passengers DB</span>
                                    <span className="info-value">{trainConfig?.passengersDb || '—'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Journey Date — editable */}
                        <div className="form-section">
                            <h3>📅 Journey Date</h3>
                            <label>
                                Select Journey Date
                                <input
                                    type="date"
                                    value={journeyDate}
                                    onChange={(e) => setJourneyDate(e.target.value)}
                                    required
                                    disabled={applying}
                                />
                                <span className="field-hint">Set the date for this train's journey</span>
                            </label>
                        </div>

                        {/* Apply button */}
                        <div className="form-actions">
                            <button
                                type="button"
                                className="btn-apply"
                                onClick={handleApplyConfig}
                                disabled={applying || !trainConfig}
                            >
                                {applying ? '⏳ Applying...' : '🚀 Apply Configuration'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TrainDashboard;
