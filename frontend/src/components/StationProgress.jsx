import React from 'react';
import './StationProgress.css';

function StationProgress({ stations = [], currentStationIdx = 0 }) {
  if (!stations.length) return null;

  return (
    <div className="station-progress-panel">
      <h3 className="panel-header">🚉 Journey Progress</h3>

      <div className="station-timeline">
        {stations.map((station, idx) => {
          const statusClass = idx < currentStationIdx
            ? 'completed'
            : idx === currentStationIdx
            ? 'current'
            : 'upcoming';

          return (
            <div key={station.code} className={`station-node ${statusClass}`}>
              <div className="station-circle">
                {idx < currentStationIdx ? '✓' : station.sno}
              </div>
              <div className="station-info">
                <span className="station-name">{station.name}</span>
                <span className="station-code">{station.code}</span>
              </div>
              {idx < stations.length - 1 && <div className="station-line" />}
            </div>
          );
        })}
      </div>

      <div className="progress-summary">
        Station {currentStationIdx + 1} of {stations.length}: 
        <strong> {stations[currentStationIdx]?.name || 'Unknown'}</strong>
      </div>
    </div>
  );
}

export default StationProgress;
