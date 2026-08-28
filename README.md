# DIAGIoT
DiagIoT is a AI–powered agentic toolkit that catches hardware/firmware drift in embedded IoT systems — before it ships, while it's failing in the field, and while onboarding new engineers.
DiagIoT — System Technical Summary
Version: 1.0
Date: 2026-08-28
Classification: Internal / Product Technical Reference 
1. Executive Overview
DiagIoT is an agentic drift detection platform for embedded IoT. It autonomously monitors fleets of embedded devices, detects when their behavior "drifts" from known-good baselines, and orchestrates investigation, reproduction, and remediation through three specialized autonomous agents.
Core Problem
Embedded IoT devices in factory, logistics, energy, and infrastructure deployments degrade silently. A sensor that once read within ±2 LSB starts reading ±8 LSB. A firmware update subtly changes timing behavior. A power rail develops ripple that couples into ADC channels. These drifts are slow, cross-domain, and invisible to simple threshold monitors — yet they cause cascading failures in the field.
DiagIoT's Answer
Instead of relying on static rules or manual diagnosis, DiagIoT deploys three autonomous agents that each own a phase of the device lifecycle:
Agent	Phase	Mission
🛡 Pre-Ship Agent	Pre-deployment	Gate-keep firmware before it reaches devices — scan, score, and block releases that carry drift risk
👁 Monitor & Investigate Agent	In-field	Continuously watch the fleet, detect drift, correlate across signals, form root-cause hypotheses, and replay incidents
🧭 Onboarding Agent	Human enablement	Guide new engineers through the platform, curate institutional knowledge, and accelerate investigation skills
Together, these agents create a closed loop: scan before ship → monitor in field → investigate when drift is found → capture knowledge → apply it to the next scan.
2. System Architecture
2.1 High-Level Topology
┌─────────────────────────────────────────────────────────────────┐
│                        DiagIoT Platform                         │
│                                                                 │
│  ┌─────────────┐  ┌──────────────────────┐  ┌───────────────┐  │
│  │  Pre-Ship   │  │  Monitor &           │  │  Onboarding   │  │
│  │  Agent      │  │  Investigate Agent   │  │  Agent         │  │
│  │             │  │                      │  │               │  │
│  │ • Scan      │  │ • Field Monitoring   │  │ • Onboarding  │  │
│  │ • Score     │  │ • Drift Detection    │  │ • Knowledge   │  │
│  │ • Block     │  │ • Correlation        │  │   Curation    │  │
│  │ • Baseline  │  │ • Root-Cause         │  │ • Skill       │  │
│  │   Capture   │  │   Hypothesis         │  │   Building    │  │
│  └──────┬──────┘  └──────────┬───────────┘  └───────┬───────┘  │
│         │                    │                      │          │
│         └────────────────────┼──────────────────────┘          │
│                              │                                  │
│                    ┌─────────▼─────────┐                       │
│                    │   Shared Services  │                       │
│                    │                   │                       │
│                    │ • Device Registry │                       │
│                    │ • Drift Engine    │                       │
│                    │ • Alert Bus       │                       │
│                    │ • Firmware Store  │                       │
│                    │ • Knowledge Base  │                       │
│                    │ • Integration Hub │                       │
│                    └─────────┬─────────┘                       │
│                              │                                  │
│              ┌───────────────┼───────────────┐                  │
│              ▼               ▼               ▼                  │
│     ┌──────────────┐ ┌────────────┐ ┌──────────────┐           │
│     │  CI/CD       │ │  IDEs /    │ │  Build       │           │
│     │  Pipelines   │ │  Tooling   │ │  Systems     │           │
│     └──────────────┘ └────────────┘ └──────────────┘           │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
     ┌──────────────┐ ┌────────────┐ ┌──────────────┐
     │  IoT Device  │ │  IoT Device│ │  IoT Device  │
     │  Fleet       │ │  Fleet     │ │  Fleet       │
     └──────────────┘ └────────────┘ └──────────────┘
