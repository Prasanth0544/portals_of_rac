// frontend/src/pages/VisualizationPage.jsx - FIXED CONNECTION (YOUR CODE + API CALL CORRECTION)

import React, { useState, useEffect } from 'react';
import { getStationSchedule } from '../services/api'; // Use getStationSchedule from api.js (calls /station-schedule)
import './VisualizationPage.css';

function VisualizationPage({ trainData, onClose }) {
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState(null);

  useEffect(() => {
    loadStationSchedule();
  }, []);

  const loadStationSchedule = async () => {
    try {
      setLoading(true);
      const response = await getStationSchedule(); // Calls correct endpoint (/visualization/station-schedule)
      
      if (response.success) {
        setStations(response.data.stations || []); // Extract stations from response.data.stations
      }
    } catch (error) {
      console.error('Error loading station schedule:', error);
      if (error.message?.includes('initialized')) {
        setStations([]); // Graceful empty for uninit
      }
    } finally {
      setLoading(false);
    }
  };

  // YOUR ORIGINAL infoCards (preserved – dynamic with stations)
  const infoCards = [
    {
      id: 1,
      title: 'Journey Segments',
      icon: '🚆',
      description: 'Each passenger journey is broken into segments (station-to-station).',
      details: `
        <h3>How Journey Segments Work:</h3>
        <ul>
          <li>The train journey from ${stations[0]?.name || 'origin'} to ${stations[stations.length - 1]?.name || 'destination'} is divided into ${stations.length - 1} segments</li>
          <li>Each segment represents travel between two consecutive stations</li>
          <li>Example: Station 1 → Station 2 is Segment 0, Station 2 → Station 3 is Segment 1</li>
          <li>This allows tracking which portions of the journey are occupied</li>
        </ul>
      `,
      color: '#64b5f6' // Softer blue (was #2196f3)
    },
    {
      id: 2,
      title: 'Berth Timeline',
      icon: '🛏️',
      description: 'Each berth tracks which segments are occupied. Same berth can serve multiple passengers.',
      details: `
        <h3>Berth Timeline Concept:</h3>
        <ul>
          <li>A single berth (e.g., S1-15) has ${stations.length - 1} segment slots</li>
          <li>Passenger A: Boards at Station 1, Deboards at Station 5 → Occupies Segments 0-4</li>
          <li>Passenger B: Boards at Station 6, Deboards at Station 10 → Occupies Segments 5-9</li>
          <li>Same berth serves both passengers without overlap!</li>
          <li>This maximizes berth utilization and allows multiple passengers per berth</li>
        </ul>
      `,
      color: '#81c784' // Softer green (was #4caf50)
    },
    {
      id: 3,
      title: 'Eligibility Check',
      icon: '✅',
      description: 'RAC passenger is eligible only if ALL segments of their journey are vacant.',
      details: `
        <h3>RAC Eligibility Rules:</h3>
        <ul>
          <li>RAC Passenger wants to travel from Station 3 to Station 8 (Segments 2-7)</li>
          <li>System checks if ALL segments (2, 3, 4, 5, 6, 7) are vacant in a berth</li>
          <li>If even ONE segment is occupied, the berth is NOT eligible</li>
          <li>Only berths with complete journey availability are shown</li>
          <li>This prevents overlapping passenger journeys</li>
        </ul>
      `,
      color: '#ffb74d' // Softer orange (was #ff9800)
    },
    {
      id: 4,
      title: 'Dynamic Allocation',
      icon: '🔄',
      description: 'As passengers deboard, their segments become vacant and can be reallocated.',
      details: `
        <h3>Real-time Reallocation:</h3>
        <ul>
          <li>When Passenger A deboards at Station 5, Segments 0-4 become vacant</li>
          <li>System immediately checks RAC queue for eligible passengers</li>
          <li>RAC passengers needing those segments get upgraded to CNF</li>
          <li>New passengers can board at subsequent stations using freed segments</li>
          <li>Maximizes berth utilization throughout the journey</li>
        </ul>
      `,
      color: '#ba68c8' // Softer purple (was #9c27b0)
    }
  ];

  const handleCardClick = (card) => {
    setSelectedCard(card);
  };

  const closeModal = () => {
    setSelectedCard(null);
  };

  // YOUR ORIGINAL calculateJourneyTime (preserved)
  const calculateJourneyTime = () => {
    if (!stations || stations.length < 2) return '0';
    
    const first = stations[0];
    const last = stations[stations.length - 1];
    
    const firstHour = parseInt(first.departure?.split(':')[0] || 0);
    const lastHour = parseInt(last.arrival?.split(':')[0] || 0);
    const hours = (last.day - 1) * 24 + lastHour - firstHour;
    
    return hours > 0 ? hours : 0;
  };

  // YOUR ORIGINAL getTotalDistance (preserved)
  const getTotalDistance = () => {
    if (!stations || stations.length === 0) return 0;
    return stations[stations.length - 1]?.distance || 0;
  };

  if (loading) {
    return (
      <div className="visualization-page">
        <div className="page-header">
          <button className="back-btn" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <h2>📊 Train Journey Visualization</h2>
        </div>
        <div className="loading-container">
          <div className="spinner-large"></div>
          <p>Loading station schedule...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="visualization-page">
      <div className="page-header">
        <button className="back-btn" onClick={onClose}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <h2>📊 Train Journey Visualization</h2>
      </div>

      {/* YOUR Info Banner (preserved) */}
      <div className="vis-info-banner">
        <strong>💡 Segment-Based Vacancy:</strong> Journey divided into <strong>{stations.length - 1} segments</strong>. 
        A berth can be vacant in some segments and occupied in others. Click the cards below to learn more!
      </div>

      {/* YOUR Station Schedule Table (preserved + empty handling) */}
      <div className="station-schedule-section">
        <div className="section-header">
          <h3>📍 Train Station Schedule</h3>
          <div className="schedule-stats">
            <span className="stat-badge">🚉 {stations.length} Stations</span>
            <span className="stat-badge">📏 {getTotalDistance()} km</span>
            <span className="stat-badge">⏱️ {calculateJourneyTime()} hrs</span>
          </div>
        </div>

        <div className="table-container">
          <table className="station-schedule-table">
            <thead>
              <tr>
                <th>#</th>
                <th>CODE</th>
                <th>STATION NAME</th>
                <th>ZONE</th>
                <th>DIVISION</th>
                <th>ARRIVAL</th>
                <th>DEPARTURE</th>
                <th>HALT</th>
                <th>DISTANCE (KM)</th>
                <th>DAY</th>
                <th>PLATFORM</th>
                <th>REMARKS</th>
              </tr>
            </thead>
            <tbody>
              {stations.length === 0 ? (
                <tr>
                  <td colSpan="12" className="no-data">
                    No stations loaded. <button onClick={loadStationSchedule} className="retry-btn">Retry</button> or initialize train on Home page.
                  </td>
                </tr>
              ) : (
                stations.map((station, idx) => (
                  <tr key={station.code} className={
                    idx === 0 ? 'first-station' : 
                    idx === stations.length - 1 ? 'last-station' : ''
                  }>
                    <td className="td-center">{station.sno}</td>
                    <td className="td-code">{station.code}</td>
                    <td className="td-name">
                      {idx === 0 && <span className="station-badge origin">ORIGIN</span>}
                      {idx === stations.length - 1 && <span className="station-badge destination">DESTINATION</span>}
                      {station.name}
                    </td>
                    <td className="td-center">{station.zone || 'South Central'}</td> {/* FIXED: Default if missing */}
                    <td className="td-center">{station.division || 'Vijayawada'}</td> {/* FIXED: Default if missing */}
                    <td className="td-center">{station.arrival === '-' ? 'First' : station.arrival}</td>
                    <td className="td-center">{station.departure === '-' ? 'Last' : station.departure}</td>
                    <td className="td-right">{station.halt || 0} min</td>
                    <td className="td-right">{station.distance}</td>
                    <td className="td-center">{station.day}</td>
                    <td className="td-center">{station.platform || '-'}</td>
                    <td className="td-center">{station.remarks || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* YOUR Interactive Info Cards (preserved) */}
      <div className="info-cards-section">
        <h3 className="cards-section-title">🧠 How Segment-Based Vacancy Works</h3>
        <div className="info-cards-grid">
          {infoCards.map(card => (
            <div 
              key={card.id}
              className="info-card"
              style={{ borderLeft: `4px solid ${card.color}` }}
              onClick={() => handleCardClick(card)}
            >
              <div className="card-number" style={{ backgroundColor: card.color }}>
                {card.id}
              </div>
              <div className="card-icon">{card.icon}</div>
              <h4 className="card-title">{card.title}</h4>
              <p className="card-description">{card.description}</p>
              <button className="card-btn" style={{ backgroundColor: card.color }}>
                Learn More →
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* YOUR Modal for Card Details (preserved) */}
      {selectedCard && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content card-details-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ borderBottom: `3px solid ${selectedCard.color}` }}>
              <button className="back-btn" onClick={closeModal}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
              </button>
              <div className="modal-title">
                <span className="modal-icon">{selectedCard.icon}</span>
                <h3>{selectedCard.title}</h3>
              </div>
            </div>
            <div className="modal-body" dangerouslySetInnerHTML={{ __html: selectedCard.details }} />
            <div className="modal-footer">
              <button 
                className="btn-primary" 
                style={{ backgroundColor: selectedCard.color }}
                onClick={closeModal}
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default VisualizationPage;