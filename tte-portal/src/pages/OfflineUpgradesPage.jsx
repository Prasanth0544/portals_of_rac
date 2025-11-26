// tte-portal/src/pages/OfflineUpgradesPage.jsx

import React, { useState, useEffect } from 'react';
import { tteAPI } from '../api';
import "./OfflineUpgradesPage.css";

function OfflineUpgradesPage() {
    const [passengers, setPassengers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentStation, setCurrentStation] = useState("");
    const [filter, setFilter] = useState("all");

    const fetchBoardedRACPassengers = async () => {
        try {
            setLoading(true);
            const response = await tteAPI.getBoardedRACPassengers();

            if (response.success) {
                setPassengers(response.data.passengers || []);
                setCurrentStation(response.data.currentStation || "");
            }
        } catch (error) {
            console.error("Error fetching boarded RAC passengers:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBoardedRACPassengers();
        const interval = setInterval(fetchBoardedRACPassengers, 60000);
        return () => clearInterval(interval);
    }, []);

    const filteredPassengers = passengers.filter((p) => {
        if (filter === "online") return p.passengerStatus?.toLowerCase() === "online";
        if (filter === "offline") return p.passengerStatus?.toLowerCase() !== "online";
        if (filter === "upgraded") return p.upgraded === true || p.pnrStatus === "CNF";
        return true;
    });

    const onlineCount = passengers.filter(p => p.passengerStatus?.toLowerCase() === "online").length;
    const offlineCount = passengers.filter(p => p.passengerStatus?.toLowerCase() !== "online").length;
    const upgradedCount = passengers.filter(p => p.upgraded === true || p.pnrStatus === "CNF").length;

    return (
        <div className="upgrades-page">
            <h2 className="upgrades-header">⬆️ RAC Upgrades Management</h2>
            <p className="upgrades-subtitle">
                Currently boarded RAC passengers at <strong>{currentStation || "N/A"}</strong>
            </p>

            <div className="filter-tabs">
                <button
                    onClick={() => setFilter("all")}
                    className={`filter-tab ${filter === "all" ? "active" : ""}`}
                >
                    All ({passengers.length})
                </button>
                <button
                    onClick={() => setFilter("online")}
                    className={`filter-tab ${filter === "online" ? "active online" : ""}`}
                >
                    Online ({onlineCount})
                </button>
                <button
                    onClick={() => setFilter("offline")}
                    className={`filter-tab ${filter === "offline" ? "active offline" : ""}`}
                >
                    Offline ({offlineCount})
                </button>
                <button
                    onClick={() => setFilter("upgraded")}
                    className={`filter-tab ${filter === "upgraded" ? "active upgraded" : ""}`}
                >
                    Upgraded ({upgradedCount})
                </button>
            </div>

            {loading ? (
                <div className="empty-state">Loading RAC passengers...</div>
            ) : filteredPassengers.length === 0 ? (
                <div className="empty-state">
                    No {filter !== "all" ? filter : ""} RAC passengers at current station
                </div>
            ) : (
                <div className="table-container">
                    <table className="rac-table">
                        <thead>
                            <tr>
                                <th>S.No</th>
                                <th>PNR</th>
                                <th>Name</th>
                                <th>Age</th>
                                <th>Gender</th>
                                <th>Status</th>
                                <th>RAC Number</th>
                                <th>Class</th>
                                <th>From</th>
                                <th>To</th>
                                <th>Passenger Status</th>
                                <th>Upgrade Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredPassengers.map((passenger, index) => (
                                <tr key={passenger.pnr || index}>
                                    <td className="td-no">{index + 1}</td>
                                    <td className="td-pnr">{passenger.pnr || "N/A"}</td>
                                    <td className="td-name">{passenger.name || "N/A"}</td>
                                    <td>{passenger.age || "N/A"}</td>
                                    <td>{passenger.gender || "N/A"}</td>
                                    <td>
                                        <span className={`badge-rac ${passenger.pnrStatus === "CNF" ? "cnf" : ""}`}>
                                            {passenger.pnrStatus || "RAC"}
                                        </span>
                                    </td>
                                    <td className="td-rac">{passenger.racStatus || "N/A"}</td>
                                    <td className="td-class">{passenger.class || "N/A"}</td>
                                    <td>{passenger.from || "N/A"}</td>
                                    <td>{passenger.to || "N/A"}</td>
                                    <td>
                                        <span className={`status-btn ${passenger.passengerStatus?.toLowerCase() === "online" ? "online" : "offline"}`}>
                                            {passenger.passengerStatus || "Offline"}
                                        </span>
                                    </td>
                                    <td>
                                        {passenger.upgraded || passenger.pnrStatus === "CNF" ? (
                                            <span className="upgrade-badge upgraded">✅ Upgraded</span>
                                        ) : (
                                            <span className="upgrade-badge pending">Pending</span>
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

export default OfflineUpgradesPage;