2.2 Agent Communication Model
Agents are semiautonomous — each owns its domain and acts independently, but they share a common data substrate and can feed each other:
Pre-Ship ──(baseline data)──► Monitor & Investigate
Monitor & Investigate ──(incident findings)──► Onboarding (knowledge articles)
Onboarding ──(runbooks)──► Pre-Ship (scan policies)
Monitor & Investigate ──(field drift patterns)──► Pre-Ship (scan rule updates)
No agent commands another. Communication is event-driven and asynchronous:
	When the Pre-Ship Agent blocks a firmware, it publishes a block event → Monitor subscribes to track the device post-deployment.
	When the Monitor Agent resolves a root cause, it publishes a finding → Onboarding subscribes to create or update a knowledge article.
	When the Onboarding Agent curates a new runbook, it publishes a rule suggestion → Pre-Ship subscribes to update scan policies.
3. Agent Deep-Dives
3.1 Pre-Ship Agent (🛡)
Identity: Teal #4ecdc4 · Shield icon 🛡
Phase: Pre-deployment
Scope: 1 dedicated screen (Pre-Ship Scan) + shared Dashboard
Responsibilities
Function	Description
Firmware Scanning	Accept firmware binaries from CI/CD pipelines, IDEs, or manual upload. Decompile/analyze for drift risk indicators.
Drift Scoring	Compute a drift risk score (0.00–1.00) per binary, comparing against known-good baselines captured from the field by the Monitor Agent.
Gate Decision	Block releases exceeding the configurable threshold (default 0.70). Flag releases in the 0.40–0.70 warning zone for human review.
Baseline Capture	When a firmware is explicitly marked as "good" (e.g., a stable release tag), record its behavioral signature as the new baseline for that device type.
Build Integration	Hook into build systems (Arduino IDE, Keil, VS Code, Jenkins, GitHub) to automatically scan on build completion.
Drift Scoring Model
The Pre-Ship Agent computes a composite drift risk score from multiple signal categories:
Signal	Weight	Source
Binary structural diff	30%	Firmware diff against baseline
Behavioral signature	25%	Runtime telemetry comparison
Known vulnerability patterns	20%	Knowledge Base patterns from resolved incidents
Hardware compatibility flags	15%	HW revision + component specification checks
Config drift	10%	Compiler flags, optimization levels
Thresholds:
	< 0.40 → Pass — auto-flash
	0.40 – 0.70 → Warn — review required
	≥ 0.70 → Block — exceeds safety threshold
Pre-Ship Scan Screen
The scan screen is organized as a vertical pipeline (.pipe-flow):
┌─────────────┐
│  Source      │  Where the firmware came from (GitHub, Jenkins, IDE…)
├─────────────┤
│  Binary      │  The firmware artifact name + version
├─────────────┤
│  Baseline    │  Known-good version being compared against
├─────────────┤
│  Drift Score │  0.00–1.00 with color-coded gauge
├─────────────┤
│  Verdict     │  Pass / Warn / Block with action button
├─────────────┤
│  Detail      │  Breakdown of contributing factors
└─────────────┘
Below the pipeline: a filterable scan history table (source dropdown, status dropdown, search input) showing all past scans with columns for time, source, description, binary, drift score, and verdict.
3.2 Monitor & Investigate Agent (👁)
Identity: Blue #6c8cff · Eye icon 👁
Phase: In-field
Scope: 5 dedicated screens (Field Monitor, Drift Analysis, Event Timeline, Firmware Diff, Reproduce Incident) + shared Dashboard
Responsibilities
Function	Description
Fleet Monitoring	Continuously ingest telemetry from all devices in the fleet. Surface health status (Healthy / Drifting / Critical) per device type.
Drift Detection	Compute per-device drift scores in real time. Alert when scores cross configurable thresholds.
Cross-Signal Correlation	Identify relationships between drift signals across subsystems (e.g., power ripple ↔ ADC offset). Build a correlation matrix across all signal pairs.
Root-Cause Hypothesis	From correlated signals, generate ranked hypotheses (Primary / Secondary / Alternative) with confidence scores, traceable to specific hardware components and firmware versions.
Incident Replay	Load a field incident into the simulation engine. Inject the hypothesized fault conditions. Compare simulation output to field readings. Validate or reject the root-cause hypothesis.
Firmware Diff	Binary-level comparison between the running firmware version and the baseline. Highlight structural changes, added/removed functions, and register-level diffs.
Event Timeline	Chronological log of all fleet events (drift alerts, firmware pushes, config changes, hardware incidents) with severity-colored markers.
Drift Detection Pipeline
Device Telemetry ──► Ingest ──► Feature Extraction ──► Baseline Comparison
                                                        │
                                                        ▼
                                               Drift Score (0.00–1.00)
                                                        │
                                          ┌─────────────┴─────────────┐
                                          │                           │
                                     Score < 0.40              Score ≥ 0.40
                                     (Healthy)              ┌──────┴──────┐
                                                        │              │
                                                   0.40–0.70      ≥ 0.70
                                                   (Drifting)    (Critical)
                                                        │              │
                                                        ▼              ▼
                                                   Alert Bus    Urgent Alert
                                                        │         + Auto-Investigate
                                                        ▼
                                                   Correlation Engine
                                                        │
                                                        ▼
                                                   Root-Cause Hypotheses
                                                        │
                                                        ▼
                                                   Incident Replay (if validated)
