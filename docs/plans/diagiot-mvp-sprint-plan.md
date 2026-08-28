# DiagIoT — MVP Sprint Implementation Plan

**Goal:** Deliver a demo-ready DiagIoT MVP by Sunday with a real thin slice (Dashboard, Pre-Ship Scan, Field Monitor wired to live services) and convincingly polished mocked screens for the rest of the system.

**Scope alignment:** This plan follows `DiagIoT_Team_Build_Plan (1).md` exactly — no new scope, mocked beats broken, commit early and often.

---

## Stack Decision (resolved)

| Layer | Choice | Notes |
|---|---|---|
| Backend framework | Node.js + Express | Already implemented in `src/server/` |
| Real-time | WebSocket (`ws` lib) | Already implemented, broadcasting all events |
| Database | In-process `Store` (EventEmitter + Maps) | `src/server/store.js` — complete |
| Frontend | Vanilla HTML/CSS/JS | `src/web/` — scaffold done, screens missing |
| Event transport | In-process pub/sub (Store EventEmitter) | No external broker needed |
| Port | 3000 | `src/server/index.js` |

> **Note:** The original plan assumed Python + FastAPI + SQLite. The actual build uses Node.js + Express + in-process store. All plan sub-tasks are updated to reflect this reality.

---

## Current Implementation State

### ✅ Already Complete — do not re-implement

| Component | Location | What's There |
|---|---|---|
| Express + WebSocket server | `src/server/index.js` | HTTP + WS, JWT guard, integration startup, broadcast |
| In-process data store | `src/server/store.js` | Devices, Alerts, Scans, Baselines, Integrations, Agents, KB, Incidents |
| Drift engine | `src/server/drift-engine.js` | Pre-Ship 5-component scoring + field telemetry scoring + alert-raising |
| REST API (31 endpoints) | `src/server/routes/api.js` | `/fleet/*`, `/alerts`, `/scans`, `/baselines`, `/agents`, `/integrations`, `/knowledge`, `/incidents`, `/health` |
| Seed data | `src/server/seed.js` | 8 devices, 4 alerts, 2 scans, 3 KB articles, agent + integration statuses |
| GitHub integration | `src/server/integrations/github.js` | Webhook + artifact upload, HMAC-SHA256 verified |
| Arduino integration | `src/server/integrations/arduino.js` | Serial detection, upload, telemetry parsing |
| API client (browser) | `src/shared/api-client.js` | All endpoint methods, works in browser |
| In-page API client | `src/web/index.html` lines 11–43 | `window.api` — `DiagIoTClient` class, all methods |
| WebSocket data layer | `src/web/app-data.js` | `window.D` store, WS connect/reconnect, all event handlers, helpers (`relTime`, `scoreLabel`, `scoreStyle`, `healthBadge`, `sevBadge`, `statusBadge`) |
| Design system | `src/web/styles.css` | Full token system, all agent colors, layout components, badges, tables, forms |
| App scaffold + landing | `src/web/index.html` | Landing page complete; workspace shell (sidebar, topbar, tabs, CLI panel) complete |
| CLI | `src/cli/diagiot.js` | 17 commands, REPL, ANSI formatting |
| Dashboard screen HTML | `src/web/app.js` `SCREENS.dashboard` | Template defined with hardcoded values — needs live data wiring |

### ❌ Missing — these are the remaining work items

| What's Missing | Impact |
|---|---|
| `switchScreen()` + `softRefreshScreen()` — screen router | **No screens can render at all** — called throughout but not defined |
| `SCREENS.preship`, `.field`, `.drift`, `.timeline`, `.diff`, `.repro`, `.integrations`, `.onboard`, `.knowledge` | 9 of 10 screens are blank |
| Dashboard live data wiring | Dashboard renders hardcoded values, not `window.D` data |
| Chart rendering (Chart.js is loaded but no charts drawn) | Dashboard trend + donut charts are empty canvases |
| `AGENTS.md` at repo root | Sprint plan guardrail doc — not created |
| `docs/plans/api-contract-mvp.md` | API contract doc — not created |
| `docs/HANDOFF.md` | Run instructions doc — not created |

---

