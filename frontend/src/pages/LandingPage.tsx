// frontend/src/pages/LandingPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    listTrains,
    registerTrain,
    registerTTE
} from '../services/apiWithErrorHandling';
import '../styles/pages/LandingPage.css';
import '../UserMenu.css';
import { successToast, errorToast } from '../services/toastNotification';

interface Train {
    trainNo: string;
    trainName: string;
    status: string;
    stationsCollection?: string;
    passengersCollection?: string;
    currentStation?: number;
    totalStations?: number;
    createdAt?: Date;
    totalCoaches?: number;
    sleeperCoachesCount?: number;
    threeTierACCoachesCount?: number;
}

const LandingPage: React.FC = () => {
    const navigate = useNavigate();
    const [trains, setTrains] = useState<Train[]>([]);
    const [loading, setLoading] = useState(true);

    // Add Train Modal State
    const [showAddTrainModal, setShowAddTrainModal] = useState(false);
    const [newTrainNo, setNewTrainNo] = useState('');
    const [newTrainName, setNewTrainName] = useState('');

    const [totalCoaches, setTotalCoaches] = useState('');
    const [sleeperCoachesCount, setSleeperCoachesCount] = useState('');
    const [threeTierACCoachesCount, setThreeTierACCoachesCount] = useState('');
    const [addingTrain, setAddingTrain] = useState(false);

    // Sign Up TTE Modal State
    const [showSignUpTTEModal, setShowSignUpTTEModal] = useState(false);
    const [selectedTrain, setSelectedTrain] = useState('');
    const [tteName, setTteName] = useState('');
    const [ttePassword, setTtePassword] = useState('');
    const [createdTTE, setCreatedTTE] = useState<any>(null);
    const [signingUpTTE, setSigningUpTTE] = useState(false);

    // Load trains on mount
    useEffect(() => {
        loadTrains();
    }, []);

    const loadTrains = async () => {
        setLoading(true);
        const result = await listTrains();
        if (result.success && result.data) {
            setTrains(result.data);
        } else {
            console.error('Failed to load trains:', result.error);
        }
        setLoading(false);
    };

    const handleAddTrain = async (e: React.FormEvent) => {
        e.preventDefault();
        setAddingTrain(true);

        const result = await registerTrain(
            newTrainNo.trim(),
            newTrainName.trim(),
            totalCoaches ? Number(totalCoaches) : undefined,
            sleeperCoachesCount ? Number(sleeperCoachesCount) : undefined,
            threeTierACCoachesCount ? Number(threeTierACCoachesCount) : undefined
        );
        if (result.success) {
            successToast('Train Registered', `Train ${newTrainNo} added successfully!`);
            setNewTrainNo('');
            setNewTrainName('');

            setTotalCoaches('');
            setSleeperCoachesCount('');
            setThreeTierACCoachesCount('');
            setShowAddTrainModal(false);
            loadTrains();
        } else {
            errorToast('Registration Failed', result.error || 'Failed to register train');
        }
        setAddingTrain(false);
    };

    const handleSignUpTTE = async (e: React.FormEvent) => {
        e.preventDefault();
        setSigningUpTTE(true);

        const result = await registerTTE(selectedTrain, tteName.trim(), ttePassword);
        if (result.success && result.data?.user) {
            setCreatedTTE(result.data.user);
            successToast('TTE Created', `TTE ID: ${result.data.user.employeeId}`);
        } else {
            errorToast('TTE Creation Failed', result.error || 'Failed to create TTE');
            setSigningUpTTE(false);
        }
    };

    const handleCloseTTEModal = () => {
        setShowSignUpTTEModal(false);
        setCreatedTTE(null);
        setSelectedTrain('');
        setTteName('');
        setTtePassword('');
        setSigningUpTTE(false);
    };

    const handleOpenTrain = (trainNo: string) => {
        // Navigate to train dashboard — ConfigPage will handle setup
        navigate(`/train/${trainNo}`);
    };

    const getStatusBadge = (status: string) => {
        const statusMap: Record<string, { label: string; icon: string; color: string }> = {
            'RUNNING': { label: 'Running', icon: '🟢', color: 'status-running' },
            'READY': { label: 'Ready', icon: '🟡', color: 'status-ready' },
            'REGISTERED': { label: 'Not Init', icon: '⚪', color: 'status-not-init' },
            'COMPLETE': { label: 'Complete', icon: '✅', color: 'status-complete' }
        };
        const statusInfo = statusMap[status?.toUpperCase()] || statusMap['REGISTERED'];
        return (
            <span className={`status-badge ${statusInfo.color}`}>
                {statusInfo.icon} {statusInfo.label}
            </span>
        );
    };

    const [menuOpen, setMenuOpen] = useState(false);

    // Get user info from localStorage
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.reload();
    };

    return (
        <div className="landing-page">
            <div className="landing-container">
                <div className="landing-header">
                    <h1>🚂 RAC Reallocation System — Admin Control Center</h1>
                    <div className="user-menu">
                        <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)}>
                            ⋮
                        </button>
                        {menuOpen && (
                            <div className="menu-dropdown">
                                <div className="menu-user-info">
                                    <p><strong>{user?.username || 'Admin'}</strong></p>
                                    <p className="user-role">{user?.role || 'ADMIN'}</p>
                                </div>
                                <hr />
                                <button onClick={handleLogout} className="menu-item logout">
                                    🚪 Logout
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Actions Section */}
                <div className="actions-section">
                    <h2 className="section-title">ACTIONS</h2>
                    <div className="action-buttons">
                        <button className="action-btn add-train-btn" onClick={() => setShowAddTrainModal(true)}>
                            <span className="btn-icon">🚂</span> Add Train
                        </button>
                        <button className="action-btn signup-tte-btn" onClick={() => setShowSignUpTTEModal(true)}>
                            <span className="btn-icon">👤</span> Sign Up TTE
                        </button>
                        <button className="action-btn stats-btn" onClick={() => navigate('/config')}>
                            <span className="btn-icon">⚙️</span> Manual Config
                        </button>
                    </div>
                </div>

                {/* Trains Grid */}
                <div className="trains-section">
                    <h2 className="section-title">TRAINS LIST</h2>
                    {loading ? (
                        <div className="loading-spinner">Loading trains...</div>
                    ) : trains.length === 0 ? (
                        <div className="empty-state">
                            <p>No trains registered yet. Click "Add Train" to get started!</p>
                        </div>
                    ) : (
                        <div className="trains-grid">
                            {trains.map((train) => (
                                <div key={train.trainNo} className="train-card">
                                    <div className="train-icon">🚂</div>
                                    <div className="train-number">{train.trainNo}</div>
                                    <div className="train-name">{train.trainName}</div>
                                    {getStatusBadge(train.status)}
                                    <div className="train-info">
                                        Stn: {train.currentStation || '—'}/{train.totalStations || '—'}
                                    </div>
                                    {train.totalCoaches && (
                                        <div className="train-info">
                                            🚃 Coaches: {train.totalCoaches}
                                            {train.sleeperCoachesCount ? ` (SL: ${train.sleeperCoachesCount}` : ''}
                                            {train.threeTierACCoachesCount ? `, 3AC: ${train.threeTierACCoachesCount})` : train.sleeperCoachesCount ? ')' : ''}
                                        </div>
                                    )}
                                    <button
                                        className="open-train-btn"
                                        onClick={() => handleOpenTrain(train.trainNo)}
                                    >
                                        Open ↗
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Add Train Modal */}
            {showAddTrainModal && (
                <div className="modal-overlay" onClick={() => setShowAddTrainModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h2>Add New Train</h2>
                        <form onSubmit={handleAddTrain}>
                            <div className="form-group">
                                <label>Train Number</label>
                                <input
                                    type="text"
                                    value={newTrainNo}
                                    onChange={(e) => setNewTrainNo(e.target.value)}
                                    placeholder="e.g., 17225"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Train Name</label>
                                <input
                                    type="text"
                                    value={newTrainName}
                                    onChange={(e) => setNewTrainName(e.target.value)}
                                    placeholder="e.g., Amaravathi Express"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Total Coaches</label>
                                <input
                                    type="number"
                                    value={totalCoaches}
                                    onChange={(e) => setTotalCoaches(e.target.value)}
                                    placeholder="e.g., 16"
                                    min="1"
                                />
                            </div>
                            <div className="form-group">
                                <label>Sleeper Coaches</label>
                                <input
                                    type="number"
                                    value={sleeperCoachesCount}
                                    onChange={(e) => setSleeperCoachesCount(e.target.value)}
                                    placeholder="e.g., 9"
                                    min="0"
                                />
                            </div>
                            <div className="form-group">
                                <label>3-Tier AC Coaches</label>
                                <input
                                    type="number"
                                    value={threeTierACCoachesCount}
                                    onChange={(e) => setThreeTierACCoachesCount(e.target.value)}
                                    placeholder="e.g., 2"
                                    min="0"
                                />
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn-cancel" onClick={() => setShowAddTrainModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn-submit" disabled={addingTrain}>
                                    {addingTrain ? 'Adding...' : 'Add Train'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Sign Up TTE Modal */}
            {showSignUpTTEModal && (
                <div className="modal-overlay" onClick={handleCloseTTEModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h2>Sign Up TTE</h2>
                        {createdTTE ? (
                            <div className="tte-success">
                                <div className="success-icon">✅</div>
                                <h3>TTE Created Successfully!</h3>
                                <div className="tte-details">
                                    <p><strong>TTE ID:</strong> {createdTTE.employeeId}</p>
                                    <p><strong>Name:</strong> {createdTTE.name}</p>
                                    <p><strong>Train:</strong> {createdTTE.trainAssigned}</p>
                                    <p><strong>Password:</strong> {createdTTE.defaultPassword}</p>
                                </div>
                                <p className="note">⚠️ Please share these credentials with the TTE</p>
                                <button className="btn-submit" onClick={handleCloseTTEModal}>
                                    Done
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleSignUpTTE}>
                                <div className="form-group">
                                    <label>Select Train</label>
                                    <select
                                        value={selectedTrain}
                                        onChange={(e) => setSelectedTrain(e.target.value)}
                                        required
                                    >
                                        <option value="">-- Choose Train --</option>
                                        {trains.map((train) => (
                                            <option key={train.trainNo} value={train.trainNo}>
                                                {train.trainNo} - {train.trainName}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>TTE Name</label>
                                    <input
                                        type="text"
                                        value={tteName}
                                        onChange={(e) => setTteName(e.target.value)}
                                        placeholder="e.g., Ravi Kumar"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Password</label>
                                    <input
                                        type="password"
                                        value={ttePassword}
                                        onChange={(e) => setTtePassword(e.target.value)}
                                        placeholder="Enter password for TTE"
                                        required
                                        minLength={6}
                                    />
                                </div>
                                <p className="info-note">
                                    📝 TTE ID will be auto-generated
                                </p>
                                <div className="modal-actions">
                                    <button type="button" className="btn-cancel" onClick={handleCloseTTEModal}>
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn-submit" disabled={signingUpTTE}>
                                        {signingUpTTE ? 'Creating...' : 'Sign Up TTE'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default LandingPage;
