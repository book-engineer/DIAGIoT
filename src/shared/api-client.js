/**
 * DiagIoT — Shared API Client
 *
 * Used by:
 *   - src/cli/diagiot.js  (Node.js, uses built-in fetch / node-fetch fallback)
 *   - src/web/app.js      (browser, uses fetch)
 *
 * All data comes from the live backend REST API.
 * No hardcoded data in this file or its callers.
 */

'use strict';

const DEFAULT_BASE = (
  typeof process !== 'undefined' && process.env?.DIAGIOT_SERVER
    ? process.env.DIAGIOT_SERVER
    : 'http://localhost:3000'
).replace(/\/$/, '');

class DiagIoTClient {
  constructor(baseUrl) {
    this.base = (baseUrl || DEFAULT_BASE).replace(/\/$/, '');
  }

  async _fetch(path, opts = {}) {
    const url  = `${this.base}/api${path}`;
    // Node 18+ has native fetch; older versions need node-fetch
    const fetcher = typeof fetch !== 'undefined' ? fetch
      : (() => { try { return require('node-fetch').default || require('node-fetch'); } catch { throw new Error('No fetch available. Run: npm install node-fetch'); } })();
    const res = await fetcher(url, {
      headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
      ...opts,
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`API ${opts.method || 'GET'} ${path} → HTTP ${res.status}: ${body}`);
    }
    return res.json();
  }

  get(path)         { return this._fetch(path); }
  post(path, body)  { return this._fetch(path, { method: 'POST', body: JSON.stringify(body) }); }

  // ── Fleet ─────────────────────────────────────────────
  fleetSummary()              { return this.get('/fleet/summary'); }
  fleetDevices(q = {})        { return this.get('/fleet/devices' + toQs(q)); }
  fleetDevice(id)             { return this.get(`/fleet/devices/${encodeURIComponent(id)}`); }
  deviceTelemetry(id, limit)  { return this.get(`/fleet/devices/${encodeURIComponent(id)}/telemetry${limit ? `?limit=${limit}` : ''}`); }
  pushTelemetry(id, readings) { return this.post(`/fleet/devices/${encodeURIComponent(id)}/telemetry`, { readings }); }

  // ── Alerts ────────────────────────────────────────────
  alerts(q = {})              { return this.get('/alerts' + toQs(q)); }
  acknowledgeAlert(id, user)  { return this.post(`/alerts/${encodeURIComponent(id)}/acknowledge`, { user }); }

  // ── Scans ─────────────────────────────────────────────
  scans()                     { return this.get('/scans'); }
  latestScan(target)          { return this.get(`/scans/latest${target ? `?target=${encodeURIComponent(target)}` : ''}`); }
  runScan(target, checks, scores) { return this.post('/scans/run', { target, checks, scores }); }

  // ── Baselines ─────────────────────────────────────────
  baseline(deviceId)          { return this.get(`/baselines/${encodeURIComponent(deviceId)}`); }
  captureBaseline(deviceId, readings, tag) {
    return this.post(`/baselines/${encodeURIComponent(deviceId)}/capture`, { readings, tag });
  }

  // ── Agents ────────────────────────────────────────────
  agents()                    { return this.get('/agents'); }
  agent(id)                   { return this.get(`/agents/${encodeURIComponent(id)}`); }

  // ── Integrations ──────────────────────────────────────
  integrations()              { return this.get('/integrations'); }
  integration(id)             { return this.get(`/integrations/${encodeURIComponent(id)}`); }

  // ── Knowledge Base ────────────────────────────────────
  knowledge(q)                { return this.get(`/knowledge${q ? `?q=${encodeURIComponent(q)}` : ''}`); }
  addKnowledge(article)       { return this.post('/knowledge', article); }

  // ── Incidents ─────────────────────────────────────────
  incidents()                 { return this.get('/incidents'); }

  // ── Health ────────────────────────────────────────────
  health()                    { return this.get('/health'); }
}

function toQs(obj) {
  const entries = Object.entries(obj).filter(([, v]) => v !== undefined && v !== null);
  return entries.length ? '?' + entries.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&') : '';
}

// Export singleton for Node (CLI), and the class for browser (new DiagIoTClient(url))
if (typeof module !== 'undefined') {
  module.exports = { DiagIoTClient, client: new DiagIoTClient() };
}
// Browser: window.DiagIoTClient = DiagIoTClient;
if (typeof window !== 'undefined') {
  window.DiagIoTClient = DiagIoTClient;
}
