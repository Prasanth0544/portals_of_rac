// passenger-portal/src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, AppBar, Toolbar, Typography, Container, Box, Button } from '@mui/material';
import TrainIcon from '@mui/icons-material/Train';
import SearchIcon from '@mui/icons-material/Search';
import NotificationsIcon from '@mui/icons-material/Notifications';

// Pages
import PNRCheckPage from './pages/PNRCheckPage';
import UpgradeNotificationsPage from './pages/UpgradeNotificationsPage';
import './App.css';

const theme = createTheme({
    palette: {
        primary: {
            main: '#1976d2',
        },
        secondary: {
            main: '#dc004e',
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
    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <Router>
                <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
                    <AppBar position="static" elevation={2}>
                        <Toolbar>
                            <TrainIcon sx={{ mr: 2 }} />
                            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                                Indian Railways - Passenger Portal
                            </Typography>
                            <Button color="inherit" component={Link} to="/" startIcon={<SearchIcon />}>
                                PNR Check
                            </Button>
                            <Button color="inherit" component={Link} to="/upgrades" startIcon={<NotificationsIcon />}>
                                Upgrades
                            </Button>
                        </Toolbar>
                    </AppBar>

                    <Container maxWidth="lg" sx={{ flex: 1, py: 4 }}>
                        <Routes>
                            <Route path="/" element={<PNRCheckPage />} />
                            <Route path="/upgrades" element={<UpgradeNotificationsPage />} />
                        </Routes>
                    </Container>

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