Screen Breakdown
Field Monitor — Fleet-wide health dashboard:
	System registry (5 device types with device counts + health status)
	Recent alerts table with Agent column, drift score, severity badge, and device/time/type columns
	Live indicator with pulse animation
	Filter bar (search + status dropdown + agent filter)
Drift Analysis — Deep signal investigation:
	6×6 correlation matrix (signal vs signal, values 0.00–1.00)
	Primary root-cause path highlighted (ADC ↔ Power = 0.79)
	3 ranked root-cause hypotheses with confidence scores
	Hypothesis cards: Primary (🔴 89%), Secondary (🟡 62%), Alternative (🔵 31%)
	Each hypothesis links to hardware components (C34, U5) and firmware versions
Event Timeline — Chronological fleet log:
	Vertical timeline with colored severity dots (red=critical, amber=warning, blue=info)
	Each event: timestamp, device, event type, description
	Filter bar for time range and severity
Firmware Diff — Binary comparison:
	Side-by-side code view (old vs new)
	Diff highlighting: .diff-add (green), .diff-del (red)
	Register-level changes annotated
	Link back to drift analysis for correlated signals
Reproduce Incident — Simulation lab:
	Simulation setup: incident selector dropdown + load button
	Process flow: Load Baseline → Inject Drift → Monitor Response → Compare to Field → Validated ✓
	Simulation parameters: target device, FW version, HW revision, injected fault, CPU load, temperature
	Reproduction results: match score (96%), simulated vs field drift comparison, confirm/adjust buttons
