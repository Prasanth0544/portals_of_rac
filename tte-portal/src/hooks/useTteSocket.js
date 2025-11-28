// tte-portal/src/hooks/useTteSocket.js

import { useEffect, useRef, useState, useCallback } from 'react';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:5000';

/**
 * WebSocket hook for TTE Portal
 * Subscribes to train-wide updates and real-time events
 */
const useTteSocket = () => {
    const [isConnected, setIsConnected] = useState(false);
    const [lastUpdate, setLastUpdate] = useState(null);
    const [pendingUpgrades, setPendingUpgrades] = useState([]);
    const [stats, setStats] = useState(null);

    const socketRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);
    const listenersRef = useRef(new Map());

    /**
     * Connect to WebSocket
     */
    const connect = useCallback(() => {
        if (socketRef.current?.readyState === WebSocket.OPEN) {
            return;
        }

        try {
            const ws = new WebSocket(WS_URL);

            ws.onopen = () => {
                console.log('✅ TTE WebSocket connected');
                setIsConnected(true);

                // Subscribe to general updates
                ws.send(JSON.stringify({ type: 'SUBSCRIBE' }));
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    handleMessage(data);
                } catch (error) {
                    console.error('Failed to parse WebSocket message:', error);
                }
            };

            ws.onclose = () => {
                console.log('❌ TTE WebSocket disconnected');
                setIsConnected(false);

                // Attempt reconnect after 3 seconds
                reconnectTimeoutRef.current = setTimeout(() => {
                    connect();
                }, 3000);
            };

            ws.onerror = (error) => {
                console.error('WebSocket error:', error);
            };

            socketRef.current = ws;
        } catch (error) {
            console.error('Failed to create WebSocket:', error);
        }
    }, []);

    /**
     * Disconnect from WebSocket and cleanup
     */
    const disconnect = useCallback(() => {
        // Clear reconnect timeout
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }

        // Close and cleanup socket
        if (socketRef.current) {
            try {
                // Remove all event listeners
                socketRef.current.onopen = null;
                socketRef.current.onmessage = null;
                socketRef.current.onclose = null;
                socketRef.current.onerror = null;

                // Close connection
                if (socketRef.current.readyState === WebSocket.OPEN) {
                    socketRef.current.close(1000, 'Component unmount');
                }
            } catch (error) {
                console.error('Error disconnecting socket:', error);
            } finally {
                socketRef.current = null;
            }
        }

        // Clear listeners map
        listenersRef.current.clear();
        setIsConnected(false);
    }, []);

    /**
     * Handle incoming messages
     */
    const handleMessage = useCallback((data) => {
        const { type, payload } = data;

        setLastUpdate({ type, payload, timestamp: new Date() });

        // Handle specific event types
        switch (type) {
            case 'TRAIN_UPDATE':
                // Trigger listeners
                const listeners = listenersRef.current.get(type);
                if (listeners) {
                    listeners.forEach(listener => listener(payload));
                }
                break;

            case 'NO_SHOW':
                console.log('📋 No-show event:', payload);
                // New vacancy created - potential upgrade opportunity
                break;

            case 'RAC_UPGRADE_ACCEPTED':
                console.log('✅ Passenger accepted upgrade:', payload);
                // Add to pending upgrades for TTE verification
                setPendingUpgrades(prev => [...prev, payload]);
                break;

            case 'STATS_UPDATE':
                setStats(payload.stats);
                break;

            case 'PASSENGER_BOARDED':
                console.log('🎫 Passenger boarded:', payload);
                break;

            case 'PASSENGER_DEBOARDED':
                console.log('👋 Passenger deboarded:', payload);
                break;

            default:
                // Pass to generic listeners
                const genericListeners = listenersRef.current.get(type);
                if (genericListeners) {
                    genericListeners.forEach(listener => listener(payload));
                }
        }
    }, []);

    /**
     * Subscribe to event
     */
    const on = useCallback((eventType, callback) => {
        if (!listenersRef.current.has(eventType)) {
            listenersRef.current.set(eventType, new Set());
        }
        listenersRef.current.get(eventType).add(callback);

        // Return unsubscribe function
        return () => {
            const listeners = listenersRef.current.get(eventType);
            if (listeners) {
                listeners.delete(callback);
            }
        };
    }, []);

    /**
     * Send message
     */
    const send = useCallback((type, payload) => {
        if (socketRef.current?.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify({ type, payload }));
        }
    }, []);

    // Auto-connect on mount
    useEffect(() => {
        connect();

        return () => {
            disconnect();
        };
    }, [connect, disconnect]);

    return {
        isConnected,
        lastUpdate,
        pendingUpgrades,
        stats,
        connect,
        disconnect,
        on,
        send
    };
};

export default useTteSocket;
