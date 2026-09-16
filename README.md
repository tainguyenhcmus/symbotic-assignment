# Robot Fleet Management Dashboard

A real-time robot fleet monitoring system built with **uWebSockets.js**, **Next.js 14**, and **MongoDB**.

## Demo

[Watch the presentation video on YouTube](https://www.youtube.com/watch?v=kBH7WzlDT8U)

---

## Prerequisites

- Node.js 18+
- Docker (for MongoDB)

---

## Getting Started

### 1. Start MongoDB

```bash
docker run -d --name mongo-robot-fleet -p 27017:27017 mongo:7
```

### 2. Start the Backend

```bash
cd backend
npm install
npm start
```

The backend listens on **port 8080**.

### 3. Start the Robot Simulator

In a new terminal:

```bash
cd backend
npm run simulator
```

This connects 5 simulated robots that send telemetry every second.

### 4. Start the Frontend

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:3000** in your browser.

---

## Project Structure

```
├── backend/
│   ├── app.js                  # Main server (uWebSockets.js)
│   ├── models/
│   │   ├── RobotTelemetry.js   # Telemetry schema
│   │   └── Log.js              # Log schema
│   ├── database/index.js       # MongoDB connection
│   └── simulator/
│       └── robot-simulator.js  # Simulates 5 robots
│
└── frontend/
    └── src/
        ├── app/
        │   ├── page.tsx                    # Dashboard page
        │   └── robots/[robotId]/page.tsx   # Robot detail page
        ├── hooks/
        │   ├── useWebSocket.ts             # WebSocket connection
        │   └── useRobotFleet.ts            # Fleet state + alerts
        ├── components/
        │   └── LogProvider.tsx             # Log flush (Q4)
        └── services/
            └── robotApi.ts                 # REST API calls
```

---

## API Reference

### WebSocket Endpoints

| Endpoint | Used by | Description |
|---|---|---|
| `ws://localhost:8080/robots?robotId=<id>` | Robot simulator | Send telemetry data |
| `ws://localhost:8080/dashboard` | Frontend | Receive real-time updates |

**Messages from `/dashboard`:**

```json
{ "type": "initial_robots", "robots": { "00001": { ... } } }
{ "type": "robot_update", "robotId": "00001", "data": { ... } }
{ "type": "robot_connected", "robotId": "00001" }
{ "type": "robot_disconnected", "robotId": "00001", "data": { ... } }
```

**Telemetry payload (robot → backend):**

```json
{
  "batteryPercentage": 82.5,
  "wifiSignalStrength": -62,
  "isCharging": false,
  "temperature": 44.3,
  "memoryUsage": 41,
  "timestamp": "2026-09-17T01:21:00.000Z"
}
```

### REST Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/robots` | Current state of all robots (from in-memory Map) |
| `GET` | `/api/robots/:robotId/history?hours=6` | Historical telemetry (max 24h) |
| `POST` | `/api/logs` | Persist frontend log batch (max 64 KB) |

**POST /api/logs payload:**

```json
{
  "connectionId": "abc-123",
  "startedAt": 1726000000000,
  "entries": ["log entry 1", "log entry 2"]
}
```

---

## Database Schema

### `robottelemetries`

Stores one document per telemetry message received from a robot.

| Field | Type | Description |
|---|---|---|
| `robotId` | String | Robot identifier (e.g. `"00001"`) |
| `batteryPercentage` | Number | 0–100 % |
| `wifiSignalStrength` | Number | -100 to 0 dBm |
| `isCharging` | Boolean | Whether the robot is charging |
| `temperature` | Number | °C |
| `memoryUsage` | Number | 0–100 % |
| `timestamp` | Date | When the reading was taken |

**Indexes:**
- `{ robotId: 1, timestamp: 1 }` — used by the history query
- `{ timestamp: -1 }` — used for sorting by recency

### `logs`

Stores log batches flushed from the frontend every 30 minutes.

| Field | Type | Description |
|---|---|---|
| `connectionId` | String | LogController session ID |
| `startedAt` | Number | Session start time (Unix ms) |
| `entries` | String[] | Log entries (max 64 KB total) |
| `receivedAt` | Date | Server receive time |

---

## Architecture Overview

```
Robot Simulators (x5)
    │  WS /robots?robotId=...
    ▼
Backend (uWebSockets.js — port 8080)
    ├── validateRobotData()
    ├── RobotTelemetry.create()    → MongoDB
    ├── robotStates.set()          → in-memory Map
    └── ws.publish('dashboard')    → pub/sub broadcast
                │
                ▼
Frontend (Next.js — port 3000)
    ├── WS /dashboard → useRobotFleet hook → React state
    ├── GET /api/robots/:id/history → Recharts (6h window)
    └── POST /api/logs every 30 min (LogController flush)
```

**Key design decisions:**

- **In-memory Map** holds current robot states so new dashboard clients receive an immediate snapshot without a database query.
- **Aborted-flag pattern** on every async HTTP handler prevents server crashes when clients disconnect mid-request.
- **`useRef` for alert state** avoids unnecessary React re-renders (alert logic runs every second per robot).
- **`isAnimationActive={false}`** on Recharts lines prevents flickering during one-second live updates.

---

## Environment Variables

Create a `.env` file in `backend/` if needed:

```
MONGODB_URI=mongodb://localhost:27017/robot-fleet
PORT=8080
```

Defaults work out of the box with the Docker command above.
