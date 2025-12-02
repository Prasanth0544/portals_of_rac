// passenger-portal/src/components/NotificationBell.jsx
import React, { useState, useEffect } from 'react';
import './NotificationBell.css';

const NotificationBell = ({ irctcId }) => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showDropdown, setShowDropdown] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (irctcId) {
            fetchNotifications();
            fetchUnreadCount();

            // Poll for new notifications every 30 seconds
            const interval = setInterval(() => {
                fetchUnreadCount();
            }, 30000);

            return () => clearInterval(interval);
        }
    }, [irctcId]);

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const response = await fetch(
                `${process.env.REACT_APP_API_URL}/api/passenger/notifications?irctcId=${irctcId}`
            );
            const data = await response.json();

            if (data.success) {
                setNotifications(data.data.notifications || []);
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchUnreadCount = async () => {
        try {
            const response = await fetch(
                `${process.env.REACT_APP_API_URL}/api/passenger/notifications/unread-count?irctcId=${irctcId}`
            );
            const data = await response.json();

            if (data.success) {
                setUnreadCount(data.data.count);
            }
        } catch (error) {
            console.error('Error fetching unread count:', error);
        }
    };

    const markAsRead = async (notificationId) => {
        try {
            const response = await fetch(
                `${process.env.REACT_APP_API_URL}/api/passenger/notifications/${notificationId}/read`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ irctcId })
                }
            );

            if (response.ok) {
                // Update local state
                setNotifications(prev =>
                    prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
                );
                setUnreadCount(prev => Math.max(0, prev - 1));
            }
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    };

    const handleNotificationClick = (notification) => {
        if (!notification.read) {
            markAsRead(notification.id);
        }

        // Navigate based on notification type
        if (notification.type === 'UPGRADE_OFFER') {
            window.location.href = '/#/upgrades';
        }
    };

    const toggleDropdown = () => {
        setShowDropdown(!showDropdown);
        if (!showDropdown) {
            fetchNotifications();
        }
    };

    const getNotificationIcon = (type) => {
        switch (type) {
            case 'NO_SHOW_MARKED':
                return '⚠️';
            case 'UPGRADE_OFFER':
                return '🎉';
            case 'NO_SHOW_REVERTED':
                return '✅';
            default:
                return '🔔';
        }
    };

    const getNotificationClass = (type) => {
        switch (type) {
            case 'NO_SHOW_MARKED':
                return 'notification-warning';
            case 'UPGRADE_OFFER':
                return 'notification-success';
            case 'NO_SHOW_REVERTED':
                return 'notification-info';
            default:
                return '';
        }
    };

    const formatTime = (timestamp) => {
        const now = new Date();
        const notifTime = new Date(timestamp);
        const diffMs = now - notifTime;
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;

        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h ago`;

        const diffDays = Math.floor(diffHours / 24);
        return `${diffDays}d ago`;
    };

    const recentNotifications = notifications.slice(0, 5);

    return (
        <div className="notification-bell-container">
            <button
                className="notification-bell-button"
                onClick={toggleDropdown}
                aria-label="Notifications"
            >
                🔔
                {unreadCount > 0 && (
                    <span className="notification-badge">{unreadCount}</span>
                )}
            </button>

            {showDropdown && (
                <>
                    <div
                        className="notification-overlay"
                        onClick={() => setShowDropdown(false)}
                    />
                    <div className="notification-dropdown">
                        <div className="notification-header">
                            <h3>Notifications</h3>
                            {unreadCount > 0 && (
                                <span className="unread-indicator">
                                    {unreadCount} unread
                                </span>
                            )}
                        </div>

                        <div className="notification-list">
                            {loading ? (
                                <div className="notification-loading">Loading...</div>
                            ) : recentNotifications.length === 0 ? (
                                <div className="notification-empty">
                                    <p>No notifications yet</p>
                                </div>
                            ) : (
                                recentNotifications.map(notification => (
                                    <div
                                        key={notification.id}
                                        className={`notification-item ${getNotificationClass(notification.type)} ${notification.read ? 'read' : 'unread'
                                            }`}
                                        onClick={() => handleNotificationClick(notification)}
                                    >
                                        <div className="notification-icon">
                                            {getNotificationIcon(notification.type)}
                                        </div>
                                        <div className="notification-content">
                                            <p className="notification-message">
                                                {notification.data.message}
                                            </p>
                                            {notification.data.berth && (
                                                <p className="notification-detail">
                                                    Berth: {notification.data.berth}
                                                </p>
                                            )}
                                            <span className="notification-time">
                                                {formatTime(notification.createdAt)}
                                            </span>
                                        </div>
                                        {!notification.read && (
                                            <div className="unread-dot" />
                                        )}
                                    </div>
                                ))
                            )}
                        </div>

                        {notifications.length > 5 && (
                            <div className="notification-footer">
                                <a href="/#/notifications">View all notifications</a>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default NotificationBell;
