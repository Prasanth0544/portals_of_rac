// passenger-portal/src/App.jsx
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, AppBar, Toolbar, Typography, Container, Box, Tabs, Tab, IconButton, Menu, MenuItem, Divider } from '@mui/material';
import TrainIcon from '@mui/icons-material/Train';
import HomeIcon from '@mui/icons-material/Home';
import SearchIcon from '@mui/icons-material/Search';
import MapIcon from '@mui/icons-material/Map';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import LogoutIcon from '@mui/icons-material/Logout';
import SettingsIcon from '@mui/icons-material/Settings';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import PNRSearchPage from './pages/PNRSearchPage';

import JourneyVisualizationPage from './pages/JourneyVisualizationPage';
import NotificationBell from './components/NotificationBell';
import './App.css';
import './UserMenu.css';

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

// Navigation component with tabs
function Navigation({ user, onLogout }) {
    const location = useLocation();
    const [menuAnchor, setMenuAnchor] = useState(null);

    const getTabValue = () => {
        switch (location.pathname) {
            case '/': return 0;
            case '/pnr-search': return 1;
            case '/journey': return 2;
            default: return 0;
        }
    };

    const handleMenuOpen = (event) => {
        setMenuAnchor(event.currentTarget);
    };

    const handleMenuClose = () => {
        setMenuAnchor(null);
    };

    const handleLogout = () => {
        handleMenuClose();
        onLogout();
    };

    return (
        <AppBar position="static" elevation={2}>
            <Toolbar>
                <TrainIcon sx={{ mr: 2 }} />
                <Typography variant="h6" component="div" sx={{ mr: 4 }}>
                    Passenger Portal
                </Typography>

                <Tabs
                    value={getTabValue()}
                    textColor="inherit"
                    indicatorColor="secondary"
                    sx={{
                        flexGrow: 1,
                        '& .MuiTab-root': {
                            minHeight: 64,
                            color: 'rgba(255,255,255,0.7)',
                            '&.Mui-selected': { color: 'white' }
                        }
                    }}
                >
                    <Tab
                        icon={<HomeIcon />}
                        label="Home"
                        component={Link}
                        to="/"
                        iconPosition="start"
                    />
                    <Tab
                        icon={<SearchIcon />}
                        label="PNR Search"
                        component={Link}
                        to="/pnr-search"
                        iconPosition="start"
                    />
                    <Tab
                        icon={<MapIcon />}
                        label="Journey"
                        component={Link}
                        to="/journey"
                        iconPosition="start"
                    />
                </Tabs>

                <NotificationBell irctcId={user?.IRCTC_ID} />

                {/* Three-dots Menu */}
                <IconButton
                    color="inherit"
                    onClick={handleMenuOpen}
                    sx={{ ml: 1 }}
                >
                    <MoreVertIcon />
                </IconButton>
                <Menu
                    anchorEl={menuAnchor}
                    open={Boolean(menuAnchor)}
                    onClose={handleMenuClose}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                >
                    <MenuItem disabled sx={{ opacity: 0.8 }}>
                        <Typography variant="body2" color="text.secondary">
                            {user?.name || user?.IRCTC_ID || 'Passenger'}
                        </Typography>
                    </MenuItem>
                    <Divider />
                    <MenuItem onClick={handleMenuClose}>
                        <SettingsIcon sx={{ mr: 1, fontSize: 20 }} />
                        Settings
                    </MenuItem>
                    <MenuItem onClick={handleLogout} sx={{ color: '#e74c3c' }}>
                        <LogoutIcon sx={{ mr: 1, fontSize: 20 }} />
                        Logout
                    </MenuItem>
                </Menu>
            </Toolbar>
        </AppBar>
    );
}

function App() {
    const [authenticated, setAuthenticated] = useState(false);
    const [user, setUser] = useState(null);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('user');

        if (token && userData) {
            setAuthenticated(true);
            setUser(JSON.parse(userData));
        }
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setAuthenticated(false);
        setUser(null);
        window.location.reload();
    };

    if (!authenticated) {
        return <LoginPage />;
    }

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <Router>
                <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
                    <Navigation user={user} onLogout={handleLogout} />

                    <Box sx={{ flex: 1 }}>
                        <Routes>
                            <Route path="/" element={<DashboardPage />} />
                            <Route path="/pnr-search" element={<PNRSearchPage />} />
                            <Route path="/journey" element={<JourneyVisualizationPage />} />
                        </Routes>
                    </Box>

                    <Box component="footer" sx={{ bgcolor: 'background.paper', py: 3, borderTop: '1px solid #e0e0e0' }}>
                        <Container maxWidth="lg">
                            <Typography variant="body2" color="text.secondary" align="center">
                                © 2025 Indian Railways - Dynamic RAC Reallocation System
                            </Typography>
                        </Container>
                    </Box>
                </Box>
            </Router>
        </ThemeProvider>
    );
}

export default App;
