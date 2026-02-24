// frontend/src/pages/TrainDashboard.tsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  getTrainConfig,
  setupConfig,
  initializeTrain,
  updateTrainConfig,
} from "../services/apiWithErrorHandling";
import { errorToast, successToast } from "../services/toastNotification";
import TrainApp from "../TrainApp";
import "../styles/pages/ConfigPage.css";
import "../styles/pages/TrainDashboard.css";

interface TrainConfig {
  trainNo?: string;
  trainName?: string;
  journeyDate?: string;
  stationsDb?: string;
  stationsCollection?: string;
  passengersDb?: string;
  passengersCollection?: string;
}

const TrainDashboard: React.FC<{ initialPage?: string }> = ({ initialPage }) => {
  const { trainNo } = useParams<{ trainNo?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const fromLanding = (location.state as any)?.fromLanding === true;

  const [configured, setConfigured] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);

  const [editTrainNo, setEditTrainNo] = useState("");
  const [editTrainName, setEditTrainName] = useState("");
  const [editStationsDb, setEditStationsDb] = useState("");
  const [editPassengersDb, setEditPassengersDb] = useState("");

  useEffect(() => {
    if (fromLanding) {
      window.history.replaceState({}, "", location.pathname);
    }
  }, []);

  useEffect(() => {
    if (initialPage === "config") {
      setConfigured(true);
      setLoadingConfig(false);
      return;
    }

    if (trainNo) {
      fetchTrainConfig(trainNo);
    }
  }, [trainNo, initialPage]);

  const fetchTrainConfig = async (trainNumber: string) => {
    setLoadingConfig(true);
    setConfigError(null);

    try {
      const result = await getTrainConfig(trainNumber);
      if (result.success && result.data) {
        setEditTrainNo(result.data.trainNo || "");
        setEditTrainName(result.data.trainName || "");
        setEditStationsDb(result.data.stationsDb || "");
        setEditPassengersDb(result.data.passengersDb || "");
      } else {
        setConfigError("Failed to load train configuration");
      }
    } catch (e: any) {
      setConfigError(e.message);
    } finally {
      setLoadingConfig(false);
    }
  };

  const handleApplyConfig = async () => {
    setApplying(true);
    try {
      const targetTrainNo = editTrainNo || trainNo || "";

      await updateTrainConfig(targetTrainNo, {
        trainName: editTrainName,
        stationsDb: editStationsDb,
        passengersDb: editPassengersDb,
      });

      await setupConfig({
        trainNo: targetTrainNo,
        trainName: editTrainName,
        stationsDb: editStationsDb,
        passengersDb: editPassengersDb,
      });

      await initializeTrain(targetTrainNo, "");

      successToast("Train Ready", `Train ${targetTrainNo} configured`);
      setConfigured(true);
    } catch (e: any) {
      setConfigError(e.message);
      errorToast("Error", e.message);
    } finally {
      setApplying(false);
    }
  };

  if (configured) return <TrainApp initialPage={initialPage} />;

  if (loadingConfig) {
    return (
      <div className="App">
        <div className="app-header">
          <div className="header-content">
            <h1>🚂 RAC Reallocation System</h1>
            <h2>Loading Train {trainNo}…</h2>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <div className="app-header">
        <div className="header-content">
          <h1>🚂 RAC Reallocation System</h1>
          <h2>Train Setup</h2>
        </div>
      </div>

      <div className="app-content">
        <div className="config-page">
          <div className="page-header">
            <button className="back-btn" onClick={() => navigate("/")}>
              ←
            </button>
            <h2>⚙️ Train Configuration</h2>
          </div>

          {configError && <div className="error-banner">{configError}</div>}

          <div className="config-form">
            <div className="form-section combined-section">
              <div className="combined-section-header">
                <h3>🚂 Train Details</h3>
              </div>

              <div className="train-info-grid">
                <div className="info-row">
                  <span className="info-label">Train Number</span>
                  <input
                    className="info-input"
                    value={editTrainNo}
                    onChange={(e) => setEditTrainNo(e.target.value)}
                  />
                </div>

                <div className="info-row">
                  <span className="info-label">Train Name</span>
                  <input
                    className="info-input"
                    value={editTrainName}
                    onChange={(e) => setEditTrainName(e.target.value)}
                  />
                </div>

                <div className="info-row">
                  <span className="info-label">Stations DB</span>
                  <input
                    className="info-input"
                    value={editStationsDb}
                    onChange={(e) => setEditStationsDb(e.target.value)}
                  />
                </div>

                <div className="info-row">
                  <span className="info-label">Passengers DB</span>
                  <input
                    className="info-input"
                    value={editPassengersDb}
                    onChange={(e) => setEditPassengersDb(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-actions">
                <button
                  className="btn-apply"
                  onClick={handleApplyConfig}
                  disabled={applying}
                >
                  {applying ? "Applying..." : "Apply Configuration"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrainDashboard;