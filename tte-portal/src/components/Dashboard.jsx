// tte-portal/src/components/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { Box, Grid, Card, CardContent, Typography, CircularProgress, Alert } from '@mui/material';
import { BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, XAxis, YAxis } from 'recharts';
import { tteAPI } from '../api';

const COLORS = ['#4caf50', '#ff9800', '#f44336', '#2196f3'];

const Dashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchStatistics();
        const interval = setInterval(fetchStatistics, 10000); // Refresh every 10s
        return () => clearInterval(interval);
    }, []);

    const fetchStatistics = async () => {
        try {
            const response = await tteAPI.getStatistics();
            setStats(response.data);
            setError('');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch statistics');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return <Alert severity="error">{error}</Alert>;
    }

    const passengerData = [
        { name: 'CNF', value: stats.passengers.cnf, color: '#4caf50' },
        { name: 'RAC', value: stats.passengers.rac, color: '#ff9800' },
        { name: 'Upgraded', value: stats.passengers.racUpgraded, color: '#2196f3' }
    ];

    const statusData = [
        { name: 'Boarded', value: stats.passengers.boarded },
        { name: 'Pending', value: stats.passengers.pending },
        { name: 'Deboarded', value: stats.passengers.deboarded },
        { name: 'No-Shows', value: stats.passengers.noShows }
    ];

    return (
        <Box>
            <Typography variant="h4" gutterBottom>Dashboard</Typography>

            {/* Train Info */}
            <Card sx={{ mb: 3, bgcolor: 'primary.main', color: 'white' }}>
                <CardContent>
                    <Typography variant="h5">{stats.train.name} ({stats.train.number})</Typography>
                    <Typography variant="body1">
                        Current Station: <strong>{stats.train.currentStation}</strong> ({stats.train.currentStationIndex + 1}/{stats.train.totalStations})
                    </Typography>
                </CardContent>
            </Card>

            {/* Stats Grid */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard title="Total Passengers" value={stats.passengers.total} color="#1976d2" />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard title="Current Onboard" value={stats.passengers.currentOnboard} color="#4caf50" />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard title="RAC Upgraded" value={stats.passengers.racUpgraded} color="#ff9800" />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard title="Vacant Berths" value={stats.berths.vacant} color="#f44336" />
                </Grid>
            </Grid>

            {/* Charts */}
            <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>Passenger Status Distribution</Typography>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={statusData}>
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip />
                                    <Bar dataKey="value" fill="#1976d2" />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>Booking Types</Typography>
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={passengerData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={(entry) => `${entry.name}: ${entry.value}`}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {passengerData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* RAC Queue */}
            {stats.racQueue.count > 0 && (
                <Card sx={{ mt: 3 }}>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>RAC Queue ({stats.racQueue.count} passengers)</Typography>
                        <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
                            {stats.racQueue.passengers.map((p, idx) => (
                                <Box key={p.pnr} sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: '1px solid #eee' }}>
                                    <Typography>{idx + 1}. {p.name} ({p.pnr})</Typography>
                                    <Typography variant="caption">{p.from} → {p.to}</Typography>
                                    <Typography variant="caption" color={p.boarded ? 'success.main' : 'warning.main'}>
                                        {p.boarded ? '✓ Boarded' : '○ Pending'}
                                    </Typography>
                                </Box>
                            ))}
                        </Box>
                    </CardContent>
                </Card>
            )}
        </Box>
    );
};

const StatCard = ({ title, value, color }) => (
    <Card sx={{ height: '100%' }}>
        <CardContent>
            <Typography color="text.secondary" gutterBottom>{title}</Typography>
            <Typography variant="h3" sx={{ color, fontWeight: 'bold' }}>{value}</Typography>
        </CardContent>
    </Card>
);

export default Dashboard;
