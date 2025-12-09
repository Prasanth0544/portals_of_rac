// frontend/src/pages/ConfigPage.tsx
import React, { useState, useEffect, FormEvent, ChangeEvent } from "react";
import { setupConfig, initializeTrain, getTrains } from "../services/apiWithErrorHandling";
import "../styles/pages/ConfigPage.css";

interface FormState {
    mongoUri: string;
    stationsDb: string;
    stationsCollection: string;
    passengersDb: string;
    passengersCollection: string;
    trainNo: string;
    trainName: string;
    journeyDate: string;
}

interface TrainItem {
    trainNo: string | number;
    trainName?: string;
    stationCollectionName?: string;
    sleeperCount?: number;
    threeAcCount?: number;
}

interface ConfigPageProps {
    onClose: () => void;
    loadTrainState: () => Promise<void>;
}

function ConfigPage({ onClose, loadTrainState }: ConfigPageProps): React.ReactElement {
    const [form, setForm] = useState<FormState>({
        mongoUri: "mongodb://localhost:27017",
        stationsDb: "rac",
        stationsCollection: "",
        passengersDb: "PassengersDB",
        passengersCollection: "",
        trainNo: "",
        trainName: "",
        journeyDate: "",
    });
    const [submitting, setSubmitting] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [trainList, setTrainList] = useState<TrainItem[]>([]);

    useEffect(() => {
        (async () => {
            try {
                const res = await getTrains();
                if (res.success) setTrainList(res.data || []);
            } catch (error: any) {
                console.warn('Could not load train list:', error.message);
            }
        })();
    }, []);

    const update = (key: keyof FormState, value: string): void => setForm((prev) => ({ ...prev, [key]: value }));

    const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);

        try {
            let stationsCollection = form.stationsCollection;
            if (!stationsCollection && form.trainNo) {
                const item = trainList.find((t) => String(t.trainNo) === form.trainNo);
                if (item && item.stationCollectionName) {
                    stationsCollection = item.stationCollectionName;
                    update("stationsCollection", stationsCollection);
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
                stationsCollection: stationsCollection,
                passengersDb: form.passengersDb,
                passengersCollection: form.passengersCollection,
                trainNo: form.trainNo,
                journeyDate: form.journeyDate,
            };

            const res = await setupConfig(payload);
            if (!res.success)
                throw new Error((res as any).message || "Failed to apply configuration");

            const init = await initializeTrain(form.trainNo, form.journeyDate);
            if (!init.success)
                throw new Error((init as any).message || "Initialization failed");

            await new Promise(resolve => setTimeout(resolve, 500));

            await loadTrainState();

            await new Promise(resolve => setTimeout(resolve, 300));
            onClose();
        } catch (err: any) {
            const msg =
                typeof err === "string"
                    ? err
                    : err?.message || err?.error || "Configuration failed";
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
                            onChange={(e: ChangeEvent<HTMLInputElement>) => update("mongoUri", e.target.value)}
                            required
                        />
                    </label>
                </div>

                <div className="form-section">
                    <h3>Passengers (Database: {form.passengersDb})</h3>
                    <label>
                        Collection Name
                        <input
                            type="text"
                            value={form.passengersCollection}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => update("passengersCollection", e.target.value)}
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
                                onChange={(e: ChangeEvent<HTMLSelectElement>) => {
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
                            >
                                <option value="">-- Select --</option>
                                {trainList.map((t) => (
                                    <option key={String(t.trainNo)} value={String(t.trainNo)}>
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
                            onChange={(e: ChangeEvent<HTMLInputElement>) => {
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
                            onChange={(e: ChangeEvent<HTMLInputElement>) => update("journeyDate", e.target.value)}
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

