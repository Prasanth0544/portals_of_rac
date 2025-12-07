# 👮 RAC TTE Portal

The **TTE (Travelling Ticket Examiner) Portal** for the RAC Reallocation System. Built with **Vite + React 19** and **Material-UI**.

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Opens at: **http://localhost:5174**

---

## 📋 Features

| Feature | Description |
|---------|-------------|
| **Secure Login** | Employee ID + password authentication |
| **Dashboard** | Train stats, journey status, alerts |
| **Passenger List** | View all passengers with filters and search |
| **Passenger Verification** | Verify boarding status via PNR scan |
| **No-Show Management** | Mark passengers as no-show with reason selection |
| **RAC Queue** | View RAC passengers by priority |
| **Vacant Berths** | Real-time vacant berth list |
| **Pending Reallocations** | Approve/reject RAC upgrade requests |
| **Journey Control** | Advance to next station, view progress |
| **Push Notifications** | Receive alerts for new RAC upgrade requests |

---

## 🛠️ Tech Stack

- **Vite** - Build tool and dev server
- **React 19** - UI framework
- **Material-UI** - Component library
- **Recharts** - Data visualization
- **Axios** - HTTP client
- **Web Push API** - Browser notifications

---

## 📁 Project Structure

```
tte-portal/
├── src/
│   ├── components/     # Reusable UI components
│   ├── pages/          # Page components (17 pages)
│   ├── hooks/          # Custom React hooks
│   ├── services/       # API and push services
│   ├── utils/          # Utility functions
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
| `npm run dev` | Start development server (port 5174) |
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

## 🔔 Workflow

### No-Show → Reallocation Flow

1. **TTE marks passenger as no-show** → Berth becomes vacant
2. **System identifies eligible RAC passengers** (boarded + journey overlap)
3. **Pending Reallocations page shows eligible candidates**
4. **TTE approves reallocation** → Passenger notified
5. **Passenger accepts** → Status upgraded to CNF

---

## 🔗 Related

- [Root Documentation](../README.md)
- [QUICKSTART.md](../QUICKSTART.md)
- [Backend](../backend/)
