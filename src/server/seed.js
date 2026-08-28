'use strict';

function seedStore(store) {
  if (store.getAllDevices().length > 0) return;

  const devices = [
    { id: 'SH-X4-3192', name: 'SensorHub-X4 #3192', fleet: 'Pacific NW Grid', fw: 'v3.8.2-rc4', driftScore: 0.87, health: 'critical', source: 'jlink', ip: '10.24.11.92' },
    { id: 'TN-R2-0841', name: 'ThermoNode-R2 #0841', fleet: 'EU Logistics Hub', fw: 'v3.8.1-stable', driftScore: 0.52, health: 'warning', source: 'socketcan', ip: '10.18.4.41' },
    { id: 'AB-M7-5501', name: 'ActuatorBridge-M7 #5501', fleet: 'Factory Line A', fw: 'v3.8.2-rc4', driftScore: 0.44, health: 'warning', source: 'arduino', ip: '192.168.10.15' },
    { id: 'SH-X4-1023', name: 'SensorHub-X4 #1023', fleet: 'Pacific NW Grid', fw: 'v3.8.1-stable', driftScore: 0.21, health: 'healthy', source: 'jlink', ip: '10.24.11.23' },
    { id: 'EG-E1-7700', name: 'EdgeGateway-E1 #7700', fleet: 'Data Center East', fw: 'v3.8.2-rc4', driftScore: 0.91, health: 'critical', source: 'docker', ip: '172.16.80.70' },
    { id: 'PG-P9-1209', name: 'PowerGrid-PM9 #1209', fleet: 'Midwest Substation', fw: 'v3.8.0-rel', driftScore: 0.12, health: 'healthy', source: 'serial', ip: '10.40.12.9' },
    { id: 'DS-C1-4421', name: 'DriveSync-CAN #4421', fleet: 'Automotive Test Track', fw: 'v3.8.1-stable', driftScore: 0.35, health: 'healthy', source: 'socketcan', ip: '192.168.44.21' },
    { id: 'AS-I2-9012', name: 'AeroSens-IMU #9012', fleet: 'Flight Systems Lab', fw: 'v3.8.2-rc4', driftScore: 0.18, health: 'healthy', source: 'segger', ip: '10.90.1.12' },
  ];

  devices.forEach(d => store.upsertDevice(d));

  const alerts = [
    { id: 'alt-001', sev: 'CRITICAL', type: 'GPIO Register Mismatch', deviceId: 'SH-X4-3192', driftScore: 0.87, agent: 'monitor', message: 'GPIO register PORTB_CRH configuration mismatch against golden baseline commit 7b19a2f.' },
    { id: 'alt-002', sev: 'CRITICAL', type: 'Memory Leak Pattern', deviceId: 'EG-E1-7700', driftScore: 0.91, agent: 'monitor', message: 'FreeRTOS Heap-4 allocation creep detected: 14.2 KB/hr steady growth.' },
    { id: 'alt-003', sev: 'WARNING', type: 'Clock Skew Detected', deviceId: 'TN-R2-0841', driftScore: 0.52, agent: 'monitor', message: 'SysTick timer deviation exceeded 120ppm under elevated temperature cycle.' },
    { id: 'alt-004', sev: 'WARNING', type: 'ADC Offset Drift', deviceId: 'AB-M7-5501', driftScore: 0.44, agent: 'monitor', message: 'Channel 3 ADC zero-point offset shifted by +48mV relative to calibration baseline.' },
  ];

  alerts.forEach(a => store.addAlert(a));

  const scans = [
    {
      id: 'scan-0828-rc4',
      target: 'fw-v3.8.2-rc4',
      verdict: 'FAIL',
      score: 0.76,
      ts: new Date(Date.now() - 3600000).toISOString(),
      checks: [
        { name: 'ELF Static Memory Sizing', status: 'PASS', score: 0.12 },
        { name: 'Peripheral Register Delta', status: 'FAIL', score: 0.88, detail: 'TIM2_PSC register shifted from 0x0047 to 0x0052' },
        { name: 'Dynamic Heap Leak Scan', status: 'FAIL', score: 0.74, detail: 'Heap fragmentation index rose above 0.30 threshold' },
        { name: 'CAN Frame Timing Analysis', status: 'PASS', score: 0.15 }
      ]
    },
    {
      id: 'scan-0827-rel',
      target: 'fw-v3.8.1-stable',
      verdict: 'PASS',
      score: 0.14,
      ts: new Date(Date.now() - 86400000).toISOString(),
      checks: [
        { name: 'ELF Static Memory Sizing', status: 'PASS', score: 0.08 },
        { name: 'Peripheral Register Delta', status: 'PASS', score: 0.11 },
        { name: 'Dynamic Heap Leak Scan', status: 'PASS', score: 0.15 },
        { name: 'CAN Frame Timing Analysis', status: 'PASS', score: 0.09 }
      ]
    }
  ];

  scans.forEach(s => store.scans.set(s.id, s));

  const kbArticles = [
    {
      id: 'kb-082',
      title: 'STM32F4 ADC Sampling Drift on Shared DMA Buffer',
      affectedDevices: 'SensorHub-X4, ActuatorBridge-M7',
      rootCause: 'DMA circular buffer pointer overrun under high interrupt load caused sample truncation.',
      resolution: 'Reconfigure DMA double-buffering mode and increase priority of TIM2 trigger ISR.',
      tags: ['adc', 'dma', 'stm32', 'drift']
    },
    {
      id: 'kb-041',
      title: 'FreeRTOS Heap-4 Fragmentation under Async Socket Reconnects',
      affectedDevices: 'EdgeGateway-E1',
      rootCause: 'Unbounded dynamic allocations in MQTT keepalive thread without block reuse.',
      resolution: 'Enforce static allocation pools for packet descriptor buffers via pvPortMallocCaps.',
      tags: ['freertos', 'heap', 'memory-leak', 'mqtt']
    },
    {
      id: 'kb-119',
      title: 'CAN 2.0B Bus-Off State Triggered by Bit Timing Drift',
      affectedDevices: 'DriveSync-CAN, ThermoNode-R2',
      rootCause: 'Uncompensated ceramic resonator thermal skew exceeded 1.5% CAN bit clock tolerance window.',
      resolution: 'Switch to hardware-calibrated crystal oscillator circuit and increase SJW parameter.',
      tags: ['can', 'socketcan', 'timing', 'bus-off']
    }
  ];

  kbArticles.forEach(a => store.addKnowledgeArticle(a));

  store.setAgentStatus('preship', 'active', { scansToday: 14, blockedReleases: 2 });
  store.setAgentStatus('monitor', 'active', { nodesTracked: 1247, anomaliesIsolated: 4 });
  store.setAgentStatus('onboard', 'active', { activeTracks: 3, kbArticlesIndexed: 3 });

  store.setIntegrationStatus('arduino', 'disconnected', 'Waiting for USB-Serial device plug-in');
  store.setIntegrationStatus('github', 'connected', 'Webhook listener verified with HMAC-SHA256');
  store.setIntegrationStatus('vscode', 'connected', 'PlatformIO daemon connected via IPC');
  store.setIntegrationStatus('segger', 'connected', 'J-Link SWD adapter probe active');
}

module.exports = { seedStore };
