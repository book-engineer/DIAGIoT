'use strict';
const AGENT_MAP = {
  preship:      'preship',
  field:        'monitor',
  drift:        'monitor',
  timeline:     'monitor',
  diff:         'monitor',
  repro:        'monitor',
  onboard:      'onboard',
  knowledge:    'onboard',
  dashboard:    'neutral',
  integrations: 'neutral',
};
const SCREENS = {};
SCREENS.dashboard = () => `
<div class="screen active" id="screen-dashboard">
  <div class="page-title">System Health Dashboard</div>
  <div class="page-sub">Real-time overview of all IoT fleets under DiagIoT surveillance — powered by autonomous drift agents</div>
  <div class="grid4" style="margin-bottom:16px">
    <div class="card stat">
      <div class="stat-num" style="color:var(--ok)">1,247</div>
      <div class="stat-label"><i class="ph-bold ph-hard-drives"></i> Devices Online</div>
    </div>
    <div class="card stat">
      <div class="stat-num" style="color:var(--warn)">38</div>
      <div class="stat-label"><i class="ph-bold ph-warning"></i> Drift Warnings</div>
    </div>
    <div class="card stat">
      <div class="stat-num" style="color:var(--danger)">7</div>
      <div class="stat-label"><i class="ph-bold ph-x-circle"></i> Critical Failures</div>
    </div>
    <div class="card stat">
      <div class="stat-num" style="color:var(--monitor)">99.4%</div>
      <div class="stat-label"><i class="ph-bold ph-activity"></i> Fleet Uptime</div>
    </div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin-bottom:16px">
    <div class="agent-card preship">
      <div class="agent-card-icon"><i class="ph-bold ph-shield-check" style="color:var(--preship)"></i></div>
      <div class="agent-card-name">Pre-Ship Agent</div>
      <div class="agent-card-scope">Pre-Ship Scan · Gate control · Baseline capture</div>
      <div class="agent-card-status"><span class="agent-status-dot teal"></span><span style="color:var(--preship)">Active</span> — last scan 12m ago</div>
      <div class="agent-metrics"><div>Scans: <strong>47</strong></div><div>Blocked: <strong>3</strong></div><div>Pass rate: <strong>93%</strong></div></div>
    </div>
    <div class="agent-card monitor">
      <div class="agent-card-icon"><i class="ph-bold ph-eye" style="color:var(--monitor)"></i></div>
      <div class="agent-card-name">Monitor &amp; Investigate Agent</div>
      <div class="agent-card-scope">Field Monitor · Drift Analysis · Event Timeline · Firmware Diff · Reproduce</div>
      <div class="agent-card-status"><span class="agent-status-dot blue"></span><span style="color:var(--monitor)">Active</span> — monitoring 1,247 devices</div>
      <div class="agent-metrics"><div>Alerts: <strong>38</strong></div><div>Root-caused: <strong>5</strong></div><div>Uptime: <strong>99.9%</strong></div></div>
    </div>
    <div class="agent-card onboard">
      <div class="agent-card-icon"><i class="ph-bold ph-compass" style="color:var(--onboard)"></i></div>
      <div class="agent-card-name">Onboarding Agent</div>
      <div class="agent-card-scope">Engineer Onboarding · Knowledge Base · Curation</div>
      <div class="agent-card-status"><span class="agent-status-dot amber"></span><span style="color:var(--onboard)">Active</span> — 3 engineers in training</div>
      <div class="agent-metrics"><div>Modules: <strong>12</strong></div><div>Articles: <strong>6</strong></div><div>Completion: <strong>72%</strong></div></div>
    </div>
  </div>
  <div class="grid2" style="margin-bottom:16px">
    <div class="card">
      <div class="card-title"><i class="ph-bold ph-chart-bar"></i> Drift Trend — Last 30 Days</div>
      <div class="chart-wrap" style="height:160px"><canvas id="chartDriftTrend"></canvas></div>
    </div>
    <div class="card">
      <div class="card-title"><i class="ph-bold ph-chart-donut"></i> Fleet Health Distribution</div>
      <div style="display:flex;align-items:center;justify-content:center;gap:24px;padding:10px 0">
        <div style="position:relative;width:130px;height:130px">
          <canvas id="chartFleetHealth"></canvas>
        </div>
        <div style="font-size:12px;line-height:2.2">
          <div><span class="badge ok">Healthy</span> 70% (873)</div>
          <div><span class="badge warn">Drifting</span> 20% (249)</div>
          <div><span class="badge danger">Critical</span> 10% (125)</div>
        </div>
      </div>
    </div>
  </div>
  <div class="split-wide" style="margin-bottom:16px">
    <div class="card">
      <div class="card-title"><i class="ph-bold ph-stack"></i> System Registry — Current &amp; Past</div>
      <div style="display:flex;gap:6px;margin-bottom:10px">
        <button class="btn btn-primary" style="font-size:11px;padding:5px 12px">Current Systems</button>
        <button class="btn btn-ghost" style="font-size:11px;padding:5px 12px">Archived / Past</button>
      </div>
      <table class="wtable">
        <thead><tr><th>System</th><th>Fleet</th><th>FW Version</th><th>Devices</th><th>Health</th><th>Last Scan</th></tr></thead>
        <tbody>
          <tr class="clickable" onclick="switchScreen('field')">
            <td style="font-weight:600">SensorHub-X4</td><td>Pacific NW Grid</td><td>v3.8.1</td><td>412</td>
            <td><span class="badge warn">Drifting</span></td><td>12m ago</td>
          </tr>
          <tr class="clickable" onclick="switchScreen('field')">
            <td style="font-weight:600">ThermoNode-R2</td><td>EU Logistics Hub</td><td>v2.4.0</td><td>289</td>
            <td><span class="badge ok">Healthy</span></td><td>45m ago</td>
          </tr>
          <tr class="clickable" onclick="switchScreen('field')">
            <td style="font-weight:600">ActuatorBridge-M7</td><td>Factory Line A</td><td>v1.9.3</td><td>154</td>
            <td><span class="badge danger">Critical</span></td><td>8m ago</td>
          </tr>
          <tr class="clickable" onclick="switchScreen('field')">
            <td style="font-weight:600">EdgeGateway-E1</td><td>Data Center East</td><td>v4.1.0</td><td>192</td>
            <td><span class="badge ok">Healthy</span></td><td>1h ago</td>
          </tr>
          <tr class="clickable" onclick="switchScreen('field')">
            <td style="font-weight:600">PowerCtrl-Z8</td><td>Factory Line B</td><td>v2.1.7</td><td>200</td>
            <td><span class="badge ok">Healthy</span></td><td>2h ago</td>
          </tr>
        </tbody>
      </table>
      <div style="margin-top:10px;display:flex;gap:8px">
        <button class="btn btn-ghost" style="font-size:11px"><i class="ph-bold ph-folder-open"></i> Archived (14)</button>
        <button class="btn btn-ghost" style="font-size:11px"><i class="ph-bold ph-plus"></i> Register New System</button>
      </div>
    </div>
    <div class="card">
      <div class="card-title"><i class="ph-bold ph-plugs-connected"></i> Quick Connect — Link to IDE / CI</div>
      <div style="font-size:11px;color:var(--text-dim);margin-bottom:12px;line-height:1.6">Select a system and connect it to your firmware IDE, version control, or CI/CD pipeline.</div>
      <div style="margin-bottom:10px">
        <label class="form-label">1. Select System</label>
        <select class="form-select">
          <option>SensorHub-X4 — Pacific NW Grid (412 devices)</option>
          <option>ThermoNode-R2 — EU Logistics Hub (289 devices)</option>
          <option>ActuatorBridge-M7 — Factory Line A (154 devices)</option>
          <option>EdgeGateway-E1 — Data Center East (192 devices)</option>
        </select>
      </div>
      <div style="margin-bottom:10px">
        <label class="form-label">2. Choose Integration Target</label>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
          ${[
            ['ph-cpu','Arduino IDE','Connected','ok'],
            ['ph-git-branch','GitHub','Connected','ok'],
            ['ph-code','VS Code / PlatformIO','Connected','ok'],
            ['ph-wrench','Jenkins CI','Connected','ok'],
            ['ph-cube','Docker / OCI','Connected','ok'],
            ['ph-gear','Keil / STM32Cube','Partial','warn'],
          ].map(([icon, name, status, cls]) => `
          <div style="border:1px solid var(--${cls === 'ok' ? 'monitor' : 'border'});border-radius:var(--radius-sm);padding:8px;text-align:center;cursor:pointer;background:var(--surface2)">
            <i class="ph-bold ${icon}" style="font-size:16px;color:var(--${cls})"></i>
            <div style="font-size:10px;font-weight:600;margin-top:3px">${name}</div>
            <div style="font-size:9px;color:var(--${cls})">${status}</div>
          </div>`).join('')}
        </div>
      </div>
      <div style="margin-bottom:12px">
        <label class="form-label">3. Scan Trigger Mode</label>
        <select class="form-select">
          <option>Auto — On every push / build / upload</option>
          <option>On PR / MR creation only</option>
          <option>On release tag only</option>
          <option>Manual — Triggered by engineer</option>
          <option>Scheduled — Every 6 hours</option>
        </select>
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        <button class="btn btn-ok" onclick="switchScreen('integrations')"><i class="ph-bold ph-plugs-connected"></i> Connect System</button>
        <button class="btn btn-primary" onclick="switchScreen('integrations')"><i class="ph-bold ph-gear"></i> Full Config</button>
      </div>
    </div>
  </div>
  <div class="card">
    <div class="card-title"><i class="ph-bold ph-bell-ringing"></i> Recent Alerts</div>
    <table class="wtable">
      <thead><tr><th>Time</th><th>Device</th><th>Fleet</th><th>Type</th><th>Severity</th><th>Agent</th><th>Drift Score</th><th>Action</th></tr></thead>
      <tbody>
        <tr><td>2m ago</td><td>SensorHub-X4 #3192</td><td>Pacific NW Grid</td><td>GPIO Register Mismatch</td><td><span class="badge danger">Critical</span></td><td><span class="agent-tag monitor"><i class="ph-bold ph-eye"></i> Monitor</span></td><td style="color:var(--danger);font-weight:700">0.87</td><td><button class="btn btn-ghost" style="font-size:10px;padding:3px 8px" onclick="switchScreen('drift')">Investigate</button></td></tr>
        <tr><td>14m ago</td><td>ThermoNode-R2 #0841</td><td>EU Logistics Hub</td><td>Clock Skew Detected</td><td><span class="badge warn">Warning</span></td><td><span class="agent-tag monitor"><i class="ph-bold ph-eye"></i> Monitor</span></td><td style="color:var(--warn);font-weight:700">0.52</td><td><button class="btn btn-ghost" style="font-size:10px;padding:3px 8px" onclick="switchScreen('drift')">Investigate</button></td></tr>
        <tr><td>28m ago</td><td>ActuatorBridge-M7 #5501</td><td>Factory Line A</td><td>ADC Offset Drift</td><td><span class="badge warn">Warning</span></td><td><span class="agent-tag monitor"><i class="ph-bold ph-eye"></i> Monitor</span></td><td style="color:var(--warn);font-weight:700">0.44</td><td><button class="btn btn-ghost" style="font-size:10px;padding:3px 8px" onclick="switchScreen('drift')">Investigate</button></td></tr>
        <tr><td>1h ago</td><td>SensorHub-X4 #1023</td><td>Pacific NW Grid</td><td>Firmware Version Mismatch</td><td><span class="badge info">Info</span></td><td><span class="agent-tag preship"><i class="ph-bold ph-shield-check"></i> Pre-Ship</span></td><td style="color:var(--monitor);font-weight:700">0.21</td><td><button class="btn btn-ghost" style="font-size:10px;padding:3px 8px">View</button></td></tr>
        <tr><td>2h ago</td><td>EdgeGateway-E1 #7700</td><td>Data Center East</td><td>Memory Leak Pattern</td><td><span class="badge danger">Critical</span></td><td><span class="agent-tag monitor"><i class="ph-bold ph-eye"></i> Monitor</span></td><td style="color:var(--danger);font-weight:700">0.91</td><td><button class="btn btn-ghost" style="font-size:10px;padding:3px 8px" onclick="switchScreen('drift')">Investigate</button></td></tr>
      </tbody>
    </table>
  </div>
</div>`;
let meshCanvas = null;
let meshCtx = null;
let meshNodes = [];
let meshAnimId = null;
let mousePos = { x: -1000, y: -1000 };
function initLandingCanvas() {
  meshCanvas = document.getElementById('landingMeshCanvas');
  if (!meshCanvas) return;
  meshCtx = meshCanvas.getContext('2d');
  function resize() {
    if (!meshCanvas) return;
    meshCanvas.width = meshCanvas.parentElement.clientWidth || window.innerWidth;
    meshCanvas.height = meshCanvas.parentElement.clientHeight || window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('mousemove', function(e) {
    const rect = meshCanvas.getBoundingClientRect();
    mousePos.x = e.clientX - rect.left;
    mousePos.y = e.clientY - rect.top;
  });
  const nodeCount = Math.min(50, Math.floor(window.innerWidth / 28));
  meshNodes = [];
  const palette = ['#3dada8', '#5b7fd4', '#3ebd8c', '#d4922a'];
  for (let i = 0; i < nodeCount; i++) {
    meshNodes.push({
      x: Math.random() * meshCanvas.width,
      y: Math.random() * meshCanvas.height,
      vx: (Math.random() - 0.5) * 0.7,
      vy: (Math.random() - 0.5) * 0.7,
      radius: Math.random() * 2.5 + 2,
      color: palette[i % palette.length],
      pulse: Math.random() * Math.PI,
      pulseSpeed: 0.03 + Math.random() * 0.02
    });
  }
  function render() {
    if (!meshCtx || !meshCanvas) return;
    meshCtx.clearRect(0, 0, meshCanvas.width, meshCanvas.height);
    for (let i = 0; i < meshNodes.length; i++) {
      const n1 = meshNodes[i];
      n1.x += n1.vx;
      n1.y += n1.vy;
      n1.pulse += n1.pulseSpeed;
      if (n1.x < 0 || n1.x > meshCanvas.width) n1.vx *= -1;
      if (n1.y < 0 || n1.y > meshCanvas.height) n1.vy *= -1;
      const dxM = mousePos.x - n1.x;
      const dyM = mousePos.y - n1.y;
      const distM = Math.sqrt(dxM * dxM + dyM * dyM);
      if (distM < 120) {
        n1.x -= (dxM / distM) * 0.8;
        n1.y -= (dyM / distM) * 0.8;
      }
      for (let j = i + 1; j < meshNodes.length; j++) {
        const n2 = meshNodes[j];
        const dx = n1.x - n2.x;
        const dy = n1.y - n2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 130) {
          const alpha = (1 - dist / 130) * 0.25;
          meshCtx.beginPath();
          meshCtx.moveTo(n1.x, n1.y);
          meshCtx.lineTo(n2.x, n2.y);
          meshCtx.strokeStyle = 'rgba(91, 127, 212, ' + alpha + ')';
          meshCtx.lineWidth = 1;
          meshCtx.stroke();
        }
      }
      const pRadius = n1.radius + Math.sin(n1.pulse) * 1.5;
      meshCtx.beginPath();
      meshCtx.arc(n1.x, n1.y, Math.max(1, pRadius), 0, Math.PI * 2);
      meshCtx.fillStyle = n1.color;
      meshCtx.fill();
    }
    meshAnimId = requestAnimationFrame(render);
  }
  if (meshAnimId) cancelAnimationFrame(meshAnimId);
  render();
}
let sandboxWaveCanvas = null;
let sandboxWaveCtx = null;
let sandboxScenario = 'heap';
let sandboxNoise = 42;
let sandboxThresh = 35;
let sandboxTime = 0;
let sandboxSpike = 0;
let sandboxAnimId = null;
const SCENARIOS = {
  heap: {
    name: 'Firmware Heap Creep',
    agent: 'Pre-Ship & Monitor Agents',
    status: 'Surveillance Active',
    logs: [
      { tag: 'PRE-SHIP', type: 'preship', text: 'Tracking dynamic heap allocation pool in firmware build v3.8.2-rc4' },
      { tag: 'MONITOR', type: 'monitor', text: 'Heap fragmentation slope +0.42KB/hr detected on worker task #2' },
      { tag: 'OK', type: 'ok', text: 'Baseline comparison: Golden target max allowable heap variance is 0.05%' }
    ]
  },
  jitter: {
    name: 'Clock Jitter & Drift',
    agent: 'Field Monitor Agent',
    status: 'Real-time Frequency Lock',
    logs: [
      { tag: 'MONITOR', type: 'monitor', text: 'Crystal oscillator PLL sync drift detected on Node AB-M7-5501' },
      { tag: 'WARN', type: 'warn', text: 'Phase accumulator delta reached 14.8 PPM (threshold: 10.0 PPM)' },
      { tag: 'OK', type: 'ok', text: 'Automated calibration offset recommended: 0x004F register trim' }
    ]
  },
  packet: {
    name: 'CAN Bus Frame Drop',
    agent: 'Investigate Agent',
    status: 'Bus Diagnostic Engine Active',
    logs: [
      { tag: 'MONITOR', type: 'monitor', text: 'Monitoring automotive CAN 2.0B bus arbitration on Interface can0' },
      { tag: 'DANGER', type: 'danger', text: 'Intermittent CRC error bursts detected on Frame ID 0x3A4 (Payload: Telemetry)' },
      { tag: 'WARN', type: 'warn', text: 'Bus load variance 68.4% during transmit bursts. Generating test harness' }
    ]
  }
};
function initSandbox() {
  sandboxWaveCanvas = document.getElementById('sandboxWaveformCanvas');
  if (!sandboxWaveCanvas) return;
  sandboxWaveCtx = sandboxWaveCanvas.getContext('2d');
  function resize() {
    if (!sandboxWaveCanvas) return;
    sandboxWaveCanvas.width = sandboxWaveCanvas.parentElement.clientWidth || 600;
    sandboxWaveCanvas.height = sandboxWaveCanvas.parentElement.clientHeight || 220;
  }
  resize();
  window.addEventListener('resize', resize);
  selectSandboxScenario('heap');
  function render() {
    if (!sandboxWaveCtx || !sandboxWaveCanvas) return;
    const w = sandboxWaveCanvas.width;
    const h = sandboxWaveCanvas.height;
    sandboxWaveCtx.fillStyle = '#0c0e16';
    sandboxWaveCtx.fillRect(0, 0, w, h);
    sandboxWaveCtx.strokeStyle = '#1e2230';
    sandboxWaveCtx.lineWidth = 1;
    for (let y = 30; y < h; y += 30) {
      sandboxWaveCtx.beginPath();
      sandboxWaveCtx.moveTo(0, y);
      sandboxWaveCtx.lineTo(w, y);
      sandboxWaveCtx.stroke();
    }
    const baselineY = h / 2;
    sandboxWaveCtx.strokeStyle = 'rgba(62, 189, 140, 0.4)';
    sandboxWaveCtx.setLineDash([4, 4]);
    sandboxWaveCtx.beginPath();
    sandboxWaveCtx.moveTo(0, baselineY);
    sandboxWaveCtx.lineTo(w, baselineY);
    sandboxWaveCtx.stroke();
    sandboxWaveCtx.setLineDash([]);
    const threshDelta = (sandboxThresh / 100) * (h / 2.5);
    sandboxWaveCtx.strokeStyle = 'rgba(201, 84, 104, 0.4)';
    sandboxWaveCtx.setLineDash([2, 4]);
    sandboxWaveCtx.beginPath();
    sandboxWaveCtx.moveTo(0, baselineY - threshDelta);
    sandboxWaveCtx.lineTo(w, baselineY - threshDelta);
    sandboxWaveCtx.moveTo(0, baselineY + threshDelta);
    sandboxWaveCtx.lineTo(w, baselineY + threshDelta);
    sandboxWaveCtx.stroke();
    sandboxWaveCtx.setLineDash([]);
    sandboxWaveCtx.beginPath();
    sandboxWaveCtx.strokeStyle = '#5b7fd4';
    sandboxWaveCtx.lineWidth = 2;
    const noiseFactor = sandboxNoise / 100;
    sandboxTime += 0.04;
    if (sandboxSpike > 0) sandboxSpike -= 0.015;
    for (let x = 0; x < w; x += 3) {
      const t = sandboxTime + x * 0.02;
      let yOffset = Math.sin(t) * 28 + Math.sin(t * 2.3) * 12 * noiseFactor;
      yOffset += (Math.random() - 0.5) * 10 * noiseFactor;
      if (x > w * 0.6 && x < w * 0.85 && sandboxSpike > 0) {
        yOffset += Math.sin((x - w * 0.6) * 0.08) * 65 * sandboxSpike;
      }
      const y = baselineY + yOffset;
      if (x === 0) sandboxWaveCtx.moveTo(x, y);
      else sandboxWaveCtx.lineTo(x, y);
    }
    sandboxWaveCtx.stroke();
    sandboxAnimId = requestAnimationFrame(render);
  }
  if (sandboxAnimId) cancelAnimationFrame(sandboxAnimId);
  render();
}
function selectSandboxScenario(scenarioKey) {
  sandboxScenario = scenarioKey;
  const btns = document.querySelectorAll('.sandbox-scenario-btn');
  btns.forEach(function(btn) {
    const isTarget = btn.getAttribute('data-scenario') === scenarioKey;
    btn.classList.toggle('active', isTarget);
    btn.setAttribute('aria-selected', isTarget ? 'true' : 'false');
  });
  const sc = SCENARIOS[scenarioKey];
  const agentStatusEl = document.getElementById('sandboxAgentStatus');
  if (agentStatusEl && sc) agentStatusEl.textContent = 'Agent: ' + sc.agent + ' (' + sc.status + ')';
  const logsEl = document.getElementById('sandboxLogs');
  if (logsEl && sc) {
    logsEl.innerHTML = '';
    sc.logs.forEach(function(log) { appendSandboxLog(log.tag, log.type, log.text); });
  }
}
function updateSandboxParams() {
  const nSlider = document.getElementById('noiseSlider');
  const tSlider = document.getElementById('threshSlider');
  const nVal = document.getElementById('noiseVal');
  const tVal = document.getElementById('threshVal');
  if (nSlider && nVal) {
    sandboxNoise = parseInt(nSlider.value, 10);
    nVal.textContent = sandboxNoise + '%';
  }
  if (tSlider && tVal) {
    sandboxThresh = parseInt(tSlider.value, 10);
    tVal.textContent = (sandboxThresh / 100).toFixed(2) + ' sigma';
  }
}
function appendSandboxLog(tag, type, message) {
  const logsEl = document.getElementById('sandboxLogs');
  if (!logsEl) return;
  const row = document.createElement('div');
  row.className = 'console-log-row';
  const now = new Date();
  const timeStr = now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0');
  row.innerHTML = '<span class="console-time">[' + timeStr + ']</span>' +
    '<span class="console-tag ' + type + '">[' + tag + ']</span>' +
    '<span>' + message + '</span>';
  logsEl.appendChild(row);
  logsEl.scrollTop = logsEl.scrollHeight;
}
function triggerSandboxAnomaly() {
  sandboxSpike = 1.0;
  appendSandboxLog('ANOMALY', 'danger', 'Burst anomaly injected into active stream. Threshold exceeded.');
  setTimeout(function() {
    appendSandboxLog('ISOLATION', 'warn', 'Autonomous agent isolated drift root-cause to commit 7b19a2f on branch main.');
  }, 280);
  setTimeout(function() {
    appendSandboxLog('REMEDY', 'ok', 'Golden state remediation patch calculated. Zero downtime required.');
  }, 560);
}
function resetSandbox() {
  sandboxSpike = 0;
  appendSandboxLog('RESET', 'ok', 'Telemetry stream reset to immutable golden baseline standards.');
}



