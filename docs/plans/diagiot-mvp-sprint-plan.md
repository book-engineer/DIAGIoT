# DiagIoT — MVP Sprint Implementation Plan

**Goal:** Deliver a demo-ready DiagIoT MVP by Sunday with a real thin slice (Dashboard, Pre-Ship Scan, Field Monitor wired to live services) and convincingly polished mocked screens for the rest of the system.

**Scope alignment:** This plan follows `DiagIoT_Team_Build_Plan (1).md` exactly — no new scope, mocked beats broken, commit early and often.

**Structure:** Sub-tasks are grouped into four tracks that can be executed in parallel. Tracks have internal ordering within them; across tracks they depend on the API contract (Sub-task 0) before coding can start.

---

## Stack Decision (resolved)

| Layer | Choice |
|---|---|
| Backend framework | Python + FastAPI |
| Database | SQLite via SQLAlchemy (single file, zero setup) |
| API structure | Single unified FastAPI app — `/devices` and `/alerts` routers, one process, port 8000 |
| Frontend | TBD by Frontend role |
| Event transport | In-process (Alert Bus is a REST service backed by SQLite for MVP) |

---

## Sub-Task 0 — Setup: Stack Decision, AGENTS.md, and API Contract

**Status:** `[ ] pending`

**Intent:**
Settle the technology stack before a single line of code is written, establish the root `AGENTS.md` guardrail so all Bob agents stay inside MVP scope, and produce the minimal API contract so Frontend can work against a mock server independently of the real backends.

**Expected Outcomes:**
- A documented stack decision (backend framework, frontend framework, database, event transport) committed somewhere visible to all three roles.
- `AGENTS.md` at the repository root containing: the Device/Alert schema, the drift-score formula, the MVP scope table from Section 1 of the sprint plan, and an explicit note that Bob agents must not build beyond that scope.
- `docs/plans/api-contract-mvp.md` committed with Device and Alert field schemas plus 3–4 REST routes (see Relevant Context).
- A mock server (or static JSON fixtures) generated from the contract so Frontend can start without waiting for real backends.

**Todo List:**
1. Decide and document the stack: backend (FastAPI Python or other), frontend (React/Next.js or other), database (SQLite for MVP or in-memory), event transport (in-process pub/sub or Redis Streams).
2. Write `AGENTS.md` at the repository root — include Device/Alert entity schemas, drift-score formula, and the MVP scope table; add the explicit out-of-scope guard.
3. Write `docs/plans/api-contract-mvp.md` — Device and Alert fields, and routes: `GET /devices`, `GET /devices/{id}`, `POST /alerts`, `GET /alerts`.
4. Generate a mock server or fixture JSON files matching the contract so Frontend is unblocked.
5. Share the contract in the team channel and get thumbs-up from all three roles before Saturday coding starts.

**Relevant Context:**
- [`docs/DiagIoT_Team_Build_Plan (1).md`](docs/DiagIoT_Team_Build_Plan%20(1).md) — Section 1 (scope table), Friday evening checklist
- [`docs/README.md`](docs/README.md) — Data model section (7 core entities, field detail in tech summary Section 4)
- `docs/DiagIoT_System_Technical_Summary.docx` — Section 4 (full field-level entity schemas)
- Target file: `AGENTS.md` (repo root), `docs/plans/api-contract-mvp.md`

---

## Track A — Backend A: Device Registry + Alert Bus

### Sub-Task A1 — Device Registry service

**Status:** `[ ] pending`

**Intent:**
Implement the Device Registry as a minimal REST service with just enough fields to support the Dashboard and Field Monitor screens. This is the foundational shared service — both agents and the frontend depend on it.

**Expected Outcomes:**
- A running HTTP service exposing `GET /devices` (list all) and `GET /devices/{id}` (single device).
- Device entity contains at minimum: `id`, `name`, `type`, `firmware_version`, `drift_score`, `status` (Healthy / Drifting / Critical), `last_seen`.
- Seed data: at least 5 realistic fake devices covering all three status values so the Dashboard and Field Monitor have data to show.
- Service is reachable at a documented local port and passes the API contract from Sub-task 0.

**Todo List:**
1. Scaffold the Device Registry service inside `shared/device-registry/` using the chosen stack.
2. Define the Device schema matching `docs/plans/api-contract-mvp.md`.
3. Implement `GET /devices` and `GET /devices/{id}` endpoints.
4. Write seed/fixture data (5+ devices, mixed statuses and drift scores).
5. Verify the contract: run the two endpoints, confirm response shapes match the contract.
6. Update `docs/HANDOFF.md` with the service's local port and any env vars needed.

**Relevant Context:**
- `docs/plans/api-contract-mvp.md` (output of Sub-task 0)
- `shared/device-registry/` (target directory)
- `docs/DiagIoT_System_Technical_Summary.docx` Section 4 — Device entity schema
- Drift score ranges: Safe 0.00–0.20, Low 0.21–0.39, Warning 0.40–0.69, Critical 0.70–1.00

