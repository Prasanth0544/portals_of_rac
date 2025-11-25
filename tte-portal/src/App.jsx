// tte-portal/src/App.jsx
import React, { useState } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, AppBar, Toolbar, Typography, Container, Box, Tabs, Tab, Badge } from '@mui/material';
import TrainIcon from '@mui/icons-material/Train';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';

// Pages/Components
import LoginPage from './pages/LoginPage'; // ✅ NEW
import './App.css';

// Temporary Placeholder Components (until features are implemented)
function Dashboard() {
    return (
        <Box sx={{ textAlign: 'center', mt: 8 }}>
            <Typography variant="h4" gutterBottom>TTE Dashboard</Typography>
            <Typography variant="body1" color="text.secondary">
                Dashboard functionality will be available after authentication is implemented.
            </Typography>
        </Box>
    );
}

function PassengerManagement() {
    return (
        <Box sx={{ textAlign: 'center', mt: 8 }}>
            <Typography variant="h4" gutterBottom>Passenger Management</Typography>
            <Typography variant="body1" color="text.secondary">
                Passenger management features coming soon...
            </Typography>
        </Box>
    );
}

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
    const { isConnected, pendingUpgrades } = useTteSocket();

    // ✅ NEW: Check for existing auth token on mount
    React.useEffect(() => {
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('user');

        if (token && userData) {
            setIsAuthenticated(true);
            setUser(JSON.parse(userData));
        }
    }, []);

    // ✅ NEW: Show login page if not authenticated
    if (!isAuthenticated) {
        return <LoginPage />;
    }

    const handleTabChange = (event, newValue) => {
        setCurrentTab(newValue);
    };

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: '#f5f5f5' }}>
                <AppBar position="static" elevation={3}>
                    <Toolbar>
                        <TrainIcon sx={{ mr: 2, fontSize: 32 }} />
                        <Box sx={{ flexGrow: 1 }}>
                            <Typography variant="h6" component="div">
                                TTE Control Portal
                            </Typography>
                            <Typography variant="caption" sx={{ opacity: 0.8 }}>
                                Dynamic RAC Reallocation System {isConnected && '🟢 Live'}
                            </Typography>
                        </Box>
                    </Toolbar>
                    <Tabs value={currentTab} onChange={handleTabChange} sx={{ bgcolor: 'primary.dark' }} textColor="inherit">
                        <Tab icon={<DashboardIcon />} label="Dashboard" />
                        <Tab icon={<PeopleIcon />} label="Passenger Management" />
                        <Tab
                            icon={
                                <Badge badgeContent={pendingUpgrades.length} color="error">
                                    <VerifiedUserIcon />
                                </Badge>
                            }
                            label="Offline Upgrades"
                        />
                    </Tabs>
                </AppBar>

                <Container maxWidth="xl" sx={{ flex: 1, py: 4 }}>
                    {currentTab === 0 && <Dashboard />}
                    {currentTab === 1 && <PassengerManagement />}
                    {currentTab === 2 && <OfflineUpgradeVerification />}
                </Container>

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
