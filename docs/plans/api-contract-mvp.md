# DiagIoT — API Contract (MVP)

**Base URL:** `http://localhost:3000/api`  
**WebSocket:** `ws://localhost:3000` (optional `?token=<jwt>` for auth)  
**Content-Type:** `application/json`  
**Auth:** Optional — JWT Bearer token via `SUPABASE_JWT_SECRET`. Disabled by default.

---

## Fleet

### `GET /api/fleet/summary`
Returns aggregated fleet health KPIs.

**Response:**
```json
{
  "total":        8,
  "healthy":      4,
  "drifting":     2,
  "critical":     2,
  "uptime":       "75.0%",
  "alertCount":   4,
  "agentsOnline": 3
}
```

---

### `GET /api/fleet/devices`
Returns all registered devices.

**Query params:** `?fleet=<string>` (filter by fleet name), `?health=healthy|warning|critical`

**Response:** Array of Device objects.

```json
[
  {
    "id":          "SH-X4-3192",
    "name":        "SensorHub-X4 #3192",
    "fleet":       "Pacific NW Grid",
    "fw":          "v3.8.2-rc4",
    "driftScore":  0.87,
    "driftLabel":  "CRITICAL",
    "health":      "critical",
    "source":      "jlink",
    "ip":          "10.24.11.92",
    "updatedAt":   "2026-08-28T10:00:00.000Z"
  }
]
```

---

### `GET /api/fleet/devices/:id`
Returns a single device by ID.

**Response:** Device object (see above) or `404`.

---

### `POST /api/fleet/devices`
Register a new device.

**Body:**
```json
{ "id": "MY-DEV-001", "name": "My Device", "fleet": "Lab", "fw": "v1.0.0", "source": "serial" }
```

**Response:** `201` — created Device object.

---

### `GET /api/fleet/devices/:id/telemetry?limit=60`
Returns the last N telemetry samples for a device (default 60, max 300).

**Response:** Array of telemetry samples:
```json
[{ "adcOffset": 48, "gpioState": 1, "clockSkewNs": 12, "powerRippleMv": 22, "tempC": 24.1, "memUsage": 0.41, "driftScore": 0.44, "ts": "ISO8601" }]
```

---

### `POST /api/fleet/devices/:id/telemetry`
Push a telemetry sample. Triggers drift evaluation and alert if threshold crossed.

**Body:**
```json
{ "readings": { "adcOffset": 148, "gpioState": 0, "clockSkewNs": 120, "powerRippleMv": 62, "tempC": 31.2, "memUsage": 0.78 } }
```

**Response:**
```json
{ "ok": true, "deviceId": "SH-X4-3192", "driftResult": { "score": 0.87, "label": "CRITICAL", "decision": "block", "breakdown": {} } }
```

---

## Alerts

### `GET /api/alerts`
Returns alerts, newest first.

**Query params:** `?sev=CRITICAL|WARNING|INFO`, `?acknowledged=true|false`

**Response:** Array of Alert objects:
```json
[
  {
    "id":             "alt-001",
    "source":         "monitor",
    "deviceId":       "SH-X4-3192",
    "type":           "GPIO Register Mismatch",
    "severity":       "CRITICAL",
    "driftScore":     0.87,
    "message":        "GPIO register PORTB_CRH configuration mismatch...",
    "acknowledged":   false,
    "acknowledgedBy": null,
    "acknowledgedAt": null,
    "createdAt":      "ISO8601"
  }
]
```

---

### `POST /api/alerts/:id/acknowledge`
Acknowledge an alert.

**Body:** `{ "user": "engineer" }` (optional)

**Response:** Updated Alert object with `acknowledged: true`.

---

## Pre-Ship Scans

### `GET /api/scans`
Returns all scans, newest first.

**Response:** Array of Scan objects.

---

### `GET /api/scans/latest?target=<fw-version>`
Returns the most recent scan, optionally filtered by target firmware version.

**Response:** Scan object or `404`.

---

### `POST /api/scans/run`
Run a Pre-Ship firmware scan. Core Pre-Ship Agent endpoint.

**Body:**
```json
{
  "target": "fw-v3.8.2-rc5",
  "checks": [
    { "name": "ELF Static Memory Sizing", "status": "PASS", "score": 0.12 },
    { "name": "Peripheral Register Delta", "status": "FAIL", "score": 0.88, "detail": "TIM2_PSC shifted" }
  ],
  "scores": {
    "binaryDiff":    0.30,
    "behavioralSig": 0.10,
    "knownVulns":    0.05,
    "hwCompat":      0.05,
    "configDrift":   0.05
  }
}
```

**Response:** `201`
```json
{
  "id":        "scan-1234567890",
  "target":    "fw-v3.8.2-rc5",
  "composite": 0.127,
  "decision":  "pass",
  "label":     "SAFE",
  "checks":    [...],
  "scores":    {...},
  "createdAt": "ISO8601"
}
```

Verdicts: `pass` (< 0.40) · `warn` (0.40–0.69) · `block` (≥ 0.70)

---

## Baselines

### `GET /api/baselines/:deviceId`
Returns the captured baseline for a device or `404`.

**Response:**
```json
{
  "deviceId":   "SH-X4-3192",
  "readings":   { "adcOffset": 0, "gpioState": 1, "clockSkewNs": 0, "powerRippleMv": 5, "tempC": 22.0, "memUsage": 0.30 },
  "tag":        "manual",
  "source":     "api",
  "capturedAt": "ISO8601"
}
```