function _authSetStatus(type, msg) {
  const box  = document.getElementById('authStatusBox');
  const text = document.getElementById('authStatusText');
  if (!box) return;
  box.className = 'auth-status-box ' + (type || '');
  if (text) text.textContent = msg || '';
}
function openAuthModal() {
  const modal = document.getElementById('authModalBackdrop');
  if (!modal) return;
  modal.classList.add('open');
  const emailInput = document.getElementById('authEmail');
  if (emailInput) setTimeout(function() { emailInput.focus(); }, 60);
}
function closeAuthModal() {
  const modal = document.getElementById('authModalBackdrop');
  if (!modal) return;
  modal.classList.remove('open');
}
function selectAuthRole(roleKey) {
  const chips = document.querySelectorAll('.role-chip');
  chips.forEach(function(c) {
    const isTarget = c.getAttribute('data-role') === roleKey;
    c.classList.toggle('active', isTarget);
    c.setAttribute('aria-checked', isTarget ? 'true' : 'false');
  });
}
async function submitAuthLaunch() {
  const emailInput = document.getElementById('authEmail');
  const keyInput   = document.getElementById('authKey');
  const submitBtn  = document.getElementById('authSubmitBtn');
  const email    = emailInput ? emailInput.value.trim() : '';
  const password = keyInput   ? keyInput.value.trim()   : '';
  if (!email || !email.includes('@')) {
    _authSetStatus('error', 'Please enter a valid work email address.');
    return;
  }
  if (!password || password.length < 6) {
    _authSetStatus('error', 'Password must be at least 6 characters.');
    return;
  }
  if (submitBtn) submitBtn.disabled = true;
  _authSetStatus('verifying', 'Authenticating with Supabase...');

  if (window._sbInitPromise) await window._sbInitPromise;
  if (!window.SB) {

    _authSetStatus('success', 'No-auth mode — launching workspace...');
    setTimeout(function() {
      closeAuthModal();
      if (submitBtn) submitBtn.disabled = false;
      _applySessionUser({ email: email, id: 'local' });
      enterDashboard();
    }, 400);
    return;
  }
  try {
    const { data, error } = await window.SB.auth.signInWithPassword({ email, password });
    if (error) throw error;
    const user = data.user || data.session?.user;
    _authSetStatus('success', 'Authenticated. Launching workspace...');
    setTimeout(function() {
      closeAuthModal();
      if (submitBtn) submitBtn.disabled = false;
      _applySessionUser(user);
      enterDashboard();
    }, 380);
  } catch (err) {
    if (submitBtn) submitBtn.disabled = false;
    _authSetStatus('error', err.message || 'Authentication failed — please check your credentials.');
  }
}
function _applySessionUser(user) {
  if (!user) return;

  const email   = user.email || '';
  const nameParts = email.split('@')[0].split(/[._-]/);
  const initials = nameParts.length >= 2
    ? (nameParts[0][0] + nameParts[1][0]).toUpperCase()
    : email.slice(0, 2).toUpperCase();
  const avatar = document.getElementById('topbarAvatar');
  if (avatar) {
    avatar.textContent = initials;
    avatar.setAttribute('aria-label', 'Authenticated user: ' + email);
    avatar.title = email;
  }
  const signOutBtn = document.getElementById('signOutBtn');
  if (signOutBtn) signOutBtn.style.display = '';

  window._authUser = user;
}
async function authSignOut() {
  if (window.SB) {
    try { await window.SB.auth.signOut(); } catch {  }
  }
  window._authUser = null;
  const avatar = document.getElementById('topbarAvatar');
  if (avatar) { avatar.textContent = '--'; avatar.title = ''; }
  const signOutBtn = document.getElementById('signOutBtn');
  if (signOutBtn) signOutBtn.style.display = 'none';
  exitToLanding();
}
function enterDashboard() {
  document.body.classList.add('dashboard-active');
  const landing = document.getElementById('landingPage');
  const app = document.getElementById('appInterface');
  if (landing) landing.style.display = 'none';
  if (app) {
    app.style.display = 'block';
    app.setAttribute('aria-hidden', 'false');
  }
  if (typeof connectWS === 'function' && !window.D?.connected) {
    connectWS();
  }
  switchScreen('dashboard');
  if (typeof initCLI === 'function') {
    initCLI();
  }
}
function exitToLanding() {
  document.body.classList.remove('dashboard-active');
  const landing = document.getElementById('landingPage');
  const app = document.getElementById('appInterface');
  if (landing) landing.style.display = 'block';
  if (app) {
    app.style.display = 'none';
    app.setAttribute('aria-hidden', 'true');
  }
  initLandingCanvas();
  initSandbox();
}
function dismissPrivacyBanner() {
  const b = document.getElementById('privacyBanner');
  if (b) b.classList.add('hidden');
  try {
    localStorage.setItem('diagiot_privacy_ack', 'true');
  } catch (e) {}
}
window.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    closeAuthModal();
    if (typeof closeDocModal === 'function') closeDocModal();
  }
  if (e.shiftKey && e.key === '?') {
    const btn = document.getElementById('cliPanelBtn');
    if (btn) btn.click();
  }
});
window.addEventListener('DOMContentLoaded', function() {
  try {
    if (localStorage.getItem('diagiot_privacy_ack') === 'true') {
      dismissPrivacyBanner();
    }
  } catch (e) {}
  initLandingCanvas();
  initSandbox();
  if (window.location.hash && window.location.hash !== '#landingHero' && window.location.hash !== '#sandbox' && window.location.hash !== '#agents' && window.location.hash !== '#compliance' && window.location.hash !== '#testimonials') {
    const targetScreen = window.location.hash.replace('#', '');
    if (AGENT_MAP[targetScreen]) {
      enterDashboard();
      switchScreen(targetScreen);
    }
  }
});

