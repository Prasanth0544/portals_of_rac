// frontend/src/pages/RACQueuePage.jsx

import React, { useState, useEffect } from 'react';
import { getRACQueue } from '../services/api';
import './RACQueuePage.css';

function RACQueuePage({ trainData, onClose }) {
  const [racQueue, setRacQueue] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRACQueue();
  }, []);

  const loadRACQueue = async () => {
    try {
      setLoading(true);
      const response = await getRACQueue();
      
      if (response.success) {
        setRacQueue(response.data.queue);
      }
    } catch (error) {
      console.error('Error loading RAC queue:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="rac-queue-page">
        <div className="page-header">
          <button className="back-btn" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <h2>🎫 RAC Queue</h2>
        </div>
        <div className="loading-container">
          <div className="spinner-large"></div>
          <p>Loading RAC queue...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rac-queue-page">
      <div className="page-header">
        <h2>🎫 RAC Queue ({racQueue.length} passengers)</h2>
        <button className="btn-close" onClick={onClose}>✕ Close</button>
      </div>

      {racQueue.length === 0 ? (
        <div className="empty-state">
          <p>No passengers in RAC queue</p>
        </div>
      ) : (
        <div className="rac-list">
          {racQueue.map((rac, idx) => (
            <div key={rac.pnr} className="rac-item">
              <div className="rac-position">{idx + 1}</div>
              <div className="rac-details">
                <div className="rac-header">
                  <span className="rac-name">{rac.name}</span>
                  <span className="rac-status">{rac.pnrStatus}</span>
                </div>
                <div className="rac-info">
                  <span className="rac-age-gender">{rac.age}/{rac.gender}</span>
                  <span className="rac-class">{rac.class}</span>
                  <span className="rac-pnr">PNR: {rac.pnr}</span>
                </div>
                <div className="rac-journey">
                  <span className="journey-from">{rac.from}</span>
                  <span className="journey-arrow">→</span>
                  <span className="journey-to">{rac.to}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default RACQueuePage;