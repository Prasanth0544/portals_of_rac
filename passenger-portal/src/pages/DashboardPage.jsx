// passenger-portal/src/pages/DashboardPage.jsx
import React, { useState, useEffect } from 'react';
import {
    Container,
    Box,
    Typography,
    Grid,
    Card,
    CardContent,
    Alert,
    CircularProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button
} from '@mui/material';
import BoardingPass from '../components/BoardingPass';
import JourneyTimeline from '../components/JourneyTimeline';
import NotificationSettings from '../components/NotificationSettings';
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

function DashboardPage() {
    const [passenger, setPassenger] = useState(null);
    const [trainState, setTrainState] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [upgradeOffer, setUpgradeOffer] = useState(null);
    const [reverting, setReverting] = useState(false);

    useEffect(() => {
        fetchData();

        const userData = JSON.parse(localStorage.getItem('user') || '{}');

        // Request push notification permission
        if (userData.irctcId) {
            requestPushPermission(userData.irctcId);
        }

        const ws = new WebSocket('ws://localhost:5000');

        ws.onopen = () => {
            console.log('📡 WebSocket connected to passenger portal');
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                if (data.type === 'upgradeOffer' && data.irctcId === userData.irctcId) {
                    console.log('🎉 Upgrade offer received:', data);
                    setUpgradeOffer(data.offer);
                }
            } catch (err) {
                console.error('Error parsing WebSocket message:', err);
            }
        };

        // Auto-refresh every 10 seconds
        const refreshInterval = setInterval(() => {
            fetchData();
        }, 10000);

        return () => {
            ws.close();
            clearInterval(refreshInterval);
        };
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);

            const userData = JSON.parse(localStorage.getItem('user') || '{}');
            const irctcId = userData.irctcId || 'IR_8001';

            const [passengerRes, trainRes] = await Promise.all([
                axios.get(`${API_URL}/passengers/by-irctc/${irctcId}`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                }),
                axios.get(`${API_URL}/train/state`)
            ]);

            if (passengerRes.data.success && passengerRes.data.data) {
                setPassenger(passengerRes.data.data);
            } else {
                setError('No booking found for your IRCTC ID');
            }

            if (trainRes.data.success && trainRes.data.data) {
                setTrainState(trainRes.data.data);
            }
        } catch (err) {
            console.error('Error fetching data:', err);
            setError(err.response?.data?.message || 'Failed to load your booking details');
        } finally {
            setLoading(false);
        }
    };

    const handleAcceptUpgrade = async () => {
        if (!upgradeOffer) return;

        try {
            const response = await axios.post(
                `${API_URL}/tte/confirm-upgrade`,
                {
                    pnr: passenger?.PNR_Number,
                    notificationId: upgradeOffer.notificationId || 'MANUAL_ACCEPT'
                },
                {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                }
            );

            if (response.data.success) {
                alert('🎉 Upgrade confirmed! Your new berth is ' + upgradeOffer.offeredBerth);
                setUpgradeOffer(null);
                fetchData();
            }
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to confirm upgrade');
        }
    };

    const handleRejectUpgrade = () => {
        if (window.confirm('Are you sure you want to reject this upgrade offer?')) {
            setUpgradeOffer(null);
            alert('Upgrade offer rejected. The berth will be offered to another passenger.');
        }
    };

    const handleRevertNoShow = async () => {
        if (!window.confirm('Are you present on the train? This will revert your NO-SHOW status.')) {
            return;
        }

        setReverting(true);
        try {
            const response = await axios.post(
                `${API_URL}/passenger/revert-no-show`,
                { pnr: passenger?.PNR_Number },
                { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }
            );

            if (response.data.success) {
                alert('✅ NO-SHOW status cleared! You are confirmed as boarded.');
                fetchData(); // Refresh passenger data
            }
        } catch (error) {
            const errorMsg = error.response?.data?.message || 'Failed to revert NO-SHOW status';
            alert('❌ ' + errorMsg);
        } finally {
            setReverting(false);
        }
    };

    if (loading) {
        return (
            <Container maxWidth="md" sx={{ mt: 8, textAlign: 'center' }}>
                <CircularProgress />
                <Typography sx={{ mt: 2 }}>Loading your booking...</Typography>
            </Container>
        );
    }

    if (error) {
        return (
            <Container maxWidth="md" sx={{ mt: 4 }}>
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
                <Card>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>
                            No Active Booking
                        </Typography>
                        <Typography color="text.secondary">
                            You don't have any confirmed bookings at the moment.
                            Please book a ticket through IRCTC to view your boarding pass.
                        </Typography>
                    </CardContent>
                </Card>
            </Container>
        );
    }

    return (
        <Container maxWidth="lg" sx={{ mt: { xs: 2, md: 4 }, mb: { xs: 2, md: 4 }, px: { xs: 2, sm: 3, md: 4 } }}>
            <Box sx={{ mb: 4, textAlign: 'center' }}>
                <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
                    Welcome, {passenger?.Name || 'Passenger'}!
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Your digital boarding pass is ready
                </Typography>
            </Box>

            {/* NO-SHOW Warning Banner */}
            {passenger?.NO_show && (
                <Alert
                    severity="error"
                    sx={{
                        mb: 3,
                        p: 2,
                        border: '2px solid #d32f2f',
                        borderRadius: '8px',
                        backgroundColor: '#ffebee'
                    }}
                    action={
                        <Button
                            color="inherit"
                            size="small"
                            variant="outlined"
                            onClick={handleRevertNoShow}
                            disabled={reverting}
                            sx={{
                                fontWeight: 600,
                                borderWidth: 2,
                                '&:hover': { borderWidth: 2 }
                            }}
                        >
                            {reverting ? 'Reverting...' : "I'm Here! Revert"}
                        </Button>
                    }
                >
                    <Box>
                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                            ⚠️ YOU HAVE BEEN MARKED AS NO-SHOW
                        </Typography>
                        <Typography variant="body2">
                            The Train Ticket Examiner (TTE) has marked you as not present on the train.
                            If you ARE present, click the "I'm Here!" button to revert this status immediately.
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 1, fontWeight: 600 }}>
                            ⚠️ Your berth may be allocated to another passenger if not reverted!
                        </Typography>
                    </Box>
                </Alert>
            )}

            {/* Journey Tracker */}
            {trainState?.journey?.stations && (
                <JourneyTimeline
                    stations={trainState.journey.stations}
                    currentStationIndex={trainState.currentStationIndex || 0}
                />
            )}

            {/* Boarding Pass */}
            <BoardingPass passenger={passenger} />

            {/* Notification Settings */}
            <Box sx={{ mt: 3 }}>
                <NotificationSettings />
            </Box>

            {/* Additional Info Cards */}
            <Grid container spacing={{ xs: 1, sm: 2 }} sx={{ mt: 2 }}>
                <Grid item xs={12} md={6}>
                    <Card elevation={2}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                📍 Boarding Information
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                <strong>Boarding Station:</strong> {passenger?.Boarding_Station}<br />
                                <strong>Board at:</strong> {passenger?.Journey_Date || 'N/A'}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                    <Card elevation={2}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                🎟️ Ticket Status
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                <strong>Status:</strong> {passenger?.PNR_Status}<br />
                                <strong>Last Updated:</strong> {new Date().toLocaleDateString()}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Tips */}
            <Alert severity="info" sx={{ mt: 3 }}>
                <strong>Tip:</strong> Save this page or take a screenshot for offline access.
                You can also print your boarding pass for easy verification.
            </Alert>

            {/* Upgrade Offer Dialog */}
            <Dialog open={Boolean(upgradeOffer)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    textAlign: 'center'
                }}>
                    🎉 Upgrade Available!
                </DialogTitle>
                <DialogContent sx={{ mt: 3 }}>
                    <Typography variant="body1" gutterBottom>
                        Great news! You're eligible for a confirmed berth upgrade.
                    </Typography>

                    <Box sx={{
                        mt: 2,
                        p: 2,
                        bgcolor: '#f0f8ff',
                        borderRadius: 2,
                        border: '2px solid #667eea'
                    }}>
                        <Typography variant="h6" color="primary" gutterBottom>
                            New Berth: {upgradeOffer?.offeredBerth}
                        </Typography>
                        <Typography variant="body2">
                            <strong>Coach:</strong> {upgradeOffer?.coach}
                        </Typography>
                        <Typography variant="body2">
                            <strong>Berth Type:</strong> {upgradeOffer?.berthType}
                        </Typography>
                        <Typography variant="body2">
                            <strong>Current Status:</strong> {upgradeOffer?.currentStatus}
                        </Typography>
                    </Box>

                    <Alert severity="info" sx={{ mt: 2 }}>
                        <Typography variant="body2">
                            This is a limited time offer. Please accept or reject within 5 minutes.
                        </Typography>
                    </Alert>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button
                        onClick={handleRejectUpgrade}
                        color="error"
                        variant="outlined"
                    >
                        Reject
                    </Button>
                    <Button
                        onClick={handleAcceptUpgrade}
                        variant="contained"
                        color="success"
                        sx={{ ml: 1 }}
                    >
                        Accept Upgrade
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}

export default DashboardPage;
