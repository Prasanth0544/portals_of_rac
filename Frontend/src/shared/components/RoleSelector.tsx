// Frontend/src/shared/components/RoleSelector.tsx
// Landing page with 3 role cards — user picks their portal
import React from 'react';
import { useNavigate } from 'react-router-dom';
import './RoleSelector.css';

function RoleSelector(): React.ReactElement {
    const navigate = useNavigate();

    const roles = [
        {
            id: 'admin',
            emoji: '🛡️',
            title: 'Admin Portal',
            description: 'System management, train configuration, and real-time monitoring',
            color: '#667eea',
        },
        {
            id: 'tte',
            emoji: '📋',
            title: 'TTE Portal',
            description: 'Ticket examination, boarding verification, and passenger management',
            color: '#f093fb',
        },
        {
            id: 'passenger',
            emoji: '🎫',
            title: 'Passenger Portal',
            description: 'Check your RAC status, bookings, and upgrade offers',
            color: '#4facfe',
        },
    ];

    return (
        <div className="role-selector-container">
            <div className="role-selector-header">
                <h1>🚂 Dynamic RAC Reallocation System</h1>
                <p>Select your portal to continue</p>
            </div>
            <div className="role-cards">
                {roles.map((role) => (
                    <div
                        key={role.id}
                        className="role-card"
                        style={{ '--card-accent': role.color } as React.CSSProperties}
                        onClick={() => navigate(`/login?role=${role.id}`)}
                    >
                        <div className="role-card-emoji">{role.emoji}</div>
                        <h2>{role.title}</h2>
                        <p>{role.description}</p>
                        <div className="role-card-arrow">→</div>
                    </div>
                ))}
            </div>
            <div className="role-selector-footer">
                <p>© 2025 Indian Railways — Dynamic RAC Reallocation System</p>
            </div>
        </div>
    );
}

export default RoleSelector;