3.3 Onboarding Agent (🧭)
Identity: Amber #f0a030 · Compass icon 🧭
Phase: Human enablement
Scope: 2 dedicated screens (Engineer Onboarding, Knowledge Base) + shared Dashboard
Responsibilities
Function	Description
Guided Onboarding	Walk new engineers through the platform's investigation workflow via interactive modules. Track progress per module and per engineer.
Knowledge Curation	Automatically create and update knowledge base articles when the Monitor Agent resolves incidents. Tag articles by severity and device type.
Skill Assessment	Verify engineers understand drift detection concepts through hands-on lab exercises with real (anonymized) incident data.
Contextual Help	Provide in-screen guidance during active investigations, referencing relevant past incidents and runbooks.
Onboarding Modules
Module	Type	Progress	Content
System Architecture	Structured lesson	✅ Complete	Platform overview, agent roles, data flows
Drift Concepts	Interactive tutorial	65% (4/6)	What drift is, scoring model, threshold interpretation
Hands-On Lab	Practical exercise	20% (1/5)	Guided investigation of real anonymized incidents
Knowledge Base
Articles are curated by the Onboarding Agent based on field findings:
Category	Examples
Critical incidents	Power-Rail Ripple → ADC Coupling, Clock Skew in Multi-MCU Systems
Warning patterns	Memory Leak Patterns in Bare-Metal FW
Runbooks / Guides	Pre-Ship Scan Runbook, Interrupt Vector Priority Guide
Post-mortems	Factory Line A Post-Mortem (Resolved)
Each article card shows: title, severity badge, device type, update timestamp, and tags. Articles are auto-updated when new drift patterns are detected — the Onboarding Agent revises content weekly based on Monitor Agent findings.
4. Data Model
4.1 Core Entities
Device
├── device_id: string (e.g., "SensorHub-X4 #3192")
├── device_type: enum (SensorHub-X4, ThermoNode-R2, ActuatorBridge-M7, EdgeGateway-E1, PowerCtrl-Z8)
├── firmware_version: string
├── hardware_revision: string
├── health_status: enum (Healthy, Drifting, Critical)
├── drift_score: float (0.00–1.00)
└── last_seen: timestamp
Firmware
├── artifact_name: string (e.g., "fw-sensor-v2.4.1.hex")
├── version: string
├── source: enum (Arduino IDE, GitHub, VS Code, Keil, Jenkins, Docker)
├── drift_score: float (0.00–1.00)
├── verdict: enum (Pass, Warn, Block)
├── baseline_version: string
└── scan_timestamp: timestamp
Alert
├── alert_id: string
├── device: reference → Device
├── alert_type: string (e.g., "GPIO Register Mismatch")
├── drift_score: float
├── severity: enum (Critical, Warning, Info)
├── owning_agent: enum (Pre-Ship, Monitor)
├── timestamp: datetime
└── status: enum (New, Investigating, Resolved)
Incident
├── incident_id: string
├── affected_devices: list → Device
├── root_cause_hypotheses: list → Hypothesis
├── correlation_matrix: Signal[][] → float
├── simulation_result: SimResult (nullable)
├── status: enum (Open, Investigating, Reproduced, Resolved)
└── created_at: timestamp
Hypothesis
├── rank: enum (Primary, Secondary, Alternative)
├── confidence: float (0.00–1.00)
├── description: string
├── hardware_components: list → string
├── firmware_versions: list → string
└── validated: boolean
KnowledgeArticle
├── article_id: string
├── title: string
├── severity: enum (Critical, Warning, Guide, Resolved)
├── device_types: list → string
├── content: markdown
├── curated_by: Onboarding Agent
├── last_updated: timestamp
└── auto_updated: boolean
Integration
├── name: string (e.g., "Arduino IDE")
├── type: enum (IDE, CI/CD, Build Tool, Debugger)
├── status: enum (Live, Connected, Partial, Disconnected)
├── connected_at: timestamp
└── config: JSON
4.2 Drift Score Semantics
The drift score is the unifying metric across the entire system:
Range	Label	Color	Action
0.00–0.20	Safe	#4ecdc4(teal/green)	No action
0.21–0.39	Low	#6c8cff(blue)	Informational
0.40–0.69	Warning	#f0a030(amber)	Review required
0.70–1.00	Critical	#ef4444(red)	Block / Urgent alert
The same scale is used by both the Pre-Ship Agent (firmware scoring) and the Monitor Agent (device health scoring), ensuring a consistent risk language across the platform.
5. Integration Layer
DiagIoT connects to the tools that embedded teams already use:
5.1 Supported Integrations
Integration	Type	Status	Hook Point
Arduino IDE	IDE	Live	Post-build scan trigger
GitHub	VCS	Live	PR push + release tag events
VS Code + PlatformIO	IDE	Live	Extension-based build hook
Keil / STM32Cube	IDE	Partial	Post-build hook (ARM toolchain)
Jenkins CI	CI/CD	Connected	Build completion webhook
Docker / OCI	Container	Connected	Image build scan
GitLab	VCS	Disconnected	Planned: merge request hooks
SEGGER Ozone	Debugger	Disconnected	Planned: flash + debug session hooks
5.2 Integration Flow
Developer commits code
       │
       ▼
CI/CD Pipeline triggers build
       │
       ▼
Build produces firmware artifact
       │
       ├──────────────────────────────────┐
       ▼                                  ▼
Pre-Ship Agent scans artifact    Manual upload
       │                            (IDE / drag-drop)
       ▼                                  │
Drift Score computed                    │
       │                                  │
       ▼                                  ▼
Verdict rendered ◄────────────────────────┘
   Pass → Auto-flash                Warn → Notify team
   Block → Halt pipeline           Info → Log only
