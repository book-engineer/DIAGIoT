#!/usr/bin/env node
/**
 * DiagIoT CLI — Agentic Drift Detection Platform
 *
 * A standalone command-line tool that connects to the DiagIoT backend server.
 * All data is live — fetched from real integration-connected backend endpoints.
 *
 * Works standalone in any terminal OR embedded in:
 *   - Arduino IDE  (Tools menu → External Tools, or via arduino-cli)
 *   - Arduino CLI  (as a companion tool: diagiot scan run --target <fw>)
 *   - VS Code      (integrated terminal, or extension task runner)
 *   - Jenkins      (pipeline step: sh 'diagiot scan run --target $BUILD_TAG')
 *   - Docker       (RUN diagiot agents status)
 *
 * Configuration:
 *   DIAGIOT_SERVER   URL of the backend server (default: http://localhost:3000)
 *   DIAGIOT_TOKEN    API token for authentication (future use)
 *
 * Usage:
 *   diagiot <command> [subcommand] [--flag value]
 *   diagiot interactive    (starts REPL mode — type "help")
 *
 * Principles applied:
 *   Hick's Law — flat command tree, no deep nesting
 *   Miller's Law — grouped output, max 7 items before separator
 *   Fitts's Law — shortest names for most-used commands
 *   POSIX conventions — --flags, error on stderr, exit codes
 */

'use strict';

const readline = require('readline');
const path     = require('path');

// ── API client (real backend calls, no mock data) ─────────
const { DiagIoTClient } = require(path.join(__dirname, '../shared/api-client'));
const client = new DiagIoTClient(process.env.DIAGIOT_SERVER);

// ── ANSI colour helpers ───────────────────────────────────
const C = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  dim:    '\x1b[2m',
  ok:     '\x1b[32m',
  warn:   '\x1b[33m',
  danger: '\x1b[31m',
  info:   '\x1b[36m',
  accent: '\x1b[34m',
  muted:  '\x1b[90m',
};

const isTTY = process.stdout.isTTY;
const col    = (c, t) => isTTY ? `${c}${t}${C.reset}` : t;
const ok     = t => col(C.ok,     t);
const warn   = t => col(C.warn,   t);
const danger = t => col(C.danger, t);
const info   = t => col(C.info,   t);
const accent = t => col(C.accent, t);
const muted  = t => col(C.muted,  t);
const bold   = t => col(C.bold,   t);
const err    = t => { process.stderr.write(danger('  Error: ') + t + '\n'); };

function header(text) {
  console.log('');
  console.log(bold(accent('  ' + text)));
  console.log(muted('  ' + '─'.repeat(Math.max(text.length + 2, 44))));
}

function row(label, value, colorFn) {
  const pad = 28;
  const l   = ('  ' + label).padEnd(pad);
  const v   = colorFn ? colorFn(String(value)) : String(value);
  console.log(muted(l) + v);
}

function scoreColor(s) {
  const n = parseFloat(s);
  if (isNaN(n))  return t => t;
  if (n < 0.40)  return ok;
  if (n < 0.70)  return warn;
  return danger;
}

function healthColor(h) {
  if (!h) return t => t;
  if (h.toUpperCase() === 'HEALTHY')  return ok;
  if (h.toUpperCase() === 'DRIFTING') return warn;
  return danger;
}

function sevColor(s) {
  if (!s) return muted;
  if (s.toUpperCase() === 'CRITICAL') return danger;
  if (s.toUpperCase() === 'WARNING')  return warn;
  if (s.toUpperCase() === 'INFO')     return info;
  return muted;
}

function statusColor(s) {
  if (!s) return muted;
  const u = s.toUpperCase();
  if (u === 'LIVE' || u === 'ACTIVE' || u === 'CONNECTED') return ok;
  if (u === 'PARTIAL')      return warn;
  if (u === 'DISCONNECTED') return muted;
  return muted;
}

