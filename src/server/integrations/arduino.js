/**
 * Arduino / Arduino CLI Integration Adapter
 *
 * Supports two connection modes:
 *
 * MODE 1 — Arduino CLI  (preferred, used when arduino-cli is on PATH)
 *   Polls `arduino-cli monitor` over serial for JSON telemetry lines.
 *   Expects the firmware to emit newline-delimited JSON:
 *     {"adc":2064,"gpio":255,"clockSkewNs":8,"powerRippleMv":35,"tempC":38.2,"memFree":4096}
 *
 * MODE 2 — SerialPort direct (fallback when arduino-cli not available)
 *   Opens the serial port directly via the 'serialport' npm package.
 *
 * MODE 3 — Arduino IDE Plugin  (IDE calls POST /api/integrations/arduino/upload)
 *   The DiagIoT Arduino IDE plugin sends the compiled .hex/.bin to the server
 *   after each build/upload. Server runs Pre-Ship scan on the artifact.
 *
 * ENV:
 *   ARDUINO_CLI_PATH   path to arduino-cli binary (default: arduino-cli)
 *   ARDUINO_PORT       serial port (default: /dev/ttyACM0 or auto-detect)
 *   ARDUINO_BAUD       baud rate (default: 115200)
 */

'use strict';

const store  = require('../store');
const { evaluateTelemetry, computePreShipScore } = require('../drift-engine');

let activePort  = null;
let activePoll  = null;
let isConnected = false;

// ── Auto-detect serial port ───────────────────────────────
async function detectPort() {
  const configured = process.env.ARDUINO_PORT;
  if (configured) return configured;

  try {
    const { SerialPort } = require('serialport');
    const ports = await SerialPort.list();
    // Prefer USB/ACM ports (Arduino signature)
    const arduino = ports.find(p =>
      p.manufacturer?.toLowerCase().includes('arduino') ||
      p.vendorId === '2341' ||
      p.path?.includes('ACM') ||
      p.path?.includes('usbmodem')
    );
    return arduino?.path || ports[0]?.path || null;
  } catch { return null; }
}

// ── Connect via SerialPort directly ──────────────────────
async function connectSerial(deviceId, port, baud) {
  try {
    const { SerialPort } = require('serialport');
    const { ReadlineParser } = require('@serialport/parser-readline');

    activePort = new SerialPort({ path: port, baudRate: baud, autoOpen: false });
    const parser = activePort.pipe(new ReadlineParser({ delimiter: '\n' }));

    activePort.open(err => {
      if (err) {
        console.error(`[Arduino] Serial open error on ${port}:`, err.message);
        store.setIntegrationStatus('arduino', 'error', err.message);
        return;
      }
      isConnected = true;
      store.setIntegrationStatus('arduino', 'live', `Serial ${port} @ ${baud} baud`);
      store.setAgentStatus('monitor', 'active', { arduinoPort: port });
      console.log(`[Arduino] Serial connected: ${port}`);
    });

    parser.on('data', line => {
      line = line.trim();
      if (!line.startsWith('{')) return;
      try {
        const readings = JSON.parse(line);
        handleTelemetrySample(deviceId, readings);
      } catch { /* malformed JSON line — skip */ }
    });

    activePort.on('close', () => {
      isConnected = false;
      store.setIntegrationStatus('arduino', 'disconnected', 'Port closed');
      console.log('[Arduino] Serial port closed');
    });

    activePort.on('error', err => {
      isConnected = false;
      store.setIntegrationStatus('arduino', 'error', err.message);
      console.error('[Arduino] Serial error:', err.message);
    });

  } catch (err) {
    console.error('[Arduino] SerialPort module error:', err.message);
    store.setIntegrationStatus('arduino', 'error', 'serialport module unavailable: ' + err.message);
  }
}

// ── Handle an incoming telemetry sample ──────────────────
function handleTelemetrySample(deviceId, readings) {
  // Register device if not yet known
  if (!store.getDevice(deviceId)) {
    store.upsertDevice({ id: deviceId, name: deviceId, source: 'arduino', fleet: 'Arduino' });
  }
  evaluateTelemetry(deviceId, readings);
  store.emit('arduino:telemetry', { deviceId, readings, ts: new Date().toISOString() });
}

