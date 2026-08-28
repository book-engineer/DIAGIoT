/**
 * Docker / OCI Integration Adapter
 *
 * Monitors Docker daemon events for build and push activity.
 * When a firmware build container finishes, checks its labels for
 * DiagIoT metadata and triggers a Pre-Ship scan.
 *
 * Expects firmware build containers to have labels:
 *   LABEL diagiot.target="fw-v1.2.3"
 *   LABEL diagiot.baseline="fw-v1.2.2-gold"
 *   LABEL diagiot.scores='{"binaryDiff":0.1,"behavioralSig":0.05,...}'
 *
 * ENV:
 *   DOCKER_HOST   e.g. unix:///var/run/docker.sock  (default)
 *                 or   tcp://localhost:2376
 */

'use strict';

const store  = require('../store');
const { computePreShipScore } = require('../drift-engine');

let eventStream = null;

async function getDockerFetch() {
  // Use node-fetch to talk to Docker socket
  const { default: fetch } = await import('node-fetch');
  return fetch;
}

function dockerUrl(path) {
  const host = process.env.DOCKER_HOST || 'unix:///var/run/docker.sock';
  if (host.startsWith('unix://')) {
    // node-fetch doesn't handle unix sockets natively; use http-unix workaround
    return `http://localhost${path}`;
  }
  return host.replace(/\/$/, '') + path;
}

async function fetchDockerJson(path) {
  // For socket connections we use the raw http module
  return new Promise((resolve, reject) => {
    const http = require('http');
    const socketPath = (process.env.DOCKER_HOST || 'unix:///var/run/docker.sock').replace('unix://', '');
    const req = http.request({ socketPath, path, method: 'GET' }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve(null); } });
    });
    req.on('error', reject);
    req.end();
  });
}

async function streamDockerEvents(handler) {
  const http = require('http');
  const socketPath = (process.env.DOCKER_HOST || 'unix:///var/run/docker.sock').replace('unix://', '');
  const req = http.request({ socketPath, path: '/events?filters={"type":["container"]}', method: 'GET' }, res => {
    res.on('data', chunk => {
      const lines = chunk.toString().trim().split('\n');
      lines.forEach(line => { try { handler(JSON.parse(line)); } catch {} });
    });
    res.on('end', () => console.log('[Docker] Event stream ended'));
  });
  req.on('error', err => {
    console.error('[Docker] Stream error:', err.message);
    store.setIntegrationStatus('docker', 'error', err.message);
  });
  req.end();
  return req;
}

async function handleContainerEvent(event) {
  if (event.status !== 'die' && event.status !== 'stop') return;

  const labels = event.Actor?.Attributes || {};
  const target   = labels['diagiot.target'];
  const baseline = labels['diagiot.baseline'];
  const scoresRaw = labels['diagiot.scores'];

  if (!target || !scoresRaw) return;   // not a DiagIoT-labelled build

  let scores;
  try { scores = JSON.parse(scoresRaw); }
  catch { console.warn('[Docker] Invalid diagiot.scores label on container'); return; }

  const checksRaw = labels['diagiot.checks'] || '[]';
  let checks;
  try { checks = JSON.parse(checksRaw); } catch { checks = []; }

  const result = computePreShipScore(target, checks, scores);
  store.setIntegrationStatus('docker', 'live', `${target} — score ${result.composite} [${result.decision}]`);
  store.emit('docker:build', {
    target, baseline,
    containerId: event.id?.slice(0, 12),
    driftScore:  result.composite,
    decision:    result.decision,
    ts:          new Date().toISOString(),
  });
  console.log(`[Docker] Container ${event.id?.slice(0, 12)} → ${target}  score: ${result.composite}  [${result.decision}]`);
}

async function start() {
  try {
    // Verify Docker is reachable
    const info = await fetchDockerJson('/info');
    if (!info) throw new Error('No response from Docker daemon');

    store.setIntegrationStatus('docker', 'connected', `Docker ${info.ServerVersion || 'unknown'}`);
    console.log(`[Docker] Connected — ${info.Containers} containers, ${info.Images} images`);

    // Stream live container events
    eventStream = await streamDockerEvents(handleContainerEvent);

  } catch (err) {
    console.log('[Docker] Not available:', err.message);
    store.setIntegrationStatus('docker', 'disconnected', 'Docker daemon not reachable');
  }
}

function stop() {
  if (eventStream) { try { eventStream.destroy(); } catch {} eventStream = null; }
  store.setIntegrationStatus('docker', 'disconnected', null);
}

/**
 * POST /api/integrations/docker/artifact
 * Manually submit a Docker-built artifact for scanning.
 * Body: { target, baseline, checks, scores, image }
 */
function artifactHandler(req, res) {
  const { target, baseline, checks, scores, image } = req.body;
  if (!target || !scores) return res.status(400).json({ error: 'target and scores required' });
  let s, c;
  try { s = typeof scores === 'string' ? JSON.parse(scores) : scores; }
  catch { return res.status(400).json({ error: 'Invalid scores JSON' }); }
  c = typeof checks === 'string' ? JSON.parse(checks || '[]') : (checks || []);

  const result = computePreShipScore(target, c, s);
  store.setIntegrationStatus('docker', 'live', `${image || target} — score ${result.composite}`);
  res.json({ scanId: result.id, driftScore: result.composite, decision: result.decision, label: result.label });
}

module.exports = { start, stop, artifactHandler };
