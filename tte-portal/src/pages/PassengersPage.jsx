// tte-portal/src/pages/PassengersPage.jsx
// Updated to fix export issue

import React, { useState, useEffect } from "react";
import { tteAPI } from "../api";
import "./PassengersPage.css";

// Passenger Status Button Component
function PassengerStatusButton({ passenger, onStatusUpdate }) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [showButtons, setShowButtons] = useState(false);

  const currentStatus = passenger.passengerStatus || 'Offline';

  const handleToggle = async (newStatus) => {
    setIsUpdating(true);
    try {
      await onStatusUpdate(passenger.pnr, newStatus);
      setShowButtons(false);
    } catch (error) {
      console.error('Failed to update status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  if (showButtons) {
    return (
      <div className="status-buttons-container">
        <button
          onClick={() => handleToggle('online')}
          disabled={isUpdating}
          className="status-btn online-btn"
        >
          Online
        </button>
        <button
          onClick={() => handleToggle('offline')}
          disabled={isUpdating}
          className="status-btn offline-btn"
        >
          Offline
        </button>
        <button
          onClick={() => setShowButtons(false)}
          className="status-btn cancel-btn"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowButtons(true)}
      disabled={isUpdating}
      className={`current-status-btn ${currentStatus.toLowerCase()}`}
    >
      {currentStatus}
    </button>
  );
}

function PassengersPage() {
  const [passengers, setPassengers] = useState([]);
  const [filteredPassengers, setFilteredPassengers] = useState([]);
  const [counts, setCounts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [trainData, setTrainData] = useState(null); // Fetch from TTE API

  const [searchPNR, setSearchPNR] = useState("");
  const [searchCoach, setSearchCoach] = useState("");
  const [filterStatus, setFilterStatus] = useState("boarded"); // DEFAULT: Show only boarded
  const [showVacantBerths, setShowVacantBerths] = useState(false);
  const [vacantBerths, setVacantBerths] = useState([]);
  const [filteredVacantBerths, setFilteredVacantBerths] = useState([]);
  const [vacantFromStation, setVacantFromStation] = useState("");
  const [vacantToStation, setVacantToStation] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFilters();
    calculateVacantBerths();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passengers, searchPNR, filterStatus, trainData]);

  useEffect(() => {
    filterVacantBerths();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vacantBerths, vacantFromStation, vacantToStation]);

  const calculateVacantBerths = async () => {
    if (!trainData || !trainData.coaches || !trainData.journeyStarted) {
      setVacantBerths([]);
      return;
    }

    try {
      // Fetch vacant berths from backend API
      const response = await fetch('http://localhost:5000/api/train/vacant-berths');
      const data = await response.json();

      console.log('🔍 TTE Portal - Vacant Berths API Response (ALL segments):', data);

      if (data.success && data.data && data.data.vacancies) {
        // TTE Portal: Filter to show ONLY vacant berths at current station
        const currentStationName = trainData.stations[trainData.currentStationIdx]?.name || "N/A";
        
        const vacant = data.data.vacancies
          .filter(berth => berth.isCurrentlyVacant) // Only show berths vacant NOW at current station
          .map(berth => {
            console.log('📦 TTE Portal - Current station vacant berth:', berth.fullBerthNo,
              `Vacant at: ${currentStationName}`);

            return {
              coach: berth.coachNo,
              berthNo: berth.berthNo,
              fullBerthNo: berth.fullBerthNo,
              type: berth.type,
              class: berth.class,
              currentStation: currentStationName,
              currentStationCode: trainData.stations[trainData.currentStationIdx]?.code || "",
              vacantFromStation: berth.vacantFromStation,
              vacantToStation: berth.vacantToStation,
              willOccupyAt: berth.willOccupyAt,
              isCurrentlyVacant: berth.isCurrentlyVacant
            };
          });

        console.log('✅ TTE Portal - Current station vacant berths:', vacant.length);
        setVacantBerths(vacant);
      } else {
        setVacantBerths([]);
      }
    } catch (error) {
      console.error('TTE Portal - Error fetching vacant berths:', error);
      setVacantBerths([]);
    }
  };

  const filterVacantBerths = () => {
    // For TTE Portal: Just display all current station vacant berths
    // (Already filtered by isCurrentlyVacant in calculateVacantBerths)
    setFilteredVacantBerths([...vacantBerths]);
  };

  const loadData = async () => {
    try {
      setLoading(true);

      // TTE API structure - fetch passengers AND train state
      const [passengersRes, trainStateRes] = await Promise.all([
        tteAPI.getPassengers({}),
        tteAPI.getTrainState()
      ]);

      if (passengersRes.success) {
        const allPassengers = passengersRes.data.passengers || [];
        setPassengers(allPassengers);

        // Calculate counts from data
        const counts = {
          total: allPassengers.length,
          cnf: allPassengers.filter(p => p.pnrStatus === 'CNF').length,
          rac: allPassengers.filter(p => p.pnrStatus === 'RAC').length,
          boarded: allPassengers.filter(p => p.boarded && !p.noShow).length,
          noShow: allPassengers.filter(p => p.noShow).length,
          online: allPassengers.filter(p => p.passengerStatus?.toLowerCase() === 'online').length,
          offline: allPassengers.filter(p => !p.passengerStatus || p.passengerStatus.toLowerCase() === 'offline').length
        };
        setCounts(counts);
      }

      if (trainStateRes.success) {
        setTrainData(trainStateRes.data);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async () => {
    try {
      // TTE API doesn't have setPassengerStatus - skip for now
      alert('Status update not available in TTE portal yet');
      // await tteAPI.setPassengerStatus(pnr, status);
      // await loadData();
    } catch (error) {
      console.error('Error updating passenger status:', error);
      alert(error.message || 'Failed to update passenger status');
    }
  };

  const applyFilters = () => {
    let filtered = [...passengers];

    // Search by PNR
    if (searchPNR.trim()) {
      filtered = filtered.filter((p) =>
        String(p.pnr).includes(searchPNR.trim()),
      );
    }

    // Search by Coach
    if (searchCoach.trim()) {
      filtered = filtered.filter((p) =>
        p.coach?.toLowerCase().includes(searchCoach.trim().toLowerCase()),
      );
    }

    // Filter by status
    switch (filterStatus) {
      case "cnf":
        filtered = filtered.filter((p) => p.pnrStatus === "CNF");
        break;
      case "rac":
        filtered = filtered.filter((p) => p.pnrStatus === "RAC");
        break;
      case "boarded":
        filtered = filtered.filter((p) => p.boarded === true && !p.noShow);
        break;
      case "no-show":
        filtered = filtered.filter((p) => p.noShow === true);
        break;
      case "online":
        filtered = filtered.filter((p) => p.passengerStatus && p.passengerStatus.toLowerCase() === 'online');
        break;
      case "offline":
        filtered = filtered.filter((p) => !p.passengerStatus || p.passengerStatus.toLowerCase() === 'offline');
        break;
      case "upcoming":
        filtered = filtered.filter(
          (p) =>
            p.fromIdx > trainData.currentStationIdx && !p.noShow && !p.boarded,
        );
        break;
      default:
        break;
    }

    setFilteredPassengers(filtered);
  };

  // Search functionality handled via searchPNR state changes and applyFilters

  if (loading) {
    return (
      <div className="passengers-page">
        <div className="page-header">
          <h2>👥 Passenger List</h2>
        </div>
        <div className="loading-container">
          <div className="spinner-large"></div>
          <p>Loading passengers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="passengers-page">
      <div className="page-header">
        <h2>
          👥 Passenger List ({counts ? counts.total : passengers.length} total)
        </h2>
      </div>

      {/* Statistics - Compact */}
      {counts && (
        <div className="pass-stats">
          <div className="pass-stat" onClick={() => setFilterStatus("all")}>
            <div className="pass-stat-label">Total</div>
            <div className="pass-stat-value">{counts.total}</div>
          </div>
          <div className="pass-stat" onClick={() => setFilterStatus("cnf")}>
            <div className="pass-stat-label">CNF</div>
            <div className="pass-stat-value">{counts.cnf}</div>
          </div>
          <div className="pass-stat" onClick={() => setFilterStatus("rac")}>
            <div className="pass-stat-label">RAC</div>
            <div className="pass-stat-value">{counts.rac}</div>
          </div>
          <div className="pass-stat" onClick={() => setFilterStatus("boarded")}>
            <div className="pass-stat-label">Boarded</div>
            <div className="pass-stat-value">{counts.boarded}</div>
          </div>
          <div className="pass-stat" onClick={() => setFilterStatus("no-show")}>
            <div className="pass-stat-label">No-Show</div>
            <div className="pass-stat-value">{counts.noShow}</div>
          </div>
          <div className="pass-stat" onClick={() => setFilterStatus("online")}>
            <div className="pass-stat-label">Online</div>
            <div className="pass-stat-value">{counts.online || 0}</div>
          </div>
          <div className="pass-stat" onClick={() => setFilterStatus("offline")}>
            <div className="pass-stat-label">Offline</div>
            <div className="pass-stat-value">{counts.offline || 0}</div>
          </div>
        </div>
      )}

      {/* Search Boxes - Only show when viewing passengers */}
      {!showVacantBerths && (
        <div style={{ marginBottom: '15px' }}>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="🔍 Search by PNR..."
              value={searchPNR}
              onChange={(e) => setSearchPNR(e.target.value)}
              style={{
                width: '100%',
                maxWidth: '300px',
                padding: '10px 15px',
                border: '2px solid #e1e8ed',
                borderRadius: '6px',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s ease',
              }}
              onFocus={(e) => e.target.style.borderColor = '#3498db'}
              onBlur={(e) => e.target.style.borderColor = '#e1e8ed'}
            />
            <input
              type="text"
              placeholder="🚂 Filter by Coach (e.g., S1, B2)..."
              value={searchCoach}
              onChange={(e) => setSearchCoach(e.target.value)}
              style={{
                width: '100%',
                maxWidth: '300px',
                padding: '10px 15px',
                border: '2px solid #e1e8ed',
                borderRadius: '6px',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s ease',
              }}
              onFocus={(e) => e.target.style.borderColor = '#3498db'}
              onBlur={(e) => e.target.style.borderColor = '#e1e8ed'}
            />
            {(searchPNR || searchCoach) && filteredPassengers.length > 0 && (
              <span style={{ fontSize: '13px', color: '#5a6c7d' }}>
                {filteredPassengers.length} result(s)
              </span>
            )}
          </div>
        </div>
      )}

      {/* Filter Options - Only show when viewing passengers */}
      {!showVacantBerths && (
        <div style={{ marginBottom: '15px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button onClick={() => setFilterStatus("all")} style={{ padding: '8px 20px', background: filterStatus === "all" ? '#3498db' : '#ecf0f1', color: filterStatus === "all" ? 'white' : '#2c3e50', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: filterStatus === "all" ? '600' : '500', fontSize: '13px', transition: 'all 0.2s ease' }}>
          All ({counts?.total || 0})
        </button>
        <button onClick={() => setFilterStatus("cnf")} style={{ padding: '8px 20px', background: filterStatus === "cnf" ? '#27ae60' : '#ecf0f1', color: filterStatus === "cnf" ? 'white' : '#2c3e50', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: filterStatus === "cnf" ? '600' : '500', fontSize: '13px', transition: 'all 0.2s ease' }}>
          CNF ({counts?.cnf || 0})
        </button>
        <button onClick={() => setFilterStatus("rac")} style={{ padding: '8px 20px', background: filterStatus === "rac" ? '#f39c12' : '#ecf0f1', color: filterStatus === "rac" ? 'white' : '#2c3e50', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: filterStatus === "rac" ? '600' : '500', fontSize: '13px', transition: 'all 0.2s ease' }}>
          RAC ({counts?.rac || 0})
        </button>
        <button onClick={() => setFilterStatus("boarded")} style={{ padding: '8px 20px', background: filterStatus === "boarded" ? '#9b59b6' : '#ecf0f1', color: filterStatus === "boarded" ? 'white' : '#2c3e50', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: filterStatus === "boarded" ? '600' : '500', fontSize: '13px', transition: 'all 0.2s ease' }}>
          Boarded ({counts?.boarded || 0})
        </button>
        <button onClick={() => setFilterStatus("no-show")} style={{ padding: '8px 20px', background: filterStatus === "no-show" ? '#e74c3c' : '#ecf0f1', color: filterStatus === "no-show" ? 'white' : '#2c3e50', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: filterStatus === "no-show" ? '600' : '500', fontSize: '13px', transition: 'all 0.2s ease' }}>
          No-Show ({counts?.noShow || 0})
        </button>
        <button onClick={() => setFilterStatus("upcoming")} style={{ padding: '8px 20px', background: filterStatus === "upcoming" ? '#1abc9c' : '#ecf0f1', color: filterStatus === "upcoming" ? 'white' : '#2c3e50', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: filterStatus === "upcoming" ? '600' : '500', fontSize: '13px', transition: 'all 0.2s ease' }}>
          Upcoming
        </button>
        </div>
      )}

      {/* Vacant Berths Toggle Button - Separate Row */}
      {trainData && trainData.journeyStarted && (
        <div className="vacant-toggle-section">
          <button
            onClick={() => setShowVacantBerths(!showVacantBerths)}
            className="vacant-toggle-btn"
          >
            {showVacantBerths ? "👥 View Passengers List " : "🛏️ View Vacant Berths"}
            {!showVacantBerths && (
              <span className="toggle-count">
                ({vacantBerths.length} vacant at{" "}
                {trainData.stations[trainData.currentStationIdx]?.code})
              </span>
            )}
          </button>
        </div>
      )}

      {/* Vacant Berths Section */}
      {showVacantBerths && trainData && trainData.journeyStarted && (
        <div className="vacant-berths-section" style={{ marginTop: '30px' }}>
          <div className="section-header">
            <h3>
              Vacant Berths at{" "}
              {trainData.stations[trainData.currentStationIdx]?.name}
            </h3>
            <span className="badge-count">{vacantBerths.length} vacant</span>
          </div>

          {/* Vacant Berths Filter */}
          <div className="vacant-filters">
            <div className="vacant-filter-group">
              <label className="filter-label">🔍 Filter by Stations</label>
              <div className="vacant-filter-inputs">
                <input
                  type="text"
                  placeholder="From Station: (Enter: Station Name/Code)"
                  value={vacantFromStation}
                  onChange={(e) => setVacantFromStation(e.target.value)}
                  className="vacant-filter-input"
                />
                <input
                  type="text"
                  placeholder="To Station: (Enter: Station Name/Code)"
                  value={vacantToStation}
                  onChange={(e) => setVacantToStation(e.target.value)}
                  className="vacant-filter-input"
                />
                <button
                  onClick={() => {
                    setVacantFromStation("");
                    setVacantToStation("");
                  }}
                  className="vacant-filter-reset"
                  title="Clear Filters"
                >
                  ✕ Clear
                </button>
              </div>
            </div>
          </div>

          {vacantBerths.length === 0 ? (
            <div className="empty-state">
              <p>✅ All berths are occupied at this station!</p>
            </div>
          ) : (
            <>
              {filteredVacantBerths.length === 0 ? (
                <div className="empty-state">
                  <p>🔍 No berths match your filter criteria</p>
                </div>
              ) : (
                <div className="table-container">
                  <div className="filter-result-info">
                    Showing <strong>{filteredVacantBerths.length}</strong> of{" "}
                    <strong>{vacantBerths.length}</strong> vacant berths
                  </div>
                  <table className="vacant-berths-table">
                    <thead>
                      <tr>
                        <th>No.</th>
                        <th>Berth</th>
                        <th>Type</th>
                        <th>Class</th>
                        <th>Current Station</th>
                        <th>Vacant From</th>
                        <th>Will Occupy At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredVacantBerths.map((berth, idx) => (
                        <tr key={berth.fullBerthNo}>
                          <td className="td-no">{idx + 1}</td>
                          <td className="td-berth">{berth.fullBerthNo}</td>
                          <td className="td-type">{berth.type}</td>
                          <td className="td-class">{berth.class}</td>
                          <td className="td-station">
                            {berth.currentStation}
                          </td>
                          <td className="td-station">
                            {berth.vacantFromStation}
                          </td>
                          <td className="td-station">
                            {berth.vacantToStation}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Table - Compact & Tabular */}
      {!showVacantBerths && (
        <div className="table-container">
          {filteredPassengers.length === 0 ? (
            <div className="empty-state">
              <p>No passengers match your filters</p>
            </div>
          ) : (
            <>
              <table className="pass-table">
                <thead>
                  <tr>
                    <th>No.</th>
                    <th>PNR</th>
                    <th>Name</th>
                    <th className="th-age">Age</th>
                    <th className="th-gender">Gender</th>
                    <th className="th-status">Status</th>
                    <th className="th-rac">RAC Que_no</th>
                    <th>Class</th>
                    <th>From</th>
                    <th>To</th>
                    <th>Berth</th>
                    <th>Boarded</th>
                    <th>Passenger Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPassengers.map((p, idx) => (
                    <tr key={p.pnr} className={p.noShow ? "no-show-row" : ""}>
                      <td className="td-no">{idx + 1}</td>
                      <td className="td-pnr">{p.pnr}</td>
                      <td className="td-name">{p.name}</td>
                      <td className="td-age">{p.age}</td>
                      <td className="td-gender">{p.gender}</td>
                      <td className="td-status">
                        <span
                          className={`badge ${p.pnrStatus.toLowerCase().replace(" ", "-")}`}
                        >
                          {p.pnrStatus}
                        </span>
                      </td>
                      <td className="td-rac">{p.racStatus || '-'}</td>
                      <td className="td-class">{p.class}</td>
                      <td className="td-from">{p.from}</td>
                      <td className="td-to">{p.to}</td>
                      <td className="td-berth">{p.berth}</td>
                      <td className="td-boarded">
                        {p.noShow ? "❌" : p.boarded ? "✅" : "⏳"}
                      </td>
                      <td className="td-passenger-status">
                        <PassengerStatusButton passenger={p} onStatusUpdate={handleStatusUpdate} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="table-footer">
                Showing {filteredPassengers.length} of {passengers.length}{" "}
                passengers
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default PassengersPage;