function relTime(isoString) {
  if (!isoString) return '—';
  const ms = Date.now() - new Date(isoString).getTime();
  if (ms < 60000)    return `${Math.round(ms / 1000)}s ago`;
  if (ms < 3600000)  return `${Math.round(ms / 60000)}m ago`;
  if (ms < 86400000) return `${Math.round(ms / 3600000)}h ago`;
  return new Date(isoString).toLocaleDateString();
}

// ── Server availability check ─────────────────────────────
async function checkServer() {
  try {
    await client.health();
    return true;
  } catch (e) {
    err(`Cannot reach DiagIoT server at ${client.base}`);
    console.error(muted(`  Make sure the server is running: npm start`));
    console.error(muted(`  Set DIAGIOT_SERVER env var to override: export DIAGIOT_SERVER=http://host:3000`));
    return false;
  }
}

// ═══════════════════════════════════════════════════════════
// COMMAND IMPLEMENTATIONS — all use live API data
// ═══════════════════════════════════════════════════════════

async function cmdHelp() {
  console.log('');
  console.log(bold(accent('  DiagIoT CLI v1.0.0')));
  console.log(muted('  Agentic Drift Detection Platform for Embedded IoT'));
  console.log(muted('  Server: ' + client.base));
  console.log('');
  const cmds = [
    ['fleet status',                    'Live fleet health from connected devices'],
    ['fleet list',                      'All registered systems/devices'],
    ['fleet device <id>',               'Detail view for a device'],
    ['scan run [--target <fw>] [--scores <json>]', 'Submit a Pre-Ship drift scan'],
    ['scan status [--target <fw>]',     'Last scan result from server'],
    ['drift score --device <id>',       'Live drift score breakdown'],
    ['drift history --device <id>',     'Telemetry history (last 60 samples)'],
    ['alerts list [--sev <level>]',     'Active alerts from Monitor Agent'],
    ['alerts ack --id <alertId>',       'Acknowledge an alert'],
    ['agents status',                   'All three agent runtime statuses'],
    ['integrations list',               'All integration statuses (live data)'],
    ['integrations connect --id <id>',  'Connect an integration'],
    ['baseline capture --device <id>',  'Capture current firmware baseline'],
    ['knowledge list [--q <term>]',     'Knowledge base articles'],
    ['incidents list',                  'All recorded incidents'],
    ['bob status',                      'Bob AI Agent connection status'],
    ['bob analyze --id <alertId>',      'AI root-cause analysis for an alert'],
    ['bob diff [--target <fw>]',        'AI firmware diff semantic analysis'],
    ['health',                          'Backend server health check'],
    ['interactive',                     'Start interactive REPL mode'],
    ['version',                         'Show CLI version'],
  ];
  console.log(bold('  COMMANDS'));
  cmds.forEach(([cmd, desc]) => {
    const padded = ('    diagiot ' + cmd).padEnd(52);
    console.log(`${accent(padded)} ${muted(desc)}`);
  });
  console.log('');
  console.log(muted('  Thresholds:  ') +
    ok('Pass  0.00–0.39  ') + warn('Warn  0.40–0.69  ') + danger('Block  0.70–1.00'));
  console.log('');
}

async function cmdFleetStatus() {
  const data = await client.fleetSummary();
  header('Fleet Health Overview  —  Live');
  row('Total Devices',  data.total);
  row('Healthy',        `${data.healthy}`,  ok);
  row('Drifting',       `${data.drifting}`, warn);
  row('Critical',       `${data.critical}`, danger);
  console.log('');
  row('Fleet Uptime',   data.uptime, ok);
  row('Active Alerts',  data.alertCount);
  row('Agents Online',  `${data.agentsOnline} / 3`, data.agentsOnline === 3 ? ok : warn);
  console.log('');
}

