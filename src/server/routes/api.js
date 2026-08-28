/**
 * DiagIoT — REST API Routes
 *
 * All routes return JSON. The web frontend and CLI both call these endpoints.
 * No mock data anywhere — every response comes from the live store,
 * which is populated exclusively by real integration adapters.
 */

'use strict';

const express = require('express');
const multer  = require('multer');
const os      = require('os');
const path    = require('path');

const store     = require('../store');
const engine    = require('../drift-engine');

const github    = require('../integrations/github');
const arduino   = require('../integrations/arduino');
const jenkins   = require('../integrations/jenkins');
const dockerInt = require('../integrations/docker');
const keil      = require('../integrations/keil');
const vscode    = require('../integrations/vscode');

const router  = express.Router();
const upload  = multer({ dest: os.tmpdir() });

// ── Middleware: capture raw body for GitHub HMAC verification ──
router.use(express.json({
  verify: (req, _res, buf) => { req.rawBody = buf.toString('utf8'); },
}));

// ═══════════════════════════════════════════════════════════
// FLEET & DEVICES
// ═══════════════════════════════════════════════════════════

// GET /api/fleet/summary
router.get('/fleet/summary', (_req, res) => {
  res.json(store.getFleetSummary());
});

// GET /api/fleet/devices
router.get('/fleet/devices', (req, res) => {
  const { fleet, health } = req.query;
  let devices = store.getAllDevices();
  if (fleet)  devices = devices.filter(d => d.fleet?.toLowerCase().includes(fleet.toLowerCase()));
  if (health) devices = devices.filter(d => d.health?.toLowerCase() === health.toLowerCase());
  res.json(devices);
});

// GET /api/fleet/devices/:id
router.get('/fleet/devices/:id', (req, res) => {
  const device = store.getDevice(req.params.id);
  if (!device) return res.status(404).json({ error: `Device "${req.params.id}" not found` });
  res.json(device);
});

// POST /api/fleet/devices  — register a new device
router.post('/fleet/devices', (req, res) => {
  const { id, name, fleet, fw, source } = req.body;
  if (!id) return res.status(400).json({ error: 'id is required' });
  const device = store.upsertDevice({ id, name, fleet, fw, source });
  res.status(201).json(device);
});

// GET /api/fleet/devices/:id/telemetry?limit=60
router.get('/fleet/devices/:id/telemetry', (req, res) => {
  const limit = parseInt(req.query.limit || '60', 10);
  res.json(store.getTelemetry(req.params.id, limit));
});

// POST /api/fleet/devices/:id/telemetry  — push a telemetry sample
router.post('/fleet/devices/:id/telemetry', (req, res) => {
  const { readings } = req.body;
  if (!readings) return res.status(400).json({ error: 'readings is required' });
  const result = engine.evaluateTelemetry(req.params.id, readings);
  res.json({ ok: true, deviceId: req.params.id, driftResult: result });
});

// ═══════════════════════════════════════════════════════════
// ALERTS
// ═══════════════════════════════════════════════════════════

// GET /api/alerts?sev=CRITICAL&acknowledged=false
router.get('/alerts', (req, res) => {
  const { sev, acknowledged } = req.query;
  const ack = acknowledged !== undefined ? acknowledged === 'true' : undefined;
  res.json(store.getAlerts({ sev, acknowledged: ack }));
});

// POST /api/alerts/:id/acknowledge
router.post('/alerts/:id/acknowledge', (req, res) => {
  const alert = store.acknowledgeAlert(req.params.id, req.body.user);
  if (!alert) return res.status(404).json({ error: `Alert "${req.params.id}" not found` });
  res.json(alert);
});

// ═══════════════════════════════════════════════════════════
// SCANS (Pre-Ship)
// ═══════════════════════════════════════════════════════════

// GET /api/scans  — list all scans
router.get('/scans', (_req, res) => {
  res.json(store.getAllScans());
});

// GET /api/scans/latest?target=fw-v3.8.2-rc4
router.get('/scans/latest', (req, res) => {
  const scan = store.getLastScan(req.query.target);
  if (!scan) return res.status(404).json({ error: 'No scans found' });
  res.json(scan);
});

// POST /api/scans/run  — manual Pre-Ship scan submission
router.post('/scans/run', (req, res) => {
  const { target, checks, scores } = req.body;
  if (!target || !scores) return res.status(400).json({ error: 'target and scores are required' });
  let s, c;
  try {
    s = typeof scores === 'string' ? JSON.parse(scores) : scores;
    c = typeof checks === 'string' ? JSON.parse(checks || '[]') : (checks || []);
  } catch { return res.status(400).json({ error: 'Invalid JSON' }); }
  const result = engine.computePreShipScore(target, c, s);
  res.status(201).json(result);
});

