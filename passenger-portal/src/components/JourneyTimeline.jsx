// passenger-portal/src/components/JourneyTimeline.jsx
import React, { useRef, useEffect } from 'react';
import { Box, Typography, Paper, Chip } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import TrainIcon from '@mui/icons-material/Train';
import './JourneyTimeline.css';

function JourneyTimeline({ stations, currentStationIndex }) {
    const timelineRef = useRef(null);

    // Auto-scroll to current station
    useEffect(() => {
        if (timelineRef.current && currentStationIndex >= 0) {
            const currentStation = timelineRef.current.querySelector(`.station-item:nth-child(${currentStationIndex + 1})`);
            if (currentStation) {
                currentStation.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }
        }
    }, [currentStationIndex]);

    const getStationStatus = (index) => {
        if (index < currentStationIndex) return 'completed';
        if (index === currentStationIndex) return 'current';
        return 'upcoming';
    };

    const getStationIcon = (status) => {
        switch (status) {
            case 'completed':
                return <CheckCircleIcon className="station-icon completed" />;
            case 'current':
                return <TrainIcon className="station-icon current" />;
            default:
                return <RadioButtonUncheckedIcon className="station-icon upcoming" />;
        }
    };

    if (!stations || stations.length === 0) {
        return (
            <Paper className="journey-timeline-empty" elevation={2}>
                <Typography color="text.secondary">
                    Journey information not available
                </Typography>
            </Paper>
        );
    }

    return (
        <Paper className="journey-timeline-container" elevation={3}>
            <Box className="timeline-header">
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    🗺️ Journey Progress
                </Typography>
                <Chip
                    label={`${currentStationIndex + 1}/${stations.length} Stations`}
                    size="small"
                    color="primary"
                />
            </Box>

            <Box className="timeline-scroll" ref={timelineRef}>
                <Box className="timeline-track">
                    {stations.map((station, index) => {
                        const status = getStationStatus(index);
                        const isLast = index === stations.length - 1;

                        return (
                            <Box key={station.code || station.idx || station.name || `station-${index}`} className={`station-item ${status}`}>
                                {/* Station Marker */}
                                <Box className="station-marker">
                                    {getStationIcon(status)}

                                    {/* Connecting Line */}
                                    {!isLast && (
                                        <Box
                                            className={`connecting-line ${index < currentStationIndex ? 'completed' : 'upcoming'
                                                }`}
                                        />
                                    )}
                                </Box>

                                {/* Station Info */}
                                <Box className="station-info">
                                    <Typography
                                        variant="body1"
                                        className="station-name"
                                        sx={{ fontWeight: status === 'current' ? 700 : 500 }}
                                    >
                                        {station.name}
                                    </Typography>

                                    {station.arrivalTime && (
                                        <Typography
                                            variant="caption"
                                            color="text.secondary"
                                            className="station-time"
                                        >
                                            {station.arrivalTime}
                                        </Typography>
                                    )}

                                    {status === 'current' && (
                                        <Chip
                                            label="Current"
                                            size="small"
                                            color="primary"
                                            className="current-badge"
                                        />
                                    )}
                                </Box>
                            </Box>
                        );
                    })}
                </Box>
            </Box>

            {/* Legend */}
            <Box className="timeline-legend">
                <Box className="legend-item">
                    <CheckCircleIcon sx={{ fontSize: 16, color: '#10b981' }} />
                    <Typography variant="caption">Completed</Typography>
                </Box>
                <Box className="legend-item">
                    <TrainIcon sx={{ fontSize: 16, color: '#3b82f6' }} />
                    <Typography variant="caption">Current</Typography>
                </Box>
                <Box className="legend-item">
                    <RadioButtonUncheckedIcon sx={{ fontSize: 16, color: '#94a3b8' }} />
                    <Typography variant="caption">Upcoming</Typography>
                </Box>
            </Box>
        </Paper>
    );
}

export default JourneyTimeline;
