# 🎫 RAC Passenger Portal

The **Passenger Portal** for the RAC Reallocation System. Built with **Vite + React 19** and **Material-UI**.

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Opens at: **http://localhost:5173**

---

## 📋 Features

| Feature | Description |
|---------|-------------|
| **IRCTC Login** | Secure authentication with JWT |
| **PNR Check** | View journey details and status |
| **Dashboard** | Current booking, journey progress, notifications |
| **Upgrade Offers** | Real-time offers with countdown timers |
| **Accept/Deny** | Respond to upgrade offers instantly |
| **QR Code Pass** | Boarding pass with dynamic QR code |
| **Push Notifications** | Browser notifications for offers (even when closed) |
| **Ticket Actions** | Cancel ticket, change boarding station |
| **History** | Past offers and journey history |

---

## 🛠️ Tech Stack

- **Vite** - Build tool and dev server
- **React 19** - UI framework
- **Material-UI** - Component library
- **Axios** - HTTP client
- **qrcode.react** - QR code generation
- **Web Push API** - Browser notifications

---

## 📁 Project Structure

```
passenger-portal/
├── src/
│   ├── components/     # Reusable UI components
│   ├── pages/          # Page components (10 pages)
│   ├── hooks/          # Custom React hooks
│   ├── services/       # API services
│   ├── utils/          # Utility functions
│   ├── config/         # App configuration
│   ├── App.jsx         # Main router
│   └── main.jsx        # Entry point
├── public/
│   └── sw.js           # Service worker for push notifications
├── vite.config.js      # Vite configuration
└── package.json
```

---

## 📖 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server (port 5173) |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

---

## 🔧 Configuration

Create `.env` file (optional - has defaults):

```env
VITE_API_URL=http://localhost:5000/api
VITE_WS_URL=ws://localhost:5000
```

---

## 🔔 Push Notifications

The portal supports browser push notifications:

1. User grants notification permission
2. Browser creates push subscription
3. Subscription stored in MongoDB
4. Backend sends push via VAPID keys
5. Notification appears even when browser is closed

Requires HTTPS in production (localhost exempt).

---

## 🔗 Related

- [Root Documentation](../README.md)
- [QUICKSTART.md](../QUICKSTART.md)
- [Backend](../backend/)
