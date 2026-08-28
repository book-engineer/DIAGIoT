/**
 * DiagIoT Backend — Data Store
 *
 * In-process state store that is populated by real integration adapters.
 * No hardcoded values — all data written here comes from live integrations:
 * GitHub webhooks, Arduino CLI serial reads, Jenkins API polls, Docker events, etc.
 *
 * Consumers (routes, CLI, WebSocket broadcast) read from this store.
 */

'use strict';

const { EventEmitter } = require('events');

class Store extends EventEmitter {
  constructor() {
    super();

    /** @type {Map<string, Device>} */
    this.devices = new Map();

    /** @type {Map<string, Alert>} */
    this.alerts = new Map();

    /** @type {Map<string, ScanResult>} */
    this.scans = new Map();

    /** @type {Map<string, Baseline>} */
    this.baselines = new Map();

    /** @type {Map<string, Integration>} */
    this.integrations = new Map([
      ['arduino',  { id: 'arduino',  name: 'Arduino IDE / Arduino CLI', status: 'disconnected', detail: null, connectedAt: null }],
      ['github',   { id: 'github',   name: 'GitHub',                    status: 'disconnected', detail: null, connectedAt: null }],
      ['vscode',   { id: 'vscode',   name: 'VS Code + PlatformIO',      status: 'disconnected', detail: null, connectedAt: null }],
      ['jenkins',  { id: 'jenkins',  name: 'Jenkins CI',                status: 'disconnected', detail: null, connectedAt: null }],
      ['docker',   { id: 'docker',   name: 'Docker / OCI',              status: 'disconnected', detail: null, connectedAt: null }],
      ['keil',     { id: 'keil',     name: 'Keil / STM32CubeIDE',       status: 'disconnected', detail: null, connectedAt: null }],
      ['gitlab',   { id: 'gitlab',   name: 'GitLab',                    status: 'disconnected', detail: null, connectedAt: null }],
      ['segger',   { id: 'segger',   name: 'SEGGER Ozone / J-Link',     status: 'disconnected', detail: null, connectedAt: null }],
    ]);

    /** @type {Map<string, AgentStatus>} */
    this.agents = new Map([
      ['preship',  { id: 'preship',  name: 'Pre-Ship Agent',             status: 'idle',    lastActivity: null, metrics: {} }],
      ['monitor',  { id: 'monitor',  name: 'Monitor & Investigate Agent', status: 'idle',    lastActivity: null, metrics: {} }],
      ['onboard',  { id: 'onboard',  name: 'Onboarding Agent',           status: 'idle',    lastActivity: null, metrics: {} }],
    ]);

    /** @type {TelemetrySample[]} — ring buffer, last 300 samples per device */
    this.telemetry = new Map();

    /** @type {KnowledgeArticle[]} — populated by Onboarding Agent curation */
    this.knowledge = [];

    /** @type {Incident[]} */
    this.incidents = [];
  }

  // ── Devices ──────────────────────────────────────────────
  upsertDevice(device) {
    const existing = this.devices.get(device.id) || {};
    const merged = { ...existing, ...device, updatedAt: new Date().toISOString() };
    this.devices.set(device.id, merged);
    this.emit('device:updated', merged);
    return merged;
  }

  getDevice(id) { return this.devices.get(id) || null; }
  getAllDevices() { return Array.from(this.devices.values()); }

