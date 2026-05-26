// passenger-portal/src/hooks/useBoardingStationChange.ts
// Manages the OTP-verified boarding station change flow

import { useState, useCallback } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface Station {
    code: string;
    name: string;
    arrivalTime?: string;
}

interface VerifyData {
    irctcId: string;
    pnr: string;
}

export interface UseBoardingStationChangeReturn {
    showModal: boolean;
    step: number;
    verifyData: VerifyData;
    setVerifyData: React.Dispatch<React.SetStateAction<VerifyData>>;
    changeOTP: string;
    setChangeOTP: React.Dispatch<React.SetStateAction<string>>;
    changeOTPSent: boolean;
    availableStations: Station[];
    selectedStation: Station | null;
    processing: boolean;
    openModal: () => void;
    closeModal: () => void;
    sendOTP: () => Promise<void>;
    verifyOTP: () => Promise<void>;
    selectStation: (station: Station | undefined) => void;
    confirmChange: () => Promise<void>;
}

/**
 * Custom hook for the boarding station change flow.
 * Handles the 3-step process: verify identity → OTP → select station.
 */
export function useBoardingStationChange(onSuccess: () => void): UseBoardingStationChangeReturn {
    const [showModal, setShowModal] = useState<boolean>(false);
    const [step, setStep] = useState<number>(1);
    const [verifyData, setVerifyData] = useState<VerifyData>({ irctcId: '', pnr: '' });
    const [changeOTP, setChangeOTP] = useState<string>('');
    const [changeOTPSent, setChangeOTPSent] = useState<boolean>(false);
    const [availableStations, setAvailableStations] = useState<Station[]>([]);
    const [selectedStation, setSelectedStation] = useState<Station | null>(null);
    const [processing, setProcessing] = useState<boolean>(false);

    const openModal = useCallback((): void => {
        setShowModal(true);
        setStep(1);
        setVerifyData({ irctcId: '', pnr: '' });
        setChangeOTP('');
        setChangeOTPSent(false);
        setSelectedStation(null);
        setAvailableStations([]);
    }, []);

    const closeModal = useCallback((): void => {
        setShowModal(false);
        setStep(1);
        setVerifyData({ irctcId: '', pnr: '' });
        setChangeOTP('');
        setChangeOTPSent(false);
        setSelectedStation(null);
        setAvailableStations([]);
    }, []);

    const sendOTP = useCallback(async (): Promise<void> => {
        if (!verifyData.irctcId || !verifyData.pnr) {
            alert('Please enter both IRCTC ID and PNR Number');
            return;
        }

        setProcessing(true);
        try {
            const response = await axios.post(`${API_URL}/otp/send`, {
                irctcId: verifyData.irctcId,
                pnr: verifyData.pnr,
                purpose: 'Change Boarding Station'
            });

            if (response.data.success) {
                setChangeOTPSent(true);
                setStep(2);
                alert(`✅ ${response.data.message}\n\nPlease check your email for the OTP.`);
            }
        } catch (err) {
            console.error('Error sending OTP:', err);
            const axiosError = err as { response?: { data?: { message?: string } } };
            alert(axiosError.response?.data?.message || 'Failed to send OTP');
        } finally {
            setProcessing(false);
        }
    }, [verifyData]);

    const verifyOTP = useCallback(async (): Promise<void> => {
        if (!changeOTP || changeOTP.length !== 6) {
            alert('Please enter the 6-digit OTP');
            return;
        }

        setProcessing(true);
        try {
            const otpResponse = await axios.post(`${API_URL}/otp/verify`, {
                irctcId: verifyData.irctcId,
                pnr: verifyData.pnr,
                otp: changeOTP
            });

            if (otpResponse.data.success) {
                const stationsResponse = await axios.get(`${API_URL}/passenger/available-boarding-stations/${verifyData.pnr}`);

                if (stationsResponse.data.success) {
                    if (stationsResponse.data.alreadyChanged) {
                        alert('Boarding station has already been changed once for this booking.');
                        closeModal();
                        return;
                    }

                    setAvailableStations(stationsResponse.data.availableStations || []);

                    if (stationsResponse.data.availableStations?.length === 0) {
                        alert('No forward stations available for change.');
                        closeModal();
                        return;
                    }

                    setStep(3);
                }
            }
        } catch (err) {
            console.error('Error verifying OTP:', err);
            const axiosError = err as { response?: { data?: { message?: string } } };
            alert(axiosError.response?.data?.message || 'Failed to verify OTP');
        } finally {
            setProcessing(false);
        }
    }, [changeOTP, verifyData, closeModal]);

    const selectStation = useCallback((station: Station | undefined): void => {
        if (station) {
            setSelectedStation(station);
        }
    }, []);

    const confirmChange = useCallback(async (): Promise<void> => {
        if (!selectedStation) {
            alert('Please select a station');
            return;
        }

        const confirmResult = window.confirm(
            `Are you sure you want to change your boarding station to ${selectedStation.name} (${selectedStation.code})?\n\nThis action can only be done ONCE and cannot be undone.`
        );
        if (!confirmResult) return;

        setProcessing(true);
        try {
            const response = await axios.post(`${API_URL}/passenger/change-boarding-station`, {
                pnr: verifyData.pnr,
                irctcId: verifyData.irctcId,
                newStationCode: selectedStation.code
            });

            if (response.data.success) {
                alert(`✅ Boarding station changed successfully to ${selectedStation.name}!`);
                closeModal();
                onSuccess();
            }
        } catch (err) {
            console.error('Error changing station:', err);
            const axiosError = err as { response?: { data?: { message?: string } } };
            alert(axiosError.response?.data?.message || 'Failed to change boarding station');
        } finally {
            setProcessing(false);
        }
    }, [selectedStation, verifyData, closeModal, onSuccess]);

    return {
        showModal, step, verifyData, setVerifyData,
        changeOTP, setChangeOTP, changeOTPSent,
        availableStations, selectedStation, processing,
        openModal, closeModal,
        sendOTP, verifyOTP, selectStation, confirmChange,
    };
}

export default useBoardingStationChange;
