import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './styles/responsive-global.css';
import App from './App';

// Create root for React 19
const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find root element');

const root = ReactDOM.createRoot(rootElement);

// Render App
root.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
