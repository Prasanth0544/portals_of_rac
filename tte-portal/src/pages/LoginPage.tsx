// tte-portal/src/pages/LoginPage.tsx
import React, { useState, FormEvent, ChangeEvent } from 'react';
import { tteAPI } from '../api';
import '../styles/pages/LoginPage.css';

function LoginPage(): React.ReactElement {
    const [employeeId, setEmployeeId] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);

    const handleLogin = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await tteAPI.login(employeeId, password);

            if (response.success && response.token && response.user) {
                // Map API response to localStorage format
                const apiUser = response.user;
                const userForStorage = {
                    username: apiUser.name || apiUser.employeeId || '',
                    role: apiUser.role || 'TTE',
                    userId: apiUser.employeeId || ''
                };

                localStorage.setItem('token', response.token);
                localStorage.setItem('user', JSON.stringify(userForStorage));
                window.location.reload();
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-box">
                <div className="login-header">
                    <h1>🚂 TTE Portal</h1>
                    <p>Dynamic RAC Reallocation System</p>
                </div>

                <form onSubmit={handleLogin} className="login-form">
                    <div className="form-group">
                        <label htmlFor="employeeId">Employee ID</label>
                        <input
                            type="text"
                            id="employeeId"
                            value={employeeId}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => setEmployeeId(e.target.value)}
                            placeholder="Enter your employee ID"
                            required
                            disabled={loading}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                            placeholder="Enter your password"
                            required
                            disabled={loading}
                        />
                    </div>

                    {error && <div className="error-message">{error}</div>}

                    <button type="submit" className="login-btn" disabled={loading}>
                        {loading ? 'Logging in...' : 'Login'}
                    </button>
                </form>

                <div className="login-footer">
                    <p>TTE Portal</p>
                    <small>Test Credentials: TTE_01 / Prasanth@123</small>
                </div>
            </div>
        </div>
    );
}

export default LoginPage;