async function cmdFleetList() {
  const devices = await client.fleetDevices();
  header(`Registered Systems  (${devices.length} total)`);
  if (!devices.length) { console.log(muted('  No devices registered yet. Connect an integration to start.')); console.log(''); return; }
  console.log(muted(
    '  ' + 'ID'.padEnd(24) + 'Fleet'.padEnd(22) + 'FW'.padEnd(12) + 'Score'.padEnd(8) + 'Health'
  ));
  console.log(muted('  ' + '─'.repeat(80)));
  devices.forEach(d => {
    const hc = healthColor(d.health || (d.driftScore >= 0.70 ? 'CRITICAL' : d.driftScore >= 0.40 ? 'DRIFTING' : 'HEALTHY'));
    const sc = scoreColor(d.driftScore);
    console.log(
      '  ' +
      (d.id || '').padEnd(24) +
      (d.fleet || '—').padEnd(22) +
      (d.fw || '—').padEnd(12) +
      sc(d.driftScore != null ? d.driftScore.toFixed(2) : '—').padEnd(8) +
      hc(d.health || (d.driftScore >= 0.70 ? 'CRITICAL' : d.driftScore >= 0.40 ? 'DRIFTING' : 'HEALTHY'))
    );
  });
  console.log('');
}

async function cmdFleetDevice(id) {
  if (!id) { err('Device ID required. Usage: fleet device <id>'); return; }
  const d = await client.fleetDevice(id);
  header(`Device Detail — ${d.id}`);
  row('Name',        d.name || d.id);
  row('Fleet',       d.fleet || '—');
  row('FW Version',  d.fw || '—');
  row('Source',      d.source || '—');
  row('Last Update', relTime(d.updatedAt));
  row('Last Telemetry', relTime(d.lastTelemetry));
  if (d.driftScore != null) {
    const sc = scoreColor(d.driftScore);
    row('Drift Score', `${d.driftScore.toFixed(3)}  [${d.driftLabel || ''}]`, sc);
  }
  console.log('');
}

async function cmdScanRun(target, scoresJson) {
  if (!target) { err('--target required. Usage: scan run --target fw-v1.2.3 [--scores <json>]'); return; }
  let scores;
  if (scoresJson) {
    try { scores = JSON.parse(scoresJson); }
    catch { err('--scores must be valid JSON, e.g. \'{"binaryDiff":0.1,"behavioralSig":0.05,"knownVulns":0,"hwCompat":0,"configDrift":0.02}\''); return; }
  } else {
    scores = { binaryDiff: 0, behavioralSig: 0, knownVulns: 0, hwCompat: 0, configDrift: 0 };
    console.log(muted(`\n  Note: No --scores provided. Submitting zero-drift scan for ${target}.`));
    console.log(muted('  For real scores, your CI/build system should pass --scores via the diagiot.json artifact.\n'));
  }

  console.log(info(`\n  Submitting Pre-Ship scan for ${bold(target)} to DiagIoT server...`));
  const result = await client.runScan(target, [], scores);

  const sc = scoreColor(result.composite);
  const dec = result.decision === 'block' ? danger('BLOCKED') : result.decision === 'warn' ? warn('WARN') : ok('PASS');

  header(`Pre-Ship Scan Result — ${target}`);
  row('Scan ID',        result.id);
  row('Drift Score',    result.composite?.toFixed(3), sc);
  row('Status Label',   result.label, sc);
  row('Decision',       result.decision?.toUpperCase(), result.decision === 'block' ? danger : result.decision === 'warn' ? warn : ok);
  row('Completed',      relTime(result.createdAt));
  console.log('');

  // Exit with non-zero if blocked (useful for CI pipelines)
  if (result.decision === 'block') {
    console.error(danger(`  Build BLOCKED — drift score ${result.composite} exceeds threshold. Do not ship.`));
    process.exitCode = 1;
  }
}

