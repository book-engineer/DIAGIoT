# DiagIoT — HANDOFF

Quick-start guide for anyone picking up this codebase.

---

## Prerequisites

- Node.js 18+ (native fetch required)
- npm 9+

---

## Install & Run

```bash
# Install dependencies
npm install

# Start the server (port 3000)
npm start

# Development mode (auto-restart on file changes)
npm run dev
```

Server output on successful start:
```
  DiagIoT Backend v1.0.0
  HTTP   : http://localhost:3000
  WS     : ws://localhost:3000
  Web UI : http://localhost:3000
  API    : http://localhost:3000/api
  Health : http://localhost:3000/api/health
```

Open `http://localhost:3000` in a browser. Click **Enter Workspace** on the landing page.

---

## CLI

```bash
# Run a CLI command directly
npm run cli -- fleet status
npm run cli -- alerts list
npm run cli -- scan run --target fw-v3.8.2-rc5

# Interactive REPL
npm run repl
```

---

## Environment Variables

All variables are optional. The server runs with sensible defaults if none are set.

Copy `.env.example` to `.env` and fill in what you need:

```bash
cp .env.example .env
```

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `3000` | HTTP/WS server port |
| `HOST` | `localhost` | Bind address |
| `SUPABASE_URL` | — | Supabase project URL (enables auth UI) |
| `SUPABASE_ANON_KEY` | — | Supabase public anon key |
| `SUPABASE_JWT_SECRET` | — | Enables JWT verification on API + WS |
| `GITHUB_WEBHOOK_SECRET` | — | HMAC secret for GitHub webhook verification |
| `GITHUB_TOKEN` | — | GitHub PAT for artifact fetching |
| `ARDUINO_PORT` | auto-detect | Serial port for Arduino (e.g. `COM3`, `/dev/ttyUSB0`) |
| `JENKINS_URL` | — | Jenkins base URL (enables job polling) |
| `JENKINS_USER` | — | Jenkins username |
| `JENKINS_TOKEN` | — | Jenkins API token |
| `DOCKER_HOST` | `unix:///var/run/docker.sock` | Docker daemon socket or TCP address |
| `DRIFT_THRESHOLD_WARN` | `0.40` | Drift score at which WARNING alerts are raised |
| `DRIFT_THRESHOLD_BLOCK` | `0.70` | Drift score at which CRITICAL alerts are raised |

**Auth is disabled by default.** The app works fully without any env vars set.

---

## Seed Data

The server auto-populates realistic fixture data on first run (via `src/server/seed.js`). No manual steps needed.

**8 devices** across 6 fleets:

| Device | Fleet | Drift Score | Health |
|---|---|---|---|
| SensorHub-X4 #3192 | Pacific NW Grid | 0.87 | Critical |
| EdgeGateway-E1 #7700 | Data Center East | 0.91 | Critical |
| ThermoNode-R2 #0841 | EU Logistics Hub | 0.52 | Warning |
| ActuatorBridge-M7 #5501 | Factory Line A | 0.44 | Warning |
| SensorHub-X4 #1023 | Pacific NW Grid | 0.21 | Healthy |
| DriveSync-CAN #4421 | Automotive Test Track | 0.35 | Healthy |
| PowerGrid-PM9 #1209 | Midwest Substation | 0.12 | Healthy |
| AeroSens-IMU #9012 | Flight Systems Lab | 0.18 | Healthy |

**4 alerts** (2 critical, 2 warning) — all unacknowledged on first run.

**2 scans** — `fw-v3.8.2-rc4` (BLOCK, score 0.76) and `fw-v3.8.1-stable` (PASS, score 0.14).

**3 KB articles** — ADC/DMA drift, FreeRTOS heap fragmentation, CAN timing.

---

## Project Structure

```
diagiot/
├── src/
│   ├── server/
│   │   ├── index.js          — Express + WebSocket server, JWT guard, integration startup
│   │   ├── store.js          — In-process data store (EventEmitter + Maps)
│   │   ├── drift-engine.js   — Pre-Ship scoring + field telemetry evaluation
│   │   ├── seed.js           — Fixture data populated on first run
│   │   ├── routes/api.js     — 31 REST endpoints
│   │   └── integrations/     — GitHub, Arduino, Jenkins, Docker, Keil, VS Code adapters
│   ├── web/
│   │   ├── index.html        — Landing page + workspace shell + inline API client
│   │   ├── app-data.js       — WebSocket data layer, window.D store, helpers
│   │   ├── app.js            — All 10 screen templates + screen router
│   │   └── styles.css        — Full design system + component library
│   ├── cli/
│   │   └── diagiot.js        — CLI with 17 commands + REPL
│   └── shared/
│       └── api-client.js     — Reusable API client (Node + browser)
├── docs/
│   ├── README.md             — System overview and architecture
│   ├── HANDOFF.md            — This file
│   ├── DiagIoT_System_Technical_Summary.docx — Full system spec
│   └── plans/
│       ├── diagiot-mvp-sprint-plan.md — Sprint plan and sub-task tracker
│       └── api-contract-mvp.md        — API contract reference
├── AGENTS.md                 — Bob agent scope guardrail
├── package.json
└── .env.example
```

---

## API Quick Reference

Full contract: [`docs/plans/api-contract-mvp.md`](plans/api-contract-mvp.md)

| Endpoint | Method | Description |
|---|---|---|
| `/api/fleet/summary` | GET | Fleet health KPIs |
| `/api/fleet/devices` | GET | All devices (filterable) |
| `/api/fleet/devices/:id` | GET | Single device |
| `/api/fleet/devices/:id/telemetry` | POST | Push telemetry sample |
| `/api/alerts` | GET | Recent alerts (filterable) |
| `/api/alerts/:id/acknowledge` | POST | Acknowledge an alert |
| `/api/scans/run` | POST | Run a Pre-Ship firmware scan |
| `/api/scans/latest` | GET | Last scan result |
| `/api/baselines/:id/capture` | POST | Capture device baseline |
| `/api/knowledge` | GET | Search knowledge base |
| `/api/agents` | GET | Agent statuses |
| `/api/integrations` | GET | Integration statuses |
| `/api/health` | GET | Server health snapshot |

---

## Demo Flow

1. Open `http://localhost:3000` → click **Enter Workspace**
2. **Dashboard** — fleet KPIs, agent cards, drift trend chart, recent alerts
3. **Pre-Ship Scan** — enter `fw-v3.8.2-rc5`, set `binaryDiff` to `0.75`, click **Run Scan** → see BLOCK verdict
4. **Field Monitor** — find `SensorHub-X4 #3192` (critical, score 0.87) → acknowledge alert
5. **Drift Analysis** — correlation heatmap + root-cause hypothesis for SH-X4-3192
6. **Knowledge Base** — search `adc` → see KB-082 article
7. Remaining screens (Timeline, Diff, Repro, Integrations, Onboarding) → polished mock data

---

## Troubleshooting

**Server won't start:** Run `npm install` first. Check Node.js version (`node --version` → must be 18+).

**`serialport` install fails:** This is optional. The server starts without it; Arduino serial integration is simply disabled.

**WebSocket shows "Offline":** Server may still be starting. Wait 2–3 seconds and the browser will auto-reconnect.

**No data in dashboard:** Check `http://localhost:3000/api/health` — if it returns JSON, the server is healthy and seed data is loaded.
