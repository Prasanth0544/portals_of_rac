// passenger-portal/src/pages/DashboardPage.tsx
// Refactored: logic extracted into usePassengerData, useDashboardWebSocket,
// useBoardingStationChange, and useSelfCancellation hooks.
import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
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
    Button,
    IconButton,
    Menu,
    MenuItem,
    Divider,
    TextField,
    Radio,
    RadioGroup,
    FormControlLabel,
    Paper
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import BoardingPass from '../components/BoardingPass';
import JourneyTimeline from '../components/JourneyTimeline';
import NotificationSettings from '../components/NotificationSettings';
import UpgradeOptionsCard from '../components/UpgradeOptionsCard';
import { requestPushPermission } from '../utils/pushManager';

// Custom hooks
import usePassengerData from '../hooks/usePassengerData';
import useDashboardWebSocket from '../hooks/useDashboardWebSocket';
import useBoardingStationChange from '../hooks/useBoardingStationChange';
import useSelfCancellation from '../hooks/useSelfCancellation';

function DashboardPage(): React.ReactElement {
    const [settingsAnchor, setSettingsAnchor] = useState<HTMLElement | null>(null);
    const [showSettings, setShowSettings] = useState<boolean>(false);
    const [upgradeTab, setUpgradeTab] = useState<'offer' | 'class'>('offer');

    // ===== Hook 1: All data fetching =====
    const {
        passenger, trainState, loading, error,
        upgradeOffer, setUpgradeOffer,
        pendingUpgrades, setPendingUpgrades,
        vacantBerthCount, isRejected,
        approvingUpgrade, reverting,
        fetchData, fetchPendingUpgrades, checkForActiveGroupUpgrade,
        handleApproveUpgrade, handleAcceptUpgrade, handleRejectUpgrade, handleRevertNoShow,
    } = usePassengerData();

    // ===== Hook 2: WebSocket =====
    const userData = useMemo(() => JSON.parse(localStorage.getItem('user') || '{}'), []);
    const irctcId: string = userData.irctcId || userData.IRCTC_ID || '';

    const { isConnected } = useDashboardWebSocket(irctcId || undefined, {
        onUpgradeOffer: (offer) => setUpgradeOffer(offer as any),
        onPendingUpgradeAvailable: () => fetchPendingUpgrades(),
        onReallocationApproved: () => fetchPendingUpgrades(),
        onUpgradeRejected: (data) => {
            setPendingUpgrades(prev => prev.filter(u => u.pnr !== data.pnr));
            alert(`❌ Your upgrade offer was rejected.\nReason: ${data.reason}`);
        },
        onStationArrival: () => { fetchData(); fetchPendingUpgrades(); },
        onGroupUpgrade: (data) => {
            const groupData: any = data.data || data;
            alert(`✅ Great news! Your group is eligible for an upgrade!\n\nYou have 10 minutes to select passengers.\n\nSeats available: ${groupData.vacantSeatsCount}\nYour group size: ${groupData.passengerCount}`);
            window.location.href = `/#/family-upgrade?pnr=${groupData.pnr}`;
        },
    });

    // ===== Hook 3: Boarding station change =====
    const boarding = useBoardingStationChange(fetchData);

    // ===== Hook 4: Self-cancellation =====
    const cancel = useSelfCancellation(fetchData);

    // ===== Side effects =====
    useEffect(() => {
        fetchData();
        if (irctcId) requestPushPermission(irctcId);
        checkForActiveGroupUpgrade();
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (irctcId) fetchPendingUpgrades();
        }, 500);
        return () => clearTimeout(timer);
    }, []);

    // ===== UI helpers =====
    const handleSettingsClick = (event: React.MouseEvent<HTMLElement>): void => {
        setSettingsAnchor(event.currentTarget);
    };
    const handleSettingsClose = (): void => { setSettingsAnchor(null); };
    const handleOpenSettings = (): void => { setShowSettings(true); handleSettingsClose(); };
    const handleLogout = (): void => {
        window.dispatchEvent(new Event('app:logout'));
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = '/';
    };

    // ===== Loading / Error states =====
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
                <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
                <Card>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>No Active Booking</Typography>
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

            {/* Settings Dialog */}
            <Dialog open={showSettings} onClose={() => setShowSettings(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <SettingsIcon />
                        Settings
                    </Box>
                </DialogTitle>
                <DialogContent><NotificationSettings /></DialogContent>
                <DialogActions><Button onClick={() => setShowSettings(false)}>Close</Button></DialogActions>
            </Dialog>

            {/* NO-SHOW Warning Banner */}
            {passenger?.NO_show && (
                <Alert
                    severity="error"
                    sx={{ mb: 3, p: 2, border: '2px solid #d32f2f', borderRadius: '8px', backgroundColor: '#ffebee' }}
                    action={
                        <Button color="inherit" size="small" variant="outlined" onClick={handleRevertNoShow} disabled={reverting}
                            sx={{ fontWeight: 600, borderWidth: 2, '&:hover': { borderWidth: 2 } }}>
                            {reverting ? 'Reverting...' : "I'm Here! Revert"}
                        </Button>
                    }
                >
                    <Box>
                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>⚠️ YOU HAVE BEEN MARKED AS NO-SHOW</Typography>
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

            {/* UPGRADE REJECTED Warning Banner */}
            {isRejected && (
                <Alert severity="warning" sx={{ mb: 3, p: 2, border: '2px solid #f57c00', borderRadius: '8px', backgroundColor: '#fff3e0' }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Upgrade Not Available</Typography>
                        <Typography variant="body2">
                            You previously declined an upgrade offer. Passengers who decline upgrades are not eligible for further upgrade offers during this journey.
                        </Typography>
                    </Box>
                </Alert>
            )}

            {/* OFFLINE STATUS Info Banner */}
            {(passenger as any)?.Online_Status === 'offline' && (
                <Alert severity="info" sx={{ mb: 3, p: 2, border: '2px solid #1976d2', borderRadius: '8px', backgroundColor: '#e3f2fd' }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>ℹ️ Offline Passenger</Typography>
                        <Typography variant="body2">
                            Your booking status is <strong>Offline</strong>. You are not eligible for automatic upgrade notifications through the Passenger Portal.
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 1 }}>
                            For upgrade opportunities, please contact the Train Ticket Examiner (TTE) directly on board.
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
            <BoardingPass
                passenger={passenger}
                journeyStarted={trainState?.journeyStarted || false}
                currentStation={
                    trainState?.stations?.[
                        trainState?.currentStationIdx ?? trainState?.currentStationIndex ?? 0
                    ]?.name || 'Unknown'
                }
                vacantBerthCount={vacantBerthCount}
                stationsRemaining={Math.max(
                    0,
                    (trainState?.stations?.length ?? 1) - 1 - (trainState?.currentStationIdx ?? trainState?.currentStationIndex ?? 0)
                )}
                totalRACCount={(trainState as unknown as { racQueueSize?: number })?.racQueueSize ?? (trainState as unknown as { racQueue?: unknown[] })?.racQueue?.length ?? 0}
                isBoarded={!!(passenger as unknown as { Boarded?: boolean; boarded?: boolean })?.Boarded || !!(passenger as unknown as { Boarded?: boolean; boarded?: boolean })?.boarded}
                isOnline={(passenger as unknown as { Online_Status?: string })?.Online_Status === 'online'}
                fromIdx={(() => { const code = (passenger as unknown as { Boarding_Station?: string })?.Boarding_Station; return trainState?.stations?.findIndex((s: { code?: string }) => s.code === code) ?? 0; })()}
                toIdx={(() => { const code = (passenger as unknown as { Deboarding_Station?: string })?.Deboarding_Station; return trainState?.stations?.findIndex((s: { code?: string }) => s.code === code) ?? 0; })()}
                totalStations={trainState?.stations?.length ?? 28}
            />

            {/* ===== Upgrades Tabbed Section ===== */}
            {passenger && (
                <Paper elevation={0} sx={{ mt: 3, mb: 3, borderRadius: 2, border: '1px solid #e0e0e0', overflow: 'hidden' }}>
                    {/* Tab Bar */}
                    <Box sx={{ display: 'flex', borderBottom: '2px solid #e0e0e0', background: '#f8fafc' }}>
                        {(['offer', 'class'] as const).map((tab) => {
                            const isActive = upgradeTab === tab;
                            const label = tab === 'offer' ? '🎯 Upgrade Offer' : '🚀 Class Upgrade';
                            const color = tab === 'offer' ? '#f59e0b' : '#8b5cf6';
                            return (
                                <button key={tab} onClick={() => setUpgradeTab(tab)}
                                    style={{
                                        flex: 1, padding: '12px 16px', border: 'none',
                                        borderBottom: isActive ? `3px solid ${color}` : '3px solid transparent',
                                        background: isActive ? 'white' : 'transparent',
                                        color: isActive ? color : '#64748b',
                                        fontWeight: isActive ? 700 : 500, fontSize: '14px',
                                        cursor: 'pointer', transition: 'all 0.2s',
                                    }}
                                >{label}</button>
                            );
                        })}
                    </Box>

                    {/* Tab Content */}
                    <Box sx={{ p: 2 }}>
                        {upgradeTab === 'offer' && (
                            <Box>
                                {upgradeOffer ? (
                                    <Box sx={{ border: '2px solid #f59e0b', borderRadius: 2, p: 2, mb: 2, background: '#fffbeb' }}>
                                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: '#b45309' }}>
                                            🎯 Upgrade Offer Available!
                                        </Typography>
                                        <Typography variant="body2" sx={{ mb: 2 }}>
                                            Berth: <strong>{upgradeOffer.offeredBerth}</strong> · Type: <strong>{upgradeOffer.berthType}</strong>
                                        </Typography>
                                        <Box sx={{ display: 'flex', gap: 2 }}>
                                            <Button variant="contained" color="success" onClick={handleAcceptUpgrade} sx={{ fontWeight: 700 }}>✅ Accept</Button>
                                            <Button variant="outlined" color="error" onClick={handleRejectUpgrade}>❌ Decline</Button>
                                        </Box>
                                    </Box>
                                ) : pendingUpgrades.length > 0 ? (
                                    <Box>
                                        {pendingUpgrades.map((upgrade) => (
                                            <Box key={upgrade.id} sx={{ border: '1px solid #e0e0e0', borderRadius: 2, p: 2, mb: 2 }}>
                                                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                                    Proposed Berth: {upgrade.proposedBerthFull} ({upgrade.proposedBerthType})
                                                </Typography>
                                                <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                                                    <Button size="small" variant="contained" color="success"
                                                        disabled={approvingUpgrade === upgrade.id}
                                                        onClick={() => handleApproveUpgrade(upgrade)}>
                                                        {approvingUpgrade === upgrade.id ? 'Approving…' : '✅ Approve'}
                                                    </Button>
                                                </Box>
                                            </Box>
                                        ))}
                                    </Box>
                                ) : (
                                    <Box sx={{ textAlign: 'center', py: 3, color: '#94a3b8' }}>
                                        <Typography variant="body2">No active upgrade offer at this time.</Typography>
                                        <Typography variant="caption">The TTE will notify you if a berth becomes available in your class.</Typography>
                                    </Box>
                                )}
                            </Box>
                        )}
                        {upgradeTab === 'class' && (
                            <UpgradeOptionsCard
                                irctcId={(JSON.parse(localStorage.getItem('user') || '{}') as { irctcId?: string }).irctcId || ''}
                                pnr={passenger.PNR_Number || ''}
                                passengerClass={passenger.Class as string}
                                pnrStatus={passenger.PNR_Status as string}
                                journeyStarted={!!(trainState as unknown as { journeyStarted?: boolean })?.journeyStarted}
                            />
                        )}
                    </Box>
                </Paper>
            )}

            {/* Ticket Actions */}
            <Paper elevation={0} sx={{ mt: 4, mb: 4, p: 3, borderRadius: 2, border: '1px solid #e0e0e0' }}>
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>Ticket Actions</Typography>
                <Grid container spacing={3}>
                    <Grid size={{ xs: 12, md: 4 }}>
                        <Card sx={{ bgcolor: '#fff3e0', border: '1px solid #f57c00', height: '100%', display: 'flex', flexDirection: 'column' }}>
                            <CardContent sx={{ flexGrow: 1 }}>
                                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>Leaving Early?</Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                    If you've left the train before your destination, report it here. Your berth will be made available for other passengers to upgrade.
                                </Typography>
                                <Box sx={{ mt: 'auto' }}>
                                    <Button component={Link} to="/passenger/report-deboarding" variant="contained" fullWidth
                                        sx={{ bgcolor: '#f57c00', '&:hover': { bgcolor: '#e65100' } }}>Report Deboarding</Button>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                        <Card sx={{ bgcolor: '#ffebee', border: '1px solid #e53935', height: '100%', display: 'flex', flexDirection: 'column' }}>
                            <CardContent sx={{ flexGrow: 1 }}>
                                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>❌ Cancel Ticket?</Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                    Need to cancel your journey? Your berth will be freed for other passengers to upgrade.
                                </Typography>
                                <Box sx={{ mt: 'auto' }}>
                                    <Button component={Link} to="/passenger/cancel-ticket" variant="contained" fullWidth
                                        sx={{ bgcolor: '#e53935', '&:hover': { bgcolor: '#c62828' } }}>Cancel Ticket</Button>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                        <Card sx={{ bgcolor: '#e3f2fd', border: '1px solid #1976d2', height: '100%', display: 'flex', flexDirection: 'column' }}>
                            <CardContent sx={{ flexGrow: 1 }}>
                                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>🔄 Change Boarding Station?</Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                    Need to board from a different station? Change to a forward station along your route.
                                </Typography>
                                <Box sx={{ mt: 'auto' }}>
                                    <Button component={Link} to="/passenger/change-boarding" variant="contained" fullWidth
                                        sx={{ bgcolor: '#1976d2', '&:hover': { bgcolor: '#1565c0' } }}>Change Station</Button>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            </Paper>

            {/* Boarding Station Change Modal (hook-driven) */}
            <Dialog open={boarding.showModal} onClose={boarding.closeModal} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ bgcolor: '#2c3e50', color: '#ffffff' }}>🔄 Change Boarding Station</DialogTitle>
                <DialogContent sx={{ mt: 2 }}>
                    {boarding.step === 1 && (
                        <Box>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                                Please verify your IRCTC ID and PNR to proceed with changing your boarding station.
                            </Typography>
                            <TextField fullWidth label="IRCTC ID" value={boarding.verifyData.irctcId}
                                onChange={(e) => boarding.setVerifyData({ ...boarding.verifyData, irctcId: e.target.value })} sx={{ mb: 2 }} />
                            <TextField fullWidth label="PNR Number" value={boarding.verifyData.pnr}
                                onChange={(e) => boarding.setVerifyData({ ...boarding.verifyData, pnr: e.target.value })} />
                        </Box>
                    )}
                    {boarding.step === 2 && (
                        <Box>
                            <Alert severity="info" sx={{ mb: 2 }}>✉️ OTP has been sent to your registered email address.</Alert>
                            <TextField fullWidth label="Enter 6-digit OTP" value={boarding.changeOTP}
                                onChange={(e) => boarding.setChangeOTP(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                inputProps={{ maxLength: 6, pattern: '[0-9]*' }} placeholder="000000" autoFocus />
                        </Box>
                    )}
                    {boarding.step === 3 && (
                        <Box>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                Select your new boarding station from the next 3 upcoming stations:
                            </Typography>
                            <RadioGroup value={boarding.selectedStation?.code || ''}
                                onChange={(e) => { const s = boarding.availableStations.find(st => st.code === e.target.value); boarding.selectStation(s); }}>
                                {boarding.availableStations.map((station, index) => (
                                    <Box key={station.code}
                                        sx={{ border: '1px solid #ecf0f1', borderRadius: '6px', p: 2, mb: 1.5,
                                            bgcolor: boarding.selectedStation?.code === station.code ? '#e3f2fd' : '#ffffff',
                                            cursor: 'pointer', '&:hover': { bgcolor: '#f5f5f5' } }}
                                        onClick={() => boarding.selectStation(station)}>
                                        <FormControlLabel value={station.code} control={<Radio />}
                                            label={
                                                <Box>
                                                    <Typography variant="body1" sx={{ fontWeight: 600 }}>{index + 1}. {station.name} ({station.code})</Typography>
                                                    <Typography variant="caption" color="text.secondary">Arrival: {station.arrivalTime || 'N/A'}</Typography>
                                                </Box>
                                            }
                                            sx={{ width: '100%', m: 0 }} />
                                    </Box>
                                ))}
                            </RadioGroup>
                            <Alert severity="warning" sx={{ mt: 2 }}>
                                <Typography variant="body2"><strong>Important:</strong> This change can only be made ONCE and cannot be undone.</Typography>
                            </Alert>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={boarding.closeModal} disabled={boarding.processing}>Cancel</Button>
                    {boarding.step === 1 && (
                        <Button onClick={boarding.sendOTP} variant="contained"
                            disabled={boarding.processing || !boarding.verifyData.irctcId || !boarding.verifyData.pnr}>
                            {boarding.processing ? 'Sending OTP...' : 'Send OTP'}
                        </Button>
                    )}
                    {boarding.step === 2 && (
                        <Button onClick={boarding.verifyOTP} variant="contained"
                            disabled={boarding.processing || boarding.changeOTP.length !== 6}>
                            {boarding.processing ? 'Verifying...' : 'Verify OTP'}
                        </Button>
                    )}
                    {boarding.step === 3 && (
                        <Button onClick={boarding.confirmChange} variant="contained" color="primary"
                            disabled={boarding.processing || !boarding.selectedStation}>
                            {boarding.processing ? 'Updating...' : 'Confirm Change'}
                        </Button>
                    )}
                </DialogActions>
            </Dialog>

            {/* Cancel Ticket Modal (hook-driven) */}
            <Dialog open={cancel.showModal} onClose={cancel.closeModal} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ bgcolor: '#e74c3c', color: '#ffffff' }}>❌ Cancel Ticket</DialogTitle>
                <DialogContent sx={{ mt: 2 }}>
                    <Alert severity="error" sx={{ mb: 3 }}>
                        <Typography variant="body2">
                            <strong>Warning:</strong> Cancelling your ticket will mark you as NO-SHOW and your berth will be made available for other passengers.
                        </Typography>
                    </Alert>
                    {cancel.step === 1 && (
                        <Box>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                                Please verify your IRCTC ID and PNR to proceed with ticket cancellation.
                            </Typography>
                            <TextField fullWidth label="IRCTC ID" value={cancel.verifyData.irctcId}
                                onChange={(e) => cancel.setVerifyData({ ...cancel.verifyData, irctcId: e.target.value })} sx={{ mb: 2 }} />
                            <TextField fullWidth label="PNR Number" value={cancel.verifyData.pnr}
                                onChange={(e) => cancel.setVerifyData({ ...cancel.verifyData, pnr: e.target.value })} />
                        </Box>
                    )}
                    {cancel.step === 2 && (
                        <Box>
                            <Alert severity="info" sx={{ mb: 2 }}>✉️ OTP has been sent to your registered email.</Alert>
                            <TextField fullWidth label="Enter 6-digit OTP" value={cancel.cancelOTP}
                                onChange={(e) => cancel.setCancelOTP(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                inputProps={{ maxLength: 6 }} placeholder="000000" autoFocus />
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={cancel.closeModal} disabled={cancel.processing}>Back</Button>
                    {cancel.step === 1 && (
                        <Button onClick={cancel.sendOTP} variant="contained" color="error"
                            disabled={cancel.processing || !cancel.verifyData.irctcId || !cancel.verifyData.pnr}>
                            {cancel.processing ? 'Sending...' : 'Send OTP'}
                        </Button>
                    )}
                    {cancel.step === 2 && (
                        <Button onClick={cancel.confirmCancel} variant="contained" color="error"
                            disabled={cancel.processing || cancel.cancelOTP.length !== 6}>
                            {cancel.processing ? 'Cancelling...' : 'Confirm Cancellation'}
                        </Button>
                    )}
                </DialogActions>
            </Dialog>
        </Container >
    );
}

export default DashboardPage;
