# DiagIoT — Team Build Plan (IBM Bob Workflow)

**Team size:** 3 (Backend A, Backend B, Frontend)
**Tooling:** IBM Bob (IDE + Bob Shell), Git, shared repo
**Source of truth:** `docs/DiagIoT_System_Technical_Summary.docx` + `README.md`

This document is the execution plan for turning the DiagIoT spec into a working system with a 3-person team, using IBM Bob as the primary build tool. It exists so that everyone — including each person's own Bob sessions — is working from the same conventions, sequence, and contracts.

---

## 1. Roles & ownership

| Role | Owns | Primary screens/modules |
|---|---|---|
| **Backend A** | Shared Services: Device Registry, Drift Engine, Alert Bus, Firmware Store | No dedicated screen — this is the foundation everyone else calls |
| **Backend B** | Pre-Ship Agent + Monitor & Investigate Agent logic | Pre-Ship Scan, Field Monitor, Drift Analysis, Event Timeline, Firmware Diff, Reproduce Incident (backend logic only) |
| **Frontend** | All screens (UI layer), Onboarding Agent UI + knowledge base | System Health Dashboard, Integrations, Engineer Onboarding, Knowledge Base, and the UI for every screen above |

Ownership follows the agent boundaries already defined in the spec — nobody has to invent a split, just follow Section 8 (Screen Ownership Map) of the technical summary.

**Build order (dependency-driven):**
```
Backend A (Shared Services)
      │
      ├──► Backend B (Pre-Ship Agent)       ──► Frontend (Pre-Ship Scan screen)
      │
      └──► Backend B (Monitor Agent)        ──► Frontend (Field Monitor, Drift Analysis, etc.)
                    │
                    └──► Frontend (Onboarding Agent UI, once Monitor produces findings)
```

---

## 2. Repo & Bob setup (do this once, together)

1. Create the repo with the structure from `README.md` (`agents/`, `shared/`, `web/`, `integrations/`, `docs/`).
2. Commit `README.md` and the technical summary docx into `docs/`.
3. Whoever sets up the repo first opens it in Bob and runs `/init` at the root. This generates the root `AGENTS.md` — **before anyone starts building**, edit it to explicitly include:
   - The full data model (Device, Firmware, Alert, Incident, Hypothesis, KnowledgeArticle, Integration)
   - The drift-score formula and thresholds (0.40 / 0.70 cutoffs)
   - The rule: *agents communicate only through the Alert Bus / shared services — never directly*
   - The UI design tokens and agent color system (teal/blue/amber)
4. Commit `AGENTS.md`. Everyone pulls it. Every teammate's Bob now starts every session with the same ground truth, instead of three slightly different mental models of the spec.
5. Frontend teammate additionally creates `web/AGENTS.md` (Bob supports nested, directory-scoped context) containing just the screen ownership map, component library, and design tokens — so their Bob sessions don't have to re-derive backend context every time.

---

## 3. The API contract — the one thing to freeze early

This is the highest-risk seam in a 3-person split: if the frontend starts guessing at field names before the backend settles them, you get rework.

1. **Backend A**, in Bob's **Plan mode**, drafts the Shared Services API/schema (REST routes + the Device/Firmware/Alert/Incident/Hypothesis fields from the data model) and saves it as `docs/plan-shared-services-api.md`.
2. The team reviews and agrees on this file together — treat it like a short design review, not a rubber stamp.
3. Commit it. This file is now the contract. Backend B builds agent logic against it; Frontend builds screens against it; nobody touches field names without updating this file first and telling the other two.
4. Backend A (or Bob, asked directly) generates a lightweight mock server matching this contract, so Frontend isn't blocked waiting for the real Pre-Ship/Monitor logic to exist.

---

## 4. Build sequence & milestones

| Phase | Backend A | Backend B | Frontend |
|---|---|---|---|
| **1** | Plan + build Shared Services (Device Registry, Drift Engine, Alert Bus) against the frozen contract | Plan the Pre-Ship Agent scoring logic (can start in parallel — the formula is fixed and doesn't depend on Shared Services being live) | Build screens against the **mock server**: System Health Dashboard, Pre-Ship Scan (static/mock data) |
| **2** | Build Firmware Store; wire Alert Bus to real event publishing | Implement Pre-Ship Agent against real Shared Services; start Monitor Agent (drift detection + correlation matrix) | Wire Pre-Ship Scan to the real Pre-Ship Agent; build Field Monitor and Drift Analysis against mock data |
| **3** | Support integrations (GitHub/Jenkins/Docker webhooks → Alert Bus) | Finish Monitor Agent: root-cause hypotheses, incident replay/simulation | Wire Field Monitor, Drift Analysis, Event Timeline, Firmware Diff, Reproduce Incident to real Monitor Agent |
| **4** | — | Build Onboarding Agent: knowledge curation triggered by Monitor findings | Build Engineer Onboarding + Knowledge Base screens against real Onboarding Agent |
| **5 (all)** | Integration testing across all three agents end-to-end (the Section 6.2 cross-agent workflow: detect → correlate → hypothesize → replay → curate → update scan policy) | | |

Each phase ends with everyone's Bob-generated plan files and code merged to a shared branch and reviewed together before moving on — don't let phases overlap by more than one at a time, or the contract-drift risk comes back.

---

## 5. Weekly workflow per person

1. **Start of week:** pull latest `main`, re-read `AGENTS.md` if it changed, open a new Bob chat (fresh context) for the week's task.
2. **Plan mode first** for anything bigger than a small fix — save the plan file into `docs/plans/` with your name and the task (e.g., `docs/plans/backendA-alert-bus.md`) so teammates can see what you're about to build without asking.
3. **Agent mode** to implement, with auto-approval left on **Read only** — you still review every write/execute action.
4. **Before opening a PR:** ask Bob (Ask mode) to summarize the diff against the contract file, so you catch accidental schema drift yourself before a teammate does.
5. **PR review is still human.** Bob's approval workflow only governs what Bob does in your own session — it is not a substitute for a teammate reviewing your PR, especially anything touching the shared API contract.

---

## 6. Keeping the three of you in sync

- **Contract changes require a 2-line Slack/message + a commit to `plan-shared-services-api.md`** before anyone builds against the new shape — never a silent field rename.
- **Use a shared `docs/HANDOFF.md`** for short, dated notes when one person's work unblocks another (e.g., "2026-09-02 — Backend A: Alert Bus live at `/api/alerts`, publishes on drift ≥ 0.40"). Point teammates' Bob sessions at it in Ask mode instead of re-explaining verbally.
- **Weekly 15-minute sync** to walk through `docs/plans/*` from the past week — cheaper than finding a mismatch after both sides have built on top of it.
- If you're on a paid Bob seat, turn on **Bobalytics** so you can see all three people's usage/spend in one place rather than each person guessing at their own consumption.

---

## 7. Definition of done (per phase)

A phase isn't done until:
- [ ] Code merged to `main` and passing whatever tests exist for that module
- [ ] `AGENTS.md` and the API contract file updated if anything changed
- [ ] `docs/HANDOFF.md` updated with what's now live and what it unblocks
- [ ] The relevant screen(s) in `/web` are wired to real data, not the mock server