---

### Sub-Task A2 — Alert Bus service

**Status:** `[ ] pending`

**Intent:**
Implement the Alert Bus as the minimal pub/sub event backbone used by Monitor Agent to publish drift alerts and by the Dashboard/Field Monitor screens to display them. Keep it simple — in-process or a lightweight broker is fine for the demo.

**Expected Outcomes:**
- A running HTTP service exposing `POST /alerts` (publish a new alert) and `GET /alerts` (list recent alerts, newest-first).
- Alert entity contains at minimum: `id`, `device_id`, `severity` (info / warning / critical), `signal`, `drift_score`, `message`, `timestamp`, `agent` (pre-ship / monitor).
- Seed data: at least 3–4 realistic alerts with timestamps so the Dashboard has content.
- Service is reachable at a documented local port.

**Todo List:**
1. Scaffold the Alert Bus service inside `shared/alert-bus/` using the chosen stack.
2. Define the Alert schema matching `docs/plans/api-contract-mvp.md`.
3. Implement `POST /alerts` (store and optionally broadcast) and `GET /alerts` (return list, newest-first).
4. Write seed/fixture alerts linked to the device IDs from A1.
5. Verify the two endpoints respond correctly.
6. Update `docs/HANDOFF.md` with the service's local port.

**Relevant Context:**
- `docs/plans/api-contract-mvp.md` (output of Sub-task 0)
- `shared/alert-bus/` (target directory)
- `docs/DiagIoT_System_Technical_Summary.docx` Section 4 — Alert entity schema
- Alert Bus is consumed by Monitor Agent (Track B) and by the Frontend Dashboard

---

## Track B — Backend B: Pre-Ship Agent + Monitor Agent

### Sub-Task B1 — Pre-Ship Agent: scoring engine + verdict endpoint

**Status:** `[ ] pending`

**Intent:**
Implement the Pre-Ship Agent's core scoring algorithm and expose it as a REST endpoint. This is the most self-contained piece of real logic in the MVP and the centerpiece of the Pre-Ship Scan screen.

**Expected Outcomes:**
- A running HTTP service (or route on a shared API) inside `agents/pre-ship/` exposing `POST /pre-ship/scan`.
- The endpoint accepts a firmware descriptor (name, version, binary size, metadata flags) and returns a structured result: `drift_score` (0.00–1.00), `verdict` (Pass / Warn / Block), and a breakdown of the five weighted components.
- Scoring formula implemented as specified:
  - Binary diff: 30%
  - Behavioral signature: 25%
  - Known vulnerabilities: 20%
  - Hardware compatibility: 15%
  - Config drift: 10%
- Three test cases covering Pass, Warn, and Block outcomes are verifiable.

**Todo List:**
1. Scaffold the Pre-Ship Agent service inside `agents/pre-ship/` using the chosen stack.
2. Implement the five-component drift scoring function using the weighted formula above.
3. Implement `POST /pre-ship/scan` — accept firmware input, run scoring, return `drift_score`, `verdict`, and component breakdown.
4. Write three test cases / sample payloads covering Pass (score < 0.40), Warn (0.40–0.69), Block (≥ 0.70).
5. Document the endpoint in `docs/HANDOFF.md` (port, route, sample request/response).

**Relevant Context:**
- `agents/pre-ship/` (target directory)
- `docs/DiagIoT_System_Technical_Summary.docx` Section 3.1 — Pre-Ship Agent detail and scoring formula
- Pre-Ship Scan screen is a real, wired screen in the Frontend (Track C)
- Verdict thresholds: Pass < 0.40, Warn 0.40–0.69, Block ≥ 0.70

---

### Sub-Task B2 — Monitor Agent: basic drift detection + alert publishing

**Status:** `[ ] pending`

**Intent:**
Implement a simplified Monitor Agent that polls or reacts to device data, computes a per-device drift score, and publishes alerts to the Alert Bus when thresholds are breached. Skip the full 6×6 correlation matrix — hardcode one illustrative hypothesis per demo incident instead.

**Expected Outcomes:**
- A service inside `agents/monitor/` that: reads device list from the Device Registry (A1), computes a drift score for each device based on simulated signal inputs, publishes an alert to the Alert Bus (A2) when drift_score ≥ 0.40.
- Exposes `GET /monitor/status` returning per-device health (Healthy / Drifting / Critical) so Field Monitor can poll it.
- At least one device in the seed data is in a Drifting or Critical state with a matching alert already in the bus.
- One hardcoded hypothesis per demo incident (no ranking engine required).