var _pendingDocScreen = null;

var DOC_CONTENT = {
  hil: {
    title: 'Hardware-in-the-Loop Gate',
    icon: 'ph-cpu',
    body: '<div class="doc-section-title"><i class="ph-bold ph-cpu"></i>HIL Verification Pipeline<span class="doc-badge">Active</span></div><p>The HIL gate connects physical hardware targets over J-Link SWD, SEGGER RTT, or standard UART/USB-Serial to execute instrumented firmware builds under controlled conditions before any production flashing is approved.</p><div class="doc-spec-grid"><div class="doc-spec-card"><div class="doc-spec-card-title">Debug Adapters</div><div class="doc-spec-card-desc">SEGGER J-Link BASE, J-Link EDU, CMSIS-DAP, ST-LINK v2/v3, NXP LPC-Link2</div></div><div class="doc-spec-card"><div class="doc-spec-card-title">Target Architectures</div><div class="doc-spec-card-desc">ARM Cortex-M0/M4/M7/M33, RISC-V RV32IMC, bare-metal RTOS (FreeRTOS, Zephyr, CMSIS-OS)</div></div><div class="doc-spec-card"><div class="doc-spec-card-title">Gate Trigger</div><div class="doc-spec-card-desc">GitHub Actions push event, Jenkins pipeline stage, or manual CLI scan run command</div></div><div class="doc-spec-card"><div class="doc-spec-card-title">Pass Criteria</div><div class="doc-spec-card-desc">All drift scores below configured sigma threshold, zero register map mismatches, heap headroom &gt; 20%</div></div></div><p style="color:var(--text-dim);font-size:12px;">All results persisted to <code style="background:var(--surface2);padding:1px 5px;border-radius:3px;">/api/scans</code> and surfaced in Pre-Ship Scan workspace.</p>'
  },
  bus: {
    title: 'CAN 2.0B & Multi-Bus Diagnostics',
    icon: 'ph-git-branch',
    body: '<div class="doc-section-title"><i class="ph-bold ph-git-branch"></i>Multi-Protocol Bus Monitor<span class="doc-badge">Active</span></div><p>DiagIoT ingests frame-level data from CAN 2.0B, SPI, I2C, and UART buses via SocketCAN, logic analyzer export, or direct adapter streaming. Frame drops, error frames, and bus-off events trigger autonomous anomaly scoring.</p><div class="doc-spec-grid"><div class="doc-spec-card"><div class="doc-spec-card-title">CAN Interface</div><div class="doc-spec-card-desc">SocketCAN (Linux), PCAN-USB, Kvaser Leaf, Vector VN1640 - bitrates from 125 kbps to 1 Mbps CAN FD</div></div><div class="doc-spec-card"><div class="doc-spec-card-title">Frame Error Taxonomy</div><div class="doc-spec-card-desc">Bit error, CRC error, form error, ACK error, stuffing error, bus-off passive isolation</div></div><div class="doc-spec-card"><div class="doc-spec-card-title">SPI / I2C / UART</div><div class="doc-spec-card-desc">Logic analyzer CSV import or real-time Saleae capture for peripheral timing verification</div></div><div class="doc-spec-card"><div class="doc-spec-card-title">Anomaly Output</div><div class="doc-spec-card-desc">Per-frame statistical variance scored against immutable golden baseline, posted to <code style="background:var(--surface2);padding:1px 4px;border-radius:3px;">/api/alerts</code></div></div></div>'
  },
  rtos: {
    title: 'Bare-Metal & RTOS Instrumentation',
    icon: 'ph-wave-sawtooth',
    body: '<div class="doc-section-title"><i class="ph-bold ph-wave-sawtooth"></i>Low-Level Trace Taps<span class="doc-badge">Active</span></div><p>DiagIoT instruments RTOS task schedulers (FreeRTOS, Zephyr, CMSIS-RTOS2) via ETM trace and SEGGER RTT ring buffers to capture task switch latency, stack watermarks, heap fragmentation, and ISR timing without bus contention.</p><div class="doc-spec-grid"><div class="doc-spec-card"><div class="doc-spec-card-title">Tracing Methods</div><div class="doc-spec-card-desc">ITM SWO trace, ETM Cortex-M trace port, SEGGER SystemView RTT, Percepio TraceRecorder</div></div><div class="doc-spec-card"><div class="doc-spec-card-title">Stack Monitoring</div><div class="doc-spec-card-desc">FreeRTOS uxTaskGetStackHighWaterMark polled at configurable intervals, threshold alerts on &lt;256 bytes remaining</div></div><div class="doc-spec-card"><div class="doc-spec-card-title">Heap Analysis</div><div class="doc-spec-card-desc">Heap-4 / Heap-5 allocation tracking with per-task watermarks and fragmentation index scoring</div></div><div class="doc-spec-card"><div class="doc-spec-card-title">Clock Jitter</div><div class="doc-spec-card-desc">SysTick, TIM2/TIM5 counter delta capture - sigma deviation triggers clock skew alert in &lt; 200ms</div></div></div>'
  },
  docker: {
    title: 'Virtual Fleet Engine (Docker)',
    icon: 'ph-package',
    body: '<div class="doc-section-title"><i class="ph-bold ph-package"></i>Containerised Node Emulation<span class="doc-badge">Requires Docker</span></div><p>Docker containers simulate physical IoT nodes, enabling drift regression tests without hardware. Each container runs a firmware stub that emits telemetry to the DiagIoT WebSocket feed, creating a full virtual fleet for CI/CD validation.</p><div class="doc-spec-grid"><div class="doc-spec-card"><div class="doc-spec-card-title">Container Images</div><div class="doc-spec-card-desc">diagiot/node-sim:arm-m4, diagiot/node-sim:riscv32 - QEMU-backed firmware execution stubs</div></div><div class="doc-spec-card"><div class="doc-spec-card-title">Telemetry Emission</div><div class="doc-spec-card-desc">WebSocket push to <code style="background:var(--surface2);padding:1px 4px;border-radius:3px;">ws://localhost:3000</code> at 1Hz - identical schema to real hardware adapters</div></div><div class="doc-spec-card"><div class="doc-spec-card-title">Drift Scenarios</div><div class="doc-spec-card-desc">Heap creep ramp, clock skew injection, ADC jitter simulation - configurable via environment variables</div></div><div class="doc-spec-card"><div class="doc-spec-card-title">CI Integration</div><div class="doc-spec-card-desc">docker compose up in GitHub Actions pre-merge step - gate enforces zero regressions before merge</div></div></div><p style="color:var(--warn);font-size:12px;margin-top:4px;">Docker daemon unavailable on this host. Start Docker Desktop or a Linux socket to activate virtual fleet nodes.</p>'
  },
  onboarding: {
    title: 'Engineer Onboarding Hub',
    icon: 'ph-graduation-cap',
    body: '<div class="doc-section-title"><i class="ph-bold ph-graduation-cap"></i>4-Stage Structured Onboarding<span class="doc-badge">Active</span></div><p>The Onboarding Agent guides new engineers through four sequential tracks, each backed by live workspace tasks rather than static documentation. Completion is tracked per-user and surfaces directly in the dashboard.</p><div class="doc-spec-grid"><div class="doc-spec-card"><div class="doc-spec-card-title">Stage 1: Architecture</div><div class="doc-spec-card-desc">Fleet topology, device naming conventions, telemetry schema (RFC 8259 JSON), and agent responsibilities</div></div><div class="doc-spec-card"><div class="doc-spec-card-title">Stage 2: Hardware Setup</div><div class="doc-spec-card-desc">J-Link adapter connection, serial port detection, first HIL scan execution against a live target</div></div><div class="doc-spec-card"><div class="doc-spec-card-title">Stage 3: Drift Workflow</div><div class="doc-spec-card-desc">Interpreting sigma scores, reading drift charts, acknowledging alerts, generating root-cause hypotheses</div></div><div class="doc-spec-card"><div class="doc-spec-card-title">Stage 4: CI/CD Gate</div><div class="doc-spec-card-desc">Adding DiagIoT scan step to GitHub Actions or Jenkins, configuring pass/fail thresholds, reviewing scan reports</div></div></div><p style="color:var(--text-dim);font-size:12px;">Accessible after authentication via the Onboarding screen in the dashboard left navigation.</p>'
  },
  knowledge: {
    title: 'Incident Knowledge Base',
    icon: 'ph-books',
    body: '<div class="doc-section-title"><i class="ph-bold ph-books"></i>Searchable Post-Mortem Repository<span class="doc-badge">Active</span></div><p>The Knowledge Base is a structured, full-text searchable store of incident post-mortems, resolved drift cases, and hardware errata entries. The Onboarding Agent writes new articles from closed incidents and flags related cases on new alerts.</p><div class="doc-spec-grid"><div class="doc-spec-card"><div class="doc-spec-card-title">Article Schema</div><div class="doc-spec-card-desc">Title, affected devices, root cause, contributing commits, resolution steps, severity classification</div></div><div class="doc-spec-card"><div class="doc-spec-card-title">Search API</div><div class="doc-spec-card-desc">Full-text via <code style="background:var(--surface2);padding:1px 4px;border-radius:3px;">GET /api/knowledge?q=adc+drift</code> - returns ranked article list with excerpt highlighting</div></div><div class="doc-spec-card"><div class="doc-spec-card-title">Auto-Linking</div><div class="doc-spec-card-desc">New alerts trigger knowledge base query - matching articles surface as hypothesis cards in the Event Timeline screen</div></div><div class="doc-spec-card"><div class="doc-spec-card-title">Contribution</div><div class="doc-spec-card-desc">Engineers contribute via <code style="background:var(--surface2);padding:1px 4px;border-radius:3px;">POST /api/knowledge</code> or directly from the Resolve action in any alert card</div></div></div>'
  },
  cli: {
    title: 'DiagIoT CLI Reference',
    icon: 'ph-terminal-window',
    body: '<div class="doc-section-title"><i class="ph-bold ph-terminal-window"></i>Embedded CLI - Shift+/ to Open<span class="doc-badge">v1.0.0</span></div><p>The CLI is embedded in the dashboard panel and connects directly to the backend REST API. All commands map 1-to-1 to API endpoints - no extra toolchain required.</p><div class="doc-spec-grid"><div class="doc-spec-card"><div class="doc-spec-card-title">fleet status</div><div class="doc-spec-card-desc">Calls <code style="background:var(--surface2);padding:1px 4px;border-radius:3px;">GET /api/fleet/summary</code> - returns live device count, warning count, and critical fault count</div></div><div class="doc-spec-card"><div class="doc-spec-card-title">scan run --target &lt;fw&gt;</div><div class="doc-spec-card-desc">Posts to <code style="background:var(--surface2);padding:1px 4px;border-radius:3px;">POST /api/scans/run</code> - executes a simulated or hardware-backed pre-ship scan and returns pass/fail gate result</div></div><div class="doc-spec-card"><div class="doc-spec-card-title">drift score --device &lt;id&gt;</div><div class="doc-spec-card-desc">Calls <code style="background:var(--surface2);padding:1px 4px;border-radius:3px;">GET /api/fleet/devices/:id/telemetry</code> and computes current sigma score</div></div><div class="doc-spec-card"><div class="doc-spec-card-title">alerts list</div><div class="doc-spec-card-desc">Fetches <code style="background:var(--surface2);padding:1px 4px;border-radius:3px;">GET /api/alerts</code> - displays severity-filtered alert table in the CLI output panel</div></div></div><p style="color:var(--text-dim);font-size:12px;">Press Shift+/ anywhere in the dashboard to toggle the CLI panel.</p>'
  },
  api: {
    title: 'REST & WebSocket API Reference',
    icon: 'ph-plugs-connected',
    body: '<div class="doc-section-title"><i class="ph-bold ph-plugs-connected"></i>Live Backend: <span style="color:var(--ok);">http://localhost:3000</span><span class="doc-badge">RFC 8259</span></div><p>All endpoints return RFC 8259 compliant JSON. The WebSocket feed at <code style="background:var(--surface2);padding:1px 5px;border-radius:3px;">ws://localhost:3000</code> emits real-time device telemetry and alert events to connected clients.</p><div class="doc-spec-grid"><div class="doc-spec-card"><div class="doc-spec-card-title">GET /api/health</div><div class="doc-spec-card-desc">Server uptime, fleet summary, all integration statuses, and all agent statuses in a single snapshot response</div></div><div class="doc-spec-card"><div class="doc-spec-card-title">GET /api/fleet/devices</div><div class="doc-spec-card-desc">All registered devices with optional ?fleet= and ?health= query filters</div></div><div class="doc-spec-card"><div class="doc-spec-card-title">POST /api/fleet/devices/:id/telemetry</div><div class="doc-spec-card-desc">Push a telemetry sample - returns live drift evaluation result with sigma score and anomaly flag</div></div><div class="doc-spec-card"><div class="doc-spec-card-title">WebSocket Events</div><div class="doc-spec-card-desc">telemetry, alert:new, scan:complete, agent:status - subscribe to any event type on connect</div></div></div>'
  },
  security: {
    title: 'Air-Gapped Telemetry & Security',
    icon: 'ph-shield-check',
    body: '<div class="doc-section-title"><i class="ph-bold ph-shield-check"></i>Strict On-Premises Data Isolation<span class="doc-badge">RFC 8259</span></div><p>DiagIoT is designed for air-gapped factory and fleet environments. No telemetry data ever leaves the local network boundary. All payloads conform to RFC 8259 JSON with cryptographic integrity tokens and are stored exclusively in the local in-memory store (or connected database if configured).</p><div class="doc-spec-grid"><div class="doc-spec-card"><div class="doc-spec-card-title">Network Boundary</div><div class="doc-spec-card-desc">Server binds exclusively to <code style="background:var(--surface2);padding:1px 4px;border-radius:3px;">localhost:3000</code> by default - no external egress, no cloud dependencies, no telemetry forwarding</div></div><div class="doc-spec-card"><div class="doc-spec-card-title">Auth Tokens</div><div class="doc-spec-card-desc">Session tokens are cryptographically signed JWTs or Supabase auth tokens - configurable via environment variables, never hardcoded</div></div><div class="doc-spec-card"><div class="doc-spec-card-title">Data Schema</div><div class="doc-spec-card-desc">All payloads strict RFC 8259 JSON - no binary blobs, no proprietary formats, no compressed telemetry tunnels</div></div><div class="doc-spec-card"><div class="doc-spec-card-title">GitHub Webhooks</div><div class="doc-spec-card-desc">HMAC-SHA256 signature verification on every X-Hub-Signature-256 header - invalid signatures return 401 immediately</div></div></div>'
  }
};