## Sub-Task 0 — Setup Docs: AGENTS.md, API Contract, HANDOFF.md

**Status:** `[ ] pending`

**Intent:**
Create the three missing documentation files that the sprint plan calls for. These are reference documents, not code — they take 30 minutes and unblock the whole team.

**Expected Outcomes:**
- `AGENTS.md` at the repository root — contains the MVP scope table, entity schemas (Device, Alert, Scan), the drift-score formula, and an explicit Bob-agent guard: "stay inside MVP scope only."
- `docs/plans/api-contract-mvp.md` — documents the actual implemented API (Node.js/Express, port 3000) with the real endpoint shapes already built, so it matches what Frontend wires against.
- `docs/HANDOFF.md` — how to install and start the server, all env vars, and the seed data summary.

**Todo List:**
1. Write `AGENTS.md` at repo root: MVP scope table, Device/Alert/Scan schemas (matching `src/server/seed.js`), drift formula (from `src/server/drift-engine.js`), explicit out-of-scope guard.
2. Write `docs/plans/api-contract-mvp.md`: document the real implemented routes (`GET /api/fleet/devices`, `GET /api/fleet/devices/:id`, `GET /api/alerts`, `POST /api/scans/run`, `GET /api/fleet/summary`, `GET /api/agents`, `GET /api/integrations`, `GET /api/knowledge`, `GET /api/health`) with actual request/response shapes from `src/server/routes/api.js`.
3. Write `docs/HANDOFF.md`: `npm install`, `npm start`, port 3000, env vars from `.env.example`, seed data summary (8 devices, 4 alerts, etc.), CLI usage.

**Relevant Context:**
- Entity schemas: [`src/server/seed.js`](src/server/seed.js)
- Route shapes: [`src/server/routes/api.js`](src/server/routes/api.js)
- Env vars: [`.env.example`](.env.example)
- Drift formula: [`src/server/drift-engine.js`](src/server/drift-engine.js)

---

## Sub-Task 1 — Screen Router: `switchScreen` + `softRefreshScreen`

**Status:** `[ ] pending`

**Intent:**
Implement the two missing routing functions that `app-data.js` calls but that do not yet exist anywhere. Without these, clicking any sidebar link or tab renders nothing. This is the single most important unblock — all other screen work depends on it.

**Expected Outcomes:**
- `switchScreen(screenId)` is defined and exported on `window`. Calling it: (1) renders the corresponding `SCREENS[screenId]()` template into `#screensContainer`, (2) updates the active tab and sidebar link, (3) sets `window._currentScreen = screenId`, (4) calls any post-render init (e.g. chart init) for that screen.
- `softRefreshScreen(screenId)` is defined and exported on `window`. Calling it re-renders the current screen's content in-place without losing scroll position, used by WebSocket live-update events.
- Clicking any of the 10 sidebar links and tabs does not throw errors (even if the screen template is a placeholder for now).
- The Dashboard screen renders correctly when the app loads.

**Todo List:**
1. Add `switchScreen(screenId)` to `src/web/app.js`: look up `SCREENS[screenId]`, inject HTML into `#screensContainer`, update active states on `.nav-link[data-screen]` and `.tab[data-screen]`, set `window._currentScreen`.
2. Add `softRefreshScreen(screenId)` to `src/web/app.js`: same as `switchScreen` but only if `window._currentScreen === screenId`.
3. Add a default fallback template for any screen not yet implemented: a placeholder card with the screen name and "Coming soon" message so clicks never error.
4. Export both functions on `window`.
5. Verify: start the server, open the browser, click every sidebar link — no JS errors, Dashboard renders, others show placeholder.

**Relevant Context:**
- Called from: [`src/web/app-data.js`](src/web/app-data.js) — `refreshCurrentScreen()` at line 256, `handleServerMessage` case branches
- Screen container: `<div id="screensContainer">` in [`src/web/index.html`](src/web/index.html) line 728
- Active state targets: `.nav-link[data-screen]`, `.tab[data-screen]`, both in `index.html`
- Existing dashboard template: [`src/web/app.js`](src/web/app.js) lines 15–175

---

## Sub-Task 2 — Dashboard: Live Data Wiring + Charts

