// frontend/src/pages/ConfigPage.jsx
import React, { useState, useEffect } from "react";
import { setupConfig, initializeTrain, getTrains } from "../services/apiWithErrorHandling";
import "./ConfigPage.css";

function ConfigPage({ onClose, loadTrainState }) {
  const [form, setForm] = useState({
    mongoUri: "mongodb://localhost:27017",
    stationsDb: "rac",
    stationsCollection: "",
    passengersDb: "PassengersDB",
    passengersCollection: "",
    trainNo: "",
    trainName: "",
    journeyDate: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [trainList, setTrainList] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await getTrains();
        if (res.success) setTrainList(res.data || []);
      } catch (error) {
        console.warn('Could not load train list:', error.message);
      }
    })();
  }, []);

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      // Fallback: Try to find station collection if missing
      let stationsCollection = form.stationsCollection;
      if (!stationsCollection && form.trainNo) {
        const item = trainList.find((t) => String(t.trainNo) === form.trainNo);
        if (item && item.stationCollectionName) {
          stationsCollection = item.stationCollectionName;
          update("stationsCollection", stationsCollection); // Sync state
        }
      }

      if (!stationsCollection) {
        throw new Error(
          `Could not auto-detect Station Collection for train ${form.trainNo}. Please ensure "Station_Collection_Name" is set in "Trains_Details" collection.`
        );
      }

      const payload = {
        mongoUri: form.mongoUri,
        stationsDb: form.stationsDb,
        stationsCollection: stationsCollection, // Use resolved value
        passengersDb: form.passengersDb,
        passengersCollection: form.passengersCollection,
        trainNo: form.trainNo,
        journeyDate: form.journeyDate,
      };

      const res = await setupConfig(payload);
      if (!res.success)
        throw new Error(res.message || "Failed to apply configuration");

      const init = await initializeTrain(form.trainNo, form.journeyDate);
      if (!init.success)
        throw new Error(init.message || "Initialization failed");

      // Wait a moment for backend to fully initialize
      await new Promise(resolve => setTimeout(resolve, 500));

      await loadTrainState();

      // Wait for parent component to update state
      await new Promise(resolve => setTimeout(resolve, 300));
      onClose();
    } catch (err) {
      // Surface server-provided message when available
      const msg =
        typeof err === "string"
          ? err
          : err?.message || err?.error || "Configuration failed";
      // Helpfully hint when backend is unreachable
      const hint =
        msg.includes("Network") || msg.includes("connect")
          ? "Cannot reach backend. Is the API running on http://localhost:5000?"
          : "";
      setError([msg, hint].filter(Boolean).join(" "));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="config-page">
      <div className="page-header">
        <button className="back-btn" onClick={onClose} disabled={submitting}>
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
        <h2>⚙️ System Configuration</h2>
      </div>

      <form className="config-form" onSubmit={handleSubmit}>
        {error && <div className="error-banner">{error}</div>}

        <div className="form-section">
          <h3>MongoDB</h3>
          <label>
            Mongo URI
            <input
              type="text"
              value={form.mongoUri}
              onChange={(e) => update("mongoUri", e.target.value)}
              required
            />
          </label>
        </div>

        {/* Stations collection is now auto-populated from Trains_Details */}

        <div className="form-section">
          <h3>Passengers (Database: {form.passengersDb})</h3>
          <label>
            Collection Name
            <input
              type="text"
              value={form.passengersCollection}
              onChange={(e) => update("passengersCollection", e.target.value)}
              placeholder="e.g., 17225_new"
              required
            />
            <span className="field-hint">
              Enter the passengers collection name
            </span>
          </label>
        </div>

        <div className="form-section">
          <h3>Train Details</h3>
          {trainList.length > 0 && (
            <label>
              Select Train (from Train_Details)
              <select
                value={form.trainNo}
                onChange={(e) => {
                  const no = e.target.value;
                  const item = trainList.find((t) => String(t.trainNo) === no);
                  update("trainNo", no);
                  if (item) {
                    update("trainName", item.trainName || "");
                    // Auto-populate stations collection from Train_Details
                    if (item.stationCollectionName) {
                      update("stationsCollection", item.stationCollectionName);
                    }
                  }
                }}
              >
                <option value="">-- Select --</option>
                {trainList.map((t) => (
                  <option key={t.trainNo} value={String(t.trainNo)}>
                    {t.trainNo} - {t.trainName || "Unnamed"} (SL:
                    {t.sleeperCount || 0}, 3A:{t.threeAcCount || 0})
                  </option>
                ))}
              </select>
              <span className="field-hint">
                Train metadata from rac.Trains_Details (includes Station_Collection_Name)
              </span>
            </label>
          )}
          <label>
            Train Number
            <input
              type="text"
              value={form.trainNo}
              onChange={(e) => {
                const no = e.target.value;
                const item = trainList.find((t) => String(t.trainNo) === no);
                update("trainNo", no);
                if (item) {
                  update("trainName", item.trainName || "");
                  if (item.stationCollectionName) {
                    update("stationsCollection", item.stationCollectionName);
                  }
                }
              }}
              placeholder="e.g., 17225"
              maxLength={5}
              required
            />
            <span className="field-hint">
              Train name will be fetched from Train_Details collection
            </span>
          </label>
          <label>
            Journey Date
            <input
              type="date"
              value={form.journeyDate}
              onChange={(e) => update("journeyDate", e.target.value)}
              required
            />
            <span className="field-hint">Format: YYYY-MM-DD</span>
          </label>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? "Applying..." : "Apply Configuration"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default ConfigPage;