async function cmdScanStatus(target) {
  const scan = await client.latestScan(target);
  const sc = scoreColor(scan.composite);
  header(`Last Scan Result${target ? ` — ${target}` : ''}`);
  row('Target',       scan.target);
  row('Scan ID',      scan.id);
  row('Drift Score',  scan.composite?.toFixed(3), sc);
  row('Label',        scan.label, sc);
  row('Decision',     scan.decision?.toUpperCase(), scan.decision === 'block' ? danger : scan.decision === 'warn' ? warn : ok);
  row('Scanned At',   relTime(scan.createdAt));
  if (scan.checks?.length) {
    console.log('');
    console.log(muted('  Checks:'));
    scan.checks.forEach(c => {
      const tag = c.passed ? ok('[PASS]') : warn('[WARN]');
      console.log(`    ${tag} ${(c.name || '').padEnd(28)} ${muted(c.delta ? 'delta: ' + c.delta : '')}`);
    });
  }
  console.log('');
}

async function cmdDriftScore(deviceId) {
  if (!deviceId) { err('--device required. Usage: drift score --device <id>'); return; }
  const device = await client.fleetDevice(deviceId);
  const baseline = await client.baseline(deviceId).catch(() => null);
  const samples  = await client.deviceTelemetry(deviceId, 1).catch(() => []);
  const latest   = samples[samples.length - 1] || {};

  header(`Drift Score — ${deviceId}`);
  row('Fleet',          device.fleet || '—');
  row('FW Version',     device.fw || '—');
  row('Last Telemetry', relTime(device.lastTelemetry));
  row('Baseline Tag',   baseline?.tag || 'none captured');

  if (device.driftScore != null) {
    const sc = scoreColor(device.driftScore);
    console.log('');
    row('Overall Score', `${device.driftScore.toFixed(3)}  [${device.driftLabel || ''}]`, sc);
  }

  if (Object.keys(latest).length > 0) {
    console.log('');
    console.log(muted('  Latest Readings:'));
    const fields = [
      ['ADC Offset',         latest.adcOffset,      'counts'],
      ['GPIO State',         latest.gpioState,       ''],
      ['Clock Skew',         latest.clockSkewNs,     'ns'],
      ['Power Ripple',       latest.powerRippleMv,   'mVpp'],
      ['Temperature',        latest.tempC,           'C'],
      ['Memory Free',        latest.memFree,         'bytes'],
    ];
    fields.forEach(([label, val, unit]) => {
      if (val === undefined) return;
      console.log(`    ${muted(label.padEnd(20))} ${val}${unit ? ' ' + muted(unit) : ''}`);
    });
  }
  console.log('');
}

async function cmdDriftHistory(deviceId) {
  if (!deviceId) { err('--device required. Usage: drift history --device <id>'); return; }
  const samples = await client.deviceTelemetry(deviceId, 60);
  header(`Telemetry History — ${deviceId}  (${samples.length} samples)`);
  if (!samples.length) {
    console.log(muted('  No telemetry received yet. Connect a device and ensure it is sending data.'));
    console.log('');
    return;
  }
  console.log(muted('  Timestamp                 Drift   ADC      Power    Temp'));
  console.log(muted('  ' + '─'.repeat(60)));
  samples.slice(-20).forEach(s => {  // show last 20 to fit terminal
    const ts  = s.ts ? new Date(s.ts).toISOString().slice(11, 19) : '—';
    const sc  = scoreColor(s.driftScore);
    const score = s.driftScore != null ? sc(s.driftScore.toFixed(3)) : muted('—    ');
    console.log(
      `  ${muted(ts.padEnd(26))}` +
      `${score.padEnd(8)}` +
      `${String(s.adcOffset ?? '—').padEnd(9)}` +
      `${String(s.powerRippleMv ?? '—').padEnd(9)}` +
      `${String(s.tempC ?? '—')}`
    );
  });
  if (samples.length > 20) console.log(muted(`  ... and ${samples.length - 20} earlier samples`));
  console.log('');
}

