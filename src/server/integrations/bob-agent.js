'use strict';

/**
 * DiagIoT — Bob Agent Integration Adapter
 *
 * Connects the DiagIoT backend to IBM Bob's agentic AI backend.
 * Bob Agent provides:
 *   - Autonomous root-cause hypothesis generation from drift scores
 *   - Natural-language incident post-mortem synthesis
 *   - Knowledge base article generation from resolved alerts
 *   - Firmware diff semantic analysis (what changed and why it matters)
 *   - Predictive drift trajectory estimation
 *
 * Authentication: Bob API key (bob_prod_bob-apikey_...) passed via
 *   Authorization: ApiKey <BOB_AGENT_API_KEY>
 *
 * ENV:
 *   BOB_AGENT_API_KEY   Your Bob platform API key
 *   BOB_AGENT_BASE_URL  Bob API base URL (default: https://api.ibm.com/bob/v1)
 *
 * The adapter runs in "observe" mode — it subscribes to store events and
 * enriches alerts + scans asynchronously.  It never blocks the main request path.
 */

const store = require('../store');

// ── Configuration ──────────────────────────────────────────────────────────────

const BOB_API_KEY  = process.env.BOB_AGENT_API_KEY || '';
const BOB_BASE_URL = (process.env.BOB_AGENT_BASE_URL || 'https://api.ibm.com/bob/v1').replace(/\/$/, '');

let _connected  = false;
let _heartbeatTimer = null;
const HEARTBEAT_MS  = 60_000;  // verify connectivity every 60s

// ── HTTP helper ────────────────────────────────────────────────────────────────

async function bobPost(path, body) {
  if (!BOB_API_KEY) throw new Error('BOB_AGENT_API_KEY not set');
  const { default: fetch } = await import('node-fetch');
  const res = await fetch(`${BOB_BASE_URL}${path}`, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `ApiKey ${BOB_API_KEY}`,
      'X-Request-ID':  `diagiot-${Date.now()}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Bob API HTTP ${res.status}: ${text.slice(0, 120)}`);
  }
  return res.json();
}

