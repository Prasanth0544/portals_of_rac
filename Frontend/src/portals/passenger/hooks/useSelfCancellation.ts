// passenger-portal/src/hooks/useSelfCancellation.ts
// Manages the OTP-verified self-cancellation flow

import { useState, useCallback } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface VerifyData {
    irctcId: string;
    pnr: string;
}

export interface UseSelfCancellationReturn {
    showModal: boolean;
    step: number;
    verifyData: VerifyData;
    setVerifyData: React.Dispatch<React.SetStateAction<VerifyData>>;
    cancelOTP: string;
    setCancelOTP: React.Dispatch<React.SetStateAction<string>>;
    cancelOTPSent: boolean;
    processing: boolean;
    openModal: () => void;
    closeModal: () => void;
    sendOTP: () => Promise<void>;
    confirmCancel: () => Promise<void>;
}

/**
 * Custom hook for the self-cancellation flow.
 * Handles the 2-step process: verify identity + OTP → confirm cancel.
 */
export function useSelfCancellation(onSuccess: () => void): UseSelfCancellationReturn {
    const [showModal, setShowModal] = useState<boolean>(false);
    const [step, setStep] = useState<number>(1);
    const [verifyData, setVerifyData] = useState<VerifyData>({ irctcId: '', pnr: '' });
    const [cancelOTP, setCancelOTP] = useState<string>('');
    const [cancelOTPSent, setCancelOTPSent] = useState<boolean>(false);
    const [processing, setProcessing] = useState<boolean>(false);

    const openModal = useCallback((): void => {
        setShowModal(true);
        setStep(1);
        setVerifyData({ irctcId: '', pnr: '' });
        setCancelOTP('');
        setCancelOTPSent(false);
    }, []);

    const closeModal = useCallback((): void => {
        setShowModal(false);
        setStep(1);
        setVerifyData({ irctcId: '', pnr: '' });
        setCancelOTP('');
        setCancelOTPSent(false);
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
                purpose: 'Cancel Ticket'
            });

            if (response.data.success) {
                setCancelOTPSent(true);
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

    const confirmCancel = useCallback(async (): Promise<void> => {
        if (!cancelOTP || cancelOTP.length !== 6) {
            alert('Please enter the 6-digit OTP');
            return;
        }

        setProcessing(true);
        try {
            const otpResponse = await axios.post(`${API_URL}/otp/verify`, {
                irctcId: verifyData.irctcId,
                pnr: verifyData.pnr,
                otp: cancelOTP
            });

            if (!otpResponse.data.success) {
                alert(otpResponse.data.message || 'Invalid OTP');
                setProcessing(false);
                return;
            }

            const confirmed = window.confirm(
                '⚠️ Are you sure you want to CANCEL your ticket?\n\n' +
                'This will mark you as NO-SHOW and your berth will be made available for other passengers.\n\n' +
                'This action cannot be undone!'
            );

            if (!confirmed) {
                setProcessing(false);
                return;
            }

            const response = await axios.post(`${API_URL}/passenger/self-cancel`, {
                pnr: verifyData.pnr,
                irctcId: verifyData.irctcId
            });

            if (response.data.success) {
                alert('✅ Ticket cancelled successfully. Your berth is now available for other passengers.');
                closeModal();
                onSuccess();
            } else {
                throw new Error(response.data.message || 'Failed to cancel ticket');
            }
        } catch (err) {
            const axiosError = err as { response?: { data?: { message?: string } }; message?: string };
            alert('❌ ' + (axiosError.response?.data?.message || axiosError.message || 'Failed to cancel ticket'));
        } finally {
            setProcessing(false);
        }
    }, [cancelOTP, verifyData, closeModal, onSuccess]);

    return {
        showModal, step, verifyData, setVerifyData,
        cancelOTP, setCancelOTP, cancelOTPSent, processing,
        openModal, closeModal,
        sendOTP, confirmCancel,
    };
}

export default useSelfCancellation;
