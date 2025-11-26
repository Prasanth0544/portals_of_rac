import React, { useState, useEffect } from 'react';
import { initializeTrain, startJourney, getTrainState, moveToNextStation, resetTrain, markPassengerNoShow } from './services/api';
import wsService from './services/websocket';
import LoginPage from './pages/LoginPage'; // ✅ NEW
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
import './App.css';
import './UserMenu.css'; // ✅ NEW - 3-dot menu styles

function App() {
  // ✅ NEW: Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  const [trainData, setTrainData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState('config');
  const [journeyStarted, setJourneyStarted] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);

  // ✅ NEW: Check for existing auth token on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (token && userData) {
      setIsAuthenticated(true);
      setUser(JSON.parse(userData));
    }
  }, []);

  useEffect(() => {
    // Always start on configuration page; connect WebSocket for status updates
    setupWebSocket();

    return () => {
      // Cleanup WebSocket on unmount
      wsService.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setupWebSocket = () => {
    // Connect to WebSocket using env or default
    const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:5000';
    wsService.connect(WS_URL);

    // Listen to connection events
    wsService.on('connected', () => {
      console.log('✅ WebSocket connected');
      setWsConnected(true);
    });

    wsService.on('disconnected', () => {
      console.log('❌ WebSocket disconnected');
      setWsConnected(false);
    });

    // Listen to train updates
    wsService.on('train_update', (data) => {
      console.log('📡 Train update:', data.eventType);
      handleWebSocketUpdate(data);
    });

    wsService.on('station_arrival', (data) => {
      console.log('🚉 Station arrival:', data.data.station);
      // Reload train state
      loadTrainState();
    });

    wsService.on('rac_reallocation', (data) => {
      console.log('🎯 RAC reallocation:', data.data.totalAllocated);
      // Show notification
      if (data.data.totalAllocated > 0) {
        alert(`✅ RAC Reallocation: ${data.data.totalAllocated} passengers upgraded!`);
      }
      loadTrainState();
    });

    wsService.on('no_show', (data) => {
      console.log('❌ No-show:', data.data.passenger.name);
      loadTrainState();
    });

    wsService.on('stats_update', (data) => {
      console.log('📊 Stats updated');
      // Update stats in real-time if needed
      if (trainData) {
        setTrainData(prev => ({
          ...prev,
          stats: data.data
        }));
      }
    });
  };

  const handleWebSocketUpdate = (data) => {
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

  const handleInitialize = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await initializeTrain();

      if (response.success) {
        await loadTrainState();
      }
    } catch (err) {
      const msg = err.message || 'Failed to initialize train';
      setError(msg);
      // If backend is not configured or missing required fields, redirect to configuration
      const shouldRedirect = (
        msg.includes('Missing train configuration') ||
        msg.includes('Missing train number') ||
        msg.includes('journey date')
      );
      if (shouldRedirect) {
        setCurrentPage('config');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadTrainState = async () => {
    try {
      const response = await getTrainState();

      if (response.success) {
        setTrainData(response.data);
        // Only update journeyStarted from API if we don't already have it set to true
        // This prevents overwriting when journey has started but API might not reflect it yet
        if (typeof response.data.journeyStarted !== 'undefined') {
          setJourneyStarted(prev => prev || response.data.journeyStarted);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to load train state');
    }
  };

  const handleStartJourney = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await startJourney();

      if (response.success) {
        setJourneyStarted(true);
        await loadTrainState();
      }
    } catch (err) {
      setError(err.message || 'Failed to start journey');
    } finally {
      setLoading(false);
    }
  };

  const handleNextStation = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await moveToNextStation();

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
        alert(response.message);
      }
    } catch (err) {
      setError(err.message || 'Failed to move to next station');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Are you sure you want to reset the train? All progress will be lost.')) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await resetTrain();

      if (response.success) {
        setJourneyStarted(false);
        await loadTrainState();
        alert('✅ Train reset successfully!');
      }
    } catch (err) {
      setError(err.message || 'Failed to reset train');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkNoShow = async (pnr) => {
    try {
      setLoading(true);
      setError(null);

      const response = await markPassengerNoShow(pnr);

      if (response.success) {
        await loadTrainState();
        alert(`✅ ${response.data.name} marked as NO-SHOW\n\nBerth: ${response.data.berth}\nFrom: ${response.data.from} → ${response.data.to}`);
      }
    } catch (err) {
      alert(`❌ Error: ${err.message || 'Failed to mark no-show'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleNavigate = (page) => {
    setCurrentPage(page);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setUser(null);
    setMenuOpen(false);
    // Reset train data
    setTrainData(null);
    setJourneyStarted(false);
    setCurrentPage('config');
  };

  const handleClosePage = () => {
    setCurrentPage('home');
    loadTrainState(); // Reload stats after closing pages (e.g., after add passenger)
  };

  // ✅ NEW: Menu state
  const [menuOpen, setMenuOpen] = useState(false);

  // Show login page if not authenticated
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
          {/* ✅ NEW: 3-dot menu */}
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

  // Render configuration page when requested
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
      <div className="app-header">
        <div className="header-content">
          <h1>🚂 RAC Reallocation System</h1>
          <h2>{trainData.trainName} (#{trainData.trainNo}) | {trainData.journeyDate}</h2>
          <p className="route">
            {trainData?.stations[0]?.name} → {trainData?.stations[trainData.stations.length - 1]?.name}
          </p>
        </div>
        {/* ✅ NEW: 3-dot menu */}
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
        <p>&copy; 2025 RAC Reallocation System | Train {trainData?.trainNo} - {trainData?.trainName} | Journey: {trainData?.journeyDate}</p>
      </div>
    </div>
  );
}

export default App;
