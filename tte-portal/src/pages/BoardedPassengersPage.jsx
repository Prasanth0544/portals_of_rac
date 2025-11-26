// tte-portal/src/pages/BoardedPassengersPage.jsx

import React, { useState, useEffect } from "react";
import { tteAPI } from "../api";
import "./PassengersPage.css";

function BoardedPassengersPage() {
    const [passengers, setPassengers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentStation, setCurrentStation] = useState("");
    const [filter, setFilter] = useState("all");
    const [updating, setUpdating] = useState(null);

    // Fetch boarded passengers
    const fetchBoardedPassengers = async () => {
        try {
            setLoading(true);
            const response = await tteAPI.getBoardedPassengers();

            if (response.success) {
                setPassengers(response.data.passengers || []);
                setCurrentStation(response.data.currentStation || "");
            }
        } catch (error) {
            console.error("Error fetching boarded passengers:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBoardedPassengers();

        // Refresh every 60 seconds
        const interval = setInterval(fetchBoardedPassengers, 60000);
        return () => clearInterval(interval);
    }, []);

    // Mark passenger as no-show
    const handleMarkNoShow = async (pnr) => {
        if (!window.confirm(`Mark passenger ${pnr} as NO-SHOW?`)) {
            return;
        }

        setUpdating(pnr);
        try {
            const response = await tteAPI.markNoShow(pnr);
            if (response.success) {
                // Update local state
                setPassengers(prev => prev.map(p =>
                    p.pnr === pnr ? { ...p, noShow: true } : p
                ));
                alert('✅ Passenger marked as NO-SHOW');
            }
        } catch (error) {
            alert('❌ Failed to mark as NO-SHOW: ' + (error.response?.data?.message || error.message));
        } finally {
            setUpdating(null);
        }
    };

    // Filter passengers based on selected filter
    const filteredPassengers = passengers.filter((p) => {
        if (filter === "rac") return p.pnrStatus === "RAC";
        if (filter === "cnf") return p.pnrStatus === "CNF";
        return true; // all
    });

    const racCount = passengers.filter(p => p.pnrStatus === "RAC").length;
    const cnfCount = passengers.filter(p => p.pnrStatus === "CNF").length;

    return (
        <div className="passengers-page">
            {/* Header */}
            <h2 style={{ marginBottom: '10px', color: '#2c3e50' }}>🚂 Currently Boarded Passengers</h2>
            <p style={{ marginBottom: '15px', color: '#5a6c7d', fontSize: '13px' }}>
                Showing passengers currently onboard at <strong>{currentStation || "N/A"}</strong> ({passengers.length} passengers)
            </p>

            {/* Filter Tabs */}
            <div style={{ marginBottom: '15px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                    onClick={() => setFilter("all")}
                    style={{
                        padding: '8px 20px',
                        background: filter === "all" ? '#3498db' : '#ecf0f1',
                        color: filter === "all" ? 'white' : '#2c3e50',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: filter === "all" ? '600' : '500',
                        fontSize: '13px',
                        transition: 'all 0.2s ease'
                    }}
                >
                    All ({passengers.length})
                </button>
                <button
                    onClick={() => setFilter("cnf")}
                    style={{
                        padding: '8px 20px',
                        background: filter === "cnf" ? '#27ae60' : '#ecf0f1',
                        color: filter === "cnf" ? 'white' : '#2c3e50',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: filter === "cnf" ? '600' : '500',
                        fontSize: '13px',
                        transition: 'all 0.2s ease'
                    }}
                >
                    CNF ({cnfCount})
                </button>
                <button
                    onClick={() => setFilter("rac")}
                    style={{
                        padding: '8px 20px',
                        background: filter === "rac" ? '#f39c12' : '#ecf0f1',
                        color: filter === "rac" ? 'white' : '#2c3e50',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: filter === "rac" ? '600' : '500',
                        fontSize: '13px',
                        transition: 'all 0.2s ease'
                    }}
                >
                    RAC ({racCount})
                </button>
            </div>

            {/* Table Only */}
            {loading ? (
                <div className="empty-state">Loading boarded passengers...</div>
            ) : filteredPassengers.length === 0 ? (
                <div className="empty-state">
                    No {filter !== "all" ? filter : ""} boarded passengers at current station
                </div>
            ) : (
                <div className="table-container">
                    <table className="pass-table">
                        <thead>
                            <tr>
                                <th>S.No</th>
                                <th>PNR</th>
                                <th>Name</th>
                                <th className="th-age">Age</th>
                                <th className="th-gender">Gender</th>
                                <th className="th-status">Status</th>
                                <th>Class</th>
                                <th>Coach</th>
                                <th>Seat No</th>
                                <th>From</th>
                                <th>To</th>
                                <th>Passenger Status</th>
                                <th>No Show</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredPassengers.map((passenger, index) => (
                                <tr key={passenger.pnr || index} className={passenger.noShow ? 'no-show-row' : ''}>
                                    <td className="td-no">{index + 1}</td>
                                    <td className="td-pnr">{passenger.pnr || "N/A"}</td>
                                    <td className="td-name">{passenger.name || "N/A"}</td>
                                    <td className="td-age">{passenger.age || "N/A"}</td>
                                    <td className="td-gender">{passenger.gender || "N/A"}</td>
                                    <td className="td-status">
                                        <span className={`badge ${passenger.pnrStatus?.toLowerCase()}`}>
                                            {passenger.pnrStatus || "N/A"}
                                        </span>
                                    </td>
                                    <td className="td-class">{passenger.class || "N/A"}</td>
                                    <td className="td-coach">{passenger.coach || "N/A"}</td>
                                    <td className="td-berth">{passenger.berth || "N/A"}</td>
                                    <td className="td-from">{passenger.from || "N/A"}</td>
                                    <td className="td-to">{passenger.to || "N/A"}</td>
                                    <td className="td-passenger-status">
                                        <span
                                            className={`current-status-btn ${passenger.passengerStatus?.toLowerCase() === "online"
                                                    ? "online"
                                                    : "offline"
                                                }`}
                                        >
                                            {passenger.passengerStatus || "Offline"}
                                        </span>
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        {passenger.noShow ? (
                                            <span style={{
                                                padding: '4px 10px',
                                                background: '#e74c3c',
                                                color: 'white',
                                                borderRadius: '4px',
                                                fontSize: '11px',
                                                fontWeight: '600'
                                            }}>
                                                NO-SHOW
                                            </span>
                                        ) : (
                                            <button
                                                onClick={() => handleMarkNoShow(passenger.pnr)}
                                                disabled={updating === passenger.pnr}
                                                style={{
                                                    padding: '4px 10px',
                                                    background: '#95a5a6',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    fontSize: '11px',
                                                    cursor: updating === passenger.pnr ? 'not-allowed' : 'pointer',
                                                    fontWeight: '600',
                                                    opacity: updating === passenger.pnr ? 0.6 : 1
                                                }}
                                            >
                                                {updating === passenger.pnr ? 'Updating...' : 'Mark No-Show'}
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default BoardedPassengersPage;
