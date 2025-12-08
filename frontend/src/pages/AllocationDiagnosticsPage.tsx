// frontend/src/pages/AllocationDiagnosticsPage.tsx

import React, { useState, useEffect, ChangeEvent } from 'react';
import axios from 'axios';
import './AllocationDiagnosticsPage.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface AllocationError {
    pnr?: string;
    name?: string;
    status?: string;
    berth?: string;
    from?: string;
    to?: string;
    error: string;
}

interface AllocationStats {
    total: number;
    success: number;
    failed: number;
}

interface AllocationData {
    stats: AllocationStats;
    errors: AllocationError[];
}

interface AllocationDiagnosticsPageProps {
    onClose: () => void;
}

function AllocationDiagnosticsPage({ onClose }: AllocationDiagnosticsPageProps): React.ReactElement {
    const [loading, setLoading] = useState<boolean>(true);
    const [allocationData, setAllocationData] = useState<AllocationData | null>(null);
    const [filterType, setFilterType] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState<string>('');

    useEffect(() => {
        loadAllocationErrors();
    }, []);

    const loadAllocationErrors = async (): Promise<void> => {
        try {
            setLoading(true);
            const response = await axios.get(`${API_BASE}/train/allocation-errors`);
            if (response.data.success) {
                setAllocationData(response.data.data);
            }
        } catch (error) {
            console.error('Error loading allocation errors:', error);
            alert('Failed to load allocation errors');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="diagnostics-page">
                <div className="page-header">
                    <button className="back-btn" onClick={onClose}>◄</button>
                    <h2>📊 Allocation Diagnostics</h2>
                </div>
                <div className="loading-container">
                    <div className="spinner-large"></div>
                    <p>Loading allocation errors...</p>
                </div>
            </div>
        );
    }

    if (!allocationData) {
        return (
            <div className="diagnostics-page">
                <div className="page-header">
                    <button className="back-btn" onClick={onClose}>◄</button>
                    <h2>📊 Allocation Diagnostics</h2>
                </div>
                <div className="empty-state">
                    <p>No allocation data available</p>
                </div>
            </div>
        );
    }

    const { stats, errors } = allocationData;

    let filteredErrors = [...errors];

    if (filterType !== 'all') {
        filteredErrors = filteredErrors.filter(err => {
            if (filterType === 'station') return err.error.includes('Station not found');
            if (filterType === 'berth') return err.error.includes('Berth not found') || err.error.includes('Berth full');
            return true;
        });
    }

    if (searchTerm.trim()) {
        const search = searchTerm.toLowerCase();
        filteredErrors = filteredErrors.filter(err =>
            err.pnr?.toLowerCase().includes(search) ||
            err.name?.toLowerCase().includes(search) ||
            err.berth?.toLowerCase().includes(search)
        );
    }

    const errorsByType: Record<string, number> = {};
    errors.forEach(err => {
        const errorType = err.error.includes('Station not found') ? 'Station Not Found' :
            err.error.includes('Berth not found') ? 'Berth Not Found' :
                err.error.includes('Berth full') ? 'Berth Full' :
                    'Other';
        errorsByType[errorType] = (errorsByType[errorType] || 0) + 1;
    });

    return (
        <div className="diagnostics-page">
            <div className="page-header">
                <button className="back-btn" onClick={onClose}>◄</button>
                <h2>📊 Allocation Diagnostics</h2>
            </div>

            <div className="diagnostics-summary">
                <div className="summary-card">
                    <div className="summary-label">Total Passengers</div>
                    <div className="summary-value">{stats.total}</div>
                </div>
                <div className="summary-card success">
                    <div className="summary-label">✅ Successfully Allocated</div>
                    <div className="summary-value">{stats.success}</div>
                </div>
                <div className="summary-card failed">
                    <div className="summary-label">❌ Failed Allocation</div>
                    <div className="summary-value">{stats.failed}</div>
                </div>
            </div>

            <div className="error-breakdown">
                <h3>Error Type Breakdown</h3>
                <div className="error-type-cards">
                    {Object.entries(errorsByType).map(([type, count]) => (
                        <div key={type} className="error-type-card">
                            <div className="error-type-label">{type}</div>
                            <div className="error-type-count">{count} passengers</div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="diagnostics-filters">
                <select
                    value={filterType}
                    onChange={(e: ChangeEvent<HTMLSelectElement>) => setFilterType(e.target.value)}
                    className="filter-select"
                >
                    <option value="all">All Errors ({errors.length})</option>
                    <option value="station">Station Not Found</option>
                    <option value="berth">Berth Issues</option>
                </select>
                <input
                    type="text"
                    placeholder="Search by PNR, Name, or Berth..."
                    value={searchTerm}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                    className="filter-input"
                />
            </div>

            <div className="results-info">
                Showing <strong>{filteredErrors.length}</strong> of <strong>{errors.length}</strong> failed allocations
            </div>

            <div className="diagnostics-table-container">
                {filteredErrors.length === 0 ? (
                    <div className="empty-state">
                        <p>No errors match your filters</p>
                    </div>
                ) : (
                    <table className="diagnostics-table">
                        <thead>
                            <tr>
                                <th>No.</th>
                                <th>PNR</th>
                                <th>Name</th>
                                <th>Status</th>
                                <th>Berth</th>
                                <th>From</th>
                                <th>To</th>
                                <th>Error Reason</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredErrors.map((err, idx) => (
                                <tr key={idx}>
                                    <td>{idx + 1}</td>
                                    <td className="td-pnr">{err.pnr || '-'}</td>
                                    <td className="td-name">{err.name || '-'}</td>
                                    <td className="td-status">
                                        <span className={`badge ${(err.status || '').toLowerCase()}`}>
                                            {err.status || '-'}
                                        </span>
                                    </td>
                                    <td className="td-berth">{err.berth || '-'}</td>
                                    <td className="td-station">{err.from || '-'}</td>
                                    <td className="td-station">{err.to || '-'}</td>
                                    <td className="td-error">
                                        <span className="error-message">{err.error}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

export default AllocationDiagnosticsPage;