**Todo List:**
1. Scaffold the Monitor Agent service inside `agents/monitor/` using the chosen stack.
2. Implement per-device drift scoring using simulated/seed signal data (no live telemetry needed for demo).
3. Implement alert publishing: when drift_score ≥ 0.40, POST to the Alert Bus with the correct Alert shape.
4. Implement `GET /monitor/status` returning device health summary.
5. Hardcode one root-cause hypothesis for the demo incident device.
6. Verify the end-to-end flow: device registry → drift scoring → alert published → alert appears in `GET /alerts`.
7. Update `docs/HANDOFF.md`.

**Relevant Context:**
- `agents/monitor/` (target directory)
- `docs/DiagIoT_System_Technical_Summary.docx` Section 3.2 — Monitor Agent and drift detection pipeline
- Depends on: Device Registry (A1) and Alert Bus (A2) running
- Field Monitor screen (Track C, Sub-task C2) consumes `GET /monitor/status`
- Skip the correlation matrix and multi-hypothesis ranking — hardcode one hypothesis for the demo

---

## Track C — Frontend: All 10 Screens

### Sub-Task C1 — App scaffold + shared components + Dashboard (real)

**Status:** `[ ] pending`

**Intent:**
Bootstrap the web application, establish the design token system and shared layout (sidebar, topbar), and deliver the System Health Dashboard wired to real data from the Device Registry and Alert Bus.

**Expected Outcomes:**
- A running web app in `web/` with the sidebar navigation (4 agent groups, 10 screen entries) and the top navigation bar.
- Design tokens applied globally: background `#0f1117`, surface `#181b24`, agent colors (teal `#4ECDC4`, blue `#6C8CFF`, amber `#F0A030`), danger `#ef4444`.
- Dashboard screen shows: fleet health summary (Healthy / Drifting / Critical counts), recent alerts list (from `GET /alerts`), and a device status grid (from `GET /devices`). All data is live — no hardcoded values.
- The app works against the mock server from Sub-task 0 initially; hot-swap to real backends when A1/A2 are ready.

**Todo List:**
1. Scaffold the frontend app inside `web/` using the chosen framework (React/Next.js or other).
2. Apply design tokens globally; create base layout with sidebar and topbar components.
3. Build the sidebar with all 10 screen navigation entries, agent color coding, and agent icons (🛡 teal, 👁 blue, 🧭 amber).
4. Build the Dashboard screen: fleet summary cards, alert list, device grid — all consuming live API data.
5. Wire to mock server from Sub-task 0; add a single config constant to swap to real backend URLs.
6. Verify the Dashboard renders correctly with seed data.

**Relevant Context:**
- `web/` (target directory)
- [`docs/README.md`](docs/README.md) — Screens inventory, UI design tokens
- `docs/DiagIoT_System_Technical_Summary.docx` Sections 7 and 8 — UI framework, screen inventory, navigation model
- Mock server / fixture data from Sub-task 0
- Depends on contract from Sub-task 0; does NOT need real backends yet

---

### Sub-Task C2 — Pre-Ship Scan screen + Field Monitor screen (real)

**Status:** `[ ] pending`

**Intent:**
Build the two remaining live-wired screens: Pre-Ship Scan (wired to the Pre-Ship Agent scoring endpoint) and Field Monitor (wired to Monitor Agent status + Alert Bus). These three screens — Dashboard, Pre-Ship Scan, Field Monitor — are the live demo core.

**Expected Outcomes:**
- **Pre-Ship Scan screen:** A form where the user inputs a firmware descriptor; on submit it calls `POST /pre-ship/scan` and displays the drift score, verdict badge (Pass/Warn/Block in agent teal), and the five-component score breakdown.
- **Field Monitor screen:** A per-device health grid showing each device's status, drift score, and latest alert, consuming `GET /monitor/status` and `GET /alerts`. Status indicators use the correct colors (Healthy = safe green, Drifting = warning amber, Critical = danger red).
- Both screens are wired to real backends (B1/B2), not the mock server.

**Todo List:**
1. Build the Pre-Ship Scan screen: firmware input form, submit handler calling the scan endpoint, result card showing score, verdict, and component breakdown.
2. Style the verdict badge: Pass (teal), Warn (amber), Block (danger red).
3. Build the Field Monitor screen: device health grid, per-device drift score bars, alert attribution by agent.
4. Wire Field Monitor to `GET /monitor/status` (Backend B2) and `GET /alerts` (Backend A2).
5. Swap both screens off the mock server onto real backend URLs.
6. Click through end-to-end: submit a firmware scan, see a verdict; check Field Monitor, see a drifting device with its alert.

**Relevant Context:**
- `web/` (build on scaffold from C1)
- `docs/DiagIoT_System_Technical_Summary.docx` Sections 8.3 (Pre-Ship Scan screen) and 8.4 (Field Monitor screen)
- Depends on: Pre-Ship Agent endpoint (B1), Monitor Agent endpoint (B2), Alert Bus (A2)
- Agent color for Pre-Ship: teal `#4ECDC4`; Monitor: blue `#6C8CFF`

