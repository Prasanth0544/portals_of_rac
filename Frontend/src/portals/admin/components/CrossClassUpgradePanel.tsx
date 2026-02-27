// Frontend/src/portals/admin/components/CrossClassUpgradePanel.tsx
// Admin view: Sleeper RAC passengers eligible for cross-class upgrade to 3A/2A

import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface UpgradeOption {
    passenger: {
        pnr: string;
        name: string;
        age: number;
        gender: string;
        racStatus: string;
        currentCoach: string;
        currentBerth: string;
        from: string;
        to: string;
    };
    berth: {
        fullBerthNo: string;
        coach: string;
        berthNo: number;
        type: string;
        class: string;
        classLabel: string;
    };
    targetClass: string;
    currentStation: string;
    deboard: string;
    remainingKm: number;
    ratePerKm: number;
    cost: number;
    costBreakdown: string;
}

interface Props {
    trainNo?: string;
}

const CLASS_COLORS: Record<string, { bg: string; border: string; text: string }> = {
    AC_3_Tier: { bg: '#e0f2fe', border: '#0ea5e9', text: '#0369a1' },
    AC_2_Tier: { bg: '#f3e8ff', border: '#a855f7', text: '#7e22ce' },
};

export default function CrossClassUpgradePanel({ trainNo }: Props) {
    const [upgrades, setUpgrades] = useState<UpgradeOption[]>([]);
    const [loading, setLoading] = useState(false);
    const [classFilter, setClassFilter] = useState<'all' | 'AC_3_Tier' | 'AC_2_Tier'>('all');
    const [applying, setApplying] = useState<string | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const fetchUpgrades = useCallback(async () => {
        setLoading(true);
        try {
            const url = `${API_URL}/reallocation/cross-class-upgrades${trainNo ? `?trainNo=${trainNo}` : ''}`;
            const res = await axios.get(url);
            if (res.data.success) setUpgrades(res.data.data.upgrades || []);
        } catch {
            setUpgrades([]);
        } finally {
            setLoading(false);
        }
    }, [trainNo]);

    useEffect(() => { fetchUpgrades(); }, [fetchUpgrades]);

    const applyUpgrade = async (opt: UpgradeOption) => {
        const key = `${opt.passenger.pnr}-${opt.berth.fullBerthNo}`;
        setApplying(key);
        setMessage(null);
        try {
            await axios.post(`${API_URL}/reallocation/apply-cross-class-upgrade`, {
                pnr: opt.passenger.pnr,
                targetCoach: opt.berth.coach,
                targetBerthNo: opt.berth.berthNo,
                trainNo,
            });
            setMessage({ type: 'success', text: `✅ ${opt.passenger.name} upgraded to ${opt.berth.fullBerthNo} (${opt.berth.classLabel})` });
            fetchUpgrades();
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Upgrade failed';
            setMessage({ type: 'error', text: `❌ ${msg}` });
        } finally {
            setApplying(null);
        }
    };

    const filtered = classFilter === 'all' ? upgrades : upgrades.filter(u => u.targetClass === classFilter);
    const slCount = upgrades.filter(u => u.targetClass === 'AC_3_Tier').length;
    const s2Count = upgrades.filter(u => u.targetClass === 'AC_2_Tier').length;

    return (
        <div style={{ marginTop: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>
                    🚀 Cross-Class Upgrade Eligible
                </h3>
                <span style={{ background: '#6366f1', color: 'white', borderRadius: '12px', padding: '2px 10px', fontSize: '13px', fontWeight: 600 }}>
                    {upgrades.length} options
                </span>
            </div>

            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 14px' }}>
                Sleeper RAC passengers who can voluntarily upgrade to 3A or 2A. Vacant berth must cover their <strong>entire remaining journey</strong>.
            </p>

            {/* Class filter pills */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
                {([
                    { key: 'all', label: `All (${upgrades.length})`, color: '#6366f1' },
                    { key: 'AC_3_Tier', label: `❄️ 3-Tier AC (${slCount})`, color: '#0ea5e9' },
                    { key: 'AC_2_Tier', label: `✨ 2nd AC (${s2Count})`, color: '#a855f7' },
                ] as { key: string; label: string; color: string }[]).map(c => (
                    <button key={c.key} onClick={() => setClassFilter(c.key as typeof classFilter)}
                        style={{
                            padding: '5px 14px', borderRadius: '20px', border: `2px solid ${c.color}`,
                            background: classFilter === c.key ? c.color : 'transparent',
                            color: classFilter === c.key ? 'white' : c.color,
                            fontWeight: 600, fontSize: '13px', cursor: 'pointer',
                        }}>
                        {c.label}
                    </button>
                ))}
                <button onClick={fetchUpgrades} style={{ marginLeft: 'auto', padding: '5px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer', fontSize: '13px' }}>
                    🔄 Refresh
                </button>
            </div>

            {message && (
                <div style={{
                    padding: '10px 14px', borderRadius: '8px', marginBottom: '12px', fontSize: '14px',
                    background: message.type === 'success' ? '#dcfce7' : '#fee2e2',
                    color: message.type === 'success' ? '#16a34a' : '#dc2626'
                }}>
                    {message.text}
                </div>
            )}

            {loading ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>Loading upgrade options…</div>
            ) : filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#64748b', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                    ✅ No cross-class upgrade opportunities at this station
                </div>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                            <tr style={{ background: '#f1f5f9', textAlign: 'left' }}>
                                <th style={th}>Passenger</th>
                                <th style={th}>Current Berth</th>
                                <th style={th}>Upgrade To</th>
                                <th style={th}>Berth</th>
                                <th style={th}>Remaining km</th>
                                <th style={th}>Cost</th>
                                <th style={th}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((opt, i) => {
                                const cls = CLASS_COLORS[opt.targetClass] || { bg: '#f8fafc', border: '#cbd5e1', text: '#334155' };
                                const key = `${opt.passenger.pnr}-${opt.berth.fullBerthNo}`;
                                return (
                                    <tr key={`${key}-${i}`} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                        <td style={td}>
                                            <div style={{ fontWeight: 600 }}>{opt.passenger.name}</div>
                                            <div style={{ color: '#64748b', fontSize: '12px' }}>{opt.passenger.pnr} · RAC {opt.passenger.racStatus}</div>
                                            <div style={{ color: '#64748b', fontSize: '12px' }}>{opt.passenger.from} → {opt.deboard}</div>
                                        </td>
                                        <td style={td}>
                                            <span style={{ fontFamily: 'monospace', background: '#fef9c3', padding: '2px 6px', borderRadius: '4px' }}>
                                                {opt.passenger.currentCoach}-{opt.passenger.currentBerth}
                                            </span>
                                            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>Sleeper</div>
                                        </td>
                                        <td style={td}>
                                            <span style={{ background: cls.bg, color: cls.text, border: `1px solid ${cls.border}`, borderRadius: '12px', padding: '2px 8px', fontSize: '12px', fontWeight: 600 }}>
                                                {opt.berth.classLabel}
                                            </span>
                                        </td>
                                        <td style={td}>
                                            <span style={{ fontFamily: 'monospace', background: cls.bg, padding: '2px 6px', borderRadius: '4px', color: cls.text, fontWeight: 600 }}>
                                                {opt.berth.fullBerthNo}
                                            </span>
                                            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>{opt.berth.type}</div>
                                        </td>
                                        <td style={td}>
                                            <span style={{ fontWeight: 600 }}>{opt.remainingKm} km</span>
                                            <div style={{ fontSize: '11px', color: '#94a3b8' }}>@ ₹{opt.ratePerKm}/km</div>
                                        </td>
                                        <td style={td}>
                                            <span style={{ fontWeight: 700, fontSize: '15px', color: '#16a34a' }}>₹{opt.cost}</span>
                                            <div style={{ fontSize: '11px', color: '#94a3b8' }}>{opt.costBreakdown}</div>
                                        </td>
                                        <td style={td}>
                                            <button
                                                onClick={() => applyUpgrade(opt)}
                                                disabled={applying === key}
                                                style={{
                                                    padding: '6px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                                                    background: applying === key ? '#94a3b8' : '#6366f1', color: 'white',
                                                    fontWeight: 600, fontSize: '12px', whiteSpace: 'nowrap',
                                                }}>
                                                {applying === key ? '⏳ Applying…' : '⬆️ Assign'}
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

const th: React.CSSProperties = { padding: '8px 12px', fontWeight: 600, fontSize: '12px', color: '#475569', whiteSpace: 'nowrap' };
const td: React.CSSProperties = { padding: '10px 12px', verticalAlign: 'top' };