**Status:** `[ ] pending`

**Intent:**
Replace all hardcoded values in `SCREENS.dashboard` with live data from `window.D` (the WebSocket-populated store) and render the two Chart.js charts. This makes the Dashboard the first fully live screen.

**Expected Outcomes:**
- Fleet summary cards show real counts from `window.D.fleet` (total, healthy/drifting/critical, uptime, alert count).
- Agent status cards show real status/metrics from `window.D.agents` (last activity, scan count, blocked count, etc.).
- Recent alerts table renders from `window.D.alerts` (newest 5, unacknowledged first).
- System registry table renders from `window.D.devices`.
- Drift Trend chart (line) renders in `#chartDriftTrend` using recent scan scores from `window.D.scans`.
- Fleet Health donut chart renders in `#chartFleetHealth` using `window.D.fleet` healthy/drifting/critical counts.
- Charts re-render when `softRefreshScreen('dashboard')` is called by live WebSocket events.

**Todo List:**
1. Convert `SCREENS.dashboard` from a static string template to a function that reads `window.D` for all values.
2. Wire fleet summary stat cards to `D.fleet.total`, `D.fleet.drifting`, `D.fleet.critical`, `D.fleet.uptime`.
3. Wire agent cards to `D.agents` — use `find(a => a.id === 'preship')` etc. for status and metrics.
4. Wire recent alerts table to `D.alerts.slice(0,5)` using `sevBadge()`, `relTime()`, `healthBadge()` helpers from `app-data.js`.
5. Wire system registry table to `D.devices` — use `healthBadge()` and `scoreStyle()`.
6. After `SCREENS.dashboard` renders, initialize the Drift Trend line chart from `D.scans` scores.
7. After `SCREENS.dashboard` renders, initialize the Fleet Health donut chart from `D.fleet` counts.
8. Ensure `softRefreshScreen('dashboard')` destroys and re-renders charts without memory leaks (destroy old Chart.js instance before creating new one).

**Relevant Context:**
- Live data store: [`src/web/app-data.js`](src/web/app-data.js) — `window.D`, helper functions
- Dashboard template to update: [`src/web/app.js`](src/web/app.js) lines 15–175
- Chart.js already loaded via CDN in [`src/web/index.html`](src/web/index.html) line 8
- Seed data shape reference: [`src/server/seed.js`](src/server/seed.js)

---

## Sub-Task 3 — Pre-Ship Scan Screen (real, wired)

**Status:** `[ ] pending`

**Intent:**
Build `SCREENS.preship` — a firmware scan form wired to `POST /api/scans/run` that shows a real drift score, verdict badge, and component breakdown. This is one of the three live demo screens.

**Expected Outcomes:**
- Screen renders a firmware input form: target version (text), and five component score sliders/inputs (binaryDiff, behavioralSig, knownVulns, hwCompat, configDrift — each 0.00–1.00).
- On submit, calls `window.api.runScan(target, [], scores)` and displays the result.
- Result card shows: composite drift score (large, color-coded), verdict badge (Pass = teal, Warn = amber, Block = danger), per-component score breakdown bar chart or table.
- Previous scans list below the form showing `window.D.scans` (newest first) with target, score, verdict, and timestamp.
- When a new scan completes via WebSocket (`scan:completed` event), the previous scans list updates live.

**Todo List:**
1. Add `SCREENS.preship` function to `src/web/app.js`.
2. Build the scan form: target input, five score inputs (0.0–1.0 range), submit button.
3. Add submit handler: call `window.api.runScan()`, handle loading state, render result card on success.
4. Style verdict badge: Pass → `var(--preship)` teal, Warn → `var(--warn)` amber, Block → `var(--danger)` red.
5. Add component breakdown display: show each of the five score components with its weight and contribution.
6. Add previous scans table from `window.D.scans`.
7. Register a post-render hook so `softRefreshScreen('preship')` refreshes the scans list without losing form state.