  // ── Alerts ───────────────────────────────────────────────
  addAlert(alert) {
    const id = alert.id || `alert-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const full = { ...alert, id, createdAt: new Date().toISOString(), acknowledged: false };
    this.alerts.set(id, full);
    this.emit('alert:created', full);
    // Update agent metrics
    const mon = this.agents.get('monitor');
    if (mon) {
      mon.metrics.alertCount = (mon.metrics.alertCount || 0) + 1;
      mon.lastActivity = full.createdAt;
    }
    return full;
  }

  acknowledgeAlert(id, user) {
    const alert = this.alerts.get(id);
    if (!alert) return null;
    alert.acknowledged = true;
    alert.acknowledgedBy = user || 'cli';
    alert.acknowledgedAt = new Date().toISOString();
    this.emit('alert:acknowledged', alert);
    return alert;
  }

  getAlerts({ sev, acknowledged } = {}) {
    let list = Array.from(this.alerts.values());
    if (sev) list = list.filter(a => a.severity?.toLowerCase() === sev.toLowerCase());
    if (acknowledged !== undefined) list = list.filter(a => a.acknowledged === acknowledged);
    return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  // ── Scans ────────────────────────────────────────────────
  addScan(scan) {
    const id = scan.id || `scan-${Date.now()}`;
    const full = { ...scan, id, createdAt: new Date().toISOString() };
    this.scans.set(id, full);
    this.emit('scan:completed', full);
    const ps = this.agents.get('preship');
    if (ps) {
      ps.metrics.scanCount = (ps.metrics.scanCount || 0) + 1;
      if (full.decision === 'block') ps.metrics.blockedCount = (ps.metrics.blockedCount || 0) + 1;
      ps.lastActivity = full.createdAt;
    }
    return full;
  }

  getLastScan(target) {
    const all = Array.from(this.scans.values());
    if (target) return all.filter(s => s.target === target).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0] || null;
    return all.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0] || null;
  }

  getAllScans() { return Array.from(this.scans.values()).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); }

  // ── Baselines ────────────────────────────────────────────
  setBaseline(deviceId, baseline) {
    const full = { ...baseline, deviceId, capturedAt: new Date().toISOString() };
    this.baselines.set(deviceId, full);
    this.emit('baseline:captured', full);
    return full;
  }

  getBaseline(deviceId) { return this.baselines.get(deviceId) || null; }

  // ── Telemetry ────────────────────────────────────────────
  pushTelemetry(deviceId, sample) {
    if (!this.telemetry.has(deviceId)) this.telemetry.set(deviceId, []);
    const buf = this.telemetry.get(deviceId);
    buf.push({ ...sample, ts: new Date().toISOString() });
    if (buf.length > 300) buf.shift();       // ring buffer
    this.emit('telemetry', { deviceId, sample });
  }

  getTelemetry(deviceId, limit = 60) {
    const buf = this.telemetry.get(deviceId) || [];
    return buf.slice(-limit);
  }

  // ── Integrations ─────────────────────────────────────────
  setIntegrationStatus(id, status, detail) {
    const intg = this.integrations.get(id);
    if (!intg) return;
    intg.status = status;
    intg.detail = detail || intg.detail;
    intg.connectedAt = status === 'live' || status === 'connected' ? new Date().toISOString() : intg.connectedAt;
    this.emit('integration:updated', intg);
    return intg;
  }

  getAllIntegrations() { return Array.from(this.integrations.values()); }
  getIntegration(id) { return this.integrations.get(id) || null; }

  // ── Agents ───────────────────────────────────────────────
  setAgentStatus(id, status, metrics) {
    const agent = this.agents.get(id);
    if (!agent) return;
    agent.status = status;
    if (metrics) agent.metrics = { ...agent.metrics, ...metrics };
    agent.lastActivity = new Date().toISOString();
    this.emit('agent:updated', agent);
    return agent;
  }

  getAllAgents() { return Array.from(this.agents.values()); }

  // ── Knowledge Base ───────────────────────────────────────
  addKnowledgeArticle(article) {
    const id = article.id || `kb-${Date.now()}`;
    const full = { ...article, id, createdAt: article.createdAt || new Date().toISOString() };
    const existing = this.knowledge.findIndex(a => a.id === id);
    if (existing >= 0) this.knowledge[existing] = full;
    else this.knowledge.push(full);
    this.emit('knowledge:updated', full);
    return full;
  }

  searchKnowledge(term) {
    if (!term) return this.knowledge;
    const t = term.toLowerCase();
    return this.knowledge.filter(a =>
      a.title?.toLowerCase().includes(t) ||
      a.body?.toLowerCase().includes(t) ||
      a.tags?.some(tag => tag.toLowerCase().includes(t))
    );
  }

  // ── Fleet summary ─────────────────────────────────────────
  getFleetSummary() {
    const devices = this.getAllDevices();
    const total = devices.length;
    const healthy  = devices.filter(d => d.driftScore < 0.4).length;
    const drifting = devices.filter(d => d.driftScore >= 0.4 && d.driftScore < 0.7).length;
    const critical = devices.filter(d => d.driftScore >= 0.7).length;
    const uptime   = total > 0 ? ((healthy + drifting) / total * 100).toFixed(1) : 'N/A';
    const alertCount = this.getAlerts({ acknowledged: false }).length;
    const agentsOnline = Array.from(this.agents.values()).filter(a => a.status !== 'idle').length;
    return { total, healthy, drifting, critical, uptime: `${uptime}%`, alertCount, agentsOnline };
  }

  // ── Incidents ─────────────────────────────────────────────
  addIncident(incident) {
    const id = incident.id || `inc-${Date.now()}`;
    const full = { ...incident, id, createdAt: new Date().toISOString() };
    this.incidents.push(full);
    this.emit('incident:created', full);
    return full;
  }

  getIncidents() { return [...this.incidents].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); }
}

// Singleton store shared across all modules
const store = new Store();
module.exports = store;
