// frontend/src/App.tsx

import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as api from './services/apiWithErrorHandling';
import wsService from './services/websocket';
import { saveAppState, loadAppState, clearAppState } from './services/StateStore';
import ToastContainer from './components/ToastContainer';

import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import HomePage from './pages/HomePage';
import RACQueuePage from './pages/RACQueuePage';
import CoachesPage from './pages/CoachesPage';
import PassengersPage from './pages/PassengersPage';

import VisualizationPage from './pages/VisualizationPage';
import AddPassengerPage from './pages/AddPassengerPage';

import PhaseOnePage from './pages/PhaseOnePage';
import ConfigPage from './pages/ConfigPage';
import { webSocketConnectedToast, webSocketDisconnectedToast } from './services/toastNotification';
import './App.css';
import './UserMenu.css';

// Types
interface User {
    username?: string;
    role?: string;
}

interface Station {
    name: string;
    code: string;
    sno?: number;
}

interface TrainData {
    trainNo?: string;
    trainName?: string;
    journeyDate?: string;
    stations?: Station[];
    currentStationIdx?: number;
    journeyStarted?: boolean;
    stats?: any;
}

interface StationArrivalData {
    data: {
        station: string;
    };
}

interface RACReallocationData {
    data: {
        totalAllocated: number;
    };
}

interface NoShowData {
    data: {
        passenger: {
            name: string;
        };
    };
}

interface WebSocketUpdateData {
    eventType: string;
    data?: any;
}

type PageType = 'config' | 'home' | 'rac-queue' | 'coaches' | 'passengers' | 'reallocation' | 'visualization' | 'add-passenger' | 'phase1';

