// passenger-portal/src/pages/UpgradeNotificationsPage.jsx
import React, { useState } from 'react';
import {
    Box,
    Card,
    CardContent,
    TextField,
    Button,
    Typography,
    Grid,
    Chip,
    Alert,
    CircularProgress,
    Paper,
    List,
    ListItem,
    ListItemText,
    Divider,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions
} from '@mui/material';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import InfoIcon from '@mui/icons-material/Info';
import { passengerAPI } from '../api';

const UpgradeNotificationsPage = () => {
    const [pnr, setPnr] = useState('');
    const [loading, setLoading] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [error, setError] = useState('');
    const [selectedNotification, setSelectedNotification] = useState(null);
    const [actionDialogOpen, setActionDialogOpen] = useState(false);
    const [actionType, setActionType] = useState(''); // 'accept' or 'deny'
    const [denyReason, setDenyReason] = useState('');

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!pnr || pnr.length < 5) {
            setError('Please enter a valid PNR number');
            return;
        }

        setLoading(true);
        setError('');
        setNotifications([]);

        try {
            const response = await passengerAPI.getUpgradeNotifications(pnr.toUpperCase());
            setNotifications(response.data || []);
            if (response.data && response.data.length === 0) {
                setError('No upgrade notifications found for this PNR');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch notifications');
        } finally {
            setLoading(false);
        }
    };

    const openActionDialog = (notification, type) => {
        setSelectedNotification(notification);
        setActionType(type);
        setActionDialogOpen(true);
        setDenyReason('');
    };

    const handleAction = async () => {
        try {
            setLoading(true);

            if (actionType === 'accept') {
                await passengerAPI.acceptUpgrade(pnr, selectedNotification.id);
                alert('✅ Upgrade accepted successfully! You will be moved to the new berth.');
            } else {
                await passengerAPI.denyUpgrade(pnr, selectedNotification.id, denyReason || 'Passenger declined');
                alert('Upgrade declined. You will remain at your current berth.');
            }

            setActionDialogOpen(false);
            // Refresh notifications
            const response = await passengerAPI.getUpgradeNotifications(pnr);
            setNotifications(response.data || []);
        } catch (err) {
            alert(err.response?.data?.message || `Failed to ${actionType} upgrade`);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'PENDING':
                return 'warning';
            case 'ACCEPTED':
                return 'success';
            case 'DENIED':
                return 'error';
            default:
                return 'default';
        }
    };

    return (
        <Box sx={{ py: 4 }}>
            <Paper elevation={0} sx={{ p: 4, mb: 4, bgcolor: 'secondary.main', color: 'white', borderRadius: 2 }}>
                <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <NotificationsActiveIcon fontSize="large" />
                    Upgrade Notifications
                </Typography>
                <Typography variant="body1" sx={{ opacity: 0.9 }}>
                    Check if you have any pending upgrade offers from RAC to Confirmed berth.
                </Typography>
            </Paper>

            <Card elevation={3} sx={{ mb: 4 }}>
                <CardContent sx={{ p: 4 }}>
                    <form onSubmit={handleSearch}>
                        <Grid container spacing={2} alignItems="center">
                            <Grid item xs={12} md={8}>
                                <TextField
                                    fullWidth
                                    label="Enter PNR Number"
                                    placeholder="e.g., 1234567890"
                                    value={pnr}
                                    onChange={(e) => setPnr(e.target.value.toUpperCase())}
                                    variant="outlined"
                                    inputProps={{ maxLength: 10, style: { textTransform: 'uppercase', fontSize: '18px', letterSpacing: '1px' } }}
                                    disabled={loading}
                                />
                            </Grid>
                            <Grid item xs={12} md={4}>
                                <Button
                                    fullWidth
                                    variant="contained"
                                    size="large"
                                    type="submit"
                                    disabled={loading}
                                    startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <NotificationsActiveIcon />}
                                    sx={{ height: '56px' }}
                                >
                                    {loading ? 'Loading...' : 'Check Notifications'}
                                </Button>
                            </Grid>
                        </Grid>
                    </form>

                    {error && (
                        <Alert severity="info" sx={{ mt: 3 }} icon={<InfoIcon />}>
                            {error}
                        </Alert>
                    )}
                </CardContent>
            </Card>

            {notifications.length > 0 && (
                <Box>
                    <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
                        Found {notifications.length} Notification{notifications.length > 1 ? 's' : ''}
                    </Typography>

                    <List sx={{ bgcolor: 'background.paper' }}>
                        {notifications.map((notification, index) => (
                            <React.Fragment key={notification.id}>
                                {index > 0 && <Divider />}
                                <ListItem
                                    sx={{
                                        flexDirection: 'column',
                                        alignItems: 'stretch',
                                        py: 3,
                                        '&:hover': { bgcolor: 'action.hover' },
                                    }}
                                >
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                        <Box>
                                            <Typography variant="h6" gutterBottom>
                                                Upgrade Offer #{index + 1}
                                            </Typography>
                                            <Chip
                                                label={notification.status}
                                                color={getStatusColor(notification.status)}
                                                size="small"
                                                sx={{ fontWeight: 'bold' }}
                                            />
                                        </Box>
                                        <Typography variant="caption" color="text.secondary">
                                            {new Date(notification.timestamp).toLocaleString()}
                                        </Typography>
                                    </Box>

                                    <Grid container spacing={2} sx={{ mb: 2 }}>
                                        <Grid item xs={12} sm={6}>
                                            <Typography variant="body2" color="text.secondary">Current Berth</Typography>
                                            <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                                {notification.currentBerth} ({notification.currentBerthType})
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={12} sm={6}>
                                            <Typography variant="body2" color="text.secondary">Offered Berth</Typography>
                                            <Typography variant="body1" sx={{ fontWeight: 600, color: 'success.main' }}>
                                                {notification.offeredCoach}-{notification.offeredSeatNo} ({notification.offeredBerthType})
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={12}>
                                            <Typography variant="body2" color="text.secondary">Current Station</Typography>
                                            <Typography variant="body1">{notification.currentStation}</Typography>
                                        </Grid>
                                    </Grid>

                                    {notification.status === 'PENDING' && (
                                        <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                                            <Button
                                                variant="contained"
                                                color="success"
                                                startIcon={<CheckCircleIcon />}
                                                onClick={() => openActionDialog(notification, 'accept')}
                                                fullWidth
                                            >
                                                Accept Upgrade
                                            </Button>
                                            <Button
                                                variant="outlined"
                                                color="error"
                                                startIcon={<CancelIcon />}
                                                onClick={() => openActionDialog(notification, 'deny')}
                                                fullWidth
                                            >
                                                Decline
                                            </Button>
                                        </Box>
                                    )}

                                    {notification.status === 'ACCEPTED' && (
                                        <Alert severity="success" sx={{ mt: 2 }}>
                                            ✓ You have accepted this upgrade. Please move to your new berth.
                                        </Alert>
                                    )}

                                    {notification.status === 'DENIED' && (
                                        <Alert severity="info" sx={{ mt: 2 }}>
                                            You declined this upgrade offer.
                                        </Alert>
                                    )}
                                </ListItem>
                            </React.Fragment>
                        ))}
                    </List>
                </Box>
            )}

            {/* Action Confirmation Dialog */}
            <Dialog open={actionDialogOpen} onClose={() => !loading && setActionDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {actionType === 'accept' ? 'Accept Upgrade Offer?' : 'Decline Upgrade Offer?'}
                </DialogTitle>
                <DialogContent>
                    {selectedNotification && (
                        <Box>
                            <Typography paragraph>
                                {actionType === 'accept' ? (
                                    <>
                                        You are about to accept an upgrade from <strong>{selectedNotification.currentBerth}</strong> to{' '}
                                        <strong style={{ color: '#4caf50' }}>
                                            {selectedNotification.offeredCoach}-{selectedNotification.offeredSeatNo}
                                        </strong>.
                                    </>
                                ) : (
                                    <>
                                        You are about to decline this upgrade offer. You will remain at your current berth{' '}
                                        <strong>{selectedNotification.currentBerth}</strong>.
                                    </>
                                )}
                            </Typography>

                            {actionType === 'deny' && (
                                <TextField
                                    fullWidth
                                    label="Reason (Optional)"
                                    placeholder="e.g., Prefer current berth"
                                    value={denyReason}
                                    onChange={(e) => setDenyReason(e.target.value)}
                                    variant="outlined"
                                    multiline
                                    rows={2}
                                    sx={{ mt: 2 }}
                                />
                            )}
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setActionDialogOpen(false)} disabled={loading}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleAction}
                        variant="contained"
                        color={actionType === 'accept' ? 'success' : 'error'}
                        disabled={loading}
                    >
                        {loading ? 'Processing...' : actionType === 'accept' ? 'Yes, Accept' : 'Yes, Decline'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default UpgradeNotificationsPage;
