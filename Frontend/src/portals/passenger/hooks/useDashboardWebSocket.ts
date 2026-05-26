// passenger-portal/src/hooks/useDashboardWebSocket.ts
// Manages WebSocket connection for the passenger dashboard with proper production URL

import { useEffect, useRef, useState, useCallback } from 'react';
import SOCKET_CONFIG from '../config/socketConfig';

interface WebSocketMessage {
    type: string;
    irctcId?: string;
    offer?: unknown;
    data?: {
        irctcId?: string;
        pnr?: string;
        reason?: string;
    };
    pnr?: string;
    vacantSeatsCount?: number;
    passengerCount?: number;
    trainNo?: string | number;
}

interface DashboardWSCallbacks {
    onUpgradeOffer: (offer: unknown) => void;
    onPendingUpgradeAvailable: () => void;
    onReallocationApproved: () => void;
    onUpgradeRejected: (data: { pnr?: string; reason?: string }) => void;
    onStationArrival: () => void;
    onGroupUpgrade: (data: WebSocketMessage) => void;
}

export interface UseDashboardWebSocketReturn {
    isConnected: boolean;
}

/**
 * WebSocket hook for the passenger dashboard.
 * Uses SOCKET_CONFIG.url (env-aware) instead of hardcoded localhost.
 */
export function useDashboardWebSocket(
    irctcId: string | undefined,
    callbacks: DashboardWSCallbacks
): UseDashboardWebSocketReturn {
    const [isConnected, setIsConnected] = useState(false);
    const socketRef = useRef<WebSocket | null>(null);
    const callbacksRef = useRef(callbacks);

    // Keep callbacks ref current without causing reconnections
    useEffect(() => {
        callbacksRef.current = callbacks;
    }, [callbacks]);

    const handleMessage = useCallback((event: MessageEvent): void => {
        try {
            const data: WebSocketMessage = JSON.parse(event.data);
            const cb = callbacksRef.current;

            // Multi-train filter
            const myTrainNo = localStorage.getItem('trainNo');
            if (data.trainNo && myTrainNo && String(data.trainNo) !== String(myTrainNo)) {
                return;
            }

            if (data.type === 'upgradeOffer' && data.irctcId === irctcId) {
                cb.onUpgradeOffer(data.offer || null);
            }

            if (data.type === 'UPGRADE_OFFER_AVAILABLE' && data.irctcId === irctcId) {
                cb.onPendingUpgradeAvailable();
            }

            if (data.type === 'RAC_REALLOCATION_APPROVED') {
                cb.onReallocationApproved();
            }

            if (data.type === 'RAC_UPGRADE_REJECTED' && data.data?.irctcId === irctcId) {
                cb.onUpgradeRejected({
                    pnr: data.data?.pnr,
                    reason: data.data?.reason,
                });
            }

            if (data.type === 'STATION_ARRIVAL') {
                cb.onStationArrival();
            }

            if (data.type === 'GROUP_UPGRADE_AVAILABLE') {
                const userData = JSON.parse(localStorage.getItem('user') || '{}');
                const passengerPNR = userData.pnr || userData.PNR_Number;
                const groupData: any = data.data || data;
                if (passengerPNR && groupData.pnr === passengerPNR) {
                    cb.onGroupUpgrade(data);
                }
            }
        } catch (err) {
            console.error('Error parsing WebSocket message:', err);
        }
    }, [irctcId]);

    useEffect(() => {
        if (!irctcId) return;

        // Use the config URL (reads VITE_WS_URL env var) instead of hardcoded localhost
        const ws = new WebSocket(SOCKET_CONFIG.url);

        ws.onopen = (): void => {
            console.log('📡 WebSocket connected to passenger portal');
            setIsConnected(true);
            ws.send(JSON.stringify({ type: 'IDENTIFY', role: 'PASSENGER', irctcId }));
        };

        ws.onmessage = handleMessage;

        ws.onclose = (): void => {
            console.log('❌ Passenger WebSocket disconnected');
            setIsConnected(false);
        };

        ws.onerror = (): void => {
            console.error('WebSocket error');
        };

        socketRef.current = ws;

        return () => {
            if (socketRef.current) {
                socketRef.current.onopen = null;
                socketRef.current.onmessage = null;
                socketRef.current.onclose = null;
                socketRef.current.onerror = null;
                if (socketRef.current.readyState === WebSocket.OPEN) {
                    socketRef.current.close(1000, 'Component unmount');
                }
                socketRef.current = null;
            }
        };
    }, [irctcId, handleMessage]);

    return { isConnected };
}

export default useDashboardWebSocket;
