// frontend/src/pages/HomePage.jsx (REORGANIZED LAYOUT)

import React, { useState } from 'react';
import './HomePage.css';

function HomePage({ 
  trainData, 
  journeyStarted, 
  loading, 
  onStartJourney, 
  onNextStation, 
  onReset, 
  onMarkNoShow,
  onNavigate 
}) {
  const [pnrInput, setPnrInput] = useState('');

  if (!trainData) return null;

  const handleMarkNoShow = () => {
    if (!pnrInput.trim()) {
      alert("Please enter a PNR");
      return;
    }
    onMarkNoShow(pnrInput);
    setPnrInput('');
  };

  const isLastStation = trainData.currentStationIdx >= trainData.stations.length - 1;

  return (
    <div className="home-page">
      {/* Train Configuration Info */}
      <div className="train-config-banner">
        <div className="config-item">
          <span className="config-label">Train:</span>
          <span className="config-value">{trainData.trainNo} - {trainData.trainName}</span>
        </div>
        <div className="config-item">
          <span className="config-label">Journey Date:</span>
          <span className="config-value">{trainData.journeyDate}</span>
        </div>
        <div className="config-item">
          <span className="config-label">Route:</span>
          <span className="config-value">
            {trainData.stations[0]?.name} → {trainData.stations[trainData.stations.length - 1]?.name}
          </span>
        </div>
      </div>


      {/* 1. Current Station Banner */}
      <div className="current-station-banner">
        <strong>Current:</strong> Station {trainData.currentStationIdx + 1} of {trainData.stations.length} - {trainData.stations[trainData.currentStationIdx]?.name}
      </div>

      {/* 2. Journey Progress */}
      {(
        <div className="journey-section">
          <h2>🚉 Journey Progress</h2>
          
          <div className="stations-grid-4col">
            {trainData.stations.map((station, idx) => (
              <div 
                key={station.code}
                className={`station-item ${
                  idx < trainData.currentStationIdx ? 'completed' :
                  idx === trainData.currentStationIdx ? 'current' : 'upcoming'
                }`}
              >
                <div className="station-number">
                  {idx < trainData.currentStationIdx ? '✓' : station.sno}
                </div>
                <div className="station-details">
                  <div className="station-name">{station.name}</div>
                  <div className="station-code">{station.code}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Start Journey Button */}
      {!journeyStarted && (
        <button 
          onClick={onStartJourney}
          disabled={loading}
          className="btn-start-journey"
        >
          {loading ? 'Starting...' : '🚀 Start Journey'}
        </button>
      )}

      {/* 4-7. Split Layout: Stats (Left) + Action Cards (Right) */}
      <div className="main-stats-section">
        {/* LEFT SIDE: Statistics Container (6 cards in 2x3 grid) */}
        <div className="stats-container-left">
          <div className="stat-box">
            <div className="stat-label">Total Passengers</div>
            <div className="stat-value">{trainData.stats.totalPassengers}</div>
          </div>

          <div className="stat-box">
            <div className="stat-label">Confirmed (CNF)</div>
            <div className="stat-value">{trainData.stats.cnfPassengers}</div>
          </div>

          <div className="stat-box">
            <div className="stat-label">Currently Onboard</div>
            <div className="stat-value">{journeyStarted ? trainData.stats.currentOnboard : '-'}</div>
          </div>

          <div className="stat-box clickable" onClick={() => onNavigate('rac-queue')}>
            <div className="stat-label">RAC Queue</div>
            <div className="stat-value">{trainData.stats.racPassengers}</div>
          </div>

          <div className="stat-box">
            <div className="stat-label">Vacant Berths</div>
            <div className="stat-value">{journeyStarted ? trainData.stats.vacantBerths : '-'}</div>
          </div>

          <div className="stat-box">
            <div className="stat-label">Occupied Berths</div>
            <div className="stat-value">{journeyStarted ? trainData.stats.occupiedBerths : '-'}</div>
          </div>

          <div className="stat-box">
            <div className="stat-label">Total Deboarded</div>
            <div className="stat-value">{journeyStarted ? trainData.stats.totalDeboarded : '-'}</div>
          </div>
        </div>

        {/* RIGHT SIDE: Action Cards - REORGANIZED */}
        <div className="action-cards-right">
          {/* NEW: Phase 1 Card (Top) */}
          <div className="action-card phase1-card" onClick={() => onNavigate('phase1')}>
            <div className="action-icon">🎯</div>
            <div className="action-content">
              <h4>Phase 1</h4>
              <p>Initial reallocation phase</p>
            </div>
            <div className="action-arrow">→</div>
          </div>

          {/* Apply Reallocation Card (Middle - moved up from bottom) */}
          <div className="action-card reallocation-card" onClick={() => onNavigate('reallocation')}>
            <div className="action-icon">🔄</div>
            <div className="action-content">
              <h4>Apply Reallocation</h4>
              <p>Upgrade RAC passengers</p>
            </div>
            <div className="action-arrow">→</div>
          </div>
        </div>
      </div>

      {/* 8. REORGANIZED: Train Simulation (Left) + Add Passenger (Center) + Mark No-Show (Right) */}
      <div className="controls-section-reorganized">
        {/* Train Simulation - LEFT SIDE (Smaller) */}
        <div className="control-box-compact">
          <h3>Train Simulation</h3>
          <button 
            onClick={onNextStation}
            disabled={loading || !journeyStarted || isLastStation}
            className="btn-action-compact"
          >
            {loading ? 'Processing...' : isLastStation ? 'Journey Complete' : 'Next Station →'}
          </button>
          <button 
            onClick={onReset}
            disabled={loading}
            className="btn-reset-compact"
          >
            Reset Train
          </button>
        </div>

        {/* Add Passenger - CENTER (New Position) */}
        <div className="control-box-center">
          <div className="add-passenger-center-card" onClick={() => onNavigate('add-passenger')}>
            <div className="center-icon">👤➕</div>
            <h3>Add Passenger</h3>
            <p>Add new passenger to train</p>
          </div>
        </div>

        {/* Mark No-Show - RIGHT SIDE (Smaller) */}
        <div className="control-box-compact">
          <h3>Mark No-Show</h3>
          <div className="input-group-compact">
            <input 
              type="text"
              placeholder="Enter 10-digit PNR"
              value={pnrInput}
              onChange={(e) => setPnrInput(e.target.value)}
              maxLength="10"
              className="input-pnr-compact"
            />
            <button 
              onClick={handleMarkNoShow}
              disabled={loading || !pnrInput.trim()}
              className="btn-noshow-compact"
            >
              Mark No-Show
            </button>
          </div>
        </div>
      </div>

      {/* 9. Quick Actions - NO CHANGES */}
      <div className="nav-section">
        <h3>Quick Actions</h3>
        <div className="nav-grid-3buttons">
          <button className="nav-btn" onClick={() => onNavigate('coaches')}>
            <span className="nav-icon">🚂</span>
            <span className="nav-text">Coaches & Berths</span>
          </button>

          <button className="nav-btn" onClick={() => onNavigate('passengers')}>
            <span className="nav-icon">👥</span>
            <span className="nav-text">Passenger List</span>
          </button>

          <button className="nav-btn" onClick={() => onNavigate('visualization')}>
            <span className="nav-icon">📊</span>
            <span className="nav-text">Segment View</span>
          </button>

          <button className="nav-btn" onClick={() => onNavigate('config')}>
            <span className="nav-icon">⚙️</span>
            <span className="nav-text">Update Configurations</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default HomePage;