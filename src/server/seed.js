'use strict';

/**
 * DiagIoT — Store Seed
 *
 * Populates the in-memory store with representative devices, baselines,
 * knowledge articles, and initial scan data so the dashboard is non-empty
 * from the very first page load — no real hardware required.
 *
 * All seeded data is clearly labelled SEED so operators know it is
 * placeholder data until real devices register themselves via the API.
 */

function seedStore(store) {
  // ── Devices ──────────────────────────────────────────────────────────────────
  const devices = [
    { id: 'SH-X4-3192', name: 'SensorHub-X4 #3192',      fleet: 'Pacific NW Grid',    fw: 'fw-v3.8.2-rc4',    driftScore: 0.87, health: 'CRITICAL' },
    { id: 'TN-R2-0841', name: 'ThermoNode-R2 #0841',      fleet: 'EU Logistics Hub',   fw: 'fw-v2.4.0',        driftScore: 0.52, health: 'DRIFTING' },
    { id: 'AB-M7-5501', name: 'ActuatorBridge-M7 #5501',  fleet: 'Factory Line A',     fw: 'fw-v1.9.3',        driftScore: 0.44, health: 'DRIFTING' },
    { id: 'EG-E1-7700', name: 'EdgeGateway-E1 #7700',     fleet: 'Data Center East',   fw: 'fw-v4.1.0',        driftScore: 0.12, health: 'HEALTHY'  },
    { id: 'PC-Z8-0022', name: 'PowerCtrl-Z8 #0022',       fleet: 'Factory Line B',     fw: 'fw-v2.1.7',        driftScore: 0.08, health: 'HEALTHY'  },
    { id: 'SH-X4-1023', name: 'SensorHub-X4 #1023',       fleet: 'Pacific NW Grid',    fw: 'fw-v3.8.1-stable', driftScore: 0.21, health: 'HEALTHY'  },
  ];
  devices.forEach(d => {
    store.upsertDevice({ ...d, source: 'seed', updatedAt: new Date().toISOString() });
  });

  // ── Baselines (golden reference readings for each seeded device) ─────────────
  const baselines = [
    { id: 'SH-X4-3192', readings: { adcOffset: 0,   gpioState: 0b10110, clockSkewNs: 0, powerRippleMv: 12, tempC: 42, memUsage: 0.48 }, tag: 'golden-v3.8.1' },
    { id: 'TN-R2-0841', readings: { adcOffset: 0,   gpioState: 0b11001, clockSkewNs: 0, powerRippleMv: 8,  tempC: 38, memUsage: 0.31 }, tag: 'golden-v2.3.4' },
    { id: 'AB-M7-5501', readings: { adcOffset: 0,   gpioState: 0b00111, clockSkewNs: 0, powerRippleMv: 15, tempC: 55, memUsage: 0.60 }, tag: 'golden-v1.9.0' },
    { id: 'EG-E1-7700', readings: { adcOffset: 0,   gpioState: 0b11111, clockSkewNs: 0, powerRippleMv: 6,  tempC: 35, memUsage: 0.22 }, tag: 'golden-v4.0.2' },
    { id: 'PC-Z8-0022', readings: { adcOffset: 0,   gpioState: 0b01100, clockSkewNs: 0, powerRippleMv: 10, tempC: 48, memUsage: 0.40 }, tag: 'golden-v2.1.5' },
    { id: 'SH-X4-1023', readings: { adcOffset: 0,   gpioState: 0b10110, clockSkewNs: 0, powerRippleMv: 12, tempC: 42, memUsage: 0.47 }, tag: 'golden-v3.8.1' },
  ];
  baselines.forEach(b => store.setBaseline(b.id, { readings: b.readings, tag: b.tag, source: 'seed' }));

  // ── Alerts ────────────────────────────────────────────────────────────────────
  const alerts = [
    { source: 'monitor', deviceId: 'SH-X4-3192', type: 'GPIO Register Mismatch', severity: 'CRITICAL', driftScore: 0.87, detail: 'GPIO state 0b10100 deviates from golden 0b10110 — register write race detected' },
    { source: 'monitor', deviceId: 'TN-R2-0841', type: 'Clock Skew Detected',    severity: 'WARNING',  driftScore: 0.52, detail: 'TIM2 prescaler overspeed — crystal PLL drift +121ppm over 2-hour window' },
    { source: 'monitor', deviceId: 'AB-M7-5501', type: 'ADC Offset Drift',       severity: 'WARNING',  driftScore: 0.44, detail: 'ADC0 offset drifted +48mV from baseline — possible supply noise source on AVDD rail' },
    { source: 'monitor', deviceId: 'EG-E1-7700', type: 'Memory Leak Pattern',    severity: 'CRITICAL', driftScore: 0.91, detail: 'Heap fragmentation index rising 0.042/hr — suspected socket handle leak in MQTT task' },
  ];
  alerts.forEach(a => store.addAlert(a));

  // ── Scans ─────────────────────────────────────────────────────────────────────
  const scans = [
    { target: 'fw-v3.8.2-rc4',    composite: 0.76, decision: 'block', label: 'CRITICAL',
      checks: [{ name: 'binary-diff', passed: false }, { name: 'behavioral-sig', passed: false }],
      scores: { binaryDiff: 0.9, behavioralSig: 0.8, knownVulns: 0.5, hwCompat: 0.4, configDrift: 0.7 } },
    { target: 'fw-v3.8.1-stable', composite: 0.14, decision: 'pass',  label: 'SAFE',
      checks: [{ name: 'binary-diff', passed: true  }, { name: 'behavioral-sig', passed: true  }],
      scores: { binaryDiff: 0.1, behavioralSig: 0.2, knownVulns: 0.1, hwCompat: 0.1, configDrift: 0.0 } },
    { target: 'fw-v2.4.0',        composite: 0.31, decision: 'pass',  label: 'LOW',
      checks: [{ name: 'binary-diff', passed: true  }],
      scores: { binaryDiff: 0.3, behavioralSig: 0.2, knownVulns: 0.4, hwCompat: 0.2, configDrift: 0.3 } },
  ];
  scans.forEach(s => store.addScan(s));

  // ── Knowledge Base ─────────────────────────────────────────────────────────────
  const articles = [
    {
      id: 'kb-001',
      title: 'DMA Circular Buffer Overrun — ADC Truncation',
      affectedDevices: 'SensorHub-X4, ActuatorBridge-M7',
      rootCause: 'Enabling DMA_SxCR_CIRC on Stream 3 without resizing the buffer to a power-of-2 boundary causes ADC samples to wrap and truncate at index 255.',
      resolution: 'Set DMA1_Stream3 to linear mode or resize buffer to 256 bytes. Validate with: TIM2->PSC = 0x0047 and DMA1_Stream3->CR &= ~DMA_SxCR_CIRC.',
      tags: ['DMA', 'ADC', 'STM32', 'hardware', 'buffer-overrun'],
    },
    {
      id: 'kb-002',
      title: 'TIM2 Prescaler Overspeed — Clock Skew Cascade',
      affectedDevices: 'ThermoNode-R2, SensorHub-X4',
      rootCause: 'Setting TIM2->PSC = 0x0052 instead of 0x0047 increases base clock by 10%, propagating to all timer-derived peripherals.',
      resolution: 'Revert TIM2->PSC to 0x0047. Cross-validate against crystal oscillator spec sheet at operating temperature.',
      tags: ['clock', 'TIM2', 'prescaler', 'STM32', 'drift'],
    },
    {
      id: 'kb-003',
      title: 'MQTT Socket Handle Leak — Heap Fragmentation',
      affectedDevices: 'EdgeGateway-E1',
      rootCause: 'MQTT reconnect logic allocates new socket handles without freeing stale TLS contexts during network drop/reconnect cycles.',
      resolution: 'Call mbedtls_ssl_free(&tls_ctx) before mbedtls_ssl_setup on reconnect. Add FreeRTOS heap watermark alert at 256 bytes remaining.',
      tags: ['MQTT', 'heap', 'TLS', 'FreeRTOS', 'memory-leak'],
    },
  ];
  articles.forEach(a => store.addKnowledgeArticle(a));

  console.log('[Seed] Store seeded: ' +
    devices.length + ' devices, ' +
    baselines.length + ' baselines, ' +
    alerts.length + ' alerts, ' +
    scans.length + ' scans, ' +
    articles.length + ' KB articles');
}

module.exports = { seedStore };