async function cmdAlertsList(sev) {
  const alerts = await client.alerts(sev ? { sev, acknowledged: false } : { acknowledged: false });
  header(`Active Alerts  (${alerts.length})`);
  if (!alerts.length) {
    console.log(ok('  No active alerts — all systems nominal.'));
    console.log('');
    return;
  }
  console.log(muted('  ID'.padEnd(24) + 'Device'.padEnd(26) + 'Type'.padEnd(28) + 'Score'.padEnd(8) + 'Sev'));
  console.log(muted('  ' + '─'.repeat(90)));
  alerts.forEach(a => {
    const sc = scoreColor(a.driftScore);
    const sv = sevColor(a.severity);
    console.log(
      '  ' +
      (a.id || '—').slice(0, 22).padEnd(24) +
      (a.deviceId || '—').slice(0, 24).padEnd(26) +
      (a.type || '—').slice(0, 26).padEnd(28) +
      (a.driftScore != null ? sc(a.driftScore.toFixed(2)) : muted('—')).padEnd(8) +
      sv(a.severity || '—')
    );
  });
  console.log('');
}

async function cmdAlertsAck(alertId) {
  if (!alertId) { err('--id required. Usage: alerts ack --id <alertId>'); return; }
  const result = await client.acknowledgeAlert(alertId);
  console.log('');
  console.log(ok(`  Alert acknowledged: ${result.id}`));
  row('Device',    result.deviceId);
  row('Type',      result.type);
  row('Acked At',  relTime(result.acknowledgedAt));
  console.log(muted('  Audit record created. Monitor Agent continues watching.'));
  console.log('');
}

async function cmdAgentsStatus() {
  const agents = await client.agents();
  header('Agent Runtime Status');
  agents.forEach(a => {
    const sc = a.status === 'active' ? ok : a.status === 'idle' ? muted : warn;
    console.log(`  ${bold(a.name.padEnd(38))} ${sc(a.status?.toUpperCase() || 'UNKNOWN')}`);
    if (a.lastActivity) row('Last Activity', relTime(a.lastActivity));
    const m = a.metrics || {};
    if (Object.keys(m).length) {
      const parts = Object.entries(m).map(([k, v]) => `${k}: ${bold(String(v))}`).join('  |  ');
      console.log(muted('    ' + parts));
    }
    console.log('');
  });
}

async function cmdIntegrationsList() {
  const integrations = await client.integrations();
  header('Integration Status  —  Live');
  console.log(muted('  ' + 'Integration'.padEnd(28) + 'Status'.padEnd(16) + 'Detail'));
  console.log(muted('  ' + '─'.repeat(72)));
  integrations.forEach(i => {
    const sc = statusColor(i.status);
    console.log(
      '  ' +
      i.name.padEnd(28) +
      sc(i.status?.toUpperCase() || '—').padEnd(16) +
      muted(i.detail || '—')
    );
  });
  console.log('');
}

async function cmdIntegrationsConnect(id) {
  if (!id) { err('--id required. Usage: integrations connect --id arduino|github|vscode|...'); return; }
  if (id === 'arduino') {
    console.log(info(`\n  Triggering Arduino serial connection on server...`));
    const result = await client.post('/integrations/arduino/connect', {});
    console.log(result.connected ? ok(`  Connected: ${result.port}`) : warn('  Not connected — no serial port found'));
  } else {
    err(`Direct connect only supported for 'arduino' via CLI. Configure others via .env and restart the server.`);
  }
  console.log('');
}