---

### `POST /api/baselines/:deviceId/capture`
Capture a new baseline for a device.

**Body:**
```json
{ "readings": { "adcOffset": 0, "gpioState": 1, "clockSkewNs": 0, "powerRippleMv": 5, "tempC": 22.0, "memUsage": 0.30 }, "tag": "golden" }
```

**Response:** `201` — Baseline object.

---

## Agents

### `GET /api/agents`
Returns status of all three agents.

**Response:**
```json
[
  { "id": "preship", "name": "Pre-Ship Agent",              "status": "active", "lastActivity": "ISO8601", "metrics": { "scansToday": 14, "blockedReleases": 2 } },
  { "id": "monitor", "name": "Monitor & Investigate Agent", "status": "active", "lastActivity": "ISO8601", "metrics": { "nodesTracked": 1247, "anomaliesIsolated": 4 } },
  { "id": "onboard", "name": "Onboarding Agent",           "status": "active", "lastActivity": "ISO8601", "metrics": { "activeTracks": 3, "kbArticlesIndexed": 3 } }
]
```

---

### `GET /api/agents/:id`
Returns a single agent by ID (`preship`, `monitor`, `onboard`).

---

## Integrations

### `GET /api/integrations`
Returns status of all 8 integrations.

**Response:**
```json
[
  { "id": "arduino", "name": "Arduino IDE / Arduino CLI", "status": "disconnected", "detail": null, "connectedAt": null },
  { "id": "github",  "name": "GitHub",                    "status": "connected",    "detail": "Webhook listener verified", "connectedAt": "ISO8601" }
]
```

Statuses: `disconnected` · `connected` · `live` · `partial` · `error`

---

### `POST /api/integrations/github/webhook`
GitHub webhook endpoint. Requires `X-Hub-Signature-256` header (HMAC-SHA256 of body with `GITHUB_WEBHOOK_SECRET`).

### `POST /api/integrations/github/artifact`
Submit a firmware artifact from a GitHub Actions step.

### `POST /api/integrations/arduino/upload`
Upload a compiled Arduino sketch for Pre-Ship scanning.

### `POST /api/integrations/arduino/telemetry`
Push telemetry from an Arduino device.

### `POST /api/integrations/jenkins/scan`
Manually trigger a Pre-Ship scan from Jenkins.

### `POST /api/integrations/docker/artifact`
Submit a Docker build artifact for scanning.

### `POST /api/integrations/keil/artifact`
Upload a Keil/STM32 `.axf` or `.elf` ELF artifact (multipart form-data).

### `POST /api/integrations/vscode/build`
VS Code extension build hook — triggers scan on PlatformIO build completion.

---

## Knowledge Base

### `GET /api/knowledge?q=<search>`
Search knowledge base articles. Returns all if no query.

**Response:** Array of KnowledgeArticle objects:
```json
[
  {
    "id":              "kb-082",
    "title":           "STM32F4 ADC Sampling Drift on Shared DMA Buffer",
    "affectedDevices": "SensorHub-X4, ActuatorBridge-M7",
    "rootCause":       "DMA circular buffer pointer overrun under high interrupt load.",
    "resolution":      "Reconfigure DMA double-buffering mode and increase TIM2 trigger ISR priority.",
    "tags":            ["adc", "dma", "stm32", "drift"],
    "createdAt":       "ISO8601"
  }
]
```

---

### `POST /api/knowledge`
Add a knowledge base article.

**Body:** KnowledgeArticle object (id auto-generated if omitted).

---

## Incidents

### `GET /api/incidents`
Returns all incidents, newest first.

### `POST /api/incidents`
Create a new incident record.

---

## System

### `GET /api/health`
Server health snapshot.

**Response:**
```json
{
  "status":       "ok",
  "version":      "1.0.0",
  "uptime":       42.1,
  "ts":           "ISO8601",
  "fleet":        { "total": 8, "healthy": 4, "drifting": 2, "critical": 2 },
  "integrations": [{ "id": "github", "status": "connected" }],
  "agents":       [{ "id": "preship", "status": "active" }]
}
```

### `GET /api/config`
Returns Supabase auth config (whether auth is enabled and the public anon key).

---

## WebSocket Events

Connect to `ws://localhost:3000` (add `?token=<jwt>` if auth is enabled).

On connect, the server immediately sends an `init` message with the full current state.

| Event type | Payload | Trigger |
|---|---|---|
| `init` | `{ fleet, devices, alerts, agents, integrations, scans, knowledge }` | On WS connect |
| `device:updated` | Device object | Any device field change |
| `alert:created` | Alert object | New alert raised |
| `alert:acknowledged` | Alert object | Alert acknowledged |
| `scan:completed` | Scan object | Pre-Ship scan run |
| `baseline:captured` | Baseline object | Baseline captured |
| `integration:updated` | Integration object | Integration status change |
| `agent:updated` | Agent object | Agent status/metrics change |
| `telemetry` | `{ deviceId, sample }` | Telemetry sample pushed |
| `knowledge:updated` | KnowledgeArticle object | KB article added/updated |
| `activity` | `{ source, ...eventData, ts }` | Integration activity (GitHub push, Jenkins build, etc.) |
