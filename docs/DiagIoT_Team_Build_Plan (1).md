# DiagIoT — Sprint Plan (3-Person, Sunday Deadline)

**Deadline:** Sunday (2 days from today, Friday)
**Reality check:** The full spec in the technical summary — three complete agents, live correlation matrices, incident replay simulation, real knowledge curation — is a multi-week build, not a weekend one. This plan cuts scope to what's actually demo-able by Sunday: a handful of screens running against **real** backend logic, and the rest running against realistic **mock/fixture data** so the whole thing still looks and feels finished.

Nothing here is "fake" in a dishonest way — it's the same pattern real product demos use: build the thin slice that's real end-to-end, and stage the rest convincingly.

---

## 1. What's real vs. what's mocked

| Component | Sunday status | Why |
|---|---|---|
| **Shared Services** (Device Registry, Alert Bus) | **Real**, minimal | Everything downstream needs this; keep it to just the Device and Alert entities — skip Firmware Store and Knowledge Base as live services |
| **Pre-Ship Agent** (scoring + verdict) | **Real**, full | It's a fixed weighted formula against static inputs — no live fleet data needed, so it's genuinely buildable in a day |
| **Monitor Agent** (drift detection) | **Real**, simplified | Build basic per-device drift scoring and alert publishing; **skip** the full 6×6 correlation matrix and multi-hypothesis ranking — hardcode one illustrative hypothesis per demo incident instead |
| **Onboarding Agent** (curation) | **Mocked** | Cut entirely as live logic — the Knowledge Base screen shows 3–4 pre-written realistic articles as static content |
| Dashboard, Pre-Ship Scan, Field Monitor | **Real** UI wired to real data | These are your three "it actually works" screens — this is what you demo live |
| Drift Analysis, Event Timeline, Firmware Diff, Reproduce Incident, Knowledge Base, Onboarding | **Polished static/mock UI** | Look finished, populated with realistic fixture data, not wired to live logic |

**Demo narrative:** "Here are three screens working end-to-end against live services — here's the full vision for the rest, already designed." That's a strong, honest Sunday demo.

---

## 2. Roles (unchanged from the full plan)

| Role | Owns for Sunday |
|---|---|
| **Backend A** | Device + Alert schema, Alert Bus, minimal Shared Services API |
| **Backend B** | Pre-Ship Agent scoring logic (full) + Monitor Agent basic drift detection |
| **Frontend** | Dashboard, Pre-Ship Scan, Field Monitor (real) + all other screens (polished mock) |

---

## 3. Timeline

### Friday evening (today) — setup, ~2 hrs
- [ ] Repo created, pushed, all three cloned (done)
- [ ] `/init` run once, root `AGENTS.md` committed with: the Device/Alert schema, the drift-score formula, and **"MVP scope only — see this file's Section 1"** pasted in explicitly so nobody's Bob wanders into building the full spec
- [ ] Backend A drafts the *minimal* API contract in Plan mode: just `Device` and `Alert` fields, 3–4 REST routes. Commit as `docs/plans/api-contract-mvp.md`. Get a thumbs-up from all three in the group chat — don't wait for a meeting.
- [ ] Backend B or Frontend generates the mock server matching that contract, so Frontend can start immediately Saturday morning without waiting

### Saturday — the only full build day
- **Backend A:** Device Registry + Alert Bus, real, working against the contract. Done by midday if possible — B and Frontend are waiting on this.
- **Backend B:** Pre-Ship Agent scoring end of morning; afternoon into basic Monitor drift detection (device health status + alert publish on threshold breach — no correlation matrix)
- **Frontend:** Morning — Dashboard + Pre-Ship Scan UI against the mock server. Afternoon — swap to real APIs as Backend A/B finish; start Field Monitor
- **End of day sync (15 min, non-negotiable):** what's real, what's still mocked, what's blocking anyone

### Sunday morning — integration + the mocked screens
- Backend A/B: bug-fix real integrations; freeze scope — **no new real features today**
- Frontend: finish Field Monitor wiring; build out Drift Analysis, Event Timeline, Firmware Diff, Reproduce Incident, Knowledge Base, Onboarding as static screens with realistic fixture data (write this data now if it isn't ready)

### Sunday afternoon — polish + rehearse
- Full team: click through the whole app together once, end to end
- Fix anything visibly broken; do **not** start new features
- Agree on and rehearse the demo narrative (which 3 screens are live, which are "here's the vision")

---

## 4. Ground rules for the weekend

- **No new scope after Saturday morning.** If someone wants to add something not in Section 1, it goes in the "future work" slide, not the build.
- **A broken real feature loses to a working mock every time.** If Monitor Agent's real drift detection isn't stable by Sunday morning, mock it too — a smooth demo beats a half-working one.
- **Commit early and often**, small commits — with this timeline, a bad merge conflict Sunday afternoon is genuinely costly.
- **`docs/HANDOFF.md`**, one line per unblock, still applies — you have even less room for silent mismatches than the full-scope plan did.