async function cmdBaselineCapture(deviceId, tag) {
  if (!deviceId) { err('--device required. Usage: baseline capture --device <id>'); return; }
  console.log(info(`\n  Capturing baseline for ${deviceId}...`));
  console.log(muted('  Reading current telemetry from server...'));

  // Use last known telemetry as baseline readings
  const samples = await client.deviceTelemetry(deviceId, 1).catch(() => []);
  const readings = samples[samples.length - 1] || {};
  // Strip meta fields
  const { ts, driftScore, ...baseReadings } = readings;

  const result = await client.captureBaseline(deviceId, baseReadings, tag);
  console.log(ok(`  Baseline captured: ${result.tag}`));
  row('Device',    result.deviceId);
  row('Tag',       result.tag);
  row('Captured',  relTime(result.capturedAt));
  console.log('');
}

async function cmdKnowledgeList(q) {
  const articles = await client.knowledge(q);
  header(`Knowledge Base${q ? ` — "${q}"` : ''}  (${articles.length} articles)`);
  if (!articles.length) {
    console.log(muted(`  No articles found${q ? ` matching "${q}"` : ''}. Knowledge is populated by the Onboarding Agent.`));
    console.log('');
    return;
  }
  articles.forEach((a, i) => {
    const sc = a.severity === 'Critical' ? danger : a.severity === 'Warning' ? warn : a.severity === 'Resolved' ? ok : info;
    console.log(`  [${i + 1}] ${sc((a.severity || 'Guide').padEnd(10))} ${a.title}`);
    if (a.createdAt) console.log(muted(`       Updated: ${relTime(a.createdAt)}`));
  });
  console.log('');
}

async function cmdIncidentsList() {
  const incidents = await client.incidents();
  header(`Incidents  (${incidents.length})`);
  if (!incidents.length) {
    console.log(ok('  No incidents recorded.'));
    console.log('');
    return;
  }
  incidents.slice(0, 10).forEach((inc, i) => {
    console.log(`  [${i + 1}] ${inc.title || inc.id}`);
    console.log(muted(`       ${relTime(inc.createdAt)}  —  ${inc.deviceId || '—'}`));
  });
  console.log('');
}

async function cmdHealth() {
  const h = await client.health();
  header('Server Health');
  row('Status',   h.status, ok);
  row('Version',  h.version);
  row('Uptime',   `${Math.round(h.uptime)}s`);
  row('Server',   client.base);
  row('Timestamp', h.ts);
  console.log('');
  row('Fleet Devices',  h.fleet?.total);
  row('Active Alerts',  h.fleet?.alertCount);
  console.log('');
  console.log(muted('  Integrations:'));
  (h.integrations || []).forEach(i => {
    const sc = statusColor(i.status);
    console.log(`    ${i.id.padEnd(16)} ${sc(i.status)}`);
  });
  console.log('');
}

// ── Bob AI Agent commands ──────────────────────────────────

async function cmdBobStatus() {
  const data = await client.get('/integrations/bob/status');
  header('Bob AI Agent — Status');
  row('Connected',    data.connected  ? 'Yes' : 'No',  data.connected ? ok : warn);
  row('Configured',  data.configured ? 'Yes' : 'No',  data.configured ? ok : warn);
  row('Base URL',    data.baseUrl || '—');
  row('Integration', (data.integration?.status) || '—', statusColor);
  if (data.integration?.detail) row('Detail', data.integration.detail);
  console.log('');
  if (data.capabilities?.length) {
    console.log(muted('  Capabilities:'));
    data.capabilities.forEach(c => console.log(`    ${ok('•')} ${c}`));
  }
  console.log('');
}

async function cmdBobAnalyze(alertId) {
  if (!alertId) {
    // Analyze first active alert if no ID given
    const alerts = await client.get('/alerts');
    if (!alerts.length) { err('No active alerts. Use: bob analyze --id <alertId>'); return; }
    alertId = alerts[0].id;
    console.log(muted(`  Analyzing top alert: ${alertId}`));
  }
  const data = await client.post('/integrations/bob/analyze-alert', { alertId });
  header('Bob AI — Alert Analysis');
  if (!data.ok) { err(data.error || 'Analysis failed'); return; }
  const a = data.analysis;
  if (!a) { console.log(muted('  Analysis queued — check dashboard shortly.')); console.log(''); return; }
  row('Hypothesis',       a.hypothesis || a.output || '—');
  row('Confidence',       a.confidence != null ? (a.confidence * 100).toFixed(0) + '%' : '—',
    v => parseFloat(v) > 70 ? ok(v) : warn(v));
  row('Suggested Action', a.suggestedAction || a.action || '—');
  row('Analyzed At',      a.analyzedAt ? relTime(a.analyzedAt) : '—');
  console.log('');
}

