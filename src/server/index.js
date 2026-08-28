/**
 * DiagIoT Backend — Main Server Entry Point
 *
 * Starts:
 *  1. Express HTTP server (REST API + static web app)
 *  2. WebSocket server (real-time push to dashboard + VS Code extension)
 *  3. Integration adapters (GitHub webhooks ready, Jenkins polling, Docker events, Arduino serial)
 *  4. Agent runtime tick (periodic drift evaluation)
 */

'use strict';

require('dotenv').config();

const express = require('express');
const http    = require('http');
const path    = require('path');
const cors    = require('cors');
const { WebSocketServer } = require('ws');

const store    = require('./store');
const apiRouter = require('./routes/api');

// ── Supabase JWT verifier (optional — only active if SUPABASE_JWT_SECRET is set) ──
let verifySupabaseJWT = null;
if (process.env.SUPABASE_JWT_SECRET) {
  try {
    const jwt = require('jsonwebtoken');
    verifySupabaseJWT = (token) =>
      jwt.verify(token, process.env.SUPABASE_JWT_SECRET, { algorithms: ['HS256'] });
  } catch {
    console.warn('[Auth] jsonwebtoken not installed — JWT verification disabled. Run: npm install jsonwebtoken');
  }
}

// Integration adapters
const jenkins   = require('./integrations/jenkins');
const dockerInt = require('./integrations/docker');
const arduino   = require('./integrations/arduino');
const vsCode    = require('./integrations/vscode');

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || 'localhost';

// ── Express app ───────────────────────────────────────────
const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Public config endpoint — exposes safe Supabase anon config to the browser ──
app.get('/api/config', (_req, res) => {
  res.json({
    supabaseUrl:  process.env.SUPABASE_URL  || null,
    supabaseKey:  process.env.SUPABASE_ANON_KEY || null,
    authEnabled:  !!(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY),
  });
});

// Serve the web application
app.use(express.static(path.join(__dirname, '../web')));

// ── JWT guard middleware (only enforced when SUPABASE_JWT_SECRET is configured) ──
function jwtGuard(req, res, next) {
  if (!verifySupabaseJWT) return next(); // auth not configured — allow all
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Unauthorized — missing Bearer token' });
  try {
    req.jwtClaims = verifySupabaseJWT(token);
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Unauthorized — invalid or expired token' });
  }
}

// API routes under /api  (guarded when JWT secret is set)
app.use('/api', jwtGuard, apiRouter);

// SPA fallback — all non-API GET requests serve index.html
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Not found' });
  res.sendFile(path.join(__dirname, '../web/index.html'));
});

// ── HTTP server ───────────────────────────────────────────
const server = http.createServer(app);

// ── WebSocket server ──────────────────────────────────────
const wss = new WebSocketServer({ server });

/**
 * Broadcast a JSON message to all connected WebSocket clients.
 * The web dashboard subscribes to these for real-time updates.
 */
function broadcast(type, data) {
  const message = JSON.stringify({ type, data, ts: new Date().toISOString() });
  wss.clients.forEach(ws => {
    if (ws.readyState === 1 /* OPEN */) ws.send(message);
  });
}

