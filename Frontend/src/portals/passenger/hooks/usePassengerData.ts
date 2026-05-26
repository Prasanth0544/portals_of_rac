// passenger-portal/src/hooks/usePassengerData.ts
// Fetches passenger booking, train state, vacant berths, and pending upgrades

import { useState, useCallback } from 'react';
import api from '../api';

interface Station {
    code: string;
    name: string;
    arrivalTime?: string;
}

interface JourneyData {
    stations?: Station[];
}

interface TrainState {
    journey?: JourneyData;
    currentStationIndex?: number;
    currentStationIdx?: number;
    journeyStarted?: boolean;
    stations?: Station[];
}

interface Passenger {
    Name?: string;
    PNR_Number?: string;
    NO_show?: boolean;
    Upgrade_Status?: string;
    Train_Number?: string;
    trainNo?: string;
    Class?: string;
    class?: string;
    [key: string]: unknown;
}

interface UpgradeOffer {
    notificationId?: string;
    offeredBerth?: string;
    coach?: string;
    berthType?: string;
    currentStatus?: string;
}

interface PendingUpgrade {
    id: string;
    pnr?: string;
    currentBerth?: string;
    proposedBerthFull?: string;
    proposedBerthType?: string;
    proposedCoach?: string;
    stationName?: string;
}

export interface UsePassengerDataReturn {
    passenger: Passenger | null;
    trainState: TrainState | null;
    loading: boolean;
    error: string | null;
    upgradeOffer: UpgradeOffer | null;
    setUpgradeOffer: React.Dispatch<React.SetStateAction<UpgradeOffer | null>>;
    pendingUpgrades: PendingUpgrade[];
    setPendingUpgrades: React.Dispatch<React.SetStateAction<PendingUpgrade[]>>;
    vacantBerthCount: number;
    isRejected: boolean;
    approvingUpgrade: string | null;
    reverting: boolean;
    fetchData: () => Promise<void>;
    fetchPendingUpgrades: () => Promise<void>;
    checkForActiveGroupUpgrade: () => Promise<void>;
    handleApproveUpgrade: (upgrade: PendingUpgrade) => Promise<void>;
    handleAcceptUpgrade: () => Promise<void>;
    handleRejectUpgrade: () => void;
    handleRevertNoShow: () => Promise<void>;
}

