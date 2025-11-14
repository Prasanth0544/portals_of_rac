// frontend/src/pages/ReallocationPage.jsx

import React, { useState, useEffect } from 'react';
import { 
  getEligibilityMatrix, 
  getRACQueue, 
  getVacantBerths,
  applyReallocation 
} from '../services/api';
import './ReallocationPage.css';

function ReallocationPage({ trainData, onClose, loadTrainState }) {
  const [eligibility, setEligibility] = useState([]);
  const [racQueue, setRacQueue] = useState([]);
  const [vacantBerths, setVacantBerths] = useState([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [eligibilityRes, racRes, vacancyRes] = await Promise.all([
        getEligibilityMatrix(),
        getRACQueue(),
        getVacantBerths()
      ]);

      if (eligibilityRes.success) {
        setEligibility(eligibilityRes.data.eligibility);
      }

      if (racRes.success) {
        setRacQueue(racRes.data.queue);
      }

      if (vacancyRes.success) {
        setVacantBerths(vacancyRes.data.vacancies);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyReallocation = async () => {
    if (eligibility.length === 0) {
      alert("No eligible RAC passengers for reallocation");
      return;
    }

    if (!window.confirm(`Apply reallocation for ${eligibility.length} vacant berths?`)) {
      return;
    }

    try {
      setApplying(true);

      const allocations = eligibility.map(e => ({
        coach: e.coach,
        berth: e.berthNo,
        pnr: e.topEligible.pnr
      }));

      const response = await applyReallocation(allocations);

      if (response.success) {
        alert(`✅ Reallocation Applied!\n\nSuccess: ${response.data.success.length}\nFailed: ${response.data.failed.length}`);
        
        await loadTrainState();
        await loadData();
      }
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <div className="reallocation-page">
        <div className="page-header">
          <button className="back-btn" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <h2>🎯 RAC Reallocation</h2>
        </div>
        <div className="loading-container">
          <div className="spinner-large"></div>
          <p>Loading reallocation data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="reallocation-page">
      <div className="page-header">
        <button className="back-btn" onClick={onClose}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <h2>🎯 RAC Reallocation</h2>
      </div>

      {/* Info Banner */}
      <div className="info-banner">
        <strong>ℹ️ Note:</strong> Shows RAC passengers eligible for vacant berths (current + future segments).
      </div>

      {/* Summary - Compact */}
      <div className="realloc-summary">
        <div className="summary-item">
          <div className="summary-label">RAC Queue</div>
          <div className="summary-value">{racQueue.length}</div>
        </div>
        <div className="summary-item">
          <div className="summary-label">Vacant</div>
          <div className="summary-value">{vacantBerths.length}</div>
        </div>
        <div className="summary-item">
          <div className="summary-label">Eligible</div>
          <div className="summary-value">{eligibility.length}</div>
        </div>
      </div>

      {/* Apply Button */}
      {eligibility.length > 0 && (
        <button 
          onClick={handleApplyReallocation}
          disabled={applying}
          className="btn-apply-realloc"
        >
          {applying ? 'Applying...' : `Apply Reallocation (${eligibility.length})`}
        </button>
      )}

      {/* Eligibility Table - Compact */}
      <div className="eligibility-section">
        <h3>Eligibility Matrix</h3>
        
        {eligibility.length === 0 ? (
          <div className="empty-state">
            <p>No eligible RAC passengers</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="eligibility-table">
              <thead>
                <tr>
                  <th>No.</th>
                  <th>Berth</th>
                  <th>Type</th>
                  <th>Top Priority</th>
                  <th>Status</th>
                  <th>Journey</th>
                </tr>
              </thead>
              <tbody>
                {eligibility.map((item, idx) => (
                  <tr key={`${item.berth}-${idx}`}>
                    <td className="td-no">{idx + 1}</td>
                    <td className="td-berth">{item.berth}</td>
                    <td className="td-type">{item.type}</td>
                    <td className="td-name">{item.topEligible.name}</td>
                    <td className="td-status">
                      <span className="badge-rac">{item.topEligible.pnrStatus}</span>
                    </td>
                    <td className="td-journey">{item.topEligible.from} → {item.topEligible.to}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default ReallocationPage;