// ═══════════════════════════════════════════════════════════
// BASELINES
// ═══════════════════════════════════════════════════════════

// GET /api/baselines/:deviceId
router.get('/baselines/:deviceId', (req, res) => {
  const baseline = store.getBaseline(req.params.deviceId);
  if (!baseline) return res.status(404).json({ error: `No baseline for "${req.params.deviceId}"` });
  res.json(baseline);
});

// POST /api/baselines/:deviceId/capture
router.post('/baselines/:deviceId/capture', (req, res) => {
  const { readings, tag } = req.body;
  if (!readings) return res.status(400).json({ error: 'readings is required' });
  const baseline = store.setBaseline(req.params.deviceId, { readings, tag: tag || 'manual', source: 'api' });
  store.setAgentStatus('preship', 'active');
  res.status(201).json(baseline);
});

// ═══════════════════════════════════════════════════════════
// AGENTS
// ═══════════════════════════════════════════════════════════

// GET /api/agents
router.get('/agents', (_req, res) => {
  res.json(store.getAllAgents());
});

// GET /api/agents/:id
router.get('/agents/:id', (req, res) => {
  const agents = store.getAllAgents();
  const agent = agents.find(a => a.id === req.params.id);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  res.json(agent);
});

// ═══════════════════════════════════════════════════════════
// INTEGRATIONS
// ═══════════════════════════════════════════════════════════

// GET /api/integrations
router.get('/integrations', (_req, res) => {
  res.json(store.getAllIntegrations());
});

// GET /api/integrations/:id
router.get('/integrations/:id', (req, res) => {
  const intg = store.getIntegration(req.params.id);
  if (!intg) return res.status(404).json({ error: 'Integration not found' });
  res.json(intg);
});

// ── GitHub ──────────────────────────────────────────────
router.post('/integrations/github/webhook',  github.webhookHandler);
router.post('/integrations/github/artifact', github.artifactHandler);

// ── Arduino / Arduino CLI ───────────────────────────────
router.post('/integrations/arduino/connect',   arduino.connectHandler);
router.post('/integrations/arduino/upload',    arduino.uploadHandler);
router.post('/integrations/arduino/telemetry', arduino.telemetryHandler);

// ── Jenkins CI ──────────────────────────────────────────
router.post('/integrations/jenkins/scan', jenkins.scanHandler);

// ── Docker / OCI ────────────────────────────────────────
router.post('/integrations/docker/artifact', dockerInt.artifactHandler);

// ── Keil / STM32CubeIDE ─────────────────────────────────
router.post('/integrations/keil/artifact',   upload.single('file'), keil.artifactHandler);
router.post('/integrations/keil/telemetry',  keil.telemetryHandler);

// ── VS Code / PlatformIO ────────────────────────────────
router.post('/integrations/vscode/build',   vscode.buildHandler);
router.get('/integrations/vscode/sessions', vscode.sessionsHandler);

// ═══════════════════════════════════════════════════════════
// KNOWLEDGE BASE
// ═══════════════════════════════════════════════════════════

// GET /api/knowledge?q=adc
router.get('/knowledge', (req, res) => {
  const results = store.searchKnowledge(req.query.q);
  res.json(results);
});

// POST /api/knowledge  — Onboarding Agent writes new/updated articles
router.post('/knowledge', (req, res) => {
  const article = store.addKnowledgeArticle(req.body);
  res.status(201).json(article);
});

// ═══════════════════════════════════════════════════════════
// INCIDENTS
// ═══════════════════════════════════════════════════════════

// GET /api/incidents
router.get('/incidents', (_req, res) => {
  res.json(store.getIncidents());
});

// POST /api/incidents
router.post('/incidents', (req, res) => {
  const incident = store.addIncident(req.body);
  res.status(201).json(incident);
});

// ═══════════════════════════════════════════════════════════
// HEALTH CHECK
// ═══════════════════════════════════════════════════════════

router.get('/health', (_req, res) => {
  res.json({
    status:   'ok',
    version:  '1.0.0',
    uptime:   process.uptime(),
    ts:       new Date().toISOString(),
    fleet:    store.getFleetSummary(),
    integrations: store.getAllIntegrations().map(i => ({ id: i.id, status: i.status })),
    agents:   store.getAllAgents().map(a => ({ id: a.id, status: a.status })),
  });
});

module.exports = router;
