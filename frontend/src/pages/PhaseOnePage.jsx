import React from "react";
import "./PhaseOnePage.css";

function PhaseOnePage({ onClose }) {
  return (
    <div className="phase-one-page">
      <div className="page-header">
        <button className="back-btn" onClick={onClose}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          ◄
        </button>
        <h2>🎯 Phase 1</h2>
      </div>
      <div className="empty-content">
        <p>This phase page is intentionally empty for now.</p>
      </div>
    </div>
  );
}

export default PhaseOnePage;