async function bobGet(path) {
  if (!BOB_API_KEY) throw new Error('BOB_AGENT_API_KEY not set');
  const { default: fetch } = await import('node-fetch');
  const res = await fetch(`${BOB_BASE_URL}${path}`, {
    headers: {
      'Authorization': `ApiKey ${BOB_API_KEY}`,
      'X-Request-ID':  `diagiot-${Date.now()}`,
    },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Bob API HTTP ${res.status}: ${text.slice(0, 120)}`);
  }
  return res.json();
}

// ── Connectivity check ─────────────────────────────────────────────────────────

async function checkConnectivity() {
  if (!BOB_API_KEY) {
    store.setIntegrationStatus('bob', 'disconnected', 'BOB_AGENT_API_KEY not configured');
    _connected = false;
    return false;
  }
  try {
    await bobGet('/health');
    if (!_connected) {
      console.log('[BobAgent] Connected to Bob AI backend');
      store.setIntegrationStatus('bob', 'connected', `Bob AI Agent — ${BOB_BASE_URL}`);
      _connected = true;
    }
    return true;
  } catch (err) {
    if (_connected) {
      console.warn('[BobAgent] Disconnected:', err.message);
      store.setIntegrationStatus('bob', 'error', err.message.slice(0, 80));
    }
    _connected = false;
    return false;
  }
}

// ── AI capabilities ────────────────────────────────────────────────────────────

/**
 * Ask Bob Agent to generate a root-cause hypothesis for a drift alert.
 * Result is stored as an AI-generated knowledge enrichment on the alert.
 *
 * @param {Object} alert  — alert object from the store
 * @returns {Promise<Object>}  { hypothesis, confidence, suggestedAction }
 */
async function analyzeAlert(alert) {
  if (!_connected) return null;
  try {
    const result = await bobPost('/agents/analyze', {
      context: 'diagiot-drift-alert',
      payload: {
        deviceId:   alert.deviceId,
        alertType:  alert.type,
        severity:   alert.severity,
        driftScore: alert.driftScore,
        detail:     alert.detail,
      },
      instruction: 'Identify the most likely root cause for this IoT firmware drift alert. Return a concise hypothesis, confidence score (0-1), and recommended corrective action.',
    });

    // Enrich the alert in-store with AI analysis
    const enriched = {
      ...alert,
      ai: {
        hypothesis:       result.hypothesis     || result.output || '—',
        confidence:       result.confidence     ?? null,
        suggestedAction:  result.suggestedAction || result.action || '—',
        analyzedAt:       new Date().toISOString(),
        model:            result.model || 'bob-agent',
      },
    };
    store.alerts.set(alert.id, enriched);
    store.emit('alert:enriched', enriched);

    console.log(`[BobAgent] Alert ${alert.id} analyzed — confidence: ${result.confidence}`);
    return result;
  } catch (err) {
    console.warn('[BobAgent] analyzeAlert failed:', err.message);
    return null;
  }
}

/**
 * Ask Bob Agent to generate a Knowledge Base article from a resolved incident.
 *
 * @param {Object} incident  — incident object
 * @param {Object[]} alerts  — related alerts
 * @returns {Promise<Object>}  KB article
 */
async function synthesizeKbArticle(incident, relatedAlerts) {
  if (!_connected) return null;
  try {
    const result = await bobPost('/agents/generate', {
      context: 'diagiot-kb-article',
      payload: {
        incidentId:    incident.id,
        incidentTitle: incident.title,
        alerts:        (relatedAlerts || []).map(a => ({
          type:       a.type,
          driftScore: a.driftScore,
          device:     a.deviceId,
          detail:     a.detail,
        })),
      },
      instruction: 'Generate a structured post-mortem Knowledge Base article for this IoT incident. Include: title, affectedDevices, rootCause, resolution steps, and relevant tags.',
    });

    const article = {
      title:          result.title          || `AI-Generated: ${incident.title}`,
      affectedDevices: result.affectedDevices || (relatedAlerts || []).map(a => a.deviceId).join(', '),
      rootCause:      result.rootCause      || result.output || '—',
      resolution:     result.resolution     || '—',
      tags:           result.tags           || ['ai-generated', 'bob-agent'],
      generatedBy:    'bob-agent',
      generatedAt:    new Date().toISOString(),
    };
    store.addKnowledgeArticle(article);
    console.log(`[BobAgent] KB article synthesized from incident ${incident.id}`);
    return article;
  } catch (err) {
    console.warn('[BobAgent] synthesizeKbArticle failed:', err.message);
    return null;
  }
}

/**
 * Ask Bob Agent to interpret a firmware diff and explain the security/stability risk.
 *
 * @param {Object} diffPayload  — { target, baseVersion, headVersion, symbolChanges, registerChanges }
 * @returns {Promise<Object>}   { summary, riskLevel, riskReason, recommendation }
 */
async function interpretFirmwareDiff(diffPayload) {
  if (!_connected) return null;
  try {
    const result = await bobPost('/agents/analyze', {
      context: 'diagiot-firmware-diff',
      payload: diffPayload,
      instruction: 'Review this firmware diff for IoT devices. Summarize the risk level (LOW/MEDIUM/HIGH/CRITICAL), explain why, and recommend whether to approve or block this release.',
    });
    console.log(`[BobAgent] Firmware diff analyzed — risk: ${result.riskLevel}`);
    return result;
  } catch (err) {
    console.warn('[BobAgent] interpretFirmwareDiff failed:', err.message);
    return null;
  }
}

// ── Store event listeners ──────────────────────────────────────────────────────

function attachStoreListeners() {
  // Enrich new critical alerts with AI hypothesis
  store.on('alert:created', async (alert) => {
    if (!_connected) return;
    if (alert.severity !== 'CRITICAL' && alert.severity !== 'WARNING') return;
    // Small delay to avoid competing with the in-band alert broadcast
    setTimeout(() => analyzeAlert(alert), 1500);
  });

  // Synthesize KB article when an incident is closed
  store.on('incident:created', async (incident) => {
    if (!_connected || !incident.relatedAlerts?.length) return;
    setTimeout(() => synthesizeKbArticle(incident, incident.relatedAlerts), 2000);
  });
}

// ── Express route handlers ─────────────────────────────────────────────────────

/**
 * POST /api/integrations/bob/analyze-alert
 * Body: { alertId }
 * Manually trigger Bob AI analysis for a specific alert.
 */
async function analyzeAlertHandler(req, res) {
  const { alertId } = req.body;
  if (!alertId) return res.status(400).json({ error: 'alertId is required' });

  const alert = store.alerts.get(alertId);
  if (!alert) return res.status(404).json({ error: `Alert "${alertId}" not found` });

  if (!_connected) {
    return res.status(503).json({ error: 'Bob Agent not connected — check BOB_AGENT_API_KEY' });
  }

  try {
    const result = await analyzeAlert(alert);
    res.json({ ok: true, alertId, analysis: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * POST /api/integrations/bob/diff
 * Body: { target, baseVersion, headVersion, symbolChanges, registerChanges }
 * Ask Bob Agent to interpret a firmware diff.
 */
async function diffHandler(req, res) {
  if (!_connected) {
    return res.status(503).json({ error: 'Bob Agent not connected — check BOB_AGENT_API_KEY' });
  }
  try {
    const result = await interpretFirmwareDiff(req.body);
    res.json({ ok: true, result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * POST /api/integrations/bob/synthesize-kb
 * Body: { incident, alertIds }
 * Ask Bob Agent to write a KB article from an incident + related alerts.
 */
async function synthesizeKbHandler(req, res) {
  const { incident, alertIds } = req.body;
  if (!incident) return res.status(400).json({ error: 'incident is required' });

  if (!_connected) {
    return res.status(503).json({ error: 'Bob Agent not connected — check BOB_AGENT_API_KEY' });
  }

  const relatedAlerts = (alertIds || [])
    .map(id => store.alerts.get(id))
    .filter(Boolean);

  try {
    const article = await synthesizeKbArticle(incident, relatedAlerts);
    res.json({ ok: true, article });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * GET /api/integrations/bob/status
 * Returns current Bob Agent connection status + capabilities.
 */
function statusHandler(_req, res) {
  res.json({
    connected:    _connected,
    configured:   !!BOB_API_KEY,
    baseUrl:      BOB_BASE_URL,
    capabilities: ['alert-analysis', 'kb-synthesis', 'firmware-diff', 'drift-prediction'],
    integration:  store.getIntegration('bob'),
  });
}

// ── Lifecycle ──────────────────────────────────────────────────────────────────

async function start() {
  if (!BOB_API_KEY) {
    console.log('[BobAgent] BOB_AGENT_API_KEY not set — integration standby');
    store.setIntegrationStatus('bob', 'disconnected', 'API key not configured — set BOB_AGENT_API_KEY in .env');
    return;
  }

  console.log('[BobAgent] Starting — connecting to Bob AI backend...');
  await checkConnectivity();
  attachStoreListeners();

  _heartbeatTimer = setInterval(checkConnectivity, HEARTBEAT_MS);
}

function stop() {
  if (_heartbeatTimer) { clearInterval(_heartbeatTimer); _heartbeatTimer = null; }
  store.setIntegrationStatus('bob', 'disconnected', null);
  _connected = false;
  console.log('[BobAgent] Stopped');
}

module.exports = {
  start,
  stop,
  analyzeAlertHandler,
  diffHandler,
  synthesizeKbHandler,
  statusHandler,
  // Exported for CLI / test use
  analyzeAlert,
  synthesizeKbArticle,
  interpretFirmwareDiff,
};
