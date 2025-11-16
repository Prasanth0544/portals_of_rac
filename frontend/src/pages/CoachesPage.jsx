// frontend/src/pages/CoachesPage.jsx

import React, { useState, useRef } from "react";
import "./CoachesPage.css";

function CoachesPage({ trainData, onClose }) {
  const [selectedBerth, setSelectedBerth] = useState(null);
  const [selectedCoachType, setSelectedCoachType] = useState("sleeper");
  const scrollContainerRef = useRef(null);

  if (!trainData || !trainData.coaches) return null;

  // Handle coach type selection
  const handleCoachTypeChange = (type) => {
    setSelectedCoachType(type);
  };

  // Scroll functions for navigation arrows
  const scroll = (direction) => {
    if (scrollContainerRef.current) {
      const scrollAmount = 340; // Card width + gap
      const currentScroll = scrollContainerRef.current.scrollLeft;
      scrollContainerRef.current.scrollTo({
        left:
          currentScroll + (direction === "left" ? -scrollAmount : scrollAmount),
        behavior: "smooth",
      });
    }
  };

  // Get berth status at CURRENT station (segment-based)
  const getBerthStatusClass = (berth) => {
    // CRITICAL: If journey hasn't started, all berths are vacant (passengers haven't boarded yet)
    if (!trainData.journeyStarted) {
      return "vacant";
    }

    const segments = berth.segmentOccupancy || berth.segments;
    const currentStationIdx = trainData.currentStationIdx || 0;

    // Check segment occupancy at current station
    if (
      segments &&
      Array.isArray(segments) &&
      segments.length > currentStationIdx
    ) {
      const currentSegment = segments[currentStationIdx];

      // null = vacant at this station
      if (currentSegment === null || currentSegment === undefined) {
        return "vacant";
      }

      // Check if it's a shared berth (RAC)
      if (berth.status === "SHARED") return "shared";

      return "occupied";
    }

    // Fallback to overall status
    if (berth.status === "VACANT") return "vacant";
    if (berth.status === "SHARED") return "shared";
    return "occupied";
  };

  return (
    <div className="coaches-page">
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
        </button>
        <h2>🚂 Train Coaches & Berths</h2>
      </div>

      <div className="legend">
        <span className="legend-item">
          <span className="color-box vacant"></span> Vacant
        </span>
        <span className="legend-item">
          <span className="color-box occupied"></span> Occupied
        </span>
        <span className="legend-item">
          <span className="color-box shared"></span> Shared (RAC)
        </span>
      </div>

      {/* Coach Type Selection */}
      <div className="coach-type-selector">
        <button
          className={`coach-type-btn ${selectedCoachType === "sleeper" ? "active" : ""}`}
          onClick={() => handleCoachTypeChange("sleeper")}
        >
          🛏️ Sleeper Coaches
        </button>
        <button
          className={`coach-type-btn ${selectedCoachType === "3ac" ? "active" : ""}`}
          onClick={() => handleCoachTypeChange("3ac")}
        >
          ❄️ 3-Tier AC
        </button>
      </div>

      {/* Navigation arrows and horizontal scroller */}
      <div className="coaches-container">
        <button
          className="scroll-arrow scroll-left"
          onClick={() => scroll("left")}
        >
          ‹
        </button>

        <div className="coaches-grid" ref={scrollContainerRef}>
          {(selectedCoachType === "sleeper"
            ? trainData.coaches.filter((c) => c.class === "SL")
            : trainData.coaches.filter((c) => c.class === "3A")
          ).map((coach) => (
            <div key={coach.coachNo} className="coach-card">
              <div className="coach-header">
                <h4>{coach.coachNo}</h4>
                <span className="coach-class">{coach.class}</span>
              </div>

              <div className="berths-grid">
                {coach.berths.map((berth) => (
                  <div
                    key={berth.fullBerthNo}
                    className={`berth ${getBerthStatusClass(berth)}`}
                    onClick={() => setSelectedBerth(berth)}
                    title={`${berth.fullBerthNo}\n${berth.type}\n${berth.status}\n${berth.passengers.length} passenger(s)`}
                  >
                    {berth.berthNo}
                  </div>
                ))}
              </div>

              <div className="coach-summary">
                Vacant:{" "}
                {!trainData.journeyStarted
                  ? coach.capacity
                  : coach.berths.filter((b) => {
                      const segments = b.segmentOccupancy || b.segments;
                      const currentStationIdx =
                        trainData.currentStationIdx || 0;
                      return segments && segments[currentStationIdx] === null;
                    }).length}{" "}
                / {coach.capacity}
              </div>
            </div>
          ))}
        </div>

        <button
          className="scroll-arrow scroll-right"
          onClick={() => scroll("right")}
        >
          ›
        </button>
      </div>

      {selectedBerth && (
        <BerthDetailsModal
          berth={selectedBerth}
          onClose={() => setSelectedBerth(null)}
          currentStationIdx={trainData.currentStationIdx}
          stations={trainData.stations}
          journeyStarted={trainData.journeyStarted}
        />
      )}
    </div>
  );
}

