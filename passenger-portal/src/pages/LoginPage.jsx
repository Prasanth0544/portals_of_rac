// passenger-portal/src/pages/LoginPage.jsx
import React, { useState } from 'react';
import axios from 'axios';
import { Box, TextField, Button, Typography, Paper, Alert, CircularProgress, Tabs, Tab } from '@mui/material';
import TrainIcon from '@mui/icons-material/Train';

function LoginPage({ onLoginSuccess }) {
    const [loginType, setLoginType] = useState(0); // 0 = IRCTC ID, 1 = Email
    const [irctcId, setIrctcId] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const payload = {
                password,
                ...(loginType === 0 ? { irctcId } : { email })
            };

            const response = await axios.post('http://localhost:5000/api/auth/passenger/login', payload);

            if (response.data.success) {
                // Store token, user info, and tickets
                localStorage.setItem('token', response.data.token);
                localStorage.setItem('user', JSON.stringify(response.data.user));
                localStorage.setItem('tickets', JSON.stringify(response.data.tickets));

                // Call parent callback
                if (onLoginSuccess) {
                    onLoginSuccess(response.data.user, response.data.tickets);
                }

                // Reload to update app state
                window.location.reload();
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                padding: 2
            }}
        >
            <Paper elevation={10} sx={{ maxWidth: 450, width: '100%', borderRadius: 3 }}>
                <Box sx={{ p: 4, textAlign: 'center', bgcolor: '#1976d2', color: 'white', borderRadius: '12px 12px 0 0' }}>
                    <TrainIcon sx={{ fontSize: 48, mb: 1 }} />
                    <Typography variant="h5" fontWeight={600}>
                        Passenger Portal
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9, mt: 1 }}>
                        Check your RAC status & bookings
                    </Typography>
                </Box>

                <Tabs
                    value={loginType}
                    onChange={(e, newValue) => setLoginType(newValue)}
                    variant="fullWidth"
                    sx={{ borderBottom: 1, borderColor: 'divider' }}
                >
                    <Tab label="IRCTC ID" />
                    <Tab label="Email" />
                </Tabs>

                <Box component="form" onSubmit={handleLogin} sx={{ p: 4 }}>
                    {loginType === 0 ? (
                        <TextField
                            fullWidth
                            label="IRCTC ID"
                            variant="outlined"
                            value={irctcId}
                            onChange={(e) => setIrctcId(e.target.value)}
                            placeholder="e.g., IR_8001"
                            required
                            disabled={loading}
                            sx={{ mb: 3 }}
                            autoFocus
                        />
                    ) : (
                        <TextField
                            fullWidth
                            label="Email"
                            type="email"
                            variant="outlined"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="your.email@example.com"
                            required
                            disabled={loading}
                            sx={{ mb: 3 }}
                            autoFocus
                        />
                    )}

                    <TextField
                        fullWidth
                        label="Password"
                        type="password"
                        variant="outlined"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={loading}
                        sx={{ mb: 3 }}
                    />

                    {error && (
                        <Alert severity="error" sx={{ mb: 3 }}>
                            {error}
                        </Alert>
                    )}

                    <Button
                        fullWidth
                        type="submit"
                        variant="contained"
                        size="large"
                        disabled={loading}
                        sx={{
                            py: 1.5,
                            textTransform: 'none',
                            fontSize: 16,
                            fontWeight: 600,
                            background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)'
                        }}
                    >
                        {loading ? <CircularProgress size={24} color="inherit" /> : 'Login'}
                    </Button>

                    <Box sx={{ mt: 3, textAlign: 'center' }}>
                        <Typography variant="caption" color="text.secondary">
                            Test: IR_8001 / Prasanth@123
                        </Typography>
                    </Box>
                </Box>
            </Paper>
        </Box>
    );
}

export default LoginPage;
