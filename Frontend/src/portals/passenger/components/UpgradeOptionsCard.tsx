// Frontend/src/portals/passenger/components/UpgradeOptionsCard.tsx
// Passenger portal: Shows available higher-class (3A/2A) upgrade options with cost for Sleeper RAC passengers

import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface BerthOption {
    berth: {
        fullBerthNo: string;
        coach: string;
        berthNo: number;
        type: string;
        class: string;
        classLabel: string;
    };
    currentStation: string;
    deboard: string;
    remainingKm: number;
    ratePerKm: number;
    cost: number;
    costBreakdown: string;
    targetClass: string;
}

interface Props {
    irctcId: string;
    pnr: string;
    passengerClass?: string;
    pnrStatus?: string;
    journeyStarted?: boolean;
}

const CLASS_CONFIG: Record<string, { emoji: string; color: string; bg: string; border: string; label: string }> = {
    AC_3_Tier: { emoji: '❄️', color: '#0369a1', bg: '#e0f2fe', border: '#0ea5e9', label: '3-Tier AC (3A)' },
    AC_2_Tier: { emoji: '✨', color: '#7e22ce', bg: '#f3e8ff', border: '#a855f7', label: '2nd AC (2A)' },
};

export default function UpgradeOptionsCard({ irctcId, pnr, passengerClass, pnrStatus, journeyStarted }: Props) {
    const [options, setOptions] = useState<Record<string, BerthOption[]>>({});
    const [loading, setLoading] = useState(false);
    const [hasOptions, setHasOptions] = useState(false);
    const [selected, setSelected] = useState<BerthOption | null>(null);
    const [applying, setApplying] = useState(false);
    const [result, setResult] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [confirmed, setConfirmed] = useState(false);

    const isEligible =
        pnrStatus === 'RAC' &&
        (passengerClass === 'SL' || passengerClass === 'Sleeper');

    // If data is still loading (passengerClass/pnrStatus are empty strings), treat as pending
    const isDataLoaded = pnrStatus !== '' || passengerClass !== '';

    const fetchOptions = useCallback(async () => {
        if (!isEligible || !irctcId) return;
        setLoading(true);
        try {
            const trainNo = localStorage.getItem('trainNo');
            const url = `${API_URL}/passenger/upgrade-options/${irctcId}${trainNo ? `?trainNo=${trainNo}` : ''}`;
            const res = await axios.get(url, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
            });
            if (res.data.success) {
                setOptions(res.data.data.options || {});
                setHasOptions(res.data.data.hasOptions || false);
            }
        } catch {
            setHasOptions(false);
        } finally {
            setLoading(false);
        }
    }, [irctcId, isEligible]);

    useEffect(() => { fetchOptions(); }, [fetchOptions]);

    const requestUpgrade = async () => {
        if (!selected) return;
        setApplying(true);
        setResult(null);
        try {
            const trainNo = localStorage.getItem('trainNo');
            await axios.post(
                `${API_URL}/passenger/request-cross-class-upgrade`,
                { pnr, targetCoach: selected.berth.coach, targetBerthNo: selected.berth.berthNo, trainNo },
                { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
            );
            setResult({ type: 'success', text: `✅ Upgrade confirmed! Your new berth: ${selected.berth.fullBerthNo} (${selected.berth.classLabel}). Please pay ₹${selected.cost} to the TTE.` });
            setSelected(null);
            setConfirmed(true);
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Upgrade failed';
            setResult({ type: 'error', text: `❌ ${msg}` });
        } finally {
            setApplying(false);
        }
    };

    // Still loading passenger data
    if (!isDataLoaded) return (
        <div style={cardStyle}>
            <div style={{ color: '#64748b', fontSize: '14px' }}>⏳ Loading upgrade options…</div>
        </div>
    );

    // Not eligible — show a clear message instead of returning null
    if (!isEligible) return (
        <div style={{ ...cardStyle, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '22px' }}>ℹ️</span>
                <div>
                    <div style={{ fontWeight: 600, fontSize: '14px', color: '#475569' }}>Class Upgrade Not Available</div>
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                        {pnrStatus !== 'RAC'
                            ? `Class upgrades are only for RAC passengers. Your status: ${pnrStatus || 'Unknown'}`
                            : passengerClass !== 'SL' && passengerClass !== 'Sleeper'
                                ? `Class upgrades are only for Sleeper class. Your class: ${passengerClass || 'Unknown'}`
                                : 'Class upgrades are available after the journey starts.'}
                    </div>
                </div>
            </div>
        </div>
    );

    if (loading) return (
        <div style={cardStyle}>
            <div style={{ color: '#64748b', fontSize: '14px' }}>⏳ Checking upgrade availability…</div>
        </div>
    );

    if (!hasOptions && !loading) return (
        <div style={{ ...cardStyle, background: '#f0fdf4', border: '1px solid #86efac' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '22px' }}>🎫</span>
                <div>
                    <div style={{ fontWeight: 600, fontSize: '14px', color: '#166534' }}>You're Eligible!</div>
                    <div style={{ fontSize: '12px', color: '#4ade80', marginTop: '4px' }}>No higher-class vacant berths available at this station that cover your full remaining journey. Check back at the next station.</div>
                </div>
            </div>
            <button onClick={fetchOptions} style={{ marginTop: '10px', padding: '6px 14px', borderRadius: '6px', border: '1px solid #86efac', background: 'white', cursor: 'pointer', fontSize: '12px', color: '#16a34a' }}>🔄 Refresh</button>
        </div>
    );

    const allOptions = Object.values(options).flat();

    return (
        <div style={cardStyle}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>🚀</span>
                <div>
                    <div style={{ fontWeight: 700, fontSize: '15px', color: '#1e293b' }}>Higher Class Available!</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>Upgrade to 3A or 2A for your remaining journey</div>
                </div>
            </div>

            {result && (
                <div style={{
                    padding: '10px 14px', borderRadius: '8px', marginBottom: '12px', fontSize: '13px',
                    background: result.type === 'success' ? '#dcfce7' : '#fee2e2',
                    color: result.type === 'success' ? '#16a34a' : '#dc2626',
                }}>
                    {result.text}
                </div>
            )}

            {confirmed ? (
                <div style={{ textAlign: 'center', padding: '10px', color: '#16a34a', fontWeight: 600 }}>
                    🎉 Upgrade complete! Show this to the TTE and pay the upgrade fee.
                </div>
            ) : (
                <>
                    {/* Available options by class */}
                    {Object.entries(options).map(([cls, opts]) => {
                        const cfg = CLASS_CONFIG[cls] || { emoji: '🚂', color: '#334155', bg: '#f8fafc', border: '#cbd5e1', label: cls };
                        return (
                            <div key={cls} style={{ marginBottom: '14px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                                    <span style={{ fontSize: '16px' }}>{cfg.emoji}</span>
                                    <span style={{ fontWeight: 600, color: cfg.color }}>{cfg.label}</span>
                                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>— ₹{opts[0]?.ratePerKm}/km</span>
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {opts.map((opt, i) => {
                                        const isSelected = selected?.berth.fullBerthNo === opt.berth.fullBerthNo;
                                        return (
                                            <button
                                                key={i}
                                                onClick={() => setSelected(isSelected ? null : opt)}
                                                style={{
                                                    padding: '8px 12px', borderRadius: '10px', cursor: 'pointer',
                                                    border: `2px solid ${isSelected ? cfg.border : '#e2e8f0'}`,
                                                    background: isSelected ? cfg.bg : 'white',
                                                    textAlign: 'left', minWidth: '140px', transition: 'all 0.2s',
                                                }}>
                                                <div style={{ fontWeight: 700, color: cfg.color, fontSize: '14px' }}>{opt.berth.fullBerthNo}</div>
                                                <div style={{ fontSize: '11px', color: '#64748b' }}>{opt.berth.type}</div>
                                                <div style={{ fontSize: '13px', fontWeight: 600, color: '#16a34a', marginTop: '4px' }}>₹{opt.cost}</div>
                                                <div style={{ fontSize: '10px', color: '#94a3b8' }}>{opt.costBreakdown}</div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}

                    {/* Cost info for selected berth */}
                    {selected && (
                        <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '10px', padding: '12px', marginBottom: '12px' }}>
                            <div style={{ fontWeight: 600, fontSize: '14px', color: '#15803d', marginBottom: '6px' }}>
                                Selected: {selected.berth.fullBerthNo} ({selected.berth.classLabel})
                            </div>
                            <div style={{ fontSize: '13px', color: '#166534' }}>
                                📍 Remaining journey: <strong>{selected.remainingKm} km</strong>
                                <span style={{ margin: '0 6px' }}>·</span>
                                Rate: <strong>₹{selected.ratePerKm}/km</strong>
                                <span style={{ margin: '0 6px' }}>·</span>
                                <strong>Total: ₹{selected.cost}</strong>
                            </div>
                            <div style={{ fontSize: '12px', color: '#4ade80', marginTop: '4px' }}>
                                💳 Pay this amount to the TTE after confirmation
                            </div>
                        </div>
                    )}

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        {selected && (
                            <button
                                onClick={requestUpgrade}
                                disabled={applying}
                                style={{
                                    padding: '10px 20px', borderRadius: '8px', border: 'none',
                                    background: applying ? '#94a3b8' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                    color: 'white', fontWeight: 700, fontSize: '14px', cursor: 'pointer', flex: 1,
                                }}>
                                {applying ? '⏳ Confirming…' : `✅ Confirm Upgrade to ${selected.berth.fullBerthNo} — ₹${selected.cost}`}
                            </button>
                        )}
                        <button onClick={fetchOptions} style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer', fontSize: '13px', color: '#64748b' }}>
                            🔄
                        </button>
                    </div>

                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '10px' }}>
                        ℹ️ Upgrade is subject to TTE verification. Pay the fee to the TTE onboard. Your status will change to CNF in the selected class.
                    </div>
                </>
            )}
        </div>
    );
}

const cardStyle: React.CSSProperties = {
    background: 'linear-gradient(135deg, #fefce8 0%, #f0f9ff 100%)',
    border: '2px solid #fbbf24',
    borderRadius: '12px',
    padding: '16px',
    marginTop: '16px',
};
