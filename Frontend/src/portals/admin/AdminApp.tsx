// Frontend/src/portals/admin/AdminApp.tsx
// Admin portal — stripped of login logic and BrowserRouter (both handled by root App)
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import TrainDashboard from './pages/TrainDashboard';

// CSS imports (previously loaded in admin-portal/src/main.tsx)
import './index.css';
import './App.css';
import './UserMenu.css';
import './styles/responsive-global.css';
import './styles/viewport-scale.css';

interface AdminAppProps {
    onLogout: () => void;
}

function AdminApp({ onLogout }: AdminAppProps): React.ReactElement {
    return (
        <Routes>
            {/* Landing Page - Train Selection */}
            <Route path="/" element={<LandingPage onLogout={onLogout} />} />

            {/* Train Dashboard - Auto-configured from URL param */}
            <Route path="/train/:trainNo" element={<TrainDashboard />} />

            {/* Manual Config Page */}
            <Route path="/config" element={<TrainDashboard initialPage="config" />} />

            {/* Redirect unknown routes to admin landing */}
            <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
    );
}

export default AdminApp;
