// tte-portal/src/pages/LoginPage.tsx
import React, { useState, FormEvent, ChangeEvent } from 'react';
import { tteAPI } from '../api';
import { Box, TextField, Button, Typography, Paper, Alert, CircularProgress } from '@mui/material';
import TrainIcon from '@mui/icons-material/Train';

interface LoginPageProps {
    onLoginSuccess?: (user: User) => void;
}

interface User {
    username: string;
    role: string;
    userId: string;
}

function LoginPage({ onLoginSuccess }: LoginPageProps): React.ReactElement {
    const [employeeId, setEmployeeId] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);

    const handleLogin = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await tteAPI.login(employeeId, password);

            if (response.success) {
                localStorage.setItem('token', response.data.token);
                localStorage.setItem('user', JSON.stringify(response.data.user));

                if (onLoginSuccess) {
                    onLoginSuccess(response.data.user);
                }

                window.location.reload();
            }
        } catch (err: any) {
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
                padding: 0
            }}
        >
            <Paper
                elevation={0}
                sx={{
                    maxWidth: 500,
                    width: '100%',
                    margin: '0 auto',
                    borderRadius: 0
                }}
            >
                <Box sx={{ p: 5, textAlign: 'center', bgcolor: '#1565c0', color: 'white' }}>
                    <TrainIcon sx={{ fontSize: 56, mb: 2 }} />
                    <Typography variant="h4" fontWeight={700}>
                        TTE Portal
                    </Typography>
                    <Typography variant="body1" sx={{ opacity: 0.9, mt: 1.5 }}>
                        Dynamic RAC Reallocation System
                    </Typography>
                </Box>

                <Box component="form" onSubmit={handleLogin} sx={{ p: 5 }}>
                    <TextField
                        fullWidth
                        label="Employee ID"
                        variant="outlined"
                        value={employeeId}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setEmployeeId(e.target.value)}
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
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
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
                            py: 1.8,
                            textTransform: 'none',
                            fontSize: 17,
                            fontWeight: 600,
                            background: 'linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)',
                            borderRadius: 0
                        }}
                    >
                        {loading ? <CircularProgress size={24} color="inherit" /> : 'Login'}
                    </Button>

                    <Box sx={{ mt: 4, textAlign: 'center', py: 2, bgcolor: '#f5f5f5', borderRadius: 0 }}>
                        <Typography variant="body2" color="text.secondary" fontWeight={500}>
                            Test Credentials
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                            TTE_01 / Prasanth@123
                        </Typography>
                    </Box>
                </Box>
            </Paper>
        </Box>
    );
}

export default LoginPage;

