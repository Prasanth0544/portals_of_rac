// tte-portal/src/pages/ActionHistoryPage.tsx
import React, { useState, useEffect } from 'react';
import {
    Container,
    Paper,
    Typography,
    Box,
    List,
    ListItem,
    Button,
    Chip,
    Alert,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    CircularProgress,
    Divider
} from '@mui/material';
import UndoIcon from '@mui/icons-material/Undo';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import HistoryIcon from '@mui/icons-material/History';
import { tteAPI } from '../api';
import './ActionHistoryPage.css';

interface ActionTarget {
    name: string;
    pnr: string;
}

interface HistoryAction {
    actionId: string;
    action: string;
    target: ActionTarget;
    station: string;
    performedBy: string;
    timestamp: string;
    canUndo: boolean;
    undoneAt?: string;
}

interface UndoDialogState {
    open: boolean;
    action: HistoryAction | null;
}

function ActionHistoryPage(): React.ReactElement {
    const [history, setHistory] = useState<HistoryAction[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [undoDialog, setUndoDialog] = useState<UndoDialogState>({ open: false, action: null });
    const [undoing, setUndoing] = useState<boolean>(false);

    useEffect(() => {
        fetchHistory();
        // Auto-refresh every 30 seconds
        const interval = setInterval(fetchHistory, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchHistory = async (): Promise<void> => {
        try {
            setLoading(true);
            setError(null);

            const response = await tteAPI.getActionHistory();

            if (response.success) {
                setHistory(response.data);
            }
        } catch (err: any) {
            console.error('Error fetching action history:', err);
            setError(err.response?.data?.message || 'Failed to load action history');
        } finally {
            setLoading(false);
        }
    };

    const handleUndoClick = (action: HistoryAction): void => {
        setUndoDialog({ open: true, action });
    };

    const handleUndoConfirm = async (): Promise<void> => {
        try {
            setUndoing(true);

            const response = await tteAPI.undoAction(undoDialog.action?.actionId || '');

            if (response.success) {
                // Refresh history
                await fetchHistory();
                setUndoDialog({ open: false, action: null });
                alert('✅ Action undone successfully!');
            }
        } catch (err: any) {
            console.error('Error undoing action:', err);
            alert(`❌ Failed to undo: ${err.response?.data?.error || 'Unknown error'}`);
        } finally {
            setUndoing(false);
        }
    };

    const handleUndoCancel = (): void => {
        setUndoDialog({ open: false, action: null });
    };

    const getActionIcon = (actionType: string): string => {
        switch (actionType) {
            case 'MARK_NO_SHOW':
            case 'NO_SHOW_MARKED':
                return '🚫';
            case 'NO_SHOW_REVERTED':
                return '✅';
            case 'CONFIRM_BOARDING':
                return '✅';
            case 'APPLY_UPGRADE':
                return '⬆️';
            default:
                return '📝';
        }
    };

    const getActionLabel = (actionType: string): string => {
        switch (actionType) {
            case 'MARK_NO_SHOW':
                return 'Marked NO_SHOW';
            case 'NO_SHOW_MARKED':
                return 'Marked NO-SHOW';
            case 'NO_SHOW_REVERTED':
                return 'Reverted NO-SHOW';
            case 'CONFIRM_BOARDING':
                return 'Confirmed Boarding';
            case 'APPLY_UPGRADE':
                return 'Applied Upgrade';
            default:
                return actionType;
        }
    };

    const formatTime = (timestamp: string): string => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} min ago`;
        return date.toLocaleTimeString();
    };

    if (loading && history.length === 0) {
        return (
            <Container maxWidth="md" sx={{ mt: 4, textAlign: 'center' }}>
                <CircularProgress />
                <Typography sx={{ mt: 2 }}>Loading action history...</Typography>
            </Container>
        );
    }

    return (
        <Container maxWidth="md" sx={{ py: { xs: 2, md: 4 }, px: { xs: 1, sm: 2 } }}>
            <Paper className="action-history-container" elevation={3}>
                {/* Header */}
                <Box className="history-header" sx={{ flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: 1, sm: 0 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <HistoryIcon sx={{ fontSize: 32, color: '#1976d2' }} />
                        <Typography variant="h5" sx={{ fontWeight: 700 }}>
                            Action History
                        </Typography>
                    </Box>
                    <Button
                        variant="outlined"
                        size="small"
                        onClick={fetchHistory}
                        disabled={loading}
                    >
                        {loading ? 'Refreshing...' : '🔄 Refresh'}
                    </Button>
                </Box>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Last 10 actions (within 30 minutes)
                </Typography>

                <Divider sx={{ mb: 2 }} />

                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}

                {/* Action List */}
                {history.length === 0 ? (
                    <Box className="empty-state">
                        <Typography variant="h6" color="text.secondary">
                            No recent actions
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Actions performed will appear here
                        </Typography>
                    </Box>
                ) : (
                    <List className="history-list">
                        {history.map((action, index) => (
                            <React.Fragment key={action.actionId}>
                                <ListItem className={`history-item ${action.canUndo ? 'can-undo' : 'cannot-undo'}`} sx={{ flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' } }}>
                                    <Box className="action-info">
                                        <Box className="action-header">
                                            <Box className="action-title">
                                                <span className="action-icon">{getActionIcon(action.action)}</span>
                                                <Typography variant="h6" component="span">
                                                    {getActionLabel(action.action)}
                                                </Typography>
                                            </Box>
                                            <Typography variant="caption" color="text.secondary">
                                                {formatTime(action.timestamp)}
                                            </Typography>
                                        </Box>

                                        <Box className="action-details">
                                            <Typography variant="body2">
                                                <strong>Passenger:</strong> {action.target.name}
                                            </Typography>
                                            <Typography variant="body2">
                                                <strong>PNR:</strong> {action.target.pnr}
                                            </Typography>
                                            <Typography variant="body2">
                                                <strong>Station:</strong> {action.station}
                                            </Typography>
                                            <Typography variant="body2">
                                                <strong>Performed by:</strong> {action.performedBy}
                                            </Typography>
                                        </Box>

                                        <Box className="action-status">
                                            {action.undoneAt ? (
                                                <Chip
                                                    icon={<CheckCircleIcon />}
                                                    label="Undone"
                                                    color="success"
                                                    size="small"
                                                />
                                            ) : action.canUndo ? (
                                                <Button
                                                    variant="contained"
                                                    color="warning"
                                                    startIcon={<UndoIcon />}
                                                    onClick={() => handleUndoClick(action)}
                                                    size="small"
                                                    fullWidth
                                                    sx={{ mt: { xs: 1, sm: 0 } }}
                                                >
                                                    Undo
                                                </Button>
                                            ) : (
                                                <Chip
                                                    icon={<CancelIcon />}
                                                    label="Cannot Undo"
                                                    color="default"
                                                    size="small"
                                                />
                                            )}
                                        </Box>
                                    </Box>
                                </ListItem>
                                {index < history.length - 1 && <Divider />}
                            </React.Fragment>
                        ))}
                    </List>
                )}

                {/* Info */}
                <Alert severity="info" sx={{ mt: 3 }}>
                    <strong>Note:</strong> Actions can only be undone within 30 minutes and from the current station.
                    Once the train moves to the next station, previous actions cannot be undone.
                </Alert>
            </Paper>

            {/* Undo Confirmation Dialog */}
            <Dialog open={undoDialog.open} onClose={handleUndoCancel}>
                <DialogTitle>Confirm Undo Action</DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to undo this action?
                    </Typography>
                    {undoDialog.action && (
                        <Box sx={{ mt: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                            <Typography variant="body2">
                                <strong>Action:</strong> {getActionLabel(undoDialog.action.action)}
                            </Typography>
                            <Typography variant="body2">
                                <strong>Passenger:</strong> {undoDialog.action.target.name} ({undoDialog.action.target.pnr})
                            </Typography>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleUndoCancel} disabled={undoing}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleUndoConfirm}
                        variant="contained"
                        color="warning"
                        disabled={undoing}
                        startIcon={undoing ? <CircularProgress size={16} /> : <UndoIcon />}
                    >
                        {undoing ? 'Undoing...' : 'Confirm Undo'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}

export default ActionHistoryPage;
