/**
 * DiagIoT Backend — Drift Engine
 *
 * Computes drift scores from live telemetry vs captured baselines.
 * Scoring weights match the spec:
 *   Binary diff        30%
 *   Behavioral sig     25%
 *   Known vulns        20%
 *   HW compatibility   15%
 *   Config drift       10%
 *
 * For field monitoring, the engine compares live telemetry samples
 * against baseline values captured at deploy time.
 */

'use strict';

const store = require('./store');

// Thresholds
const THRESHOLDS = {
  warn:  parseFloat(process.env.DRIFT_THRESHOLD_WARN  || '0.40'),
  block: parseFloat(process.env.DRIFT_THRESHOLD_BLOCK || '0.70'),
};

/**
 * Compute drift score from a set of signal readings vs a baseline.
 * Each signal contributes a normalised [0..1] deviation weighted by its category.
 *
 * @param {Object} readings   - { adc, gpio, clock, power, temp, mem } current values
 * @param {Object} baseline   - same shape as readings, captured at deploy time
 * @returns {{ score: number, breakdown: Object, label: string, decision: string }}
 */
function computeDriftScore(readings, baseline) {
  if (!baseline) return { score: null, breakdown: {}, label: 'NO_BASELINE', decision: 'skip' };

  const breakdown = {};

  function norm(key, maxDelta) {
    const r = readings[key];
    const b = baseline[key];
    if (r === undefined || b === undefined) return 0;
    return Math.min(Math.abs(r - b) / maxDelta, 1);
  }

  // ADC offset drift — baseline in raw counts (0–4095 for 12-bit ADC)
  breakdown.adc   = norm('adcOffset', 200);      // 200 counts ≈ worst case

  // GPIO state mismatch — binary (0 = same, 1 = any mismatch)
  breakdown.gpio  = (readings.gpioState !== undefined && baseline.gpioState !== undefined)
    ? (readings.gpioState === baseline.gpioState ? 0 : 1) : 0;

  // Clock skew in nanoseconds
  breakdown.clock = norm('clockSkewNs', 200);    // 200ns ≈ worst tolerable

  // Power ripple in mV peak-to-peak
  breakdown.power = norm('powerRippleMv', 100);  // 100mVpp ≈ worst case

  // Temperature deviation in °C
  breakdown.temp  = norm('tempC', 30);           // 30°C excursion

  // Memory usage deviation (fraction of heap)
  breakdown.mem   = norm('memUsage', 1.0);

  // Weighted composite
  const WEIGHTS = { adc: 0.25, gpio: 0.15, clock: 0.20, power: 0.20, temp: 0.10, mem: 0.10 };
  const score = Object.entries(WEIGHTS).reduce((acc, [k, w]) => acc + (breakdown[k] || 0) * w, 0);
  const clipped = Math.min(Math.max(score, 0), 1);

  return {
    score: parseFloat(clipped.toFixed(3)),
    breakdown,
    label:    clipped < 0.2 ? 'SAFE' : clipped < 0.40 ? 'LOW' : clipped < 0.70 ? 'WARNING' : 'CRITICAL',
    decision: clipped >= THRESHOLDS.block ? 'block' : clipped >= THRESHOLDS.warn ? 'warn' : 'pass',
  };
}

/**
 * Pre-Ship scan — compares a firmware artifact diff against a baseline.
 * Receives the raw check results from the Pre-Ship Agent adapter.
 *
 * @param {string} target  - firmware version string
 * @param {Object[]} checks - [{ name, passed, delta }]
 * @param {Object} scores   - { binaryDiff, behavioralSig, knownVulns, hwCompat, configDrift }
 * @returns {ScanResult}
 */
function computePreShipScore(target, checks, scores) {
  const WEIGHTS = {
    binaryDiff:    0.30,
    behavioralSig: 0.25,
    knownVulns:    0.20,
    hwCompat:      0.15,
    configDrift:   0.10,
  };

  const composite = Object.entries(WEIGHTS).reduce((acc, [k, w]) => {
    return acc + (scores[k] != null ? scores[k] * w : 0);
  }, 0);

  const score = parseFloat(Math.min(Math.max(composite, 0), 1).toFixed(3));
  const decision = score >= THRESHOLDS.block ? 'block' : score >= THRESHOLDS.warn ? 'warn' : 'pass';

  const result = store.addScan({
    target,
    checks,
    scores,
    composite: score,
    decision,
    label: score < 0.20 ? 'SAFE' : score < 0.40 ? 'LOW' : score < 0.70 ? 'WARNING' : 'CRITICAL',
  });

  // Raise alert if blocked
  if (decision === 'block') {
    store.addAlert({
      source: 'preship',
      deviceId: target,
      type: 'Pre-Ship Block',
      severity: 'CRITICAL',
      driftScore: score,
      detail: `Firmware ${target} blocked — drift score ${score} exceeds threshold ${THRESHOLDS.block}`,
    });
  }

  return result;
}

/**
 * Evaluate a live telemetry sample for a device. Raises alerts when thresholds crossed.
 * Called by the Monitor Agent on every incoming telemetry batch.
 *
 * @param {string} deviceId
 * @param {Object} readings
 */
function evaluateTelemetry(deviceId, readings) {
  const device   = store.getDevice(deviceId);
  const baseline = store.getBaseline(deviceId);
  if (!baseline) return;   // can't score without baseline

  const result = computeDriftScore(readings, baseline.readings);
  if (result.score === null) return;

  // Update device with latest score
  store.upsertDevice({ id: deviceId, driftScore: result.score, driftLabel: result.label, lastTelemetry: new Date().toISOString() });

  // Push telemetry sample (includes computed score)
  store.pushTelemetry(deviceId, { ...readings, driftScore: result.score });

  // Raise alert on first threshold crossing (debounced — don't spam)
  const prevScore = device?.driftScore || 0;
  const crossed = (prevScore < THRESHOLDS.block && result.score >= THRESHOLDS.block) ||
                  (prevScore < THRESHOLDS.warn  && result.score >= THRESHOLDS.warn && result.score < THRESHOLDS.block);
  if (crossed) {
    store.addAlert({
      source:     'monitor',
      deviceId,
      type:       result.score >= THRESHOLDS.block ? 'Critical Drift' : 'Drift Warning',
      severity:   result.score >= THRESHOLDS.block ? 'CRITICAL' : 'WARNING',
      driftScore: result.score,
      breakdown:  result.breakdown,
      detail:     `Device ${deviceId} drift score crossed ${result.label} threshold: ${result.score}`,
    });
  }

  return result;
}

module.exports = { computeDriftScore, computePreShipScore, evaluateTelemetry, THRESHOLDS };
