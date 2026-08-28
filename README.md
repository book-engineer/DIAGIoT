# DIAGIoT
DiagIoT is a AI–powered agentic toolkit that catches hardware/firmware drift in embedded IoT systems — before it ships, while it's failing in the field, and while onboarding new engineers.
# DiagIoT

**Agentic drift detection platform for embedded IoT fleets.**

> Status: Pre-implementation / design-complete. This README accompanies `DiagIoT_System_Technical_Summary.docx` (v1.0), the authoritative spec for the system described below.

---

## What is DiagIoT?

Embedded IoT devices in factory, logistics, energy, and infrastructure deployments degrade silently — a sensor's readings drift, a firmware update subtly changes timing, a power rail develops ripple that couples into an ADC channel. These issues are slow, cross-domain, and invisible to simple threshold monitors, yet they cause cascading failures in the field.

DiagIoT replaces static rules and manual diagnosis with **three autonomous agents**, each owning a phase of the device lifecycle:

| Agent | Phase | Mission |
|---|---|---|
| 🛡 **Pre-Ship Agent** | Pre-deployment | Gate-keep firmware before it reaches devices — scan, score, and block releases that carry drift risk |
| 👁 **Monitor & Investigate Agent** | In-field | Continuously watch the fleet, detect drift, correlate across signals, form root-cause hypotheses, and replay incidents |
| 🧭 **Onboarding Agent** | Human enablement | Guide new engineers through the platform, curate institutional knowledge, and accelerate investigation skills |

Together they form a closed loop: **scan before ship → monitor in field → investigate when drift is found → capture knowledge → apply it to the next scan.**

---

## Architecture at a glance

```
Pre-Ship Agent ──(baseline data)──► Monitor & Investigate Agent
Monitor & Investigate ──(incident findings)──► Onboarding Agent
Onboarding ──(runbooks)──► Pre-Ship (scan policies)
Monitor & Investigate ──(field drift patterns)──► Pre-Ship (scan rule updates)
```

Agents are semi-autonomous: each owns its domain, acts independently, and communicates through shared, event-driven services rather than direct calls.

**Shared Services:** Device Registry · Drift Engine · Alert Bus · Firmware Store · Knowledge Base · Integration Hub

Full topology, the drift-detection pipeline, and the integration flow diagrams are in Sections 2 and 5 of the technical summary.

---

## Core concept: the drift score

A single normalized `0.00–1.00` metric drives every decision in the platform, used identically by the Pre-Ship Agent (firmware risk) and the Monitor Agent (device health):

| Range | Label | Action |
|---|---|---|
| 0.00–0.20 | Safe | No action |
| 0.21–0.39 | Low | Informational |
| 0.40–0.69 | Warning | Review required |
| 0.70–1.00 | Critical | Block / urgent alert |

---

## Key features

- **Pre-Ship scanning** — hooks into Arduino IDE, VS Code/PlatformIO, Keil, Jenkins, GitHub, and Docker builds; computes a weighted drift score (binary diff, behavioral signature, known vulnerability patterns, HW compatibility, config drift) and issues a Pass / Warn / Block verdict.
- **Fleet monitoring & drift detection** — real-time per-device health (Healthy / Drifting / Critical) across device types.
- **Cross-signal correlation** — a 6×6 signal correlation matrix surfaces cross-domain relationships (e.g., power ripple ↔ ADC offset).
- **Root-cause hypotheses** — ranked, confidence-scored explanations (Primary / Secondary / Alternative) traceable to specific components and firmware versions.
- **Incident replay** — a simulation lab that injects hypothesized fault conditions and validates root causes against field data.
- **Firmware diff** — binary-level, register-aware comparison between running and baseline firmware.
- **Guided onboarding & knowledge curation** — interactive modules for new engineers, with knowledge-base articles auto-generated from resolved incidents.

---

## Screens

| Screen | Owning agent |
|---|---|
| System Health Dashboard | Shared |
| Pre-Ship Scan | 🛡 Pre-Ship |
| Field Monitor | 👁 Monitor |
| Drift Analysis | 👁 Monitor |
| Event Timeline | 👁 Monitor |
| Firmware Diff | 👁 Monitor |
| Reproduce Incident | 👁 Monitor |
| Integrations | Shared |
| Engineer Onboarding | 🧭 Onboarding |
| Knowledge Base | 🧭 Onboarding |

