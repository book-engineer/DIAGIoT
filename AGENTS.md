# DiagIoT — AGENTS.md

> **Bob agent guardrail:** This file defines the MVP scope for this repository.
> **Do not implement anything not listed in the MVP scope table below.**
> If a feature is not in scope, add it to the "future work" list — do not build it.

---

## MVP Scope

| Component | Status | Notes |
|---|---|---|
| Express + WebSocket server | ✅ Real | `src/server/index.js` — do not replace |
| In-process Store (EventEmitter) | ✅ Real | `src/server/store.js` — no database needed |
| Drift Engine (Pre-Ship + field scoring) | ✅ Real | `src/server/drift-engine.js` — do not modify formula |
| REST API (31 endpoints) | ✅ Real | `src/server/routes/api.js` — no new endpoints |
| Seed data | ✅ Real | `src/server/seed.js` — do not wipe |
| GitHub + Arduino integrations | ✅ Real | `src/server/integrations/` |
| Jenkins + Docker + Keil + VS Code integrations | ✅ Real | `src/server/integrations/` |
| CLI (17 commands) | ✅ Real | `src/cli/diagiot.js` |
| All 10 frontend screens | ✅ Real / Mock | `src/web/app.js` — screens defined |
| Screen router (`switchScreen`, `softRefreshScreen`) | ✅ Real | `src/web/app.js` lines 1472+ |
| Dashboard live wiring + Chart.js charts | ✅ Real | `src/web/app.js` SCREENS.dashboard |
| Pre-Ship Scan screen | ✅ Real | `src/web/app.js` SCREENS.preship |
| Field Monitor screen | ✅ Real | `src/web/app.js` SCREENS.field |
| Drift Analysis screen | ✅ Mock | Static fixture — do not replace with live logic |
| Event Timeline screen | ✅ Mock | Static fixture — do not replace with live logic |
| Firmware Diff screen | ✅ Mock | Static fixture — do not replace with live logic |
| Reproduce Incident screen | ✅ Mock | Static fixture — do not replace with live logic |
| Integrations screen | ✅ Real (status) | Wired to `window.D.integrations` |
| Engineer Onboarding screen | ✅ Mock | Static content — do not add live curation logic |
| Knowledge Base screen | ✅ Real (search) | Wired to `GET /api/knowledge` |

## Out of Scope — Do NOT Build

- Separate `agents/pre-ship/`, `agents/monitor/`, `agents/onboarding/` microservices
- Persistent database (SQLite, Postgres, etc.) — in-process store is sufficient
- Real 6×6 correlation matrix computation
- Multi-hypothesis ranking engine
- Incident replay simulation engine
- Onboarding Agent live knowledge curation
- Firmware Store service
- GitLab or SEGGER integrations
- Any new REST API endpoints
- Authentication enforcement (JWT guard is optional by design)

---

## Entity Schemas

### Device
```json
{
  "id":          "SH-X4-3192",
  "name":        "SensorHub-X4 #3192",
  "fleet":       "Pacific NW Grid",
  "fw":          "v3.8.2-rc4",
  "driftScore":  0.87,
  "health":      "critical",
  "source":      "jlink",
  "ip":          "10.24.11.92",
  "updatedAt":   "ISO8601"
}
```

### Alert
```json
{
  "id":             "alt-001",
  "source":         "monitor",
  "deviceId":       "SH-X4-3192",
  "type":           "GPIO Register Mismatch",
  "severity":       "CRITICAL",
  "driftScore":     0.87,
  "message":        "...",
  "acknowledged":   false,
  "acknowledgedBy": null,
  "acknowledgedAt": null,
  "createdAt":      "ISO8601"
}
```

### Scan
```json
{
  "id":        "scan-0828-rc4",
  "target":    "fw-v3.8.2-rc4",
  "checks":    [{ "name": "...", "status": "PASS|FAIL", "score": 0.12, "detail": "..." }],
  "scores":    { "binaryDiff": 0.30, "behavioralSig": 0.25, "knownVulns": 0.20, "hwCompat": 0.15, "configDrift": 0.10 },
  "composite": 0.76,
  "decision":  "block",
  "label":     "CRITICAL",
  "createdAt": "ISO8601"
}
```

### KnowledgeArticle
```json
{
  "id":              "kb-082",
  "title":           "STM32F4 ADC Sampling Drift on Shared DMA Buffer",
  "affectedDevices": "SensorHub-X4, ActuatorBridge-M7",
  "rootCause":       "...",
  "resolution":      "...",
  "tags":            ["adc", "dma", "stm32"],
  "createdAt":       "ISO8601"
}
```

---

## Drift Score Formula

### Pre-Ship (firmware risk)
```
composite = (binaryDiff × 0.30) + (behavioralSig × 0.25) + (knownVulns × 0.20)
          + (hwCompat × 0.15) + (configDrift × 0.10)
```

### Field telemetry (device health)
```
composite = (adcOffset × 0.25) + (gpio × 0.15) + (clockSkew × 0.20)
          + (powerRipple × 0.20) + (temp × 0.10) + (memUsage × 0.10)
```

### Thresholds
| Range | Label | Action |
|---|---|---|
| 0.00 – 0.19 | SAFE | No action |
| 0.20 – 0.39 | LOW | Informational |
| 0.40 – 0.69 | WARNING | Review required |
| 0.70 – 1.00 | CRITICAL | Block / urgent alert |

Configurable via env: `DRIFT_THRESHOLD_WARN=0.40`, `DRIFT_THRESHOLD_BLOCK=0.70`

---

## Three Agents (implemented in `src/server/`)

| Agent | ID | Logic location |
|---|---|---|
| 🛡 Pre-Ship | `preship` | `drift-engine.js` → `computePreShipScore()` |
| 👁 Monitor | `monitor` | `drift-engine.js` → `evaluateTelemetry()` |
| 🧭 Onboarding | `onboard` | `store.js` → KB methods (mocked for MVP) |

Agent statuses are tracked in `store.agents` and broadcast via WebSocket `agent:updated` events.