---

### Sub-Task C3 — Polished mock screens (6 screens with fixture data)

**Status:** `[ ] pending`

**Intent:**
Build the remaining six screens — Drift Analysis, Event Timeline, Firmware Diff, Reproduce Incident, Knowledge Base, Onboarding — as polished static screens populated with realistic fixture data. These look finished and tell the full vision story without being wired to live logic.

**Expected Outcomes:**
- All six screens render without errors and look visually consistent with the live screens.
- Each screen is populated with realistic, contextually accurate fixture data (not lorem ipsum).
- The screens are navigable from the sidebar and feel like a complete product.
- A viewer unfamiliar with the sprint plan cannot distinguish mock screens from live ones at a glance.

**Todo List:**
1. Write realistic fixture data for all six screens (JSON files or inline constants): drift correlation matrix data, event timeline events, firmware diff hunks, incident replay state, 3–4 knowledge base articles, onboarding module steps.
2. Build **Drift Analysis** screen: 6×6 correlation heatmap (static), per-signal drift trend charts (static), hardcoded hypothesis card with confidence score.
3. Build **Event Timeline** screen: chronological event list with signal, value, timestamp, and agent attribution.
4. Build **Firmware Diff** screen: binary/register-level diff view showing changed symbols or memory regions between two firmware versions.
5. Build **Reproduce Incident** screen: simulation lab panel showing hypothesis, injected fault parameters, and replay result.
6. Build **Knowledge Base** screen: list of 3–4 pre-written articles with title, symptom tags, resolution steps, and agent attribution.
7. Build **Engineer Onboarding** screen: progress tracker, module cards (Introduction, Pre-Ship, Monitor, Investigate), and a guided walkthrough panel.
8. Verify all six screens are reachable from the sidebar and display fixture data correctly.

**Relevant Context:**
- `web/` (build on scaffold from C1)
- `docs/DiagIoT_System_Technical_Summary.docx` Sections 8.5–8.10 — detailed screen layouts and content for each of these screens
- Fixture data should reference the same device IDs and firmware versions used in the seed data from Tracks A and B
- Agent color for Monitor screens: blue `#6C8CFF`; Onboarding screens: amber `#F0A030`

---

## Sub-Task 5 — Integration, Polish, and Demo Rehearsal

**Status:** `[ ] pending`

**Intent:**
Bring all three tracks together: verify the end-to-end live flow works, fix anything visibly broken, freeze scope, and rehearse the demo narrative so the team presents confidently on Sunday.

**Expected Outcomes:**
- The full app is navigable end-to-end without errors.
- The three live screens (Dashboard, Pre-Ship Scan, Field Monitor) demonstrate a complete flow: scan firmware → see verdict → view drifting device → see associated alert.
- All six mock screens render correctly with fixture data.
- `docs/HANDOFF.md` is complete with all ports, env vars, and run instructions.
- The demo narrative is agreed: which screens are live, which are "here's the vision", and the story arc.

**Todo List:**
1. Run all services simultaneously; confirm `GET /devices`, `GET /alerts`, `POST /pre-ship/scan`, `GET /monitor/status` all respond correctly.
2. Open the web app and click through all 10 screens — note anything broken.
3. Fix only visibly broken items; do NOT start new features.
4. Ensure `docs/HANDOFF.md` has: service ports, how to run each service, environment variables, seed data commands.
5. Write a 3-sentence demo script: "(1) We scanned a new firmware — here's the verdict. (2) This device in the field is drifting — here's the alert. (3) Here's the full vision of the platform when fully built." Agree on it as a team.
6. Do one full rehearsal click-through.

**Relevant Context:**
- Depends on all previous sub-tasks being complete or explicitly mocked
- [`docs/DiagIoT_Team_Build_Plan (1).md`](docs/DiagIoT_Team_Build_Plan%20(1).md) — Sunday afternoon section and ground rules
- If any real feature is unstable, replace with mock before polish — a smooth demo beats a half-working one

---

## Dependency Map

```
Sub-Task 0 (Setup)
  └─► Track A (Backend A)
  │     ├─► A1 Device Registry
  │     └─► A2 Alert Bus
  └─► Track B (Backend B)
  │     ├─► B1 Pre-Ship Agent  [independent of A]
  │     └─► B2 Monitor Agent   [depends on A1 + A2]
  └─► Track C (Frontend)
        ├─► C1 App scaffold + Dashboard  [starts against mock server]
        ├─► C2 Pre-Ship + Field Monitor  [swaps to real backends when A1/A2/B1/B2 ready]
        └─► C3 Mock screens              [independent of all backends]
All tracks ──► Sub-Task 5 Integration + Polish
```
