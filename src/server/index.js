'use strict';

require('dotenv').config();

const express = require('express');
const http    = require('http');
const path    = require('path');
const cors    = require('cors');
const { WebSocketServer } = require('ws');

const store    = require('./store');
const { seedStore } = require('./seed');
seedStore(store);
const apiRouter = require('./routes/api');

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

const jenkins   = require('./integrations/jenkins');
const dockerInt = require('./integrations/docker');
const arduino   = require('./integrations/arduino');
const vsCode    = require('./integrations/vscode');

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || 'localhost';

const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api/config', (_req, res) => {
  res.json({
    supabaseUrl:  process.env.SUPABASE_URL  || null,
    supabaseKey:  process.env.SUPABASE_ANON_KEY || null,
    authEnabled:  !!(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY),
  });
});

app.use(express.static(path.join(__dirname, '../web')));

function jwtGuard(req, res, next) {
  if (!verifySupabaseJWT) return next(); 
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

app.use('/api', jwtGuard, apiRouter);

app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Not found' });
  res.sendFile(path.join(__dirname, '../web/index.html'));
});

const server = http.createServer(app);

const wss = new WebSocketServer({ server });

function broadcast(type, data) {
  const message = JSON.stringify({ type, data, ts: new Date().toISOString() });
  wss.clients.forEach(ws => {
    if (ws.readyState === 1 /* OPEN */) ws.send(message);
  });
}

wss.on('connection', (ws, req) => {
  
  if (verifySupabaseJWT) {
    const urlObj = new URL(req.url || '/', 'http://' + (req.headers.host || 'localhost'));
    if (!token) {
      ws.close(4001, 'Unauthorized');
      return;
    }
    try { verifySupabaseJWT(token); }
    catch { ws.close(4001, 'Unauthorized — invalid token'); return; }
  }

  console.log(`[WS] Client connected from ${req.socket.remoteAddress}`);

  
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
      
      if (msg.clientType === 'vscode') {
        vsCode.registerSession(ws, msg);
        return;
      }
      
      if (msg.type === 'cli_command') {
        
        ws.send(JSON.stringify({ type: 'cli_ack', id: msg.id }));
      }
    } catch { /* ignore malformed messages */ }
  });

  ws.on('close', () => {
    console.log(`[WS] Client disconnected`);
  });
});

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

store.on('github:push',          e => broadcast('activity', { source: 'github',    ...e }));
store.on('github:pull_request',  e => broadcast('activity', { source: 'github',    ...e }));
store.on('github:scan_complete', e => broadcast('activity', { source: 'github',    ...e }));
store.on('github:release',       e => broadcast('activity', { source: 'github',    ...e }));
store.on('jenkins:build',        e => broadcast('activity', { source: 'jenkins',   ...e }));
store.on('docker:build',         e => broadcast('activity', { source: 'docker',    ...e }));
store.on('arduino:telemetry',    e => broadcast('activity', { source: 'arduino',   ...e }));

async function startIntegrations() {
  console.log('[Server] Starting integration adapters...');

  
  jenkins.start();

  
  await dockerInt.start();

  
  await arduino.connect();

  console.log('[Server] Integration adapters started.');
}

server.listen(PORT, HOST, async () => {
  console.log('');
  console.log('  DiagIoT Backend v1.0.0');
  console.log('  HTTP   : http://' + HOST + ':' + PORT);
  console.log('  WS     : ws://' + HOST + ':' + PORT);
  console.log('  Web UI : http://' + HOST + ':' + PORT);
  console.log('  API    : http://' + HOST + ':' + PORT + '/api');
  console.log('  Health : http://' + HOST + ':' + PORT + '/api/health');
  console.log('');

  await startIntegrations();

  
  ['preship', 'monitor', 'onboard'].forEach(id =>
    store.setAgentStatus(id, 'active', { startedAt: new Date().toISOString() })
  );
});

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