function openDoc(key) {
  var doc = DOC_CONTENT[key];
  if (!doc) return;
  _pendingDocScreen = null;
  var backdrop = document.getElementById('docModalBackdrop');
  var titleEl = document.getElementById('docModalTitleText');
  var iconEl = backdrop ? backdrop.querySelector('.doc-modal-title i') : null;
  var bodyEl = document.getElementById('docModalBody');
  if (!backdrop || !bodyEl) return;
  if (titleEl) titleEl.textContent = doc.title;
  if (iconEl) iconEl.className = 'ph-bold ' + doc.icon;
  bodyEl.innerHTML = doc.body;
  backdrop.classList.add('open');
}

function closeDocModal() {
  var backdrop = document.getElementById('docModalBackdrop');
  if (backdrop) backdrop.classList.remove('open');
  _pendingDocScreen = null;
}

function launchFromDoc() {
  closeDocModal();
  openAuthModal();
}

function requestWorkspaceAuth(screenId, role) {
  _pendingDocScreen = screenId;
  if (role) {
    selectAuthRole(role);
  }
  openAuthModal();
}

function launchScreen(screenId) {
  if (!window._authUser) {
    requestWorkspaceAuth(screenId, null);
    return;
  }
  if (typeof enterDashboard === 'function') enterDashboard();
  if (typeof switchScreen === 'function') switchScreen(screenId);
}

window.openDoc = openDoc;
window.closeDocModal = closeDocModal;
window.launchFromDoc = launchFromDoc;
window.requestWorkspaceAuth = requestWorkspaceAuth;
window.launchScreen = launchScreen;

var _origEnterDashboard = enterDashboard;
enterDashboard = function() {
  _origEnterDashboard();
  if (_pendingDocScreen && typeof switchScreen === 'function') {
    var target = _pendingDocScreen;
    _pendingDocScreen = null;
    setTimeout(function() { switchScreen(target); }, 50);
  }
};
window.enterDashboard = enterDashboard;