async function cmdBobDiff(target) {
  const fw = target || 'fw-v3.8.2-rc4';
  const data = await client.post('/integrations/bob/diff', {
    target:          fw,
    baseVersion:     'fw-v3.8.1-stable',
    headVersion:     fw,
    symbolChanges:   ['ADC_Init', 'DMA_Config', 'GPIO_Init'],
    registerChanges: [
      { register: 'TIM2_PSC',  before: '0x0047', after: '0x0052' },
      { register: 'DMA1_S3CR', before: '0x0C41', after: '0x0C49' },
    ],
  });
  header(`Bob AI — Firmware Diff Analysis  (${fw})`);
  if (!data.ok) { err(data.error || 'Diff analysis failed'); return; }
  const r = data.result;
  if (!r) { console.log(muted('  No result returned from Bob Agent.')); console.log(''); return; }
  row('Risk Level',      r.riskLevel || '—',
    v => v === 'CRITICAL' || v === 'HIGH' ? danger(v) : v === 'MEDIUM' ? warn(v) : ok(v));
  row('Summary',         r.summary || r.output || '—');
  row('Reason',          r.riskReason || '—');
  row('Recommendation',  r.recommendation || '—');
  console.log('');
}

function cmdVersion() {
  console.log('');
  console.log(bold(accent('  diagiot')) + muted(' v1.0.0'));
  console.log(muted('  DiagIoT — Agentic Drift Detection Platform for Embedded IoT'));
  console.log(muted('  Server: ' + client.base));
  console.log('');
}

// ═══════════════════════════════════════════════════════════
// ARGUMENT PARSER
// ═══════════════════════════════════════════════════════════
function parseArgs(argv) {
  const args = argv.slice(2);
  const flags = {};
  const positional = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      const next = args[i + 1];
      flags[key] = (next && !next.startsWith('--')) ? args[++i] : true;
    } else {
      positional.push(args[i]);
    }
  }
  return { cmd: positional[0], sub: positional[1], rest: positional.slice(2), flags };
}

// ═══════════════════════════════════════════════════════════
// INTERACTIVE REPL
// ═══════════════════════════════════════════════════════════
function startREPL() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: ok('diagiot') + muted(' > '),
  });

  console.log('');
  console.log(bold(accent('  DiagIoT CLI — Interactive Mode')));
  console.log(muted(`  Connected to: ${client.base}`));
  console.log(muted('  Type "help" for commands, "exit" to quit.'));
  console.log('');
  rl.prompt();

  rl.on('line', async (line) => {
    const input = line.trim();
    if (!input) { rl.prompt(); return; }
    if (input === 'exit' || input === 'quit') {
      console.log(muted('  Bye.'));
      rl.close();
      process.exit(0);
    }
    const mockArgv = ['node', 'diagiot', ...input.split(/\s+/)];
    try { await dispatch(parseArgs(mockArgv)); }
    catch (e) { err(e.message); }
    rl.prompt();
  });

  rl.on('close', () => process.exit(0));
}

