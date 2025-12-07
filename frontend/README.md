# 🔐 RAC Admin Portal

The **Admin Portal** for the RAC Reallocation System. Built with **Vite + React 19** and **Material-UI**.

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Opens at: **http://localhost:3000**

---

## 📋 Features

| Feature | Description |
|---------|-------------|
| **Train Initialization** | Load train data from MongoDB |
| **Journey Control** | Start journey, advance stations, reset |
| **Dashboard** | Real-time statistics (passengers, RAC queue, vacant berths) |
| **Coach Visualization** | Interactive 9-coach × 72-berth layout |
| **Passenger Management** | Search, filter, view all passengers |
| **No-Show Handling** | Mark passengers as no-show |
| **RAC Queue** | View prioritized waiting list |
| **Reallocation** | Eligibility matrix and manual allocation |
| **Segment Visualization** | Occupancy matrix by journey segment |
| **Station-Wise Phases** | Dynamic reallocation phase controls |

---

## 🛠️ Tech Stack

- **Vite** - Build tool and dev server
- **React 19** - UI framework
- **Material-UI** - Component library
- **Axios** - HTTP client
- **WebSocket** - Real-time updates
- **React Router** - Navigation

---

## 📁 Project Structure

```
frontend/
├── src/
│   ├── components/     # Reusable UI components
│   ├── pages/          # Page components (23 pages)
│   ├── services/       # API and WebSocket services
│   ├── App.jsx         # Main router
│   └── main.jsx        # Entry point
├── public/             # Static assets
├── vite.config.js      # Vite configuration
└── package.json
```

---

## 📖 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server (port 3000) |
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

## 🔗 Related

- [Root Documentation](../README.md)
- [QUICKSTART.md](../QUICKSTART.md)
- [Backend](../backend/)
