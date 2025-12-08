// frontend/src/App.tsx

import React, { useState, useEffect } from 'react';
import * as api from './services/apiWithErrorHandling';
import wsService from './services/websocket';
import ToastContainer from './components/ToastContainer';
import APIDocumentationLink from './components/APIDocumentationLink';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import RACQueuePage from './pages/RACQueuePage';
import CoachesPage from './pages/CoachesPage';
import PassengersPage from './pages/PassengersPage';
import ReallocationPage from './pages/ReallocationPage';
import VisualizationPage from './pages/VisualizationPage';
import AddPassengerPage from './pages/AddPassengerPage';
import AllocationDiagnosticsPage from './pages/AllocationDiagnosticsPage';
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

type PageType = 'config' | 'home' | 'rac-queue' | 'coaches' | 'passengers' | 'reallocation' | 'visualization' | 'add-passenger' | 'phase1' | 'diagnostics';

function App(): React.ReactElement {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [user, setUser] = useState<User | null>(null);

    const [trainData, setTrainData] = useState<TrainData | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState<PageType>('config');
    const [journeyStarted, setJourneyStarted] = useState<boolean>(false);
    const [wsConnected, setWsConnected] = useState<boolean>(false);
    const [menuOpen, setMenuOpen] = useState<boolean>(false);

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

    const handleLogout = (): void => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setIsAuthenticated(false);
        setUser(null);
        setMenuOpen(false);
        setTrainData(null);
        setJourneyStarted(false);
        setCurrentPage('config');
    };

    const handleClosePage = (): void => {
        setCurrentPage('home');
        loadTrainState();
    };

    if (!isAuthenticated) {
        return <LoginPage />;
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
                    <APIDocumentationLink />
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
                    />
                )}

                {currentPage === 'rac-queue' && (
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

                {currentPage === 'passengers' && (
                    <PassengersPage
                        trainData={trainData}
                        onClose={handleClosePage}
                        onNavigate={handleNavigate}
                    />
                )}

                {currentPage === 'reallocation' && (
                    <ReallocationPage
                        trainData={trainData}
                        onClose={handleClosePage}
                        loadTrainState={loadTrainState}
                    />
                )}

                {currentPage === 'visualization' && (
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

                {currentPage === 'phase1' && (
                    <PhaseOnePage
                        onClose={handleClosePage}
                    />
                )}

                {currentPage === 'diagnostics' && (
                    <AllocationDiagnosticsPage
                        onClose={handleClosePage}
                    />
                )}
            </div>

            <div className="app-footer">
                <p>&copy; 2025 RAC Reallocation System | Train {trainData?.trainNo || 'N/A'} - {trainData?.trainName || 'Unknown'} | Journey: {trainData?.journeyDate || 'N/A'}</p>
            </div>
        </div>
    );
}

export default App;