// ── Connect (called at startup or on demand) ──────────────
async function connect(deviceId) {
  const port = await detectPort();
  const baud = parseInt(process.env.ARDUINO_BAUD || '115200', 10);

  if (!port) {
    console.warn('[Arduino] No serial port found. Waiting for IDE plugin uploads or manual connection.');
    store.setIntegrationStatus('arduino', 'disconnected', 'No serial port detected');
    return false;
  }

  console.log(`[Arduino] Connecting to ${port} @ ${baud}`);
  await connectSerial(deviceId || 'arduino-device-default', port, baud);
  return true;
}

// ── Disconnect ────────────────────────────────────────────
function disconnect() {
  if (activePort && activePort.isOpen) {
    activePort.close();
    activePort = null;
  }
  if (activePoll) { clearInterval(activePoll); activePoll = null; }
  isConnected = false;
  store.setIntegrationStatus('arduino', 'disconnected', null);
}

// ── IDE Plugin upload endpoint ────────────────────────────
/**
 * POST /api/integrations/arduino/upload
 * Body: multipart/form-data { file, deviceId, boardFqbn, port, target, baseline, checks, scores }
 *
 * Called by the DiagIoT Arduino IDE plugin after each successful build/upload.
 */
function uploadHandler(req, res) {
  const { deviceId, boardFqbn, target, baseline, checks, scores } = req.body;

  if (!target) return res.status(400).json({ error: 'target (firmware version) is required' });

  let parsedChecks, parsedScores;
  try {
    parsedChecks = typeof checks === 'string' ? JSON.parse(checks) : (checks || []);
    parsedScores = typeof scores === 'string' ? JSON.parse(scores)
      : scores || { binaryDiff: 0, behavioralSig: 0, knownVulns: 0, hwCompat: 0, configDrift: 0 };
  } catch {
    return res.status(400).json({ error: 'Invalid JSON in checks or scores' });
  }

  // Register device with board info
  store.upsertDevice({
    id:   deviceId || `arduino-${boardFqbn || 'unknown'}`,
    name: deviceId || boardFqbn,
    source: 'arduino',
    boardFqbn,
    fleet: 'Arduino',
  });

  const result = computePreShipScore(target, parsedChecks, parsedScores);

  store.setIntegrationStatus('arduino', 'live', `${target} — score ${result.composite} [${result.decision}]`);
  console.log(`[Arduino] Upload scanned → ${target}  score: ${result.composite}  decision: ${result.decision}`);

  res.json({
    scanId:     result.id,
    target,
    driftScore: result.composite,
    decision:   result.decision,
    label:      result.label,
    board:      boardFqbn,
    port:       process.env.ARDUINO_PORT,
  });
}

/**
 * POST /api/integrations/arduino/telemetry
 * Body: { deviceId, readings: { adc, gpio, clockSkewNs, powerRippleMv, tempC, memFree } }
 *
 * For IDE plugin or external tool (e.g. Arduino CLI script) to push a telemetry sample.
 */
function telemetryHandler(req, res) {
  const { deviceId, readings } = req.body;
  if (!deviceId || !readings) return res.status(400).json({ error: 'deviceId and readings are required' });
  handleTelemetrySample(deviceId, readings);
  res.json({ ok: true, deviceId, ts: new Date().toISOString() });
}

/**
 * POST /api/integrations/arduino/connect
 * Body: { deviceId?, port?, baud? }   — trigger serial connection from dashboard
 */
async function connectHandler(req, res) {
  const { deviceId, port, baud } = req.body;
  if (port) process.env.ARDUINO_PORT = port;
  if (baud) process.env.ARDUINO_BAUD = baud;
  const ok = await connect(deviceId);
  res.json({ connected: ok, port: process.env.ARDUINO_PORT });
}

module.exports = { connect, disconnect, uploadHandler, telemetryHandler, connectHandler };