6. Interaction Model
6.1 User Personas
Persona	Primary Screens	Typical Flow
Firmware Engineer	Pre-Ship Scan, Firmware Diff	Commit → Build → Check scan verdict → Fix or release
Site Reliability Engineer	Field Monitor, Drift Analysis, Event Timeline	Receive alert → Investigate correlation → Form hypothesis
Field Engineer	Reproduce Incident, Knowledge Base	Load incident → Reproduce in lab → Validate fix
New Team Member	Onboarding, Knowledge Base	Complete modules → Read articles → Hands-on lab
Platform Admin	Dashboard, Integrations	Monitor fleet health → Configure integrations → Set thresholds
6.2 Cross-Agent Workflow
A typical end-to-end investigation follows this pattern:
1. Monitor Agent detects drift on ActuatorBridge-M7 #5501
2. Alert surfaces on Field Monitor screen
3. Engineer opens Drift Analysis → correlation matrix shows ADC ↔ Power = 0.79
4. Monitor Agent generates 3 hypotheses → Primary: C34 capacitor under-specified
5. Engineer opens Reproduce Incident → loads simulation
6. Simulation confirms 96% match → root cause validated
7. Monitor Agent publishes resolved incident to knowledge base
8. Onboarding Agent auto-creates article: "Power-Rail Ripple → ADC Coupling"
9. Pre-Ship Agent updates scan policy: flag C34-related firmware changes
10. Next firmware scan catches the pattern pre-ship → block
7. Agent Technical Details
7.1 Agent Runtime Model
Each agent operates as an autonomous service with:
Property	Description
Ownership	Each agent owns specific screens and the data flows within them
Independence	Agents act without requiring human trigger (monitor is always-on, pre-ship scans on build, onboarding curates on incident)
Event subscription	Agents subscribe to the shared Alert Bus and act on relevant events
State	Each agent maintains its own state (scan history, alert queue, module progress)
Identity	Agents present themselves to users with a consistent name, icon, and color across every touchpoint
7.2 Agent Identity System
The identity system is designed so that users always know which agent is acting:
Touchpoint	Pre-Ship	Monitor	Onboarding
Sidebar group label	🛡 Pre-Ship Agent (teal)	👁 Monitor & Investigate Agent (blue)	🧭 Onboarding Agent (amber)
Sidebar active state	Teal left border + dim bg	Blue left border + dim bg	Amber left border + dim bg
Topbar pill	🛡 Pre-Ship (teal, pulsing)	👁 Monitor (blue, pulsing)	🧭 Onboarding (amber, pulsing)
Dashboard status card	Teal top bar, scan metrics	Blue top bar, alert metrics	Amber top bar, module metrics
Screen subtitle tag	🛡 Pre-Ship Agent (teal pill)	👁 Monitor Agent (blue pill)	🧭 Onboarding Agent (amber pill)
Alert attribution	🛡 Pre-Ship(teal)	👁 Monitor(blue)	—
Knowledge attribution	—	—	Curated by Onboarding Agent(amber banner)
Chat label	—	—	Onboarding Agent(amber text)
7.3 Color Architecture
:root {
  --preship:       #4ecdc4;   /* Teal — Pre-Ship Agent base */
  --preship-dim:   rgba(78,205,196,0.12);
  --preship-border: rgba(78,205,196,0.35);
  --monitor:       #6c8cff;   /* Blue — Monitor Agent base */
  --monitor-dim:   rgba(108,140,255,0.12);
  --monitor-border: rgba(108,140,255,0.35);
  --onboard:       #f0a030;   /* Amber — Onboarding Agent base */
  --onboard-dim:   rgba(240,160,48,0.12);
  --onboard-border: rgba(240,160,48,0.35);
}
Each agent has 3 tiers: base (full saturation), dim (12% opacity for backgrounds), and border (35% opacity for outlines). This creates a visual hierarchy where:
	Base = active/selected state (active tab, active sidebar link)
	Dim = idle/presentational background (pills, tags, card backgrounds)
	Border = containment outlines (pill borders, tag borders, banner borders)
8. Screen Inventory
8.1 Screen Ownership Map
Screen	Agent	Primary Content
System Health Dashboard	Shared (neutral)	Fleet KPIs, system registry, recent alerts, agent status panel
Pre-Ship Scan	🛡 Pre-Ship	Scan pipeline, drift gauge, filterable scan history
Field Monitor	👁 Monitor	Device health grid, live alerts table, filter bar
Drift Analysis	👁 Monitor	Correlation matrix, root-cause hypotheses, signal paths
Event Timeline	👁 Monitor	Chronological event log with severity markers
Firmware Diff	👁 Monitor	Side-by-side binary comparison with diff highlighting
Reproduce Incident	👁 Monitor	Simulation setup, parameter controls, reproduction results
Integrations	Shared (neutral)	Connected tool cards with status indicators
Engineer Onboarding	🧭 Onboarding	Module progress cards, interactive chat panel
Knowledge Base	🧭 Onboarding	Article grid with curation banner, severity tags
8.2 Navigation Model
	Sidebar (fixed left, 240px): 4 branded groups with agent-colored headers
	Screen tabs (top of main area): 10 horizontal tabs, active state colored by owning agent
	Cross-linking: Screens reference each other (e.g., Drift Analysis links to Firmware Diff, Reproduce Incident links back to Drift Analysis)
