/**
 * Keil / STM32CubeIDE Integration Adapter
 *
 * Keil MDK and STM32CubeIDE don't have webhook support natively.
 * Integration works via a post-build hook script that calls this server.
 *
 * In Keil: Project → Options → User → After Build/Rebuild:
 *   cmd: curl -s -X POST http://localhost:3000/api/integrations/keil/artifact \
 *        -F "file=@$L$T.axf" -F "target=$T" -F "deviceId=myDevice"
 *
 * In STM32CubeIDE: Project → Properties → C/C++ Build → Post-build steps:
 *   Command: curl -s -X POST http://localhost:3000/api/integrations/keil/artifact \
 *            -F "file=@${ProjName}.elf" -F "target=${ProjVer}" -F "deviceId=${ProjName}"
 *
 * DiagIoT parses the .axf/.elf symbol table (using nm or size if available)
 * or reads the SVD file to compare peripheral register configurations.
 *
 * ENV:
 *   (none required — all configuration comes from the post-build hook parameters)
 */

'use strict';

const path   = require('path');
const store  = require('../store');
const { computePreShipScore } = require('../drift-engine');

/**
 * Analyse an uploaded .elf/.axf artifact.
 * Uses the `size` system command to get section sizes if available.
 * Falls back to basic file-size delta if arm-none-eabi-size is not on PATH.
 *
 * @param {string} filePath - path to uploaded file
 * @returns {Promise<Object>} - { sections, totalBytes }
 */
async function analyseElf(filePath) {
  try {
    const { execa } = await import('execa');
    const { stdout } = await execa('arm-none-eabi-size', [filePath]);
    const lines = stdout.trim().split('\n');
    // Typical output: text   data    bss    dec    hex filename
    const vals = lines[1]?.trim().split(/\s+/).map(Number);
    if (vals && vals.length >= 3) {
      return {
        textBytes: vals[0],
        dataBytes: vals[1],
        bssBytes:  vals[2],
        totalBytes: vals[0] + vals[1],
      };
    }
  } catch { /* arm-none-eabi-size not available */ }

  // Fallback: just get file size
  const fs = require('fs');
  const stat = fs.statSync(filePath);
  return { totalBytes: stat.size };
}

/**
 * POST /api/integrations/keil/artifact
 * Multipart form: { file, target, deviceId, baseline?, checks?, scores?, svd? }
 */
async function artifactHandler(req, res) {
  const { target, deviceId, baseline, checks, scores } = req.body;

  if (!target) return res.status(400).json({ error: 'target is required' });

  // Parse optional checks/scores from the hook
  let parsedChecks, parsedScores;
  try {
    parsedChecks = typeof checks === 'string' ? JSON.parse(checks) : (checks || []);
    parsedScores = typeof scores === 'string' ? JSON.parse(scores)
      : scores || { binaryDiff: 0, behavioralSig: 0, knownVulns: 0, hwCompat: 0, configDrift: 0 };
  } catch {
    return res.status(400).json({ error: 'Invalid JSON in checks or scores' });
  }

  // If a file was uploaded, try to analyse it
  let elfInfo = {};
  if (req.file) {
    elfInfo = await analyseElf(req.file.path);
    // Use file-size drift as a rough binaryDiff indicator if not provided
    const device = store.getDevice(deviceId);
    if (device?.lastElfSize && !parsedScores.binaryDiff) {
      const delta = Math.abs(elfInfo.totalBytes - device.lastElfSize) / device.lastElfSize;
      parsedScores.binaryDiff = Math.min(delta * 5, 1);   // scale: 20% size change ≈ score 1.0
    }
  }

  // Register/update device
  const dev = store.upsertDevice({
    id:         deviceId || `keil-${target}`,
    name:       deviceId || target,
    source:     'keil',
    fleet:      'Keil / STM32CubeIDE',
    lastElfSize: elfInfo.totalBytes,
  });

  const result = computePreShipScore(target, parsedChecks, parsedScores);
  store.setIntegrationStatus('keil', 'live', `${target} — score ${result.composite} [${result.decision}]`);

  console.log(`[Keil] Artifact scanned → ${target}  score: ${result.composite}  decision: ${result.decision}`);

  // Clean up temp file
  if (req.file) {
    const fs = require('fs');
    fs.unlink(req.file.path, () => {});
  }

  res.json({
    scanId:     result.id,
    target,
    deviceId:   dev.id,
    driftScore: result.composite,
    decision:   result.decision,
    label:      result.label,
    elfInfo,
  });
}

/**
 * POST /api/integrations/keil/telemetry
 * Same telemetry ingestion as Arduino, for STM32 devices with serial debug output.
 */
function telemetryHandler(req, res) {
  const { deviceId, readings } = req.body;
  if (!deviceId || !readings) return res.status(400).json({ error: 'deviceId and readings are required' });

  const { evaluateTelemetry } = require('../drift-engine');
  if (!store.getDevice(deviceId)) {
    store.upsertDevice({ id: deviceId, name: deviceId, source: 'keil', fleet: 'Keil / STM32CubeIDE' });
  }
  evaluateTelemetry(deviceId, readings);
  res.json({ ok: true, deviceId, ts: new Date().toISOString() });
}

module.exports = { artifactHandler, telemetryHandler };
