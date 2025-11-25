// tte-portal/src/pages/LoginPage.jsx
import React, { useState } from 'react';
import axios from 'axios';
import { Box, TextField, Button, Typography, Paper, Alert, CircularProgress } from '@mui/material';
import TrainIcon from '@mui/icons-material/Train';

function LoginPage({ onLoginSuccess }) {
    const [employeeId, setEmployeeId] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await axios.post('http://localhost:5000/api/auth/staff/login', {
                employeeId,
                password
            });

            if (response.data.success) {
                // Store token and user info
                localStorage.setItem('token', response.data.token);
                localStorage.setItem('user', JSON.stringify(response.data.user));

                // Call parent callback
                if (onLoginSuccess) {
                    onLoginSuccess(response.data.user);
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
                background: 'linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)',
                padding: 2
            }}
        >
            <Paper elevation={10} sx={{ maxWidth: 400, width: '100%', borderRadius: 3 }}>
                <Box sx={{ p: 4, textAlign: 'center', bgcolor: '#1565c0', color: 'white', borderRadius: '12px 12px 0 0' }}>
                    <TrainIcon sx={{ fontSize: 48, mb: 1 }} />
                    <Typography variant="h5" fontWeight={600}>
                        TTE Portal
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9, mt: 1 }}>
                        Dynamic RAC Reallocation System
                    </Typography>
                </Box>

                <Box component="form" onSubmit={handleLogin} sx={{ p: 4 }}>
                    <TextField
                        fullWidth
                        label="Employee ID"
                        variant="outlined"
                        value={employeeId}
                        onChange={(e) => setEmployeeId(e.target.value)}
                        required
                        disabled={loading}
                        sx={{ mb: 3 }}
                        autoFocus
                    />

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
                            background: 'linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)'
                        }}
                    >
                        {loading ? <CircularProgress size={24} color="inherit" /> : 'Login'}
                    </Button>

                    <Box sx={{ mt: 3, textAlign: 'center' }}>
                        <Typography variant="caption" color="text.secondary">
                            Test: TTE_01 / Prasanth@123
                        </Typography>
                    </Box>
                </Box>
            </Paper>
        </Box>
    );
}

export default LoginPage;
