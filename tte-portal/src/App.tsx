// tte-portal/src/App.tsx
import React, { useState, useEffect } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, AppBar, Toolbar, Typography, Container, Box, Tabs, Tab } from '@mui/material';
import TrainIcon from '@mui/icons-material/Train';

// Pages/Components
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import BoardingVerificationPage from './pages/BoardingVerificationPage';
import PassengersPage from './pages/PassengersPage';
import BoardedPassengersPage from './pages/BoardedPassengersPage';
import UpgradeNotificationsPage from './pages/UpgradeNotificationsPage';
import PendingReallocationsPage from './pages/PendingReallocationsPage';
import VisualizationPage from './pages/VisualizationPage';
import './App.css';
import './UserMenu.css';

// Push notification service for TTE alerts
import { initializePushNotifications } from './services/pushNotificationService';

// User interface
interface User {
    username?: string;
    role?: string;
    userId?: string;
}

// Temporary Placeholder Component
function OfflineUpgradeVerification(): React.ReactElement {
    return (
        <Box sx={{ textAlign: 'center', mt: 8 }}>
            <Typography variant="h4" gutterBottom>Offline Upgrade Verification</Typography>
            <Typography variant="body1" color="text.secondary">
                This feature will be replaced by new boarding verification workflow.
            </Typography>
        </Box>
    );
}

const theme = createTheme({
    palette: {
        primary: {
            main: '#2c3e50',  // Dark navy - same as frontend
            light: '#34495e',
            dark: '#1a252f',
        },
        secondary: {
            main: '#3498db',  // Blue accent
        },
    },
    typography: {
        fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
        h4: {
            fontWeight: 600,
        },
    },
});

function App(): React.ReactElement {
    // Authentication state
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [user, setUser] = useState<User | null>(null);
    const [currentTab, setCurrentTab] = useState<number>(0);
    const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth < 960);
    const [menuOpen, setMenuOpen] = useState<boolean>(false);

    // Check for existing auth token on mount
    useEffect(() => {
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('user');

        if (token && userData) {
            setIsAuthenticated(true);
            setUser(JSON.parse(userData));

            // Initialize push notifications when authenticated
            initializePushNotifications(() => {
                console.log('🔄 TTE Portal: Refreshing due to push notification...');
                window.location.reload();
            }).then(result => {
                if (result.success) {
                    console.log('✅ TTE push notifications ready');
                }
            });
        }

        // Handle window resize for mobile detection
        const handleResize = (): void => {
            setIsMobile(window.innerWidth < 960);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Show login page if not authenticated
    if (!isAuthenticated) {
        return <LoginPage />;
    }

    const handleTabChange = (_event: React.SyntheticEvent, newValue: number): void => {
        setCurrentTab(newValue);
    };

    // Logout handler
    const handleLogout = (): void => {
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
                        {/* 3-dot menu */}
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
                            bgcolor: '#1a252f',
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
                                backgroundColor: '#3498db',
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
                        <Tab label="Pending Reallocations" />
                        <Tab label="Journey Visualization" />
                    </Tabs>
                </AppBar>

                {/* Tab Content */}
                <Box sx={{ flex: 1, py: 2 }}>
                    {currentTab === 0 && <DashboardPage />}
                    {currentTab === 1 && <PassengersPage />}
                    {currentTab === 2 && <BoardedPassengersPage />}
                    {currentTab === 3 && <PendingReallocationsPage />}
                    {currentTab === 4 && <VisualizationPage />}
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
