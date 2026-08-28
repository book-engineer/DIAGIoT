/**
 * VS Code + PlatformIO Integration Adapter
 *
 * The DiagIoT VS Code extension (diagiot-drift-guard) connects to this server via WebSocket
 * and REST API. This adapter handles:
 *   - Extension registration (what workspace/project is open)
 *   - Manual scan requests from the "Scan Now" command palette entry
 *   - PlatformIO build event hook (extension calls POST /api/integrations/vscode/build on build)
 *   - Inline diagnostic push back (server → extension via WS)
 *
 * Extension configuration (settings.json):
 *   "diagiot.serverUrl": "http://localhost:3000"
 *   "diagiot.autoScanOnSave": true
 *   "diagiot.project": "my-firmware-project"
 */

'use strict';

const store  = require('../store');
const { computePreShipScore } = require('../drift-engine');

// Track connected extension sessions { clientId → { ws, workspace, user } }
const sessions = new Map();

/**
 * Called when a WebSocket client identifies itself as a VS Code extension session.
 * ws — the WebSocket connection (from the WS server in index.js)
 * data — { clientType: 'vscode', workspace, user, platformioProject? }
 */
function registerSession(ws, data) {
  const clientId = `vscode-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
  sessions.set(clientId, { ws, workspace: data.workspace, user: data.user });

  store.setIntegrationStatus('vscode', 'live', `${sessions.size} devs active`);
  console.log(`[VS Code] Extension connected — workspace: ${data.workspace}, user: ${data.user}`);

  ws.on('close', () => {
    sessions.delete(clientId);
    store.setIntegrationStatus('vscode',
      sessions.size > 0 ? 'live' : 'disconnected',
      sessions.size > 0 ? `${sessions.size} devs active` : null
    );
    console.log(`[VS Code] Extension disconnected — workspace: ${data.workspace}`);
  });

  // Send current agent status immediately upon connection
  ws.send(JSON.stringify({
    type: 'connected',
    agents: store.getAllAgents(),
    integrations: store.getAllIntegrations(),
    fleetSummary: store.getFleetSummary(),
  }));
}

/**
 * Push a drift diagnostic message to all connected VS Code sessions.
 * Called by the drift engine or monitor agent when a scan result is available.
 */
function pushDiagnostics(deviceId, scanResult) {
  const message = JSON.stringify({
    type:      'diagnostics',
    deviceId,
    driftScore: scanResult.composite ?? scanResult.score,
    decision:   scanResult.decision,
    label:      scanResult.label,
    breakdown:  scanResult.breakdown,
    ts:         new Date().toISOString(),
  });
  sessions.forEach(({ ws }) => {
    if (ws.readyState === 1 /* OPEN */) ws.send(message);
  });
}

/**
 * POST /api/integrations/vscode/build
 * Called by the extension when PlatformIO finishes a build.
 * Body: { target, workspace, user, checks, scores }
 */
function buildHandler(req, res) {
  const { target, workspace, user, checks, scores } = req.body;
  if (!target) return res.status(400).json({ error: 'target is required' });

  let parsedChecks, parsedScores;
  try {
    parsedChecks = typeof checks === 'string' ? JSON.parse(checks) : (checks || []);
    parsedScores = typeof scores === 'string' ? JSON.parse(scores)
      : scores || { binaryDiff: 0, behavioralSig: 0, knownVulns: 0, hwCompat: 0, configDrift: 0 };
  } catch {
    return res.status(400).json({ error: 'Invalid JSON in checks or scores' });
  }

  const result = computePreShipScore(target, parsedChecks, parsedScores);
  store.setIntegrationStatus('vscode', 'live', `${workspace || target} — score ${result.composite} [${result.decision}]`);

  // Push diagnostics back to all connected extension sessions
  pushDiagnostics(target, result);

  console.log(`[VS Code] Build scanned → ${target}  score: ${result.composite}  decision: ${result.decision}`);

  res.json({
    scanId:     result.id,
    target,
    driftScore: result.composite,
    decision:   result.decision,
    label:      result.label,
  });
}

/**
 * GET /api/integrations/vscode/sessions
 * Returns count of connected extension sessions.
 */
function sessionsHandler(req, res) {
  res.json({
    count: sessions.size,
    sessions: Array.from(sessions.values()).map(s => ({ workspace: s.workspace, user: s.user })),
  });
}

module.exports = { registerSession, pushDiagnostics, buildHandler, sessionsHandler };