wss.on('connection', (ws, req) => {
  // Optional: verify JWT from query-string ?token=... if auth is enabled
  if (verifySupabaseJWT) {
    const urlObj = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const token  = urlObj.searchParams.get('token');
    if (!token) {
      ws.close(4001, 'Unauthorized');
      return;
    }
    try { verifySupabaseJWT(token); }
    catch { ws.close(4001, 'Unauthorized — invalid token'); return; }
  }

  console.log(`[WS] Client connected from ${req.socket.remoteAddress}`);

  // Send current state immediately
  ws.send(JSON.stringify({
    type: 'init',
    data: {
      fleet:        store.getFleetSummary(),
      devices:      store.getAllDevices(),
      alerts:       store.getAlerts({ acknowledged: false }),
      agents:       store.getAllAgents(),
      integrations: store.getAllIntegrations(),
      scans:        store.getAllScans().slice(0, 20),
      knowledge:    store.knowledge,
    },
    ts: new Date().toISOString(),
  }));

  ws.on('message', rawMsg => {
    try {
      const msg = JSON.parse(rawMsg.toString());
      // Handle VS Code extension identification
      if (msg.clientType === 'vscode') {
        vsCode.registerSession(ws, msg);
        return;
      }
      // Handle CLI dashboard bridge commands
      if (msg.type === 'cli_command') {
        // acknowledged — no server action needed; dashboard reflects store state
        ws.send(JSON.stringify({ type: 'cli_ack', id: msg.id }));
      }
    } catch { /* ignore malformed messages */ }
  });

  ws.on('close', () => {
    console.log(`[WS] Client disconnected`);
  });
});

// ── Store → WebSocket broadcast wiring ───────────────────
store.on('device:updated',       d => broadcast('device:updated',       d));
store.on('alert:created',        a => broadcast('alert:created',        a));
store.on('alert:acknowledged',   a => broadcast('alert:acknowledged',   a));
store.on('scan:completed',       s => broadcast('scan:completed',       s));
store.on('baseline:captured',    b => broadcast('baseline:captured',    b));
store.on('integration:updated',  i => broadcast('integration:updated',  i));
store.on('agent:updated',        a => broadcast('agent:updated',        a));
store.on('telemetry',            t => broadcast('telemetry',            t));
store.on('knowledge:updated',    k => broadcast('knowledge:updated',    k));
store.on('incident:created',     i => broadcast('incident:created',     i));

// Activity feed events (integrations emit these)
store.on('github:push',          e => broadcast('activity', { source: 'github',    ...e }));
store.on('github:pull_request',  e => broadcast('activity', { source: 'github',    ...e }));
store.on('github:scan_complete', e => broadcast('activity', { source: 'github',    ...e }));
store.on('github:release',       e => broadcast('activity', { source: 'github',    ...e }));
store.on('jenkins:build',        e => broadcast('activity', { source: 'jenkins',   ...e }));
store.on('docker:build',         e => broadcast('activity', { source: 'docker',    ...e }));
store.on('arduino:telemetry',    e => broadcast('activity', { source: 'arduino',   ...e }));

// ── Start integrations ────────────────────────────────────
async function startIntegrations() {
  console.log('[Server] Starting integration adapters...');

  // Jenkins — starts polling if JENKINS_URL is set
  jenkins.start();

  // Docker — connects to daemon if available
  await dockerInt.start();

  // Arduino — tries to connect to serial port if configured
  await arduino.connect();

  console.log('[Server] Integration adapters started.');
}

// ── Start server ──────────────────────────────────────────
server.listen(PORT, HOST, async () => {
  console.log('');
  console.log('  DiagIoT Backend v1.0.0');
  console.log(`  HTTP   : http://${HOST}:${PORT}`);
  console.log(`  WS     : ws://${HOST}:${PORT}`);
  console.log(`  Web UI : http://${HOST}:${PORT}`);
  console.log(`  API    : http://${HOST}:${PORT}/api`);
  console.log(`  Health : http://${HOST}:${PORT}/api/health`);
  console.log('');

  await startIntegrations();

  // Mark all three agents as starting
  ['preship', 'monitor', 'onboard'].forEach(id =>
    store.setAgentStatus(id, 'active', { startedAt: new Date().toISOString() })
  );
});

// ── Graceful shutdown ─────────────────────────────────────
function shutdown(signal) {
  console.log(`\n[Server] ${signal} received — shutting down...`);
  jenkins.stop();
  dockerInt.stop();
  arduino.disconnect();
  server.close(() => {
    console.log('[Server] HTTP server closed');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 5000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

module.exports = { app, server, wss, broadcast };