export function usePassengerData(): UsePassengerDataReturn {
    const [passenger, setPassenger] = useState<Passenger | null>(null);
    const [trainState, setTrainState] = useState<TrainState | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [upgradeOffer, setUpgradeOffer] = useState<UpgradeOffer | null>(null);
    const [isRejected, setIsRejected] = useState<boolean>(false);
    const [vacantBerthCount, setVacantBerthCount] = useState<number>(0);
    const [pendingUpgrades, setPendingUpgrades] = useState<PendingUpgrade[]>([]);
    const [approvingUpgrade, setApprovingUpgrade] = useState<string | null>(null);
    const [reverting, setReverting] = useState<boolean>(false);

    const fetchData = useCallback(async (): Promise<void> => {
        try {
            setLoading(true);
            setError(null);

            const activePortal = localStorage.getItem('activePortal');
            if (activePortal && activePortal !== 'passenger') {
                setError('Portal mismatch — please log in as a passenger.');
                setLoading(false);
                return;
            }

            const userData = JSON.parse(localStorage.getItem('user') || '{}');
            const irctcId: string = userData.irctcId || userData.IRCTC_ID || '';
            if (!irctcId) {
                setError('Not logged in. Please log in as a passenger.');
                setLoading(false);
                return;
            }

            let passengerClass = '';

            // Fetch passenger booking
            try {
                const passengerRes = await api.get(`/passengers/by-irctc/${irctcId}`);

                if (passengerRes.data.success && passengerRes.data.data) {
                    const passData = passengerRes.data.data;
                    passengerClass = passData?.Class || passData?.class || '';
                    setPassenger(passData);

                    const trainNo = passData.Train_Number || passData.trainNo;
                    if (trainNo) {
                        localStorage.setItem('trainNo', String(trainNo));
                    }

                    if (passData.Upgrade_Status === 'REJECTED') {
                        setIsRejected(true);
                    } else {
                        setIsRejected(false);
                    }
                } else {
                    setError('No booking found for your IRCTC ID');
                }
            } catch (err) {
                console.error('Error fetching passenger data:', err);
                const axiosError = err as { response?: { data?: { message?: string } } };
                setError(axiosError.response?.data?.message || 'Failed to load your booking details');
            }

            // Fetch train state
            try {
                const trainRes = await api.get('/train/state');
                if (trainRes.data.success && trainRes.data.data) {
                    setTrainState(trainRes.data.data);
                }
            } catch {
                console.log('[Dashboard] Train state not available (train may not be initialized yet)');
            }

            // Fetch vacant berths
            try {
                const vacantRes = await api.get('/train/vacant-berths');
                if (vacantRes.data.success && vacantRes.data.data) {
                    const vacancies = vacantRes.data.data.vacancies || vacantRes.data.data.vacantBerths || [];
                    const currentIdx = vacantRes.data.data.currentStationIdx || 0;

                    const classMap: Record<string, string> = {
                        'Sleeper': 'SL', 'SL': 'SL',
                        'AC_2_Tier': 'AC_2_Tier', '2A': 'AC_2_Tier',
                        'AC_3_Tier': 'AC_3_Tier', '3A': 'AC_3_Tier',
                    };
                    const coachClass = classMap[passengerClass] || null;

                    const currentlyVacant = vacancies.filter((b: { fromIdx?: number; toIdx?: number; isCurrentlyVacant?: boolean; class?: string }) => {
                        const isCurrentStation = b.isCurrentlyVacant === true ||
                            (b.fromIdx !== undefined && b.toIdx !== undefined && b.fromIdx <= currentIdx && currentIdx < b.toIdx);
                        const matchesClass = !coachClass || b.class === coachClass;
                        return isCurrentStation && matchesClass;
                    }).length;
                    setVacantBerthCount(currentlyVacant);
                }
            } catch {
                setVacantBerthCount(0);
            }
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchPendingUpgrades = useCallback(async (): Promise<void> => {
        try {
            const userData = JSON.parse(localStorage.getItem('user') || '{}');
            if (!userData.irctcId) return;

            const response = await api.get(
                `/passenger/pending-upgrades/${userData.irctcId}`
            );

            if (response.data.success && response.data.data?.upgrades) {
                setPendingUpgrades(response.data.data.upgrades);
                console.log(`📝 Found ${response.data.data.upgrades.length} pending upgrades`);
            }
        } catch (err) {
            console.error('Error fetching pending upgrades:', err);
        }
    }, []);

    const checkForActiveGroupUpgrade = useCallback(async (): Promise<void> => {
        try {
            const userData = JSON.parse(localStorage.getItem('user') || '{}');
            const pnr = userData.pnr || userData.PNR_Number;
            if (!pnr) return;

            console.log('🔍 Checking for active group upgrade offers...');
            const response = await api.get(
                `/reallocation/group-upgrade-status/${pnr}`
            );

            if (response.data.success && response.data.hasActiveOffer) {
                console.log('✅ Found active group upgrade offer on reconnection!', response.data);
                alert(`✅ You have an active upgrade offer!\n\nSeats available: ${response.data.vacantSeatsCount}\nYour group size: ${response.data.passengerCount}\n\nSelect passengers now!`);
                window.location.href = `/#/family-upgrade?pnr=${pnr}`;
            }
        } catch (err) {
            console.error('Error checking for active group upgrades:', err);
        }
    }, []);

    const handleApproveUpgrade = useCallback(async (upgrade: PendingUpgrade): Promise<void> => {
        if (!window.confirm(`Accept upgrade to ${upgrade.proposedBerthFull} (${upgrade.proposedBerthType})?`)) return;

        setApprovingUpgrade(upgrade.id);
        try {
            const userData = JSON.parse(localStorage.getItem('user') || '{}');
            const response = await api.post(
                '/passenger/approve-upgrade',
                { upgradeId: upgrade.id, irctcId: userData.irctcId }
            );

            if (response.data.success) {
                alert(`✅ Upgrade approved! Your new berth: ${response.data.data.newBerth}`);
                setPendingUpgrades(prev => prev.filter(u => u.id !== upgrade.id));
                fetchData();
            }
        } catch (err) {
            const axiosError = err as { response?: { data?: { message?: string } } };
            alert('❌ ' + (axiosError.response?.data?.message || 'Failed to approve upgrade'));
        } finally {
            setApprovingUpgrade(null);
        }
    }, [fetchData]);

    const handleAcceptUpgrade = useCallback(async (): Promise<void> => {
        if (!upgradeOffer) return;

        try {
            const response = await api.post(
                '/tte/confirm-upgrade',
                {
                    pnr: passenger?.PNR_Number,
                    notificationId: upgradeOffer.notificationId || 'MANUAL_ACCEPT'
                }
            );

            if (response.data.success) {
                alert('✅ Upgrade confirmed! Your new berth is ' + upgradeOffer.offeredBerth);
                setUpgradeOffer(null);
                fetchData();
            }
        } catch (err) {
            const axiosError = err as { response?: { data?: { message?: string } } };
            alert(axiosError.response?.data?.message || 'Failed to confirm upgrade');
        }
    }, [upgradeOffer, passenger, fetchData]);

    const handleRejectUpgrade = useCallback((): void => {
        if (window.confirm('Are you sure you want to reject this upgrade offer?')) {
            setUpgradeOffer(null);
            alert('Upgrade offer rejected. The berth will be offered to another passenger.');
        }
    }, []);

    const handleRevertNoShow = useCallback(async (): Promise<void> => {
        if (!window.confirm('Are you present on the train? This will revert your NO-SHOW status.')) return;

        setReverting(true);
        try {
            const response = await api.post(
                '/passenger/revert-no-show',
                { pnr: passenger?.PNR_Number }
            );

            if (response.data.success) {
                alert('✅ NO-SHOW status cleared! You are confirmed as boarded.');
                fetchData();
            }
        } catch (err) {
            const axiosError = err as { response?: { data?: { message?: string } } };
            alert('❌ ' + (axiosError.response?.data?.message || 'Failed to revert NO-SHOW status'));
        } finally {
            setReverting(false);
        }
    }, [passenger, fetchData]);

    return {
        passenger, trainState, loading, error,
        upgradeOffer, setUpgradeOffer,
        pendingUpgrades, setPendingUpgrades,
        vacantBerthCount, isRejected,
        approvingUpgrade, reverting,
        fetchData, fetchPendingUpgrades, checkForActiveGroupUpgrade,
        handleApproveUpgrade, handleAcceptUpgrade, handleRejectUpgrade, handleRevertNoShow,
    };
}

export default usePassengerData;
