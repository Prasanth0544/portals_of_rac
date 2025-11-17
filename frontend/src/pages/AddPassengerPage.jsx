// frontend/src/pages/AddPassengerPage.jsx - Modern Enhanced Design

import React, { useState, useEffect } from "react";
import { addPassenger, getTrainState } from "../services/api";
import "./AddPassengerPage.css";

const AddPassengerPage = ({ trainData, onClose }) => {
  const [formData, setFormData] = useState({
    pnr: "",
    name: "",
    age: "",
    gender: "Male",
    from: "",
    to: "",
    class: "Sleeper",
    pnr_status: "CNF",
    rac_status: "-",
    coach: "S1",
    seat_no: "",
    berth_type: "Lower",
    train_no: trainData?.trainNo || "",
    train_name: trainData?.trainName || "",
    journey_date:
      trainData?.journeyDate || new Date().toISOString().split("T")[0],
  });
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (trainData && trainData.stations) {
      setStations(trainData.stations);
      // Update train details when trainData changes
      setFormData((prev) => ({
        ...prev,
        train_no: trainData.trainNo || "",
        train_name: trainData.trainName || "",
        journey_date:
          trainData.journeyDate || new Date().toISOString().split("T")[0],
      }));
    } else {
      loadStations();
    }
  }, [trainData]);

  const loadStations = async () => {
    try {
      const response = await getTrainState();
      if (response.success && response.data.stations) {
        setStations(response.data.stations);
      }
    } catch (err) {
      console.error("Error loading stations:", err);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const seatNum = parseInt(formData.seat_no);
    if (seatNum < 1 || seatNum > 72) {
      setError("Seat number must be between 1 and 72");
      return;
    }

    const fromStation = stations.find((s) => s.code === formData.from);
    const toStation = stations.find((s) => s.code === formData.to);
    if (!fromStation || !toStation || fromStation.idx >= toStation.idx) {
      setError("Destination station must come after boarding station");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const response = await addPassenger(formData);
      if (response.success) {
        setSuccess(true);
        setTimeout(() => {
          onClose();
        }, 1500);
      }
    } catch (err) {
      setError(err.message || "Failed to add passenger. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="add-passenger-page">
        <div className="success-animation">
          <div className="success-checkmark">
            <svg viewBox="0 0 52 52">
              <circle cx="26" cy="26" r="25" fill="none" />
              <path fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
            </svg>
          </div>
          <h2>Passenger Added Successfully!</h2>
          <p>Redirecting to home...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="add-passenger-page">
      <div className="page-container">
        <div className="page-header">
          <button onClick={onClose} className="back-btn">
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
          <div className="header-content">
            <div className="header-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="8.5" cy="7" r="4" />
                <line x1="20" y1="8" x2="20" y2="14" />
                <line x1="23" y1="11" x2="17" y2="11" />
              </svg>
            </div>
            <div>
              <h1>Add New Passenger</h1>
              <p>Fill in the passenger details for booking</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="passenger-form">
          {/* Personal Information Section */}
          <div className="form-section">
            <h3 className="section-title">
              <span className="section-icon">👤</span>
              Personal Information
            </h3>
            <div className="form-grid">
              <div className="form-group full-width">
                <label>PNR Number</label>
                <input
                  type="text"
                  name="pnr"
                  value={formData.pnr}
                  onChange={handleChange}
                  placeholder="Enter 10-digit PNR"
                  required
                  maxLength={10}
                  pattern="[0-9]{10}"
                />
                <span className="field-hint">10-digit PNR number</span>
              </div>

              <div className="form-group full-width">
                <label>Full Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter passenger name"
                  required
                />
              </div>

              <div className="form-group">
                <label>Age</label>
                <input
                  type="number"
                  name="age"
                  value={formData.age}
                  onChange={handleChange}
                  placeholder="Age"
                  min={1}
                  max={120}
                  required
                />
              </div>

              <div className="form-group">
                <label>Gender</label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  required
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
          </div>

          {/* Journey Details Section */}
          <div className="form-section">
            <h3 className="section-title">
              <span className="section-icon">🚂</span>
              Journey Details
            </h3>
            <div className="form-grid">
              <div className="form-group full-width">
                <label>Train Number</label>
                <input
                  type="text"
                  name="train_no"
                  value={formData.train_no}
                  onChange={handleChange}
                  placeholder="e.g., 17225"
                  required
                />
              </div>

              <div className="form-group full-width">
                <label>Train Name</label>
                <input
                  type="text"
                  name="train_name"
                  value={formData.train_name}
                  onChange={handleChange}
                  placeholder="e.g., Amaravathi Express"
                  required
                />
              </div>

              <div className="form-group full-width">
                <label>Journey Date</label>
                <input
                  type="date"
                  name="journey_date"
                  value={formData.journey_date}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>From Station</label>
                <select
                  name="from"
                  value={formData.from}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select boarding station</option>
                  {stations.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.code} - {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>To Station</label>
                <select
                  name="to"
                  value={formData.to}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select destination</option>
                  {stations.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.code} - {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Booking Details Section */}
          <div className="form-section">
            <h3 className="section-title">
              <span className="section-icon">🎫</span>
              Booking Details
            </h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Class</label>
                <select
                  name="class"
                  value={formData.class}
                  onChange={handleChange}
                  required
                >
                  <option value="Sleeper">Sleeper (SL)</option>
                  <option value="3-TierAC">AC 3-Tier (3A)</option>
                  <option value="2-TierAC">AC 2-Tier (2A)</option>
                  <option value="1-TierAC">AC 1-Tier (1A)</option>
                </select>
              </div>

              <div className="form-group">
                <label>PNR Status</label>
                <select
                  name="pnr_status"
                  value={formData.pnr_status}
                  onChange={handleChange}
                  required
                >
                  <option value="CNF">Confirmed (CNF)</option>
                  <option value="RAC">RAC</option>
                  <option value="WL">Waiting List (WL)</option>
                </select>
              </div>

              <div className="form-group">
                <label>RAC Status</label>
                <select
                  name="rac_status"
                  value={formData.rac_status}
                  onChange={handleChange}
                >
                  <option value="-">-</option>
                  <option value="RAC 1">RAC 1</option>
                  <option value="RAC 2">RAC 2</option>
                  <option value="RAC 3">RAC 3</option>
                  <option value="RAC 4">RAC 4</option>
                  <option value="RAC 5">RAC 5</option>
                </select>
                <span className="field-hint">Only for RAC passengers</span>
              </div>

              <div className="form-group">
                <label>Coach</label>
                <select
                  name="coach"
                  value={formData.coach}
                  onChange={handleChange}
                  required
                >
                  {["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "S9"].map(
                    (c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ),
                  )}
                </select>
              </div>

              <div className="form-group">
                <label>Seat Number</label>
                <input
                  type="number"
                  name="seat_no"
                  value={formData.seat_no}
                  onChange={handleChange}
                  placeholder="1-72"
                  min={1}
                  max={72}
                  required
                />
                <span className="field-hint">Between 1 and 72</span>
              </div>

              <div className="form-group">
                <label>Berth Type</label>
                <select
                  name="berth_type"
                  value={formData.berth_type}
                  onChange={handleChange}
                  required
                >
                  <option value="Lower Berth">Lower Berth</option>
                  <option value="Middle Berth">Middle Berth</option>
                  <option value="Upper Berth">Upper Berth</option>
                  <option value="Side Lower">Side Lower</option>
                  <option value="Side Upper">Side Upper</option>
                </select>
              </div>
            </div>
          </div>

          {error && (
            <div className="error-message">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </div>
          )}

          <div className="form-actions">
            <button
              type="button"
              onClick={onClose}
              className="cancel-btn"
              disabled={loading}
            >
              Cancel
            </button>
            <button type="submit" disabled={loading} className="submit-btn">
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Adding Passenger...
                </>
              ) : (
                <>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="8.5" cy="7" r="4" />
                    <line x1="20" y1="8" x2="20" y2="14" />
                    <line x1="23" y1="11" x2="17" y2="11" />
                  </svg>
                  Add Passenger
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddPassengerPage;
