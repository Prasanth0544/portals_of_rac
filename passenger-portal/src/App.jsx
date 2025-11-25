// passenger-portal/src/App.jsx
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, AppBar, Toolbar, Typography, Container, Box, Button } from '@mui/material';
import TrainIcon from '@mui/icons-material/Train';
import LoginPage from './pages/LoginPage';
import './App.css';

// Temporary Home Component (will be replaced with actual dashboard)
function HomePage() {
    return (
        <Box sx={{ textAlign: 'center', mt: 8 }}>
            <Typography variant="h3" gutterBottom>
                Welcome to Passenger Portal
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
                Login functionality coming soon...
            </Typography>
            <Typography variant="body1" color="text.secondary">
                After authentication is implemented, you'll be able to:
            </Typography>
            <Box sx={{ mt: 2, textAlign: 'left', maxWidth: 600, mx: 'auto' }}>
                <Typography variant="body2" sx={{ mb: 1 }}>✓ View your tickets (using IRCTC ID)</Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>✓ Check RAC upgrade status</Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>✓ Receive real-time notifications</Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>✓ View boarding pass & journey details</Typography>
            </Box>
        </Box>
    );
}

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
    // ✅ NEW: Authentication state
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState(null);

    // ✅ NEW: Check for existing auth token on mount
    useEffect(() => {
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
                            <Button color="inherit" component={Link} to="/">
                                Home
                            </Button>
                        </Toolbar>
                    </AppBar>

                    <Container maxWidth="lg" sx={{ flex: 1, py: 4 }}>
                        <Routes>
                            <Route path="/" element={<HomePage />} />
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