---

## Data model (core entities)

`Device` · `Firmware` · `Alert` · `Incident` · `Hypothesis` · `KnowledgeArticle` · `Integration`

Full field-level schemas are in Section 4 of the technical summary.

---

## Supported integrations

| Integration | Type | Status |
|---|---|---|
| Arduino IDE | IDE | Live |
| GitHub | VCS | Live |
| VS Code + PlatformIO | IDE | Live |
| Keil / STM32Cube | IDE | Partial |
| Jenkins CI | CI/CD | Connected |
| Docker / OCI | Container | Connected |
| GitLab | VCS | Planned |
| SEGGER Ozone | Debugger | Planned |

---

## UI design tokens

```css
--bg:        #0f1117;   --surface:  #181b24;   --surface2: #1e2230;
--text:      #e4e6f0;   --text-dim: #7c809a;    --border:   #2a2e3d;
--accent:    #6c8cff;   /* Monitor Agent */
--preship:   #4ecdc4;   /* Pre-Ship Agent */
--onboard:   #f0a030;   /* Onboarding Agent */
--danger:    #ef4444;
```

Each agent color has three tiers — base (active state), dim (12% opacity backgrounds), border (35% opacity outlines) — used consistently across sidebar, topbar pills, dashboard cards, and alert attribution.

---

## Scale targets

- Fleets of 100–10,000 devices
- Correlation engine: up to 36 signal pairs (6×6 matrix) per investigation

---

## Security & compliance

- Every scan, alert, hypothesis, and knowledge article is timestamped and attributed to the responsible agent.
- Pre-Ship block decisions can be overridden by authorized engineers with documented justification.
- Onboarding-curated knowledge articles are reviewable before production publication.
- Drift scores are non-repudiable once computed.

---

## Repository structure (proposed)

```
diagiot/
├── agents/
│   ├── pre-ship/
│   ├── monitor/
│   └── onboarding/
├── shared/
│   ├── device-registry/
│   ├── drift-engine/
│   ├── alert-bus/
│   ├── firmware-store/
│   ├── knowledge-base/
│   └── integration-hub/
├── web/                 # screens listed above
├── integrations/         # Arduino IDE, GitHub, Jenkins, Docker, etc. connectors
├── docs/
│   └── DiagIoT_System_Technical_Summary.docx
└── README.md
```

*(This structure is a starting proposal — adjust to your chosen stack once implementation begins.)*

---

## Getting started

No implementation exists yet — this repository currently holds the design spec. To start building:

1. Read `docs/DiagIoT_System_Technical_Summary.docx` in full (architecture, data model, drift scoring formula, screen inventory).
2. Stand up the **Shared Services** layer first (Device Registry, Drift Engine, Alert Bus) — every agent depends on it.
3. Build the **Pre-Ship Agent** next; it's the most self-contained (single screen, clear scoring formula, no dependency on live fleet data).
4. Build the **Monitor & Investigate Agent**, wiring it to the Alert Bus and Correlation Engine.
5. Build the **Onboarding Agent** last, since it consumes findings the Monitor Agent produces.

---

## Glossary

| Term | Definition |
|---|---|
| Drift | A measurable deviation in device behavior from a known-good baseline |
| Drift Score | A normalized 0.00–1.00 metric quantifying the magnitude of drift |
| Baseline | The behavioral signature of a firmware version known to be good in the field |
| Root-Cause Hypothesis | An agent-generated explanation for observed drift, ranked by confidence |
| Correlation Matrix | A signal×signal heatmap showing cross-domain drift relationships |
| Incident Replay | Simulating field conditions in a lab to verify a root-cause hypothesis |
| Gate Decision | The Pre-Ship Agent's Pass/Warn/Block verdict on a firmware release |

---

## Version

| Version | Date | Notes |
|---|---|---|
| 1.0 | 2026-08-28 | Initial system technical summary |