**Relevant Context:**
- Scan endpoint: `POST /api/scans/run` — body: `{ target, checks, scores: { binaryDiff, behavioralSig, knownVulns, hwCompat, configDrift } }` — see [`src/server/routes/api.js`](src/server/routes/api.js) line 84
- Scoring weights: binaryDiff 30%, behavioralSig 25%, knownVulns 20%, hwCompat 15%, configDrift 10% — [`src/server/drift-engine.js`](src/server/drift-engine.js)
- Seed scans for reference: [`src/server/seed.js`](src/server/seed.js) lines 28–55
- Agent color: `var(--preship)` = `#4ECDC4` teal

---

## Sub-Task 4 — Field Monitor Screen (real, wired)

**Status:** `[ ] pending`

**Intent:**
Build `SCREENS.field` — a per-device health grid consuming live data from `window.D.devices` and `window.D.alerts`. This is one of the three live demo screens.

**Expected Outcomes:**
- Screen shows a device health grid: one card per device from `window.D.devices` showing name, fleet, firmware version, drift score (color-coded bar), health badge (Healthy/Drifting/Critical), source, and last seen.
- A filter row at the top: "All / Healthy / Drifting / Critical" buttons that filter the visible devices.
- Clicking a device card expands it (or opens a detail panel) showing its latest alert (matched from `window.D.alerts` by `deviceId`).
- Active alerts panel on the side or below showing the unacknowledged alerts from `window.D.alerts` with acknowledge button (calls `window.api.acknowledgeAlert(id)`).
- When a `device:updated` or `alert:created` WebSocket event fires, the screen refreshes via `softRefreshScreen('field')`.

**Todo List:**
1. Add `SCREENS.field` function to `src/web/app.js`.
2. Build the device grid: map `window.D.devices` to cards using `healthBadge()`, `scoreStyle()`, drift score progress bar.
3. Add filter buttons (All / Healthy / Drifting / Critical) with client-side filter state.
4. Build the alerts panel: unacknowledged alerts from `window.D.alerts`, newest first, with `sevBadge()` and `relTime()`.
5. Add acknowledge button per alert: call `window.api.acknowledgeAlert(id, 'engineer')`, update `D.alerts` on success.
6. Ensure `softRefreshScreen('field')` refreshes device cards and alerts panel.

**Relevant Context:**
- Device data: `window.D.devices` — fields: `id, name, fleet, fw, driftScore, health, source, updatedAt`
- Alert data: `window.D.alerts` — fields: `id, deviceId, type, severity, driftScore, message, acknowledged, createdAt`
- Helper functions in [`src/web/app-data.js`](src/web/app-data.js): `healthBadge()`, `sevBadge()`, `relTime()`, `scoreStyle()`
- Acknowledge endpoint: `POST /api/alerts/:id/acknowledge` — [`src/server/routes/api.js`](src/server/routes/api.js) line 68
- Agent color: `var(--monitor)` = `#6C8CFF` blue

---

## Sub-Task 5 — Six Polished Mock Screens

**Status:** `[ ] pending`

**Intent:**
Build the remaining six screens — Drift Analysis, Event Timeline, Firmware Diff, Reproduce Incident, Integrations, Engineer Onboarding, Knowledge Base — as polished static screens with realistic fixture data. These complete the visual story without requiring additional backend logic.

**Expected Outcomes:**
- All six screens render without errors and look visually consistent with the live screens.
- Each screen uses realistic fixture data that references the same device IDs and firmware versions from seed data.
- Screens are indistinguishable from real screens at a glance.

