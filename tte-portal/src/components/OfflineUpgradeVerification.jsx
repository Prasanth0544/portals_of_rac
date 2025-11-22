// tte-portal/src/components/OfflineUpgradeVerification.jsx
import React, { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Button,
    Chip,
    Alert,
    CircularProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RefreshIcon from '@mui/icons-material/Refresh';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import { tteAPI } from '../api';
import { passengerAPI } from '../../../passenger-portal/src/api';

const OfflineUpgradeVerification = () => {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedNotification, setSelectedNotification] = useState(null);
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const [pnrInput, setPnrInput] = useState('');

    useEffect(() => {
        fetchPendingUpgrades();
        const interval = setInterval(fetchPendingUpgrades, 15000); // Refresh every 15s
        return () => clearInterval(interval);
    }, []);

    const fetchPendingUpgrades = async () => {
        // This would ideally call a backend endpoint that returns all pending upgrade notifications
        // For now, we'll use a manual PNR check approach
        setLoading(true);
        try {
            // In production, you'd have: GET /api/tte/pending-upgrades
            // For now, TTE will manually check PNRs
            setLoading(false);
        } catch (err) {
            console.error('Error fetching pending upgrades:', err);
            setLoading(false);
        }
    };

    const checkPNRForUpgrades = async () => {
        if (!pnrInput) {
            alert('Please enter a PNR number');
            return;
        }

        setLoading(true);
        try {
            const response = await passengerAPI.getUpgradeNotifications(pnrInput.toUpperCase());
            const pendingNotifications = response.data?.filter(n => n.status === 'PENDING') || [];

            if (pendingNotifications.length > 0) {
                setNotifications([...notifications, ...pendingNotifications.map(n => ({
                    ...n,
                    pnr: pnrInput.toUpperCase(),
                    checkedAt: new Date().toISOString()
                }))]);
                alert(`Found ${pendingNotifications.length} pending upgrade(s) for PNR ${pnrInput}`);
            } else {
                alert('No pending upgrades found for this PNR');
            }
            setPnrInput('');
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to check PNR');
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmUpgrade = async () => {
        if (!selectedNotification) return;

        setLoading(true);
        try {
            await tteAPI.confirmUpgrade(selectedNotification.pnr, selectedNotification.id);
            alert(`✅ Upgrade confirmed for PNR ${selectedNotification.pnr}!\n\nPassenger has been moved to berth ${selectedNotification.offeredCoach}-${selectedNotification.offeredSeatNo}`);

            // Remove from list
            setNotifications(notifications.filter(n => n.id !== selectedNotification.id));
            setConfirmDialogOpen(false);
            setSelectedNotification(null);
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to confirm upgrade');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box>
            <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <NotificationsActiveIcon fontSize="large" />
                Offline Passenger Upgrade Verification
            </Typography>

            <Alert severity="info" sx={{ mb: 3 }}>
                For passengers who are not online/logged in, TTE can manually verify and confirm upgrades after in-person verification.
            </Alert>

            {/* Manual PNR Check */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom>Check PNR for Pending Upgrades</Typography>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                        <TextField
                            label="Enter PNR"
                            value={pnrInput}
                            onChange={(e) => setPnrInput(e.target.value.toUpperCase())}
                            placeholder="e.g., ABC1234567"
                            sx={{ flex: 1 }}
                            inputProps={{ maxLength: 10, style: { textTransform: 'uppercase' } }}
                        />
                        <Button
                            variant="contained"
                            onClick={checkPNRForUpgrades}
                            disabled={loading}
                            sx={{ height: '56px', minWidth: '120px' }}
                        >
                            {loading ? <CircularProgress size={24} /> : 'Check PNR'}
                        </Button>
                        <Button
                            variant="outlined"
                            startIcon={<RefreshIcon />}
                            onClick={fetchPendingUpgrades}
                            disabled={loading}
                            sx={{ height: '56px' }}
                        >
                            Refresh
                        </Button>
                    </Box>
                </CardContent>
            </Card>

            {/* Pending Upgrades Table */}
            <Card>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Pending Offline Upgrades ({notifications.length})
                    </Typography>

                    {notifications.length === 0 ? (
                        <Alert severity="success" sx={{ mt: 2 }}>
                            No pending offline upgrades at the moment.
                        </Alert>
                    ) : (
                        <TableContainer component={Paper} sx={{ mt: 2 }}>
                            <Table>
                                <TableHead>
                                    <TableRow sx={{ bgcolor: 'primary.main' }}>
                                        <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>PNR</TableCell>
                                        <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Current Berth</TableCell>
                                        <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Offered Berth</TableCell>
                                        <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Station</TableCell>
                                        <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Checked At</TableCell>
                                        <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Action</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {notifications.map((notification, index) => (
                                        <TableRow key={index} hover>
                                            <TableCell sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
                                                {notification.pnr}
                                            </TableCell>
                                            <TableCell>
                                                {notification.currentBerth}
                                                <br />
                                                <Typography variant="caption" color="text.secondary">
                                                    {notification.currentBerthType}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography sx={{ color: 'success.main', fontWeight: 'bold' }}>
                                                    {notification.offeredCoach}-{notification.offeredSeatNo}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {notification.offeredBerthType}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>{notification.currentStation}</TableCell>
                                            <TableCell>
                                                <Typography variant="caption">
                                                    {new Date(notification.checkedAt).toLocaleString()}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Button
                                                    variant="contained"
                                                    color="success"
                                                    size="small"
                                                    startIcon={<CheckCircleIcon />}
                                                    onClick={() => {
                                                        setSelectedNotification(notification);
                                                        setConfirmDialogOpen(true);
                                                    }}
                                                >
                                                    Confirm
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </CardContent>
            </Card>

            {/* Confirmation Dialog */}
            <Dialog open={confirmDialogOpen} onClose={() => !loading && setConfirmDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Confirm Offline Upgrade?</DialogTitle>
                <DialogContent>
                    {selectedNotification && (
                        <Box>
                            <Typography paragraph>
                                You are about to confirm an upgrade for <strong>PNR: {selectedNotification.pnr}</strong>
                            </Typography>
                            <Alert severity="warning" sx={{ mb: 2 }}>
                                <Typography variant="body2">
                                    <strong>Important:</strong> Ensure you have verified the passenger's identity in-person before confirming.
                                </Typography>
                            </Alert>
                            <Box sx={{ bgcolor: 'background.default', p: 2, borderRadius: 1 }}>
                                <Typography variant="body2"><strong>Current Berth:</strong> {selectedNotification.currentBerth}</Typography>
                                <Typography variant="body2"><strong>New Berth:</strong> {selectedNotification.offeredCoach}-{selectedNotification.offeredSeatNo}</Typography>
                                <Typography variant="body2"><strong>Station:</strong> {selectedNotification.currentStation}</Typography>
                            </Box>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmDialogOpen(false)} disabled={loading}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirmUpgrade}
                        variant="contained"
                        color="success"
                        disabled={loading}
                    >
                        {loading ? 'Confirming...' : 'Yes, Confirm Upgrade'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default OfflineUpgradeVerification;
