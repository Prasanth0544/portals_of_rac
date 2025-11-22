// frontend/src/pages/ConfigPage.jsx
import React, { useState, useEffect } from "react";
import { setupConfig, initializeTrain, getTrains } from "../services/api";
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
      } catch (_) { }
    })();
  }, []);

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        mongoUri: form.mongoUri,
        stationsDb: form.stationsDb,
        stationsCollection: form.stationsCollection,
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

      await loadTrainState();
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

        <div className="form-section">
          <h3>Stations (Database: {form.stationsDb})</h3>
          <label>
            Collection Name
            <input
              type="text"
              value={form.stationsCollection}
              onChange={(e) => update("stationsCollection", e.target.value)}
              placeholder="e.g., 17225"
              required
            />
            <span className="field-hint">
              Enter the stations collection name
            </span>
          </label>
        </div>

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
                  if (item) update("trainName", item.trainName || "");
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
                Train metadata from rac.Trains_Details
              </span>
            </label>
          )}
          <label>
            Train Number
            <input
              type="text"
              value={form.trainNo}
              onChange={(e) => update("trainNo", e.target.value)}
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