9. UI Framework
9.1 Design Tokens
Token	Value	Usage
--bg	#0f1117	Page background
--surface	#181b24	Card/container background
--surface2	#1e2230	Elevated surface (inputs, secondary panels)
--text	#e4e6f0	Primary text
--text-dim	#7c809a	Secondary/muted text
--accent	#6c8cff	Primary accent (same as Monitor Agent)
--border	#2a2e3d	Borders, dividers
--ok	#4ecdc4	Success / safe / pass
--warn	#f0a030	Warning / moderate risk
--danger	#ef4444	Critical / blocked / fail
9.2 Component Library
Category	Components
Layout	Topbar (48px), Sidebar (240px), Main (scrollable), Frame label (fixed)
Navigation	Screen tabs, Sidebar groups + links, Agent pills
Data Display	Cards, Stat blocks, Data tables, Correlation matrix, Timeline
Visualization	Bar charts, Drift meters, Progress bars, Process flows, Pipeline diagrams
Code	Code blocks, Diff views (add/del highlighting)
Input	Filter bars (search + dropdown), Select dropdowns, Toggle switches, Buttons
Status	Severity badges (ok/warn/danger/info), Pulse dots, Live indicators, Status dots
Agent	Agent cards, Agent tags, Curation banners, Agent pills, Group labels
Onboarding	Module cards, Chat panels, Progress tracks
Integration	Integration cards (icon + status + config)
9.3 Animation Inventory
Animation	Duration	Purpose
agent-pulse	1.4s infinite	Agent status dot breathing (opacity + scale)
pulse-ring	1.5s infinite	Live indicator expanding ring
Bar entrance	Staggered	Chart bars animate from 0% to target height on load
10. Security & Compliance Model
10.1 Access Control
	Agent actions are audited: every scan, alert, hypothesis, and knowledge article is timestamped and attributed to the responsible agent.
	Block decisions by the Pre-Ship Agent can be overridden by authorized engineers with documented justification.
	Knowledge Base articles created by the Onboarding Agent are reviewable before publication in production environments.
10.2 Data Handling
	Device telemetry is processed in-stream; raw signals are retained per configurable retention policy.
	Firmware binaries are stored in the Firmware Store with integrity checksums.
	Drift scores are non-repudiable: once computed, they are logged and cannot be retroactively modified.
11. Scalability & Deployment
11.1 Fleet Scale
	Current design targets fleets of 100–10,000 devices.
	Device registry supports grouping by type, location, firmware version, and health status.
	Correlation engine processes up to 36 signal pairs (6×6 matrix) per investigation.
11.2 Integration Extensibility
New integrations follow the Integration Card pattern:
Register the tool name, type, and icon
Implement the webhook/polling connector
Map build/commit events to Pre-Ship scan triggers
Surface status (Live / Connected / Partial / Disconnected) in the Integrations grid
12. Glossary
Term	Definition
Drift	A measurable deviation in device behavior from a known-good baseline
Drift Score	A normalized 0.00–1.00 metric quantifying the magnitude of drift
Baseline	The behavioral signature of a firmware version known to be good in the field
Root-Cause Hypothesis	An agent-generated explanation for observed drift, ranked by confidence
Correlation Matrix	A signal×signal heatmap showing cross-domain drift relationships
Incident Replay	Simulating field conditions in a lab to verify a root-cause hypothesis
Agent	An autonomous service that owns a domain of the DiagIoT workflow
Curation	The Onboarding Agent's process of creating/updating knowledge articles from incident data
Gate Decision	The Pre-Ship Agent's Pass/Warn/Block verdict on a firmware release
13. Revision History
Version	Date	Author	Changes
1.0	2026-08-28	DiagIoT Team	Initial system technical summary
End of document.

