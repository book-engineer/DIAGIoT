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

// ── Screen HTML builders ──
const SCREENS = {};

// ─── DASHBOARD ───────────────────────────────────────────
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