**Todo List:**
1. **Drift Analysis** (`SCREENS.drift`): 6×6 correlation heatmap (HTML table with color-coded cells), per-signal drift trend sparklines (static SVG or Chart.js), one hypothesis card (confidence score, affected component, resolution suggestion). Use device `SH-X4-3192` (drift 0.87) as the focus device.
2. **Event Timeline** (`SCREENS.timeline`): Chronological event list (newest first) with signal name, value, deviation from baseline, timestamp, and agent attribution badge. Minimum 8 realistic events referencing seed devices.
3. **Firmware Diff** (`SCREENS.diff`): Side-by-side or unified diff view of `fw-v3.8.1-stable` vs `fw-v3.8.2-rc4`. Show changed symbols: `TIM2_PSC` register (matches seed scan check), memory section sizes, changed function names. Style as a code diff with red/green highlighting.
4. **Reproduce Incident** (`SCREENS.repro`): Simulation lab panel — hypothesis input, fault injection parameters (signal, magnitude, duration), replay status (running/complete), outcome card (confirmed/rejected). Show a pre-populated "confirmed" result for the GPIO mismatch incident.
5. **Integrations** (`SCREENS.integrations`): Grid of 8 integration cards (from `window.D.integrations`) with name, status badge, description, and connect/configure button. Wire status badges to real `window.D.integrations` data so live connection status shows correctly.
6. **Engineer Onboarding** (`SCREENS.onboard`): Progress tracker (4 stages), module cards (Architecture, Hardware Setup, Drift Workflow, CI/CD Gate) with completion state, and a guided panel showing Stage 1 content.
7. **Knowledge Base** (`SCREENS.knowledge`): Search input (calls `window.api.knowledge(q)`), article list from `window.D.knowledge`, each article showing title, affected devices, root cause, resolution, and tags. Wire search to live API.

**Relevant Context:**
- Seed KB articles: [`src/server/seed.js`](src/server/seed.js) lines 59–84 — 3 articles with `title, affectedDevices, rootCause, resolution, tags`
- Seed devices for fixture data: `SH-X4-3192` (critical, 0.87), `EG-E1-7700` (critical, 0.91), `TN-R2-0841` (warning, 0.52)
- Integration data: `window.D.integrations` — use `statusBadge()` helper
- Knowledge search endpoint: `GET /api/knowledge?q=` — [`src/server/routes/api.js`](src/server/routes/api.js) line 148
- DOC_CONTENT in [`src/web/app.js`](src/web/app.js) lines 590–636 has detailed content for Onboarding and Knowledge Base that can be reused

---

## Sub-Task 6 — Integration + Polish + Demo Rehearsal

**Status:** `[ ] pending`

**Intent:**
Full end-to-end click-through, fix anything visibly broken, freeze scope, rehearse the demo narrative.

**Expected Outcomes:**
- All 10 screens are navigable without JS errors.
- The three live screens (Dashboard, Pre-Ship Scan, Field Monitor) demonstrate a real flow: scan firmware → see verdict → view drifting device → see alert.
- All six mock screens render correctly with realistic fixture data.
- `docs/HANDOFF.md` is complete.
- Demo narrative is agreed and rehearsed.

**Todo List:**
1. Start the server (`npm start`), open the browser, click all 10 screens — note any JS errors.
2. Run the live flow: submit a Pre-Ship scan → verify result card shows verdict → go to Field Monitor → find a drifting device → acknowledge its alert.
3. Fix only visibly broken items — no new features.
4. Verify `docs/HANDOFF.md` has: `npm install`, `npm start`, port 3000, env vars, seed data summary.
5. Agree on demo narrative: 3 sentences covering the 3 live screens and the vision for the rest.
6. Do one full rehearsal click-through.

**Relevant Context:**
- [`docs/DiagIoT_Team_Build_Plan (1).md`](docs/DiagIoT_Team_Build_Plan%20(1).md) — Sunday afternoon section and ground rules
- If any live screen is unstable, replace with a mock before polish

---

## Dependency Map

```
Sub-Task 0 (Docs)          — independent, do first
Sub-Task 1 (Screen Router) — blocks everything below
  └─► Sub-Task 2 (Dashboard live wiring)
  └─► Sub-Task 3 (Pre-Ship Scan screen)
  └─► Sub-Task 4 (Field Monitor screen)
  └─► Sub-Task 5 (Six mock screens)
All ──► Sub-Task 6 (Integration + Polish)
```

## What NOT to Build

The following are **out of scope for this MVP sprint** — do not implement:

- Separate `agents/pre-ship/`, `agents/monitor/` microservices (all agent logic is already embedded in `src/server/` and works)
- The 6×6 real-time correlation matrix (hardcode one hypothesis in the Drift Analysis mock screen)
- Multi-hypothesis ranking engine
- Persistent database (SQLite or otherwise) — in-process store is sufficient
- Onboarding Agent live knowledge curation logic
- Firmware Store service
- Any new API endpoints (the 31 already built are sufficient)