function BerthDetailsModal({
  berth,
  onClose,
  currentStationIdx,
  stations,
  journeyStarted,
}) {
  // If journey hasn't started, show a message instead of berth details
  if (!journeyStarted) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <button className="back-btn" onClick={onClose}>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </button>
            <h3>🛏️ Berth Details: {berth.fullBerthNo}</h3>
          </div>

          <div className="modal-body">
            <div className="info-row">
              <strong>Type:</strong> {berth.type}
            </div>
            <div className="info-row">
              <strong>Status:</strong>
              <span className={`status-tag vacant`}>VACANT</span>
            </div>

            <div className="vacant-message">
              <div className="vacant-icon">💺</div>
              <h4>This berth is currently vacant</h4>
              <p>
                Journey has not started yet. Passenger details will be available
                once the journey begins.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <button className="back-btn" onClick={onClose}>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <h3>🛏️ Berth Details: {berth.fullBerthNo}</h3>
        </div>

        <div className="modal-body">
          <div className="info-row">
            <strong>Type:</strong> {berth.type}
          </div>
          <div className="info-row">
            <strong>Status:</strong>
            <span className={`status-tag ${berth.status.toLowerCase()}`}>
              {berth.status}
            </span>
          </div>
          <div className="info-row">
            <strong>Passengers:</strong> {berth.passengers.length}
          </div>

          {berth.passengers.length > 0 && (
            <div className="passengers-list">
              <h4>Passenger Details:</h4>
              {berth.passengers.map((p, idx) => (
                <div key={`${p.pnr}-${idx}`} className="passenger-card">
                  <div className="passenger-header">
                    <strong>{p.name}</strong>
                    <span className="age-gender">
                      ({p.age}/{p.gender})
                    </span>
                    <span
                      className={`pnr-badge ${(p.pnrStatus || "").toLowerCase().replace(" ", "-")}`}
                    >
                      {p.pnrStatus}
                    </span>
                  </div>

                  <div className="journey-info">
                    🚉 {p.from} → {p.to}
                  </div>

                  <div className="passenger-status">
                    {p.noShow ? (
                      <span className="status-icon no-show">❌ No-Show</span>
                    ) : p.boarded ? (
                      <span className="status-icon boarded">✅ Boarded</span>
                    ) : p.fromIdx <= currentStationIdx ? (
                      <span className="status-icon missed">
                        ⚠️ Missed Boarding
                      </span>
                    ) : (
                      <span className="status-icon waiting">
                        ⏳ Not Yet Boarded
                      </span>
                    )}
                  </div>

                  <div className="passenger-meta">
                    <div className="meta-item">
                      <strong>PNR:</strong> <code>{p.pnr}</code>
                    </div>
                    <div className="meta-item">
                      <strong>Class:</strong> {p.class}
                    </div>
                    {p.racStatus && p.racStatus !== "-" && (
                      <div className="meta-item">
                        <strong>RAC Status:</strong> {p.racStatus}
                      </div>
                    )}
                    {p.berthType && (
                      <div className="meta-item">
                        <strong>Berth Type:</strong> {p.berthType}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {berth.status === "VACANT" && (
            <div className="vacant-message">
              <div className="vacant-icon">💺</div>
              <h4>This berth is currently vacant</h4>
              <p>Available for allocation to RAC passengers</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CoachesPage;
