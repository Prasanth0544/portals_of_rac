// tte-portal/src/App.jsx
import React, { useState } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, AppBar, Toolbar, Typography, Container, Box, Tabs, Tab } from '@mui/material';
import TrainIcon from '@mui/icons-material/Train';

// Pages/Components
import LoginPage from './pages/LoginPage'; // ✅ NEW
import DashboardPage from './pages/DashboardPage'; // ✅ Real dashboard
import BoardingVerificationPage from './pages/BoardingVerificationPage'; // ✅ NEW - Boarding Verification
import ActionHistoryPage from './pages/ActionHistoryPage'; // ✅ NEW
import OfflineUpgradesPage from './pages/OfflineUpgradesPage'; // ✅ NEW
import PassengersPage from './pages/PassengersPage'; // ✅ UNIFIED - Same as admin portal
import BoardedPassengersPage from './pages/BoardedPassengersPage'; // ✅ NEW
import './App.css';
import './UserMenu.css'; // ✅ 3-dot menu styling

// Temporary Placeholder Components (until features are implemented)
// REMOVED: Placeholder Dashboard - using real component from ./pages/DashboardPage

// REMOVED: Placeholder PassengerManagement - using real component from ./components/PassengerManagement

function OfflineUpgradeVerification() {
    return (
        <Box sx={{ textAlign: 'center', mt: 8 }}>
            <Typography variant="h4" gutterBottom>Offline Upgrade Verification</Typography>
            <Typography variant="body1" color="text.secondary">
                This feature will be replaced by new boarding verification workflow.
            </Typography>
        </Box>
    );
}

// Placeholder hook
function useTteSocket() {
    return {
        isConnected: false,
        pendingUpgrades: []
    };
}

const theme = createTheme({
    palette: {
        primary: {
            main: '#1565c0',
        },
        secondary: {
            main: '#f57c00',
        },
    },
    typography: {
        fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
        h4: {
            fontWeight: 600,
        },
    },
});

function App() {
    // ✅ NEW: Authentication state
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState(null);
    const [currentTab, setCurrentTab] = useState(0);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 960); // ✅ NEW: Mobile detection state
    const [menuOpen, setMenuOpen] = useState(false); // ✅ 3-dot menu state
    const { isConnected, pendingUpgrades } = useTteSocket();

    // ✅ NEW: Check for existing auth token on mount
    React.useEffect(() => {
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('user');

        if (token && userData) {
            setIsAuthenticated(true);
            setUser(JSON.parse(userData));
        }

        // Handle window resize for mobile detection
        const handleResize = () => {
            setIsMobile(window.innerWidth < 960);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // ✅ NEW: Show login page if not authenticated
    if (!isAuthenticated) {
        return <LoginPage />;
    }

    const handleTabChange = (event, newValue) => {
        setCurrentTab(newValue);
    };

    // ✅ Logout handler
    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setIsAuthenticated(false);
        setUser(null);
        setMenuOpen(false);
    };

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: '#f5f5f5' }}>
                <AppBar position="static" elevation={3}>
                    <Toolbar>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <TrainIcon sx={{ fontSize: 32 }} />
                            <Typography variant="h5" component="div" sx={{ fontWeight: 700 }}>
                                TTE Portal
                            </Typography>
                        </Box>
                        <Box sx={{ flexGrow: 1 }} />
                        <Typography variant="body2" sx={{ mr: 2, opacity: 0.9 }}>
                            Welcome, {user?.username || 'TTE'}
                        </Typography>
                        {/* ✅ 3-dot menu */}
                        <div className="user-menu">
                            <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)}>
                                ⋮
                            </button>
                            {menuOpen && (
                                <div className="menu-dropdown">
                                    <div className="menu-user-info">
                                        <p><strong>{user?.username || 'TTE'}</strong></p>
                                        <p className="user-role">{user?.role || 'TTE'}</p>
                                    </div>
                                    <hr />
                                    <button onClick={handleLogout} className="menu-item logout">
                                        🚪 Logout
                                    </button>
                                </div>
                            )}
                        </div>
                    </Toolbar>
                    <Tabs
                        value={currentTab}
                        onChange={handleTabChange}
                        sx={{
                            bgcolor: '#0d47a1',
                            '& .MuiTab-root': {
                                color: 'rgba(255,255,255,0.7)',
                                fontWeight: 500,
                                fontSize: '0.875rem',
                                textTransform: 'none',
                                minHeight: 48,
                                '&.Mui-selected': {
                                    color: '#ffffff',
                                    fontWeight: 600
                                }
                            },
                            '& .MuiTabs-indicator': {
                                backgroundColor: '#ffffff',
                                height: 3
                            }
                        }}
                        textColor="inherit"
                        variant={isMobile ? "scrollable" : "standard"}
                        scrollButtons={isMobile ? "auto" : false}
                        allowScrollButtonsMobile
                    >
                        <Tab label="Dashboard" />
                        <Tab label="Passenger List" />
                        <Tab label="Boarded Passengers" />
                        <Tab label="RAC Upgrades" />
                        <Tab label="Action History" />
                    </Tabs>
                </AppBar>

                {/* Tab Content */}
                <Box sx={{ flex: 1, py: 2 }}>
                    {currentTab === 0 && <DashboardPage />}
                    {currentTab === 1 && <PassengersPage />}
                    {currentTab === 2 && <BoardedPassengersPage />}
                    {currentTab === 3 && <OfflineUpgradesPage />}
                    {currentTab === 4 && <ActionHistoryPage />}
                </Box>

                <Box component="footer" sx={{ bgcolor: 'background.paper', py: 2, borderTop: '1px solid #e0e0e0' }}>
                    <Container maxWidth="xl">
                        <Typography variant="body2" color="text.secondary" align="center">
                            © 2025 Indian Railways TTE Portal - Dynamic RAC Reallocation System
                        </Typography>
                    </Container>
                </Box>
            </Box>
        </ThemeProvider>
    );
}

export default App;
