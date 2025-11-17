// frontend/src/pages/ReallocationPage.jsx

import React, { useState, useEffect } from "react";
import {
  getEligibilityMatrix,
  getRACQueue,
  getVacantBerths,
  applyReallocation,
} from "../services/api";
import "./ReallocationPage.css";

function ReallocationPage({ trainData, onClose, loadTrainState }) {
  const [eligibility, setEligibility] = useState([]);
  const [racQueue, setRacQueue] = useState([]);
  const [vacantBerths, setVacantBerths] = useState([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [expandedRows, setExpandedRows] = useState({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const [eligibilityRes, racRes, vacancyRes] = await Promise.all([
        getEligibilityMatrix(),
        getRACQueue(),
        getVacantBerths(),
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
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyReallocation = async () => {
    if (eligibility.length === 0) {
      alert("No eligible RAC passengers for reallocation");
      return;
    }

    if (
      !window.confirm(
        `Apply reallocation for ${eligibility.length} vacant berths?`,
      )
    ) {
      return;
    }

    try {
      setApplying(true);

      const allocations = eligibility.map((e) => ({
        coach: e.coach,
        berth: e.berthNo,
        pnr: e.topEligible.pnr,
      }));

      const response = await applyReallocation(allocations);

      if (response.success) {
        alert(
          `✅ Reallocation Applied!\n\nSuccess: ${response.data.success.length}\nFailed: ${response.data.failed.length}`,
        );

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
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            ◄
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
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          ◄
        </button>
        <h2>🎯 RAC Reallocation</h2>
      </div>

      {/* Info Banner */}
      <div className="info-banner">
        <strong>ℹ️ Eligibility Matrix:</strong> Shows vacant berth segments and
        all eligible RAC passengers. Priority is given to lowest RAC number.
        Click row to see all eligible passengers.
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
          {applying
            ? "Applying..."
            : `Apply Reallocation (${eligibility.length})`}
        </button>
      )}

      {/* Eligibility Table - Enhanced with All Eligible RAC */}
      <div className="eligibility-section">
        <h3>Eligibility Matrix ({eligibility.length} vacant segments)</h3>

        {eligibility.length === 0 ? (
          <div className="empty-state">
            <p>✅ No vacant berth segments available for RAC reallocation</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="eligibility-table">
              <thead>
                <tr>
                  <th>No.</th>
                  <th>Berth</th>
                  <th>Type</th>
                  <th>Vacant Segment</th>
                  <th>Eligible RAC</th>
                  <th>Top Priority</th>
                  <th>RAC Status</th>
                  <th>Journey</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {eligibility.map((item, idx) => (
                  <React.Fragment key={`${item.berth}-${idx}`}>
                    <tr
                      className={`eligibility-row ${expandedRows[idx] ? "expanded" : ""}`}
                      onClick={() =>
                        setExpandedRows((prev) => ({
                          ...prev,
                          [idx]: !prev[idx],
                        }))
                      }
                      style={{ cursor: "pointer" }}
                    >
                      <td className="td-no">{idx + 1}</td>
                      <td className="td-berth">{item.berth}</td>
                      <td className="td-type">{item.type}</td>
                      <td className="td-segment">
                        <span className="segment-badge">
                          {item.vacantSegment}
                        </span>
                      </td>
                      <td className="td-eligible-count">
                        <span className="count-badge">
                          {item.eligibleCount} eligible
                        </span>
                      </td>
                      <td className="td-name">
                        <strong>{item.topEligible.name}</strong>
                      </td>
                      <td className="td-status">
                        <span className="badge-rac-priority">
                          {item.topEligible.racStatus}
                        </span>
                      </td>
                      <td className="td-journey">
                        {item.topEligible.from} → {item.topEligible.to}
                      </td>
                      <td className="td-action">
                        <button
                          className="btn-expand"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedRows((prev) => ({
                              ...prev,
                              [idx]: !prev[idx],
                            }));
                          }}
                        >
                          {expandedRows[idx] ? "▼" : "▶"}
                        </button>
                      </td>
                    </tr>

                    {/* Expanded Row - Show All Eligible RAC */}
                    {expandedRows[idx] && (
                      <tr className="expanded-details">
                        <td colSpan="9">
                          <div className="eligible-rac-list">
                            <h4>
                              All Eligible RAC Passengers ({item.eligibleCount}
                              ):
                            </h4>
                            <table className="rac-details-table">
                              <thead>
                                <tr>
                                  <th>Priority</th>
                                  <th>PNR</th>
                                  <th>Name</th>
                                  <th>Age/Gender</th>
                                  <th>RAC Status</th>
                                  <th>Journey</th>
                                  <th>Class</th>
                                </tr>
                              </thead>
                              <tbody>
                                {item.eligibleRAC.map((rac, racIdx) => (
                                  <tr
                                    key={rac.pnr}
                                    className={
                                      racIdx === 0 ? "top-priority" : ""
                                    }
                                  >
                                    <td>
                                      {racIdx === 0 ? (
                                        <span className="priority-badge top">
                                          🥇 Top
                                        </span>
                                      ) : (
                                        <span className="priority-badge">
                                          #{racIdx + 1}
                                        </span>
                                      )}
                                    </td>
                                    <td>{rac.pnr}</td>
                                    <td>
                                      <strong>{rac.name}</strong>
                                    </td>
                                    <td>
                                      {rac.age}/{rac.gender}
                                    </td>
                                    <td>
                                      <span className="badge-rac-detail">
                                        {rac.racStatus}
                                      </span>
                                    </td>
                                    <td>
                                      {rac.from} → {rac.to}
                                    </td>
                                    <td>{rac.class}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            <div className="allocation-note">
                              <strong>Note:</strong> Top priority passenger
                              (lowest RAC number) will be allocated when "Apply
                              Reallocation" is clicked.
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
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
