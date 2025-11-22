// passenger-portal/src/pages/PNRCheckPage.jsx
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
    Divider,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import TrainIcon from '@mui/icons-material/Train';
import PersonIcon from '@mui/icons-material/Person';
import EventSeatIcon from '@mui/icons-material/EventSeat';
import CancelIcon from '@mui/icons-material/Cancel';
import { passengerAPI } from '../api';

const PNRCheckPage = () => {
    const [pnr, setPnr] = useState('');
    const [loading, setLoading] = useState(false);
    const [pnrDetails, setPnrDetails] = useState(null);
    const [error, setError] = useState('');
    const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!pnr || pnr.length < 5) {
            setError('Please enter a valid PNR number');
            return;
        }

        setLoading(true);
        setError('');
        setPnrDetails(null);

        try {
            const response = await passengerAPI.getPNRDetails(pnr.toUpperCase());
            setPnrDetails(response.data);
        } catch (err) {
            setError(err.response?.data?.message || 'PNR not found. Please check and try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleCancelBooking = async () => {
        try {
            setLoading(true);
            await passengerAPI.cancelBooking(pnrDetails.pnr);
            alert('✅ Booking cancelled successfully. Your berth will be made available for other passengers.');
            setCancelDialogOpen(false);
            // Refresh PNR details
            const response = await passengerAPI.getPNRDetails(pnrDetails.pnr);
            setPnrDetails(response.data);
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to cancel booking');
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status?.toUpperCase()) {
            case 'CNF':
                return 'success';
            case 'RAC':
                return 'warning';
            case 'WL':
                return 'error';
            default:
                return 'default';
        }
    };

    return (
        <Box sx={{ py: 4 }}>
            <Paper elevation={0} sx={{ p: 4, mb: 4, bgcolor: 'primary.main', color: 'white', borderRadius: 2 }}>
                <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SearchIcon fontSize="large" />
                    PNR Status Check
                </Typography>
                <Typography variant="body1" sx={{ opacity: 0.9 }}>
                    Enter your 10-digit PNR number to check your booking status, berth details, and train information.
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
                                    startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SearchIcon />}
                                    sx={{ height: '56px' }}
                                >
                                    {loading ? 'Searching...' : 'Check Status'}
                                </Button>
                            </Grid>
                        </Grid>
                    </form>

                    {error && (
                        <Alert severity="error" sx={{ mt: 3 }}>
                            {error}
                        </Alert>
                    )}
                </CardContent>
            </Card>

            {pnrDetails && (
                <Card elevation={3}>
                    <CardContent sx={{ p: 4 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                            <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <PersonIcon />
                                PNR: {pnrDetails.pnr}
                            </Typography>
                            <Chip
                                label={pnrDetails.pnrStatus}
                                color={getStatusColor(pnrDetails.pnrStatus)}
                                size="large"
                                sx={{ fontWeight: 'bold', fontSize: '16px', px: 2 }}
                            />
                        </Box>

                        <Divider sx={{ mb: 3 }} />

                        <Grid container spacing={3}>
                            {/* Passenger Details */}
                            <Grid item xs={12} md={6}>
                                <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', mb: 2 }}>
                                    Passenger Details
                                </Typography>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    <DetailItem label="Name" value={pnrDetails.name} />
                                    <DetailItem label="Age" value={pnrDetails.age} />
                                    <DetailItem label="Gender" value={pnrDetails.gender} />
                                </Box>
                            </Grid>

                            {/* Train Details */}
                            <Grid item xs={12} md={6}>
                                <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <TrainIcon />
                                    Train Details
                                </Typography>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    <DetailItem label="Train" value={`${pnrDetails.trainName} (${pnrDetails.trainNo})`} />
                                    <DetailItem label="Class" value={pnrDetails.class} />
                                    <DetailItem label="Boarding" value={pnrDetails.boardingStation} />
                                    <DetailItem label="Destination" value={pnrDetails.destinationStation} />
                                </Box>
                            </Grid>

                            {/* Berth Details */}
                            <Grid item xs={12}>
                                <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <EventSeatIcon />
                                    Berth Details
                                </Typography>
                                <Grid container spacing={2}>
                                    <Grid item xs={12} sm={6} md={3}>
                                        <DetailItem label="Berth" value={pnrDetails.berth} />
                                    </Grid>
                                    <Grid item xs={12} sm={6} md={3}>
                                        <DetailItem label="Berth Type" value={pnrDetails.berthType} />
                                    </Grid>
                                    <Grid item xs={12} sm={6} md={3}>
                                        <DetailItem label="RAC Status" value={pnrDetails.racStatus} />
                                    </Grid>
                                    <Grid item xs={12} sm={6} md={3}>
                                        <DetailItem
                                            label="Boarding Status"
                                            value={pnrDetails.boarded ? '✓ Boarded' : '✗ Not Boarded'}
                                            valueColor={pnrDetails.boarded ? 'success.main' : 'warning.main'}
                                        />
                                    </Grid>
                                </Grid>
                            </Grid>
                        </Grid>

                        {/* Actions */}
                        {!pnrDetails.noShow && pnrDetails.pnrStatus !== 'WL' && (
                            <Box sx={{ mt: 4, pt: 3, borderTop: '1px solid #e0e0e0' }}>
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                    Can't travel? Cancel your booking to help other passengers:
                                </Typography>
                                <Button
                                    variant="outlined"
                                    color="error"
                                    startIcon={<CancelIcon />}
                                    onClick={() => setCancelDialogOpen(true)}
                                    sx={{ mt: 1 }}
                                >
                                    Cancel Booking (Mark No-Show)
                                </Button>
                            </Box>
                        )}

                        {pnrDetails.noShow && (
                            <Alert severity="info" sx={{ mt: 3 }}>
                                This booking has been cancelled (No-Show).
                            </Alert>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Cancel Confirmation Dialog */}
            <Dialog open={cancelDialogOpen} onClose={() => setCancelDialogOpen(false)}>
                <DialogTitle>Cancel Booking?</DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to cancel your booking (PNR: <strong>{pnrDetails?.pnr}</strong>)?
                    </Typography>
                    <Typography sx={{ mt: 2, color: 'text.secondary' }}>
                        This will mark you as a no-show and your berth will be made available for RAC passengers to upgrade.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCancelDialogOpen(false)}>No, Keep Booking</Button>
                    <Button onClick={handleCancelBooking} color="error" variant="contained" disabled={loading}>
                        {loading ? 'Cancelling...' : 'Yes, Cancel Booking'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

// Helper component for displaying details
const DetailItem = ({ label, value, valueColor }) => (
    <Box>
        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {label}
        </Typography>
        <Typography variant="body1" sx={{ fontWeight: 600, color: valueColor || 'text.primary' }}>
            {value}
        </Typography>
    </Box>
);

export default PNRCheckPage;
