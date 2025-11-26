// passenger-portal/src/components/BoardingPass.jsx
import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
    Card,
    CardContent,
    Typography,
    Box,
    Button,
    Divider,
    Grid,
    Chip
} from '@mui/material';
import QrCodeIcon from '@mui/icons-material/QrCode';
import PrintIcon from '@mui/icons-material/Print';
import DownloadIcon from '@mui/icons-material/Download';
import TrainIcon from '@mui/icons-material/Train';
import './BoardingPass.css';

function BoardingPass({ passenger }) {
    const [showQR, setShowQR] = useState(true);

    // Generate QR data (JSON with passenger details)
    const qrData = JSON.stringify({
        pnr: passenger?.PNR_Number || 'N/A',
        name: passenger?.Name || 'Passenger',
        train: passenger?.Train_Number || 'N/A',
        date: passenger?.Journey_Date || new Date().toLocaleDateString()
    });

    const handlePrint = () => {
        window.print();
    };

    const handleDownload = () => {
        // Create canvas from QR SVG
        const svg = document.getElementById('qr-code-svg');
        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            const pngFile = canvas.toDataURL('image/png');

            // Download
            const downloadLink = document.createElement('a');
            downloadLink.download = `boarding-pass-${passenger?.PNR_Number}.png`;
            downloadLink.href = pngFile;
            downloadLink.click();
        };

        img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
    };

    // Get status color
    const getStatusColor = (status) => {
        switch (status) {
            case 'CNF': return 'success';
            case 'RAC': return 'warning';
            case 'WL': return 'error';
            default: return 'default';
        }
    };

    return (
        <Card className="boarding-pass-card" elevation={3}>
            <CardContent>
                {/* Header */}
                <Box className="boarding-pass-header">
                    <TrainIcon sx={{ fontSize: 40, color: '#1976d2' }} />
                    <Typography variant="h5" component="div" sx={{ fontWeight: 700, ml: 2 }}>
                        E-Boarding Pass
                    </Typography>
                </Box>

                <Divider sx={{ my: 2 }} />

                {/* QR Code Section */}
                {showQR && (
                    <Box className="qr-section">
                        <QRCodeSVG
                            id="qr-code-svg"
                            value={qrData}
                            size={200}
                            level="H"
                            includeMargin={true}
                        />
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                            Scan at TTE verification
                        </Typography>
                    </Box>
                )}

                <Divider sx={{ my: 2 }} />

                {/* Passenger Details */}
                <Grid container spacing={3} className="passenger-details">
                    <Grid item xs={12}>
                        <Typography variant="overline" color="text.secondary">
                            Passenger Name
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            {passenger?.Name || 'N/A'}
                        </Typography>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                        <Typography variant="overline" color="text.secondary">
                            PNR Number
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 600, fontSize: '1.1rem' }}>
                            {passenger?.PNR_Number || 'N/A'}
                        </Typography>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                        <Typography variant="overline" color="text.secondary">
                            Status
                        </Typography>
                        <Box>
                            <Chip
                                label={passenger?.PNR_Status || 'N/A'}
                                color={getStatusColor(passenger?.PNR_Status)}
                                size="small"
                                sx={{ fontWeight: 600 }}
                            />
                        </Box>
                    </Grid>

                    <Grid item xs={12}>
                        <Typography variant="overline" color="text.secondary">
                            Train
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 600 }}>
                            {passenger?.Train_Name || 'N/A'} ({passenger?.Train_Number || 'N/A'})
                        </Typography>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                        <Typography variant="overline" color="text.secondary">
                            Date
                        </Typography>
                        <Typography variant="body1">
                            {passenger?.Journey_Date || 'N/A'}
                        </Typography>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                        <Typography variant="overline" color="text.secondary">
                            Coach - Seat
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 600 }}>
                            {passenger?.Assigned_Coach || 'N/A'}-{passenger?.Assigned_berth || 'N/A'}
                        </Typography>
                    </Grid>

                    <Grid item xs={12}>
                        <Typography variant="overline" color="text.secondary">
                            Journey
                        </Typography>
                        <Typography variant="body1">
                            {passenger?.Boarding_Station || 'N/A'} → {passenger?.Deboarding_Station || 'N/A'}
                        </Typography>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                        <Typography variant="overline" color="text.secondary">
                            Class
                        </Typography>
                        <Typography variant="body1">
                            {passenger?.Class || 'N/A'}
                        </Typography>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                        <Typography variant="overline" color="text.secondary">
                            Age / Gender
                        </Typography>
                        <Typography variant="body1">
                            {passenger?.Age || 'N/A'} / {passenger?.Gender || 'N/A'}
                        </Typography>
                    </Grid>
                </Grid>

                <Divider sx={{ my: 2 }} />

                {/* Action Buttons */}
                <Box className="action-buttons">
                    <Button
                        variant="contained"
                        startIcon={<PrintIcon />}
                        onClick={handlePrint}
                        fullWidth
                        sx={{ mb: 1 }}
                    >
                        Print Boarding Pass
                    </Button>
                    <Button
                        variant="outlined"
                        startIcon={<DownloadIcon />}
                        onClick={handleDownload}
                        fullWidth
                    >
                        Download QR Code
                    </Button>
                </Box>

                {/* Instructions */}
                <Box className="instructions" sx={{ mt: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                        📱 <strong>Instructions:</strong> Show this QR code to the TTE during boarding verification.
                        Keep this pass ready on your mobile device.
                    </Typography>
                </Box>
            </CardContent>
        </Card>
    );
}

export default BoardingPass;
