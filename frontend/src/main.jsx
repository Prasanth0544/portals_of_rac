import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App'

// Create root for React 19
const root = ReactDOM.createRoot(document.getElementById('root'))

// Render App
root.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
)