function App(): React.ReactElement {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [user, setUser] = useState<User | null>(null);

    const [trainData, setTrainData] = useState<TrainData | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState<PageType>('home');
    const [journeyStarted, setJourneyStarted] = useState<boolean>(false);
    const [autoInitAttempted, setAutoInitAttempted] = useState<boolean>(false);
    const [wsConnected, setWsConnected] = useState<boolean>(false);
    const [menuOpen, setMenuOpen] = useState<boolean>(false);
    const [showSignUp, setShowSignUp] = useState<boolean>(false);
    const [stateRestored, setStateRestored] = useState<boolean>(false);
    const isInitialMount = useRef(true);

    // Timer state for automatic station movement (2 minutes = 120 seconds)
    const TIMER_DURATION = 120; // 2 minutes in seconds
    const [timerSeconds, setTimerSeconds] = useState<number>(TIMER_DURATION);
    const [timerActive, setTimerActive] = useState<boolean>(false);
    const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Restore persisted state on mount AND verify with backend
    useEffect(() => {
        const restoreState = async () => {
            const saved = await loadAppState();
            let restoredPage: PageType = 'home';
            let restoredJourneyStarted = false;
            let restoredAutoInit = false;

            if (saved) {
                console.log('[App] Restoring persisted state...');
                restoredPage = saved.currentPage as PageType || 'home';
                restoredJourneyStarted = saved.journeyStarted || false;
                restoredAutoInit = saved.autoInitAttempted || false;
            }

            // Verify with backend FIRST before applying restored state
            try {
                const response = await api.getTrainState();
                if (response && response.success && response.data) {
                    const backendJourneyStarted = response.data.journeyStarted || false;

                    // Use backend state as source of truth
                    if (restoredJourneyStarted !== backendJourneyStarted) {
                        console.log('[App] State mismatch! Frontend:', restoredJourneyStarted, '| Backend:', backendJourneyStarted);
                        restoredJourneyStarted = backendJourneyStarted;

                        // If backend says journey not started, go to home page
                        if (!backendJourneyStarted && restoredPage !== 'home' && restoredPage !== 'config') {
                            console.log('[App] Journey not started on backend, redirecting to home');
                            restoredPage = 'home';
                        }
                    }

                    // Apply verified state
                    setTrainData(response.data);
                    setCurrentPage(restoredPage);
                    setJourneyStarted(backendJourneyStarted);
                    setAutoInitAttempted(restoredAutoInit);

                    // Save corrected state
                    saveAppState({
                        currentPage: restoredPage,
                        journeyStarted: backendJourneyStarted,
                        autoInitAttempted: restoredAutoInit
                    });
                } else {
                    // Backend returned no valid data, reset to safe defaults
                    console.log('[App] Backend returned no valid data, resetting state');
                    setCurrentPage('home');
                    setJourneyStarted(false);
                    setAutoInitAttempted(false);
                    await clearAppState();
                }
            } catch (err) {
                console.warn('[App] Could not verify backend state:', err);
                // On error, reset to safe defaults (don't keep stale state)
                setCurrentPage('home');
                setJourneyStarted(false);
                setAutoInitAttempted(false);
                await clearAppState();
            }

            // Only mark as restored AFTER verification is complete
            setStateRestored(true);
        };
        restoreState();
    }, []);

    // Auto-start timer when page is refreshed and journey was already in progress
    useEffect(() => {
        if (stateRestored && journeyStarted && !timerActive) {
            // Check if not at last station before starting timer
            const stations = trainData?.stations || [];
            const currentStationIdx = trainData?.currentStationIdx || 0;
            const isLastStation = stations.length > 0 && currentStationIdx >= stations.length - 1;

            if (!isLastStation) {
                console.log('[Timer] Auto-starting timer after page refresh (journey was in progress)');
                setTimerActive(true);
                // Don't reset timer - keep it at 120 seconds for a fresh start after refresh
            }
        }
    }, [stateRestored, journeyStarted, timerActive, trainData?.stations, trainData?.currentStationIdx]);

    // Save state to IndexedDB when key states change
    useEffect(() => {
        // Skip saving on initial mount
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }
        // Only save after state has been restored
        if (stateRestored) {
            saveAppState({ currentPage, journeyStarted, autoInitAttempted });
        }
    }, [currentPage, journeyStarted, autoInitAttempted, stateRestored]);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('user');

        if (token && userData) {
            setIsAuthenticated(true);
            setUser(JSON.parse(userData));
        }
    }, []);

    useEffect(() => {
        setupWebSocket();

        return () => {
            wsService.disconnect();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Auto-initialize from backend config on app load
    useEffect(() => {
        if (isAuthenticated && !autoInitAttempted) {
            autoInitializeFromBackend();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated]);

    // Timer effect for automatic station movement
    const resetTimer = useCallback(() => {
        setTimerSeconds(TIMER_DURATION);
    }, [TIMER_DURATION]);

    const startTimer = useCallback(() => {
        resetTimer();
        setTimerActive(true);
    }, [resetTimer]);

    const stopTimer = useCallback(() => {
        setTimerActive(false);
        if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
        }
    }, []);

    // Timer countdown effect
    useEffect(() => {
        if (!timerActive || !journeyStarted) {
            if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
                timerIntervalRef.current = null;
            }
            return;
        }

        // Check if already at last station
        const stations = trainData?.stations || [];
        const currentStationIdx = trainData?.currentStationIdx || 0;
        const isLastStation = stations.length > 0 && currentStationIdx >= stations.length - 1;

        if (isLastStation) {
            stopTimer();
            return;
        }

        timerIntervalRef.current = setInterval(() => {
            setTimerSeconds((prev) => {
                if (prev <= 1) {
                    // Timer reached 0 - auto move to next station
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
                timerIntervalRef.current = null;
            }
        };
    }, [timerActive, journeyStarted, trainData?.stations, trainData?.currentStationIdx, stopTimer]);

    // Auto-move to next station when timer reaches 0
    useEffect(() => {
        if (timerSeconds === 0 && timerActive && journeyStarted && !loading) {
            const stations = trainData?.stations || [];
            const currentStationIdx = trainData?.currentStationIdx || 0;
            const isLastStation = stations.length > 0 && currentStationIdx >= stations.length - 1;

            if (!isLastStation) {
                console.log('⏰ Timer reached 0 - auto moving to next station');
                handleNextStationAuto();
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [timerSeconds]);

    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
            }
        };
    }, []);

    const autoInitializeFromBackend = async (): Promise<void> => {
        setAutoInitAttempted(true);

        try {
            console.log('🔧 Attempting auto-initialization from backend config...');

            // Check if backend is configured
            const configResponse = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/config/current`);
            const config = await configResponse.json();

            if (config.success && config.data.isConfigured) {
                console.log('✅ Backend is configured, auto-initializing train...');
                console.log('   Train:', config.data.trainNo);
                console.log('   Date:', config.data.journeyDate);

                // Try to initialize train
                const response = await api.initializeTrain(config.data.trainNo, config.data.journeyDate);

                if (response.success) {
                    console.log('✅ Train auto-initialized successfully!');
                    await loadTrainState();
                    setCurrentPage('home');
                } else {
                    console.warn('⚠️ Auto-initialization failed:', response.error);
                    // Don't show error, just stay on home page - user can configure if needed
                }
            } else {
                console.log('ℹ️ Backend not configured - user will need to use config page');
            }
        } catch (error: any) {
            console.warn('⚠️ Auto-initialization error:', error.message);
            // Silent fail - user can manually configure if needed
        }
    };

    const setupWebSocket = (): void => {
        const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:5000';
        wsService.connect(WS_URL);

        wsService.on('connected', () => {
            console.log('✅ WebSocket connected');
            setWsConnected(true);
            webSocketConnectedToast();
        });

        wsService.on('disconnected', () => {
            console.log('❌ WebSocket disconnected');
            setWsConnected(false);
            webSocketDisconnectedToast();
        });

        wsService.on('train_update', (data: WebSocketUpdateData) => {
            console.log('📡 Train update:', data.eventType);
            handleWebSocketUpdate(data);
        });

        wsService.on('station_arrival', (data: StationArrivalData) => {
            console.log('🚉 Station arrival:', data.data.station);
            loadTrainState();
        });

        wsService.on('rac_reallocation', (data: RACReallocationData) => {
            console.log('🎯 RAC reallocation:', data.data.totalAllocated);
            if (data.data.totalAllocated > 0) {
                alert(`✅ RAC Reallocation: ${data.data.totalAllocated} passengers upgraded!`);
            }
            loadTrainState();
        });

        wsService.on('no_show', (data: NoShowData) => {
            console.log('❌ No-show:', data.data.passenger.name);
            loadTrainState();
        });

        wsService.on('stats_update', (data: any) => {
            console.log('📊 Stats updated');
            if (trainData) {
                setTrainData(prev => ({
                    ...prev,
                    stats: data.data
                }));
            }
        });
    };

    const handleWebSocketUpdate = (data: WebSocketUpdateData): void => {
        switch (data.eventType) {
            case 'TRAIN_INITIALIZED':
                console.log('Train initialized via WebSocket');
                break;
            case 'JOURNEY_STARTED':
                setJourneyStarted(true);
                loadTrainState();
                break;
            case 'TRAIN_RESET':
                setJourneyStarted(false);
                loadTrainState();
                break;
            case 'JOURNEY_COMPLETE':
                alert('🎉 Journey Complete!\n\n' +
                    `Final Station: ${data.data.finalStation}\n` +
                    `Total Deboarded: ${data.data.totalDeboarded}\n` +
                    `RAC Upgraded: ${data.data.totalRACUpgraded}`);
                break;
            default:
                break;
        }
    };

    const handleInitialize = async (): Promise<void> => {
        try {
            setLoading(true);
            setError(null);
            const response = await api.initializeTrain();

            if (response.success) {
                await loadTrainState();
            } else {
                setError(response.error || 'Failed to initialize');
                const shouldRedirect = (
                    response.error?.includes('Missing train configuration') ||
                    response.error?.includes('Missing train number') ||
                    response.error?.includes('journey date')
                );
                if (shouldRedirect) {
                    setCurrentPage('config');
                }
            }
        } catch (err: any) {
            const msg = err.message || 'Failed to initialize train';
            setError(msg);
            setCurrentPage('config');
        } finally {
            setLoading(false);
        }
    };

    const loadTrainState = async (): Promise<void> => {
        try {
            const response = await api.getTrainState();

            if (response && response.success) {
                setTrainData(response.data);
                if (typeof response.data?.journeyStarted !== 'undefined') {
                    setJourneyStarted(prev => prev || response.data.journeyStarted);
                }
            } else if (response && response.error) {
                setError(response.error);
            } else if (response && !response.success) {
                setError((response as any).message || 'Failed to load train state');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to load train state');
        }
    };

    const handleStartJourney = async (): Promise<void> => {
        try {
            setLoading(true);
            setError(null);

            const response = await api.startJourney();

            if (response.success) {
                setJourneyStarted(true);
                await loadTrainState();
                // Start the automatic station movement timer
                startTimer();
            } else {
                setError(response.error || 'Failed to start journey');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to start journey');
        } finally {
            setLoading(false);
        }
    };

    const handleNextStation = async (): Promise<void> => {
        try {
            setLoading(true);
            setError(null);

            const response = await api.moveToNextStation();

            if (response.success) {
                await loadTrainState();
                // Reset timer for next station
                resetTimer();

                alert(`✅ Processed Station: ${response.data.station}\n\n` +
                    `Deboarded: ${response.data.deboarded}\n` +
                    `No-Shows: ${response.data.noShows}\n` +
                    `RAC Upgraded: ${response.data.racAllocated}\n` +
                    `Boarded: ${response.data.boarded}\n\n` +
                    `Current Onboard: ${response.data.stats.currentOnboard}\n` +
                    `Vacant Berths: ${response.data.stats.vacantBerths}`);
            } else {
                setError(response.error || 'Failed to move');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to move to next station');
        } finally {
            setLoading(false);
        }
    };

    // Auto-move to next station (silent, triggered by timer)
    const handleNextStationAuto = async (): Promise<void> => {
        try {
            setLoading(true);
            setError(null);

            const response = await api.moveToNextStation();

            if (response.success) {
                await loadTrainState();
                // Reset timer for next station
                resetTimer();
                console.log(`⏰ Auto-moved to station: ${response.data.station}`);
            } else {
                setError(response.error || 'Failed to auto-move');
                stopTimer(); // Stop timer on error
            }
        } catch (err: any) {
            setError(err.message || 'Failed to auto-move to next station');
            stopTimer(); // Stop timer on error
        } finally {
            setLoading(false);
        }
    };

    const handleReset = async (): Promise<void> => {
        if (!window.confirm('Are you sure you want to reset the train? All progress will be lost.')) {
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const response = await api.resetTrain();

            if (response.success) {
                setJourneyStarted(false);
                setAutoInitAttempted(false);
                // Stop the timer and reset to initial value
                stopTimer();
                resetTimer();
                await clearAppState(); // Clear persisted state on reset
                await loadTrainState();
                alert('✅ Train reset successfully!');
            } else {
                setError(response.error || 'Failed to reset');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to reset train');
        } finally {
            setLoading(false);
        }
    };

    const handleMarkNoShow = async (pnr: string): Promise<void> => {
        try {
            setLoading(true);
            setError(null);

            const response = await api.markPassengerNoShow(pnr);

            if (response.success) {
                await loadTrainState();
                alert(`✅ ${response.data.name} marked as NO-SHOW\n\nBerth: ${response.data.berth}\nFrom: ${response.data.Boarding_Station} → ${response.data.Deboarding_Station}`);
            } else {
                alert(`❌ Error: ${response.error}`);
            }
        } catch (err: any) {
            alert(`❌ Error: ${err.message || 'Failed to mark no-show'}`);
        } finally {
            setLoading(false);
        }
    };

    const handleNavigate = (page: PageType): void => {
        setCurrentPage(page);
    };

    const handleLogout = async (): Promise<void> => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        await clearAppState(); // Clear persisted state on logout
        setIsAuthenticated(false);
        setUser(null);
        setMenuOpen(false);
        setTrainData(null);
        setJourneyStarted(false);
        setAutoInitAttempted(false);
        setCurrentPage('config');
    };

    const handleClosePage = (): void => {
        setCurrentPage('home');
        loadTrainState();
    };

    // Show loading while state is being restored from IndexedDB and verified with backend
    if (!stateRestored) {
        return (
            <div className="App">
                <div className="app-header">
                    <div className="header-content">
                        <h1>🚂 RAC Reallocation System</h1>
                        <h2>Restoring Session...</h2>
                    </div>
                </div>
                <div className="app-content">
                    <div className="initialization-screen">
                        <div className="init-card">
                            <h3>Verifying State</h3>
                            <div className="spinner-large"></div>
                            <p>Syncing with backend...</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        if (showSignUp) {
            return <SignUpPage onSwitchToLogin={() => setShowSignUp(false)} />;
        }
        return <LoginPage onSwitchToSignUp={() => setShowSignUp(true)} />;
    }

    if (!trainData && loading) {
        return (
            <div className="App">
                <div className="app-header">
                    <div className="header-content">
                        <h1>🚂 RAC Reallocation System</h1>
                        <h2>Loading Train Configuration...</h2>
                    </div>
                    <div className="user-menu">
                        <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)}>
                            ⋮
                        </button>
                        {menuOpen && (
                            <div className="menu-dropdown">
                                <div className="menu-user-info">
                                    <p><strong>{user?.username || 'Admin'}</strong></p>
                                    <p className="user-role">{user?.role || 'ADMIN'}</p>
                                </div>
                                <hr />
                                <button onClick={handleLogout} className="menu-item logout">
                                    🚪 Logout
                                </button>
                            </div>
                        )}
                    </div>
                </div>
                <div className="app-content">
                    <div className="initialization-screen">
                        <div className="init-card">
                            <h3>Initializing Train...</h3>
                            <div className="spinner-large"></div>
                            <p>Loading train data from MongoDB</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (currentPage === 'config') {
        return (
            <div className="App app-classic">
                <div className="app-header">
                    <div className="header-content">
                        <h1>🚂 RAC Reallocation System</h1>
                        <h2>Configuration</h2>
                    </div>
                </div>
                <div className="app-content">
                    <ConfigPage onClose={handleClosePage} loadTrainState={loadTrainState} />
                </div>
            </div>
        );
    }

    if (error && !trainData) {
        return (
            <div className="App">
                <div className="app-header">
                    <div className="header-content">
                        <h1>🚂 RAC Reallocation System</h1>
                        <h2>Configuration Error</h2>
                    </div>
                </div>
                <div className="app-content">
                    <div className="initialization-screen">
                        <div className="init-card error">
                            <h3>❌ Initialization Failed</h3>
                            <p>{error}</p>
                            <button onClick={() => setCurrentPage('config')} className="btn-primary">
                                Open Configuration
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="App">
            <ToastContainer />

            <div className="app-header">
                <div className="header-content">
                    <h1>🚂 RAC Reallocation System</h1>
                    {trainData && trainData.trainNo ? (
                        <>
                            <h2>{trainData.trainName || 'Unknown'} (#{trainData.trainNo}) | {trainData.journeyDate || 'N/A'}</h2>
                            <p className="route">
                                {trainData?.stations && trainData.stations.length > 0
                                    ? `${trainData.stations[0]?.name || 'Start'} → ${trainData.stations[trainData.stations.length - 1]?.name || 'End'}`
                                    : 'Loading stations...'}
                            </p>
                        </>
                    ) : (
                        <h2>Loading train configuration...</h2>
                    )}
                </div>
                <div className="header-actions">

                </div>
                <div className="user-menu">
                    <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)}>
                        ⋮
                    </button>
                    {menuOpen && (
                        <div className="menu-dropdown">
                            <div className="menu-user-info">
                                <p><strong>{user?.username || 'Admin'}</strong></p>
                                <p className="user-role">{user?.role || 'ADMIN'}</p>
                            </div>
                            <hr />
                            <button
                                onClick={() => {
                                    setCurrentPage('config');
                                    setMenuOpen(false);
                                }}
                                className="menu-item"
                            >
                                ⚙️ Configuration
                            </button>
                            <button onClick={handleLogout} className="menu-item logout">
                                🚪 Logout
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {error && (
                <div className="error-banner">
                    <span>{error}</span>
                    <button onClick={() => setError(null)}>✕</button>
                </div>
            )}
            <div className="app-content">
                {currentPage === 'home' && (
                    <HomePage
                        trainData={trainData}
                        journeyStarted={journeyStarted}
                        loading={loading}
                        onStartJourney={handleStartJourney}
                        onNextStation={handleNextStation}
                        onReset={handleReset}
                        onMarkNoShow={handleMarkNoShow}
                        onNavigate={handleNavigate}
                        timerSeconds={timerSeconds}
                        timerActive={timerActive}
                    />
                )}

                {currentPage === 'rac-queue' && journeyStarted && (
                    <RACQueuePage
                        trainData={trainData}
                        onClose={handleClosePage}
                    />
                )}

                {currentPage === 'coaches' && (
                    <CoachesPage
                        trainData={trainData}
                        onClose={handleClosePage}
                    />
                )}

                {currentPage === 'passengers' && journeyStarted && (
                    <PassengersPage
                        trainData={trainData}
                        onClose={handleClosePage}
                        onNavigate={handleNavigate}
                    />
                )}



                {currentPage === 'visualization' && journeyStarted && (
                    <VisualizationPage
                        trainData={trainData}
                        onClose={handleClosePage}
                    />
                )}

                {currentPage === 'add-passenger' && (
                    <AddPassengerPage
                        trainData={trainData}
                        onClose={handleClosePage}
                    />
                )}

                {currentPage === 'phase1' && journeyStarted && (
                    <PhaseOnePage
                        onClose={handleClosePage}
                    />
                )}

                {currentPage === 'phase1' && !journeyStarted && (
                    <div className="journey-not-started-container">
                        <div className="journey-not-started-card">
                            <div className="notice-icon">🚂</div>
                            <h2>Journey Not Started</h2>
                            <p>The train journey hasn't begun yet. Please start the journey from the home page to access allocation features.</p>
                            <button onClick={handleClosePage} className="home-btn">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                </svg>
                                Go to Home
                            </button>
                        </div>
                    </div>
                )}

                {(['rac-queue', 'passengers', 'reallocation', 'visualization'].includes(currentPage)) && !journeyStarted && (
                    <div className="journey-not-started-container">
                        <div className="journey-not-started-card">
                            <div className="notice-icon">🚂</div>
                            <h2>Journey Not Started</h2>
                            <p>The train journey hasn't begun yet. Please start the journey from the home page to access allocation features.</p>
                            <button onClick={handleClosePage} className="home-btn">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                </svg>
                                Go to Home
                            </button>
                        </div>
                    </div>
                )}


            </div>

            <div className="app-footer">
                <p>&copy; 2025 RAC Reallocation System | Train {trainData?.trainNo || 'N/A'} - {trainData?.trainName || 'Unknown'} | Journey: {trainData?.journeyDate || 'N/A'}</p>
            </div>
        </div>
    );
}

export default App;
