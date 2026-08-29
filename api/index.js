'use strict';

/**
 * Vercel serverless entry point.
 *
 * Intentionally stripped of:
 *  - server.listen()        — Vercel wraps the app itself; calling listen() crashes.
 *  - WebSocketServer        — WebSockets are not supported on Vercel serverless.
 *  - serialport / arduino   — native C++ addon, cannot run in Lambda sandbox.
 *  - jenkins / docker       — poll loops that need a persistent process.
 *
 * For full functionality (WebSockets, integrations) run locally or on
 * Railway / Render / Fly.io with: node src/server/index.js
 */

require('dotenv').config();

const express = require('express');
const path    = require('path');
const cors    = require('cors');

const store          = require('../src/server/store');
const { seedStore }  = require('../src/server/seed');
const apiRouter      = require('../src/server/routes/api');

seedStore(store);

let verifySupabaseJWT = null;
if (process.env.SUPABASE_JWT_SECRET) {
  try {
    const jwt = require('jsonwebtoken');
    verifySupabaseJWT = (token) =>
      jwt.verify(token, process.env.SUPABASE_JWT_SECRET, { algorithms: ['HS256'] });
  } catch {
    // jsonwebtoken not available — JWT guard disabled
  }
}

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

// Serve the static frontend
app.use(express.static(path.join(__dirname, '../src/web')));

function jwtGuard(req, res, next) {
  if (!verifySupabaseJWT) return next();
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Unauthorized — missing Bearer token' });
  try {
    req.jwtClaims = verifySupabaseJWT(token);
    next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized — invalid or expired token' });
  }
}

app.use('/api', jwtGuard, apiRouter);

// SPA fallback — serve index.html for all non-API routes
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Not found' });
  res.sendFile(path.join(__dirname, '../src/web/index.html'));
});

// Mark agents active (no persistent polling on serverless)
['preship', 'monitor', 'onboard'].forEach(id =>
  store.setAgentStatus(id, 'active', { startedAt: new Date().toISOString() })
);

module.exports = app;