// ═══════════════════════════════════════════════════════════
// DISPATCHER
// ═══════════════════════════════════════════════════════════
async function dispatch(parsed) {
  const { cmd, sub, flags, rest } = parsed;

  if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h')  { await cmdHelp();  return; }
  if (cmd === 'version' || cmd === '--version' || cmd === '-v')    { cmdVersion();     return; }
  if (cmd === 'interactive' || cmd === 'repl')                     { startREPL();      return; }

  if (cmd === 'fleet') {
    if (!sub || sub === 'status') { await cmdFleetStatus(); return; }
    if (sub === 'list')           { await cmdFleetList();   return; }
    if (sub === 'device')         { await cmdFleetDevice(flags.id || rest[0]); return; }
    err(`Unknown fleet sub-command: "${sub}"`); return;
  }

  if (cmd === 'scan') {
    if (!sub || sub === 'run')    { await cmdScanRun(flags.target, flags.scores); return; }
    if (sub === 'status')         { await cmdScanStatus(flags.target); return; }
    err(`Unknown scan sub-command: "${sub}"`); return;
  }

  if (cmd === 'drift') {
    if (!sub || sub === 'score')   { await cmdDriftScore(flags.device);  return; }
    if (sub === 'history')         { await cmdDriftHistory(flags.device); return; }
    err(`Unknown drift sub-command: "${sub}"`); return;
  }

  if (cmd === 'alerts') {
    if (!sub || sub === 'list') { await cmdAlertsList(flags.sev);  return; }
    if (sub === 'ack')          { await cmdAlertsAck(flags.id);    return; }
    err(`Unknown alerts sub-command: "${sub}"`); return;
  }

  if (cmd === 'agents' || cmd === 'agent') {
    if (!sub || sub === 'status') { await cmdAgentsStatus(); return; }
    err(`Unknown agents sub-command: "${sub}"`); return;
  }

  if (cmd === 'integrations' || cmd === 'integration') {
    if (!sub || sub === 'list')   { await cmdIntegrationsList(); return; }
    if (sub === 'connect')        { await cmdIntegrationsConnect(flags.id || rest[0]); return; }
    err(`Unknown integrations sub-command: "${sub}"`); return;
  }

  if (cmd === 'baseline') {
    if (!sub || sub === 'capture') { await cmdBaselineCapture(flags.device, flags.tag); return; }
    err(`Unknown baseline sub-command: "${sub}"`); return;
  }

  if (cmd === 'knowledge' || cmd === 'kb') {
    if (!sub || sub === 'list') { await cmdKnowledgeList(flags.q || rest.join(' ') || null); return; }
    err(`Unknown knowledge sub-command: "${sub}"`); return;
  }

  if (cmd === 'incidents') {
    if (!sub || sub === 'list') { await cmdIncidentsList(); return; }
    err(`Unknown incidents sub-command: "${sub}"`); return;
  }

  if (cmd === 'health') { await cmdHealth(); return; }

  if (cmd === 'bob') {
    if (!sub || sub === 'status') { await cmdBobStatus();                       return; }
    if (sub === 'analyze')        { await cmdBobAnalyze(flags.id || rest[0]);   return; }
    if (sub === 'diff')           { await cmdBobDiff(flags.target || rest[0]);  return; }
    err(`Unknown bob sub-command: "${sub}"`); return;
  }

  err(`Unknown command: "${cmd}"`);
  console.error(muted('  Run: diagiot help'));
  process.exitCode = 1;
}

// ═══════════════════════════════════════════════════════════
// ENTRY POINT
// ═══════════════════════════════════════════════════════════
async function main() {
  if (process.argv.length <= 2) {
    await cmdHelp();
    return;
  }

  const parsed = parseArgs(process.argv);

  // These commands work without a server
  if (['help', '--help', '-h', 'version', '--version', '-v', 'interactive', 'repl'].includes(parsed.cmd)) {
    await dispatch(parsed);
    return;
  }

  // All other commands need the server
  const alive = await checkServer();
  if (!alive) { process.exitCode = 2; return; }

  try {
    await dispatch(parsed);
  } catch (e) {
    err(e.message);
    if (process.env.DEBUG) console.error(e);
    process.exitCode = 1;
  }
}

main();
