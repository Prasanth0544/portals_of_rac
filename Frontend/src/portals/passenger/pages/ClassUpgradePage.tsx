// passenger-portal/src/pages/ClassUpgradePage.tsx
// Dedicated page for voluntary cross-class upgrade (Sleeper RAC → 3A / 2A)

import React, { useEffect, useState } from 'react';
import { Container, Typography, Box, Divider } from '@mui/material';
import UpgradeOptionsCard from '../components/UpgradeOptionsCard';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const ClassUpgradePage: React.FC = () => {
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    const irctcId: string = user?.IRCTC_ID || user?.irctcId || '';

    const [pnr, setPnr] = useState<string>('');
    const [passengerClass, setPassengerClass] = useState<string>('');
    const [pnrStatus, setPnrStatus] = useState<string>('');

    useEffect(() => {
        if (!irctcId) return;
        const token = localStorage.getItem('token');
        fetch(`${API_URL}/passengers/by-irctc/${irctcId}`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((r) => r.json())
            .then((data) => {
                if (data.success && data.data) {
                    setPnr(data.data.PNR_Number || '');
                    setPassengerClass(data.data.Class || '');
                    setPnrStatus(data.data.PNR_Status || '');
                }
            })
            .catch(() => { });
    }, [irctcId]);

    return (
        <Container maxWidth="md" sx={{ mt: 4, mb: 6 }}>
            {/* Header */}
            <Box sx={{ mb: 3 }}>
                <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
                    🚀 Class Upgrade
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Voluntary upgrade from Sleeper to a higher class when vacant berths are available for your
                    entire remaining journey. Pay the difference to the TTE on board.
                </Typography>
            </Box>

            {/* Pricing info */}
            <Box
                sx={{
                    display: 'flex',
                    gap: 2,
                    mb: 3,
                    flexWrap: 'wrap',
                }}
            >
                {[
                    { cls: '3-Tier AC (3A)', rate: '₹5/km', color: '#0ea5e9', bg: '#e0f2fe' },
                    { cls: '2-Tier AC (2A)', rate: '₹10/km', color: '#8b5cf6', bg: '#ede9fe' },
                ].map(({ cls, rate, color, bg }) => (
                    <Box
                        key={cls}
                        sx={{
                            flex: '1 1 180px',
                            background: bg,
                            border: `2px solid ${color}`,
                            borderRadius: 2,
                            p: 2,
                            textAlign: 'center',
                        }}
                    >
                        <Typography variant="h6" sx={{ fontWeight: 700, color }}>
                            {rate}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {cls} — from current station to your destination
                        </Typography>
                    </Box>
                ))}
            </Box>

            <Divider sx={{ mb: 3 }} />

            {/* Card — shows available berths + cost + confirm button */}
            {irctcId ? (
                <UpgradeOptionsCard
                    irctcId={irctcId}
                    pnr={pnr}
                    passengerClass={passengerClass}
                    pnrStatus={pnrStatus}
                    journeyStarted={true}
                />
            ) : (
                <Box sx={{ textAlign: 'center', py: 6, color: '#94a3b8' }}>
                    <Typography variant="h6">Please log in to view upgrade options.</Typography>
                </Box>
            )}
        </Container>
    );
};

export default ClassUpgradePage;
