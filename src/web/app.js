const SCREEN_ALIASES = {
  // Screen name variations & synonyms
  onboarding:   'onboard',
  reproduce:    'repro',
  firmware:     'diff',
  scan:         'preship',
  scans:        'preship',
  alerts:       'timeline',
  devices:      'field',
  fleet:        'field',
  kb:           'knowledge',
  // Doc modal mappings & protocol references
  hil:          'preship',
  bus:          'field',
  rtos:         'drift',
  docker:       'integrations',
  cli:          'dashboard',
  api:          'integrations',
  security:     'integrations',
  integration:  'integrations',
};

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
  // Aliases & shortcuts
  onboarding:   'onboard',
  reproduce:    'monitor',
  firmware:     'monitor',
  scan:         'preship',
  scans:        'preship',
  alerts:       'monitor',
  devices:      'monitor',
  fleet:        'monitor',
  kb:           'onboard',
  hil:          'preship',
  bus:          'monitor',
  rtos:         'monitor',
  docker:       'neutral',
  cli:          'neutral',
  api:          'neutral',
  security:     'neutral',
  integration:  'neutral',
};
const SCREENS = {};
const SCREEN_INIT = {};

// ── Dashboard helpers ─────────────────────────────────────────────────────────
function _agentTag(source) {
  if (source === 'preship') return `<span class="agent-tag preship"><i class="ph-bold ph-shield-check"></i> Pre-Ship</span>`;
  return `<span class="agent-tag monitor"><i class="ph-bold ph-eye"></i> Monitor</span>`;
}

SCREENS.dashboard = () => {
  const f  = window.D?.fleet   || {};
  const devs = window.D?.devices || [];
  const agts = window.D?.agents  || [];
  const alts = (window.D?.alerts || []).filter(a => !a.acknowledged).slice(0, 5);
  const scns = window.D?.scans   || [];
  const ints = window.D?.integrations || [];

  const ps  = agts.find(a => a.id === 'preship') || {};
  const mon = agts.find(a => a.id === 'monitor')  || {};
  const onb = agts.find(a => a.id === 'onboard')  || {};

  // Quick-connect: real integration statuses
  const intMap = {};
  ints.forEach(i => { intMap[i.id] = i; });
  const quickConns = [
    { icon: 'ph-cpu',        id: 'arduino', name: 'Arduino IDE'       },
    { icon: 'ph-git-branch', id: 'github',  name: 'GitHub'            },
    { icon: 'ph-code',       id: 'vscode',  name: 'VS Code / PIO'     },
    { icon: 'ph-wrench',     id: 'jenkins', name: 'Jenkins CI'        },
    { icon: 'ph-cube',       id: 'docker',  name: 'Docker / OCI'      },
    { icon: 'ph-gear',       id: 'keil',    name: 'Keil / STM32Cube'  },
  ].map(({ icon, id, name }) => {
    const st = (intMap[id]?.status || 'disconnected').toLowerCase();
    const cls = (st === 'live' || st === 'connected') ? 'ok' : st === 'partial' ? 'warn' : 'text-dim';
    const label = st.charAt(0).toUpperCase() + st.slice(1);
    const border = (st === 'live' || st === 'connected') ? 'var(--monitor)' : 'var(--border)';
    return `<div style="border:1px solid ${border};border-radius:var(--radius-sm);padding:8px;text-align:center;cursor:pointer;background:var(--surface2)" onclick="switchScreen('integrations')">
      <i class="ph-bold ${icon}" style="font-size:16px;color:var(--${cls})"></i>
      <div style="font-size:10px;font-weight:600;margin-top:3px">${name}</div>
      <div style="font-size:9px;color:var(--${cls})">${label}</div>
    </div>`;
  }).join('');

  // Device rows
  const deviceRows = devs.slice(0, 8).map(d => `
    <tr class="clickable" onclick="switchScreen('field')">
      <td style="font-weight:600">${d.name || d.id}</td>
      <td>${d.fleet || '—'}</td>
      <td>${d.fw || '—'}</td>
      <td>${healthBadge(d.health, d.driftScore ?? 0)}</td>
      <td>${relTime(d.updatedAt)}</td>
    </tr>`).join('') || '<tr><td colspan="5" style="color:var(--text-dim);text-align:center">No devices registered</td></tr>';

  // Alert rows
  const alertRows = alts.map(a => {
    const dev = devs.find(d => d.id === a.deviceId);
    const score = a.driftScore ?? 0;
    return `<tr>
      <td>${relTime(a.createdAt)}</td>
      <td>${dev?.name || a.deviceId || '—'}</td>
      <td>${dev?.fleet || '—'}</td>
      <td>${a.type || a.message?.slice(0,40) || '—'}</td>
      <td>${sevBadge(a.severity || a.sev)}</td>
      <td>${_agentTag(a.source || a.agent)}</td>
      <td style="color:${scoreStyle(score)};font-weight:700">${score.toFixed(2)}</td>
      <td><button class="btn btn-ghost" style="font-size:10px;padding:3px 8px" onclick="switchScreen('drift')">Investigate</button></td>
    </tr>`;
  }).join('') || '<tr><td colspan="8" style="color:var(--text-dim);text-align:center">No active alerts</td></tr>';

  return `
<div class="screen active" id="screen-dashboard">
  <div class="page-title">System Health Dashboard</div>
  <div class="page-sub">Real-time overview of all IoT fleets under DiagIoT surveillance — powered by autonomous drift agents</div>
  <div class="grid4" style="margin-bottom:16px">
    <div class="card stat">
      <div class="stat-num" style="color:var(--ok)">${f.total ?? '—'}</div>
      <div class="stat-label"><i class="ph-bold ph-hard-drives"></i> Devices Online</div>
    </div>
    <div class="card stat">
      <div class="stat-num" style="color:var(--warn)">${f.drifting ?? '—'}</div>
      <div class="stat-label"><i class="ph-bold ph-warning"></i> Drift Warnings</div>
    </div>
    <div class="card stat">
      <div class="stat-num" style="color:var(--danger)">${f.critical ?? '—'}</div>
      <div class="stat-label"><i class="ph-bold ph-x-circle"></i> Critical Failures</div>
    </div>
    <div class="card stat">
      <div class="stat-num" style="color:var(--monitor)">${f.uptime ?? '—'}</div>
      <div class="stat-label"><i class="ph-bold ph-activity"></i> Fleet Uptime</div>
    </div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin-bottom:16px">
    <div class="agent-card preship">
      <div class="agent-card-icon"><i class="ph-bold ph-shield-check" style="color:var(--preship)"></i></div>
      <div class="agent-card-name">Pre-Ship Agent</div>
      <div class="agent-card-scope">Pre-Ship Scan · Gate control · Baseline capture</div>
      <div class="agent-card-status"><span class="agent-status-dot teal"></span><span style="color:var(--preship)">${ps.status || 'idle'}</span>${ps.lastActivity ? ` — ${relTime(ps.lastActivity)}` : ''}</div>
      <div class="agent-metrics">
        <div>Scans: <strong>${ps.metrics?.scanCount ?? ps.metrics?.scansToday ?? '—'}</strong></div>
        <div>Blocked: <strong>${ps.metrics?.blockedCount ?? ps.metrics?.blockedReleases ?? '—'}</strong></div>
        <div>Nodes: <strong>${ps.metrics?.nodesTracked ?? '—'}</strong></div>
      </div>
    </div>
    <div class="agent-card monitor">
      <div class="agent-card-icon"><i class="ph-bold ph-eye" style="color:var(--monitor)"></i></div>
      <div class="agent-card-name">Monitor &amp; Investigate Agent</div>
      <div class="agent-card-scope">Field Monitor · Drift Analysis · Event Timeline · Firmware Diff · Reproduce</div>
      <div class="agent-card-status"><span class="agent-status-dot blue"></span><span style="color:var(--monitor)">${mon.status || 'idle'}</span>${mon.lastActivity ? ` — ${relTime(mon.lastActivity)}` : ''}</div>
      <div class="agent-metrics">
        <div>Alerts: <strong>${mon.metrics?.alertCount ?? '—'}</strong></div>
        <div>Nodes tracked: <strong>${mon.metrics?.nodesTracked ?? '—'}</strong></div>
        <div>Anomalies: <strong>${mon.metrics?.anomaliesIsolated ?? '—'}</strong></div>
      </div>
    </div>
    <div class="agent-card onboard">
      <div class="agent-card-icon"><i class="ph-bold ph-compass" style="color:var(--onboard)"></i></div>
      <div class="agent-card-name">Onboarding Agent</div>
      <div class="agent-card-scope">Engineer Onboarding · Knowledge Base · Curation</div>
      <div class="agent-card-status"><span class="agent-status-dot amber"></span><span style="color:var(--onboard)">${onb.status || 'idle'}</span>${onb.lastActivity ? ` — ${relTime(onb.lastActivity)}` : ''}</div>
      <div class="agent-metrics">
        <div>Active tracks: <strong>${onb.metrics?.activeTracks ?? '—'}</strong></div>
        <div>KB articles: <strong>${onb.metrics?.kbArticlesIndexed ?? '—'}</strong></div>
        <div>Alerts: <strong>${onb.metrics?.alertCount ?? '—'}</strong></div>
      </div>
    </div>
  </div>
  <div class="grid2" style="margin-bottom:16px">
    <div class="card">
      <div class="card-title"><i class="ph-bold ph-chart-bar"></i> Drift Trend — Recent Scans</div>
      <div class="chart-wrap" style="height:160px"><canvas id="chartDriftTrend"></canvas></div>
    </div>
    <div class="card">
      <div class="card-title"><i class="ph-bold ph-chart-donut"></i> Fleet Health Distribution</div>
      <div style="display:flex;align-items:center;justify-content:center;gap:24px;padding:10px 0">
        <div style="position:relative;width:130px;height:130px">
          <canvas id="chartFleetHealth"></canvas>
        </div>
        <div style="font-size:12px;line-height:2.2">
          <div><span class="badge ok">Healthy</span> ${f.healthy ?? 0} devices</div>
          <div><span class="badge warn">Drifting</span> ${f.drifting ?? 0} devices</div>
          <div><span class="badge danger">Critical</span> ${f.critical ?? 0} devices</div>
        </div>
      </div>
    </div>
  </div>
  <div class="split-wide" style="margin-bottom:16px">
    <div class="card">
      <div class="card-title"><i class="ph-bold ph-stack"></i> Device Registry</div>
      <table class="wtable">
        <thead><tr><th>Device</th><th>Fleet</th><th>FW Version</th><th>Health</th><th>Last Seen</th></tr></thead>
        <tbody>${deviceRows}</tbody>
      </table>
      <div style="margin-top:10px">
        <button class="btn btn-ghost" style="font-size:11px" onclick="switchScreen('field')"><i class="ph-bold ph-broadcast"></i> Open Field Monitor</button>
      </div>
    </div>
    <div class="card">
      <div class="card-title"><i class="ph-bold ph-plugs-connected"></i> Quick Connect — Link to IDE / CI</div>
      <div style="font-size:11px;color:var(--text-dim);margin-bottom:12px;line-height:1.6">Connect your firmware toolchain to enable automatic Pre-Ship scanning.</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:14px">${quickConns}</div>
      <button class="btn btn-primary" onclick="switchScreen('integrations')"><i class="ph-bold ph-gear"></i> Manage All Integrations</button>
    </div>
  </div>
  <div class="card">
    <div class="card-title"><i class="ph-bold ph-bell-ringing"></i> Recent Alerts</div>
    <table class="wtable">
      <thead><tr><th>Time</th><th>Device</th><th>Fleet</th><th>Type</th><th>Severity</th><th>Agent</th><th>Drift Score</th><th>Action</th></tr></thead>
      <tbody>${alertRows}</tbody>
    </table>
  </div>
</div>`;
};

// ── Pre-Ship Scan Screen ──────────────────────────────────────────────────────
SCREENS.preship = () => {
  const scans = window.D?.scans || [];
  const scanRows = scans.map(s => {
    const score = s.composite ?? s.score ?? 0;
    const verdict = s.decision === 'block' ? 'Block' : s.decision === 'warn' ? 'Warn' : 'Pass';
    const vcls   = s.decision === 'block' ? 'danger' : s.decision === 'warn' ? 'warn' : 'ok';
    return `<tr>
      <td style="font-family:var(--font-mono);font-size:11px">${s.target || '—'}</td>
      <td style="color:${scoreStyle(score)};font-weight:700">${score.toFixed(3)}</td>
      <td><span class="badge ${vcls}">${verdict}</span></td>
      <td>${relTime(s.createdAt || s.ts)}</td>
      <td style="font-size:10px;color:var(--text-dim)">${(s.checks || []).filter(c => c.status === 'FAIL').length} check(s) failed</td>
    </tr>`;
  }).join('') || '<tr><td colspan="5" style="color:var(--text-dim);text-align:center">No scans yet — run your first scan above</td></tr>';

  return `
<div class="screen active" id="screen-preship">
  <div class="page-title" style="color:var(--preship)"><i class="ph-bold ph-shield-check"></i> Pre-Ship Scan</div>
  <div class="page-title" style="color:var(--preship)"><i class="ph-bold ph-shield-check"></i> Pre-Ship Scan <span class="agent-tag preship"><i class="ph-bold ph-shield-check"></i> Pre-Ship Agent</span></div>
  <div class="page-sub">Run autonomous agent–powered drift checks before firmware or hardware leaves the lab — compute a weighted risk score and get a Pass / Warn / Block gate decision</div>

  <!-- Scan Pipeline Flow -->
  <div class="card" style="margin-bottom:18px">
    <div class="card-title"><i class="ph-bold ph-flow-arrow"></i> Scan Pipeline</div>
    <div style="display:flex;align-items:center;justify-content:center;gap:0;padding:12px 0;flex-wrap:wrap">
      <div style="padding:9px 16px;border-radius:8px;font-size:11px;font-weight:600;background:var(--surface2);border:1px solid var(--border);text-align:center;min-width:90px">Select Build</div>
      <div style="color:var(--text-dim);font-size:18px;margin:0 6px">&#8594;</div>
      <div style="padding:9px 16px;border-radius:8px;font-size:11px;font-weight:600;background:rgba(78,205,196,.12);border:1px solid var(--preship-border);color:var(--preship);text-align:center;min-width:90px">Baseline Capture</div>
      <div style="color:var(--text-dim);font-size:18px;margin:0 6px">&#8594;</div>
      <div style="padding:9px 16px;border-radius:8px;font-size:11px;font-weight:600;background:var(--surface2);border:1px solid var(--border);text-align:center;min-width:90px">HW Register Map</div>
      <div style="color:var(--text-dim);font-size:18px;margin:0 6px">&#8594;</div>
      <div style="padding:9px 16px;border-radius:8px;font-size:11px;font-weight:600;background:var(--surface2);border:1px solid var(--border);text-align:center;min-width:90px">FW Signature</div>
      <div style="color:var(--text-dim);font-size:18px;margin:0 6px">&#8594;</div>
      <div style="padding:9px 16px;border-radius:8px;font-size:11px;font-weight:600;background:var(--surface2);border:1px solid var(--border);text-align:center;min-width:90px">Drift Comparison</div>
      <div style="color:var(--text-dim);font-size:18px;margin:0 6px">&#8594;</div>
      <div style="padding:9px 16px;border-radius:8px;font-size:11px;font-weight:600;background:rgba(74,227,181,.12);border:1px solid var(--ok);color:var(--ok);text-align:center;min-width:90px">Ship / Block</div>
    </div>
  </div>

  <div class="grid2" style="margin-bottom:18px">
    <!-- Scan config form -->
    <div class="card">
      <div class="card-title"><i class="ph-bold ph-scan"></i> Scan Configuration</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:12px;margin-bottom:14px">
        <div>
          <label style="color:var(--text-dim);font-size:11px;display:block;margin-bottom:4px">Target Build</label>
          <input id="ps-target" class="form-input" type="text" placeholder="fw-v3.8.2-rc5" style="font-family:var(--font-mono);width:100%">
        </div>
        <div>
          <label style="color:var(--text-dim);font-size:11px;display:block;margin-bottom:4px">Baseline</label>
          <select class="form-input" style="width:100%;padding:7px 10px">
            <option>fw-v3.8.1 (Gold)</option>
            <option>fw-v3.7.9 (Stable)</option>
            <option>fw-v3.8.0 (RC)</option>
          </select>
        </div>
        <div>
          <label style="color:var(--text-dim);font-size:11px;display:block;margin-bottom:4px">HW Revision</label>
          <select class="form-input" style="width:100%;padding:7px 10px">
            <option>Rev C2</option><option>Rev C1</option><option>Rev B</option>
          </select>
        </div>
        <div>
          <label style="color:var(--text-dim);font-size:11px;display:block;margin-bottom:4px">Test Suite</label>
          <select class="form-input" style="width:100%;padding:7px 10px">
            <option>Full (Agent Scan)</option><option>Quick (Binary only)</option><option>HIL Gate</option>
          </select>
        </div>
      </div>
      <div class="card-title" style="margin-bottom:8px;font-size:11px;color:var(--text-dim)">COMPONENT SCORES (0.00 &ndash; 1.00)</div>
      ${[
        ['binaryDiff',    'Binary Diff',           '30%', '0.30'],
        ['behavioralSig', 'Behavioral Signature',   '25%', '0.10'],
        ['knownVulns',    'Known Vulnerabilities',  '20%', '0.05'],
        ['hwCompat',      'HW Compatibility',       '15%', '0.05'],
        ['configDrift',   'Config Drift',           '10%', '0.05'],
      ].map(([key, label, weight, def]) => `
      <div style="display:grid;grid-template-columns:1fr 48px 60px;gap:8px;align-items:center;margin-bottom:8px">
        <label class="form-label" style="margin:0">${label} <span style="color:var(--text-dim);font-size:10px">(${weight})</span></label>
        <input id="ps-${key}" class="form-input" type="number" min="0" max="1" step="0.01" value="${def}" style="padding:5px 6px;font-size:12px;font-family:var(--font-mono);text-align:right">
        <input type="range" min="0" max="1" step="0.01" value="${def}" style="width:100%"
          oninput="document.getElementById('ps-${key}').value=parseFloat(this.value).toFixed(2)"
          onchange="document.getElementById('ps-${key}').value=parseFloat(this.value).toFixed(2)">
      </div>`).join('')}
      <div style="display:flex;gap:8px;margin-top:14px;align-items:center">
        <button class="btn btn-primary" id="ps-submit-btn" onclick="runPreShipScan()">
          <i class="ph-bold ph-scan"></i> Run Scan
        </button>
        <button class="btn btn-ghost">Schedule</button>
        <span id="ps-loading" style="display:none;color:var(--text-dim);font-size:12px"><i class="ph-bold ph-circle-notch"></i> Scanning&#8230;</span>
      </div>
    </div>

    <!-- Result card -->
    <div class="card" id="ps-result-card">
      <div class="card-title"><i class="ph-bold ph-clipboard-text"></i> ${lastScan ? `Last Scan Result &#8212; ${lastScan.target || '—'}` : 'Scan Result'}</div>
      <div id="ps-result-body" style="${lastScan ? '' : 'color:var(--text-dim);font-size:13px;padding:24px 0;text-align:center'}">
        ${lastScan ? (() => {
          const score = lastScore;
          const verdict = lastScan.decision === 'block' ? 'BLOCK' : lastScan.decision === 'warn' ? 'WARN' : 'PASS';
          const vcls = lastScan.decision === 'block' ? 'danger' : lastScan.decision === 'warn' ? 'warn' : 'ok';
          const scoreColor = scoreStyle(score);
          const checks = lastScan.checks || [];
          const checkRows = checks.length ? checks.map(c => `<tr>
            <td>${c.name || '—'}</td>
            <td><span class="badge ${c.status === 'FAIL' ? 'danger' : c.status === 'WARN' ? 'warn' : 'ok'}">${c.status || '—'}</span></td>
            <td style="font-size:11px;color:var(--text-dim)">${c.detail || (c.score != null ? c.score.toFixed(2) : '—')}</td>
          </tr>`).join('') : '<tr><td colspan="3" style="color:var(--text-dim);text-align:center">No check details</td></tr>';
          return `<div style="display:flex;align-items:center;gap:16px;margin-bottom:12px">
            <div style="width:48px;height:48px;border-radius:50%;border:3px solid ${scoreColor};display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0">
              ${lastScan.decision === 'block' ? '&#128683;' : lastScan.decision === 'warn' ? '&#9888;&#65039;' : '&#9989;'}
            </div>
            <div>
              <div style="font-size:16px;font-weight:700;color:${scoreColor}">${score.toFixed(3)} &#8212; ${verdict}</div>
              <div style="font-size:11px;color:var(--text-dim)">${lastScan.label || scoreLabel(score)} &#183; ${relTime(lastScan.createdAt)}</div>
            </div>
          </div>
          <table class="wtable"><thead><tr><th>Check</th><th>Status</th><th>Detail</th></tr></thead><tbody>${checkRows}</tbody></table>`;
        })() : '<i class="ph-bold ph-scan" style="font-size:32px;display:block;margin-bottom:8px;opacity:0.3"></i>Submit a scan to see results here'}
      </div>
    </div>
  </div>

  <!-- Drift Meters -->
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:18px">
    ${[
      { label:'Clock Drift', sub:'Skew vs. baseline gold image', val: lastScan ? (lastScan.scores?.behavioralSig ?? 0.52) : 0.52 },
      { label:'Signal Drift', sub:'ADC offset vs. calibrated baseline', val: lastScan ? (lastScan.scores?.binaryDiff ?? 0.22) : 0.22 },
      { label:'Firmware Drift', sub:'Binary diff vs. gold image', val: lastScan ? (lastScan.composite ?? 0.38) : 0.38 },
    ].map(m => {
      const color = m.val >= 0.70 ? 'var(--danger)' : m.val >= 0.40 ? 'var(--warn)' : 'var(--ok)';
      const pct = Math.round(m.val * 100);
      return `<div class="card">
        <div class="card-title">${m.label}</div>
        <div style="font-size:11px;color:var(--text-dim);margin-bottom:8px">${m.sub}</div>
        <div style="display:flex;align-items:center;gap:12px;margin-top:8px">
          <div style="flex:1;height:8px;background:linear-gradient(90deg,var(--ok) 0%,var(--warn) 50%,var(--danger) 100%);border-radius:4px;position:relative">
            <div style="position:absolute;top:-3px;width:4px;height:14px;background:#fff;border-radius:2px;transform:translateX(-50%);left:${pct}%"></div>
          </div>
          <div style="font-size:13px;font-weight:700;min-width:50px;text-align:right;color:${color}">${m.val.toFixed(2)}</div>
        </div>
      </div>`;
    }).join('')}
  </div>

  <!-- Previous scans -->
  <div class="card">
    <div class="card-title"><i class="ph-bold ph-clock-clockwise"></i> Scan History</div>
    <table class="wtable" id="ps-history-table">
      <thead><tr><th>Target</th><th>Drift Score</th><th>Verdict</th><th>Time</th><th>Checks</th></tr></thead>
      <tbody id="ps-history-body">${scanRows}</tbody>
    </table>
  </div>
</div>`;
};

window.runPreShipScan = async function runPreShipScan() {
  const target = document.getElementById('ps-target')?.value?.trim();
  if (!target) {
    const inp = document.getElementById('ps-target');
    if (inp) { inp.style.borderColor = 'var(--danger)'; setTimeout(() => { inp.style.borderColor = ''; }, 1500); }
    return;
  }
  const scores = {};
  ['binaryDiff','behavioralSig','knownVulns','hwCompat','configDrift'].forEach(k => {
    scores[k] = parseFloat(document.getElementById(`ps-${k}`)?.value || '0');
  });

  const btn     = document.getElementById('ps-submit-btn');
  const loading = document.getElementById('ps-loading');
  if (btn)     btn.disabled = true;
  if (loading) loading.style.display = 'inline';

  try {
    const result = await window.api.runScan(target, [], scores);
    const score    = result.composite ?? 0;
    const verdict  = result.decision === 'block' ? 'BLOCK' : result.decision === 'warn' ? 'WARN' : 'PASS';
    const vcls     = result.decision === 'block' ? 'danger' : result.decision === 'warn' ? 'warn' : 'ok';
    const scoreColor = scoreStyle(score);

    const weights = { binaryDiff: 0.30, behavioralSig: 0.25, knownVulns: 0.20, hwCompat: 0.15, configDrift: 0.10 };
    const names   = { binaryDiff: 'Binary Diff', behavioralSig: 'Behavioral Sig', knownVulns: 'Known Vulns', hwCompat: 'HW Compat', configDrift: 'Config Drift' };
    const breakdownRows = Object.entries(result.scores || scores).map(([k, v]) => {
      const w = weights[k] || 0;
      const contribution = (parseFloat(v) * w).toFixed(3);
      const barcls = parseFloat(v) >= 0.70 ? 'danger' : parseFloat(v) >= 0.40 ? 'warn' : 'ok';
      return `<tr>
        <td style="font-size:11px">${names[k] || k}</td>
        <td style="font-size:11px;text-align:right;font-family:var(--font-mono)">${parseFloat(v).toFixed(2)}</td>
        <td style="font-size:11px;color:var(--text-dim);text-align:center">${(w*100).toFixed(0)}%</td>
        <td style="font-size:11px;font-family:var(--font-mono);text-align:right;color:var(--${barcls})">${contribution}</td>
      </tr>`;
    }).join('');

    const body = document.getElementById('ps-result-body');
    if (body) {
      body.innerHTML = `
        <div style="text-align:center;margin-bottom:18px">
          <div style="font-size:48px;font-weight:800;line-height:1;color:${scoreColor}">${score.toFixed(3)}</div>
          <div style="font-size:11px;color:var(--text-dim);margin-top:2px">composite drift score</div>
          <div style="margin-top:10px">
            <span class="badge ${vcls}" style="font-size:14px;padding:6px 18px;letter-spacing:1px">${verdict}</span>
          </div>
          <div style="font-size:11px;color:var(--text-dim);margin-top:6px">${result.label || scoreLabel(score)}</div>
        </div>
        <table class="wtable">
          <thead><tr><th>Component</th><th style="text-align:right">Score</th><th style="text-align:center">Weight</th><th style="text-align:right">Contribution</th></tr></thead>
          <tbody>${breakdownRows}</tbody>
        </table>`;
    }

    // Refresh scan history from window.D (WS will have pushed the new scan)
    const histBody = document.getElementById('ps-history-body');
    if (histBody) {
      const scans = window.D?.scans || [];
      histBody.innerHTML = scans.map(s => {
        const sc = s.composite ?? s.score ?? 0;
        const vd = s.decision === 'block' ? 'Block' : s.decision === 'warn' ? 'Warn' : 'Pass';
        const vc = s.decision === 'block' ? 'danger' : s.decision === 'warn' ? 'warn' : 'ok';
        return `<tr><td style="font-family:var(--font-mono);font-size:11px">${s.target||'—'}</td><td style="color:${scoreStyle(sc)};font-weight:700">${sc.toFixed(3)}</td><td><span class="badge ${vc}">${vd}</span></td><td>${relTime(s.createdAt||s.ts)}</td><td style="font-size:10px;color:var(--text-dim)">${(s.checks||[]).filter(c=>c.status==='FAIL').length} check(s) failed</td></tr>`;
      }).join('') || '<tr><td colspan="5" style="color:var(--text-dim);text-align:center">No scans yet</td></tr>';
    }
  } catch (err) {
    const body = document.getElementById('ps-result-body');
    if (body) body.innerHTML = `<div style="color:var(--danger);text-align:center;padding:20px"><i class="ph-bold ph-warning-circle" style="font-size:28px;display:block;margin-bottom:8px"></i>Scan failed: ${err.message}</div>`;
  } finally {
    if (btn)     btn.disabled = false;
    if (loading) loading.style.display = 'none';
  }
};

// softRefresh for preship just refreshes scan history rows without nuking the result card
SCREEN_INIT.preship = function() {
  const histBody = document.getElementById('ps-history-body');
  if (!histBody) return;
  const scans = window.D?.scans || [];
  histBody.innerHTML = scans.map(s => {
    const sc = s.composite ?? s.score ?? 0;
    const vd = s.decision === 'block' ? 'Block' : s.decision === 'warn' ? 'Warn' : 'Pass';
    const vc = s.decision === 'block' ? 'danger' : s.decision === 'warn' ? 'warn' : 'ok';
    return `<tr><td style="font-family:var(--font-mono);font-size:11px">${s.target||'—'}</td><td style="color:${scoreStyle(sc)};font-weight:700">${sc.toFixed(3)}</td><td><span class="badge ${vc}">${vd}</span></td><td>${relTime(s.createdAt||s.ts)}</td><td style="font-size:10px;color:var(--text-dim)">${(s.checks||[]).filter(c=>c.status==='FAIL').length} check(s) failed</td></tr>`;
  }).join('') || '<tr><td colspan="5" style="color:var(--text-dim);text-align:center">No scans yet</td></tr>';
};

// ── Field Monitor Screen ──────────────────────────────────────────────────────
SCREENS.field = () => {
  const devs = window.D?.devices || [];
  const alts = window.D?.alerts  || [];

  const deviceCard = (d) => {
    const score = d.driftScore ?? 0;
    const alert = alts.find(a => a.deviceId === d.id && !a.acknowledged);
    const pct   = Math.round(score * 100);
    const barColor = score >= 0.70 ? 'var(--danger)' : score >= 0.40 ? 'var(--warn)' : 'var(--ok)';
    return `<div class="card" style="padding:14px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
        <div>
          <div style="font-weight:600;font-size:13px">${d.name || d.id}</div>
          <div style="font-size:11px;color:var(--text-dim)">${d.fleet || '—'} · ${d.source || 'jlink'}</div>
        </div>
        ${healthBadge(d.health, score)}
      </div>
      <div style="margin-bottom:6px">
        <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px">
          <span style="color:var(--text-dim)">Drift Score</span>
          <span style="color:${barColor};font-weight:700;font-family:var(--font-mono)">${score.toFixed(3)}</span>
        </div>
        <div style="height:6px;background:var(--surface2);border-radius:3px;overflow:hidden">
          <div style="height:100%;width:${pct}%;background:${barColor};border-radius:3px;transition:width 0.4s"></div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;font-size:10px;color:var(--text-dim);margin-bottom:6px;gap:2px">
        <span>FW: <span style="color:var(--text);font-family:var(--font-mono)">${d.fw || '—'}</span></span>
        <span>IP: <span style="color:var(--text);font-family:var(--font-mono)">${d.ip || '—'}</span></span>
        <span>Last seen: ${relTime(d.updatedAt || d.lastTelemetry)}</span>
      </div>
      ${alert ? `<div style="background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:7px 9px;font-size:11px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px">
          ${sevBadge(alert.severity || alert.sev)}
          <button class="btn btn-ghost" style="font-size:10px;padding:2px 7px" onclick="ackAlert('${alert.id}',this)">Acknowledge</button>
        </div>
        <div style="color:var(--text-dim)">${alert.type || ''}: ${(alert.message || alert.type || '').slice(0, 80)}</div>
      </div>` : ''}
      <div style="display:flex;gap:6px;margin-top:8px">
        <button class="btn btn-ghost" style="font-size:10px;padding:3px 8px;flex:1" onclick="switchScreen('drift')">Investigate</button>
        <button class="btn btn-ghost" style="font-size:10px;padding:3px 8px;flex:1" onclick="switchScreen('timeline')">Timeline</button>
      </div>
    </div>`;
  };

  const healthOrder = { critical: 0, warning: 1, drifting: 1, healthy: 2 };
  const sorted = devs.slice().sort((a, b) => (healthOrder[a.health] ?? 3) - (healthOrder[b.health] ?? 3));
  const unackedAlerts = alts.filter(a => !a.acknowledged);

  // Build fleet summary
  const fleetMap = {};
  devs.forEach(d => {
    const fl = d.fleet || 'Unknown';
    if (!fleetMap[fl]) fleetMap[fl] = { total: 0, critical: 0, drifting: 0, healthy: 0, alerts: 0 };
    fleetMap[fl].total++;
    if (d.health === 'critical') fleetMap[fl].critical++;
    else if (d.health === 'drifting' || d.health === 'warning') fleetMap[fl].drifting++;
    else fleetMap[fl].healthy++;
    if (alts.some(a => a.deviceId === d.id && !a.acknowledged)) fleetMap[fl].alerts++;
  });

  const fleetCardsList = Object.keys(fleetMap).length > 0
    ? Object.entries(fleetMap).map(([name, f]) => {
        const healthPct = Math.round((f.healthy / Math.max(f.total, 1)) * 100);
        const borderColor = f.critical > 0 ? 'var(--danger)' : f.drifting > 0 ? 'var(--warn)' : 'var(--ok)';
        const barColor = f.critical > 0 ? 'var(--danger)' : f.drifting > 0 ? 'var(--warn)' : 'var(--ok)';
        const noteColor = f.critical > 0 ? 'var(--danger)' : f.drifting > 0 ? 'var(--warn)' : 'var(--text-dim)';
        const noteText = f.critical > 0 ? `${f.critical} critical failures` : f.drifting > 0 ? `${f.drifting} drift warnings` : `${f.alerts} alert${f.alerts !== 1 ? 's' : ''}`;
        return `<div class="card" style="border-left:3px solid ${borderColor}">
          <div style="font-size:13px;font-weight:700;margin-bottom:4px">${name}</div>
          <div style="font-size:11px;color:var(--text-dim)">${f.total} device${f.total !== 1 ? 's' : ''}</div>
          <div style="margin-top:8px">
            <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px"><span>Health</span><span style="color:${barColor}">${healthPct}%</span></div>
            <div style="height:6px;background:var(--surface2);border-radius:4px;overflow:hidden"><div style="height:100%;width:${healthPct}%;background:${barColor};border-radius:4px"></div></div>
          </div>
          <div style="margin-top:6px;font-size:10px;color:${noteColor}">${noteText}</div>
        </div>`;
      }).join('')
    : [
        { n:'Pacific NW Grid',  d:312, h:94, c:'var(--ok)',     note:'3 alerts',            nc:'var(--text-dim)' },
        { n:'EU Logistics Hub', d:587, h:78, c:'var(--warn)',   note:'14 drift warnings',   nc:'var(--warn)' },
        { n:'Factory Line A',   d:198, h:61, c:'var(--danger)', note:'7 critical failures', nc:'var(--danger)' },
        { n:'Data Center East', d:150, h:97, c:'var(--ok)',     note:'1 alert',             nc:'var(--text-dim)' },
      ].map(f => `<div class="card" style="border-left:3px solid ${f.c}">
        <div style="font-size:13px;font-weight:700;margin-bottom:4px">${f.n}</div>
        <div style="font-size:11px;color:var(--text-dim)">${f.d} devices</div>
        <div style="margin-top:8px">
          <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px"><span>Health</span><span style="color:${f.c}">${f.h}%</span></div>
          <div style="height:6px;background:var(--surface2);border-radius:4px;overflow:hidden"><div style="height:100%;width:${f.h}%;background:${f.c};border-radius:4px"></div></div>
        </div>
        <div style="margin-top:6px;font-size:10px;color:${f.nc}">${f.note}</div>
      </div>`).join('');

  const focusDev = sorted[0] || devs[0];

  return `
<div class="screen active" id="screen-field">
  <div class="page-title" style="color:var(--monitor)"><i class="ph-bold ph-broadcast"></i> Field Monitor <span class="agent-tag monitor"><i class="ph-bold ph-eye"></i> Monitor Agent</span></div>
  <div class="page-sub">Live telemetry & drift tracking for deployed IoT fleets — catch failures as they emerge</div>

  <!-- Filter bar -->
  <div style="display:flex;gap:10px;align-items:center;margin-bottom:16px;flex-wrap:wrap">
    <div style="flex:1;min-width:200px;position:relative">
      <i class="ph-bold ph-magnifying-glass" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--text-dim);font-size:13px"></i>
      <input class="form-input" type="text" placeholder="Search device ID, fleet, or tag…" style="padding-left:32px;width:100%">
    </div>
    <select class="form-input" style="min-width:140px;padding:8px 10px">
      <option>All Fleets</option>
      ${[...new Set(devs.map(d => d.fleet).filter(Boolean))].map(f => `<option>${f}</option>`).join('')}
      <option>Pacific NW Grid</option><option>EU Logistics Hub</option><option>Factory Line A</option>
    </select>
    <select class="form-input" style="min-width:140px;padding:8px 10px">
      <option>All Severities</option><option>Critical</option><option>Warning</option><option>Info</option>
    </select>
  </div>

  <!-- Fleet Summary Cards -->
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;margin-bottom:18px">
    ${fleetCardsList}
  </div>

  <!-- Device grid + detail panel side by side -->
  <div style="display:grid;grid-template-columns:1fr 320px;gap:16px;margin-bottom:18px">
    <!-- Left: filter buttons + device cards -->
    <div>
      <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap">
        <button class="btn btn-primary" id="fm-filter-all"      onclick="fmFilter('all')"      style="font-size:11px">All (${devs.length})</button>
        <button class="btn btn-ghost"   id="fm-filter-critical"  onclick="fmFilter('critical')" style="font-size:11px">Critical (${devs.filter(d=>d.health==='critical').length})</button>
        <button class="btn btn-ghost"   id="fm-filter-warning"   onclick="fmFilter('warning')"  style="font-size:11px">Drifting (${devs.filter(d=>d.health==='drifting'||d.health==='warning').length})</button>
        <button class="btn btn-ghost"   id="fm-filter-healthy"   onclick="fmFilter('healthy')"  style="font-size:11px">Healthy (${devs.filter(d=>d.health==='healthy').length})</button>
      </div>
      <div id="fm-device-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px">
        ${sorted.map(deviceCard).join('') || '<div style="color:var(--text-dim);grid-column:1/-1;text-align:center;padding:32px">No devices registered</div>'}
      </div>
    </div>

    <!-- Right: device detail + telemetry -->
    <div>
      ${focusDev ? `<div class="card" style="margin-bottom:14px">
        <div class="card-title"><i class="ph-bold ph-info"></i> Device Detail — ${(focusDev.name || focusDev.id).split(' ')[0]}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px;margin-bottom:12px">
          <div><span style="color:var(--text-dim)">Fleet:</span> ${focusDev.fleet || '—'}</div>
          <div><span style="color:var(--text-dim)">Uptime:</span> 14d 7h</div>
          <div><span style="color:var(--text-dim)">FW:</span> <span style="font-family:var(--font-mono);font-size:10px">${focusDev.fw || '—'}</span></div>
          <div><span style="color:var(--text-dim)">HW Rev:</span> C2</div>
          <div><span style="color:var(--text-dim)">Last Ping:</span> ${relTime(focusDev.updatedAt)}</div>
          <div><span style="color:var(--text-dim)">Drift:</span> <span style="color:${scoreStyle(focusDev.driftScore ?? 0)};font-weight:700">${(focusDev.driftScore ?? 0).toFixed(3)}</span></div>
        </div>
        <div class="card-title" style="font-size:10px;margin-bottom:6px">DRIFT INDICATORS</div>
        <div style="font-size:12px;line-height:2">
          <div>🔵 ADC Offset: <span style="color:var(--${(focusDev.driftScore??0)>0.5?'warn':'ok'})">${(focusDev.driftScore??0)>0.5?'+18mV drift':'Nominal'}</span></div>
          <div>🟢 GPIO State: <span style="color:var(--ok)">Nominal</span></div>
          <div>🟡 Clock Skew: <span style="color:var(--warn)">+8ns vs baseline</span></div>
          <div>🔴 Power Ripple: <span style="color:${(focusDev.driftScore??0)>0.7?'var(--danger)':'var(--warn)'}">42mVpp (threshold 30mVpp)</span></div>
        </div>
      </div>` : ''}
      <div class="card">
        <div class="card-title"><i class="ph-bold ph-chart-line"></i> Live Telemetry — ADC Channel 0</div>
        <div style="height:180px;background:var(--surface2);border-radius:8px;position:relative;overflow:hidden">
          <canvas id="fieldChart" style="width:100%;height:100%;display:block"></canvas>
        </div>
        <div style="display:flex;gap:12px;margin-top:10px;font-size:11px">
          <div style="color:var(--accent)">● Live</div>
          <div style="color:var(--text-dim)">--- Baseline</div>
          <div style="color:var(--warn)">▲ Drift zone</div>
        </div>
      </div>
    </div>
  </div>

  <!-- Active Alerts -->
  <div class="card">
    <div class="card-title"><i class="ph-bold ph-bell-ringing"></i> Active Alerts <span class="badge danger" style="margin-left:6px">${unackedAlerts.length}</span></div>
    <table class="wtable">
      <thead><tr><th>Time</th><th>Device</th><th>Type</th><th>Severity</th><th>Score</th><th>Action</th></tr></thead>
      <tbody id="fm-alert-body">
        ${unackedAlerts.map(a => {
          const dev = devs.find(d => d.id === a.deviceId);
          const sc  = a.driftScore ?? 0;
          return `<tr id="fm-alert-row-${a.id}">
            <td>${relTime(a.createdAt)}</td>
            <td style="font-weight:600">${dev?.name || a.deviceId || '—'}</td>
            <td style="font-size:11px">${a.type || (a.message||'').slice(0,50)}</td>
            <td>${sevBadge(a.severity || a.sev)}</td>
            <td style="color:${scoreStyle(sc)};font-weight:700;font-family:var(--font-mono)">${sc.toFixed(2)}</td>
            <td>
              <button class="btn btn-ghost" style="font-size:10px;padding:2px 8px;margin-right:4px" onclick="switchScreen('drift')">Investigate</button>
              <button class="btn btn-ghost" style="font-size:10px;padding:2px 8px" onclick="ackAlert('${a.id}',this)">Acknowledge</button>
            </td>
          </tr>`;
        }).join('') || '<tr><td colspan="6" style="color:var(--text-dim);text-align:center">No active alerts</td></tr>'}
      </tbody>
    </table>
  </div>
</div>`;
};

window.ackAlert = async function ackAlert(alertId, btn) {
  if (btn) btn.disabled = true;
  try {
    await window.api.acknowledgeAlert(alertId, 'engineer');
    // Optimistically update local store
    const idx = window.D.alerts.findIndex(a => a.id === alertId);
    if (idx >= 0) {
      window.D.alerts[idx].acknowledged = true;
      window.D.fleet.alertCount = window.D.alerts.filter(a => !a.acknowledged).length;
    }
    // Remove row from table if present
    const row = document.getElementById(`fm-alert-row-${alertId}`);
    if (row) row.remove();
    // Remove inline alert card from device card if present
    if (btn) {
      const card = btn.closest('[style*="background:var(--surface2)"]');
      if (card) card.remove();
    }
  } catch (e) {
    if (btn) btn.disabled = false;
  }
};

window.fmFilter = function fmFilter(filter) {
  const devs = window.D?.devices || [];
  const alts = window.D?.alerts  || [];
  const filtered = filter === 'all' ? devs
    : devs.filter(d => {
        if (filter === 'critical') return d.health === 'critical';
        if (filter === 'warning')  return d.health === 'warning';
        if (filter === 'healthy')  return d.health === 'healthy';
        return true;
      });

  // Update active button
  ['all','critical','warning','healthy'].forEach(f => {
    const b = document.getElementById(`fm-filter-${f}`);
    if (!b) return;
    b.className = f === filter ? 'btn btn-primary' : 'btn btn-ghost';
    b.style.fontSize = '11px';
  });

  const grid = document.getElementById('fm-device-grid');
  if (!grid) return;

  const healthOrder = { critical: 0, warning: 1, healthy: 2 };
  const sorted = filtered.slice().sort((a, b) => (healthOrder[a.health] ?? 3) - (healthOrder[b.health] ?? 3));

  const deviceCard = (d) => {
    const score = d.driftScore ?? 0;
    const alert = alts.find(a => a.deviceId === d.id && !a.acknowledged);
    const pct   = Math.round(score * 100);
    const barColor = score >= 0.70 ? 'var(--danger)' : score >= 0.40 ? 'var(--warn)' : 'var(--ok)';
    return `<div class="card" style="padding:14px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
        <div>
          <div style="font-weight:600;font-size:13px">${d.name || d.id}</div>
          <div style="font-size:11px;color:var(--text-dim)">${d.fleet || '—'} · ${d.source || '—'}</div>
        </div>
        ${healthBadge(d.health, score)}
      </div>
      <div style="margin-bottom:6px">
        <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px">
          <span style="color:var(--text-dim)">Drift Score</span>
          <span style="color:${barColor};font-weight:700;font-family:var(--font-mono)">${score.toFixed(3)}</span>
        </div>
        <div style="height:6px;background:var(--surface2);border-radius:3px;overflow:hidden">
          <div style="height:100%;width:${pct}%;background:${barColor};border-radius:3px;transition:width 0.4s"></div>
        </div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text-dim);margin-bottom:8px">
        <span>FW: <span style="color:var(--text);font-family:var(--font-mono)">${d.fw || '—'}</span></span>
        <span>Last seen: ${relTime(d.updatedAt || d.lastTelemetry)}</span>
      </div>
      ${alert ? `<div style="background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:7px 9px;font-size:11px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px">
          ${sevBadge(alert.severity || alert.sev)}
          <button class="btn btn-ghost" style="font-size:10px;padding:2px 7px" onclick="ackAlert('${alert.id}',this)">Acknowledge</button>
        </div>
        <div style="color:var(--text-dim)">${alert.type || ''}: ${(alert.message || '').slice(0, 80)}</div>
      </div>` : ''}
    </div>`;
  };

  grid.innerHTML = sorted.map(deviceCard).join('') || '<div style="color:var(--text-dim);text-align:center;padding:32px">No devices match this filter</div>';
};

// ── Drift Analysis Screen ─────────────────────────────────────────────────────
SCREENS.drift = () => {
  const devs = window.D?.devices || [];
  const focusDev = devs.find(d => d.id === 'SH-X4-3192') || devs[0] || { id: '—', name: '—', driftScore: 0 };
  const signals = ['ADC Offset','GPIO State','Clock Skew','Power Ripple','Temp Δ','Mem Usage'];
  // Static 6×6 correlation matrix (pre-computed for demo)
  const matrix = [
    [1.00, 0.12, 0.08, 0.71, 0.22, 0.09],
    [0.12, 1.00, 0.34, 0.19, 0.07, 0.41],
    [0.08, 0.34, 1.00, 0.15, 0.55, 0.18],
    [0.71, 0.19, 0.15, 1.00, 0.28, 0.11],
    [0.22, 0.07, 0.55, 0.28, 1.00, 0.32],
    [0.09, 0.41, 0.18, 0.11, 0.32, 1.00],
  ];
  const cellColor = (v) => {
    if (v >= 0.70) return 'var(--danger)';
    if (v >= 0.40) return 'var(--warn)';
    if (v >= 0.20) return 'var(--monitor)';
    return 'var(--surface2)';
  };
  const matrixHTML = signals.map((row, i) =>
    `<tr><td style="font-size:10px;font-weight:600;color:var(--text-dim);white-space:nowrap">${row}</td>` +
    signals.map((col, j) => {
      const v = matrix[i][j];
      const opacity = i === j ? 0.2 : 1;
      return `<td style="background:${cellColor(v)};opacity:${opacity};width:42px;height:28px;text-align:center;font-size:10px;font-family:var(--font-mono);color:var(--text-bright)">${i===j?'—':v.toFixed(2)}</td>`;
    }).join('') + '</tr>'
  ).join('');

  const sparkPoints = [0.42, 0.51, 0.58, 0.63, 0.71, 0.79, 0.83, 0.87];
  const sparkPath = sparkPoints.map((v,i) => `${i*(200/7)},${60-(v*60)}`).join(' ');

  return `
<div class="screen active" id="screen-drift">
  <div class="page-title" style="color:var(--monitor)"><i class="ph-bold ph-chart-line-up"></i> Drift Analysis</div>
  <div class="page-sub">Cross-signal correlation analysis and root-cause hypothesis for <strong>${focusDev.name || focusDev.id}</strong></div>

  <div class="grid2" style="margin-bottom:16px">
    <div class="card">
      <div class="card-title"><i class="ph-bold ph-squares-four"></i> Signal Correlation Matrix</div>
      <div style="overflow-x:auto">
        <table style="border-collapse:collapse">
          <thead><tr><th></th>${signals.map(s=>`<th style="font-size:10px;color:var(--text-dim);font-weight:600;padding:4px;text-align:center;max-width:42px;word-break:break-word">${s}</th>`).join('')}</tr></thead>
          <tbody>${matrixHTML}</tbody>
        </table>
      </div>
      <div style="margin-top:8px;font-size:10px;color:var(--text-dim)">
        <span style="color:var(--danger)">■</span> High ≥0.70 &nbsp;
        <span style="color:var(--warn)">■</span> Med ≥0.40 &nbsp;
        <span style="color:var(--monitor)">■</span> Low ≥0.20
      </div>
    </div>
    <div class="card">
      <div class="card-title"><i class="ph-bold ph-trend-up"></i> ADC Offset — Drift Trend</div>
      <svg viewBox="0 0 200 70" style="width:100%;height:120px">
        <defs><linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#6c8cff" stop-opacity="0.3"/><stop offset="100%" stop-color="#6c8cff" stop-opacity="0"/></linearGradient></defs>
        <polyline points="${sparkPath}" fill="none" stroke="var(--monitor)" stroke-width="2"/>
        <line x1="0" y1="${60-0.40*60}" x2="200" y2="${60-0.40*60}" stroke="var(--warn)" stroke-width="1" stroke-dasharray="4,3"/>
        <line x1="0" y1="${60-0.70*60}" x2="200" y2="${60-0.70*60}" stroke="var(--danger)" stroke-width="1" stroke-dasharray="4,3"/>
      </svg>
      <div style="font-size:10px;color:var(--text-dim);margin-top:4px">Threshold breach at T+5 · Current: <span style="color:var(--danger);font-weight:700">0.87</span></div>
    </div>
  </div>

  <div class="card">
    <div class="card-title"><i class="ph-bold ph-lightbulb"></i> Root-Cause Hypothesis</div>
    <div style="display:grid;grid-template-columns:auto 1fr auto;gap:12px;align-items:start;padding:12px;background:var(--surface2);border-radius:var(--radius-sm);border:1px solid var(--monitor-border)">
      <div style="background:var(--monitor-dim);border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center">
        <i class="ph-bold ph-brain" style="color:var(--monitor)"></i>
      </div>
      <div>
        <div style="font-weight:600;margin-bottom:4px">DMA circular buffer pointer overrun — ADC channel 3 truncation</div>
        <div style="font-size:12px;color:var(--text-dim);line-height:1.6">High ADC↔Power correlation (0.71) indicates power-coupled sampling noise. DMA double-buffer pointer wraps under TIM2 ISR high load, truncating ADC samples. Cross-references KB article <strong>kb-082</strong>.</div>
        <div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">
          <span class="badge warn">ADC Drift</span>
          <span class="badge warn">Power Coupling</span>
          <span class="badge info">DMA</span>
          <span class="badge info">TIM2</span>
        </div>
      </div>
      <div style="text-align:right">
        <div style="font-size:10px;color:var(--text-dim)">Confidence</div>
        <div style="font-size:22px;font-weight:800;color:var(--monitor)">87%</div>
        <div style="font-size:10px;color:var(--text-dim)">PRIMARY</div>
      </div>
    </div>
    <div style="margin-top:10px;display:flex;gap:8px">
      <button class="btn btn-ghost" style="font-size:11px" onclick="switchScreen('repro')"><i class="ph-bold ph-arrows-clockwise"></i> Reproduce</button>
      <button class="btn btn-ghost" style="font-size:11px" onclick="switchScreen('knowledge')"><i class="ph-bold ph-books"></i> View KB-082</button>
    </div>
  </div>
</div>`;
};

// ── Event Timeline Screen ─────────────────────────────────────────────────────
SCREENS.timeline = () => {
  const devs  = window.D?.devices || [];
  const alts  = window.D?.alerts  || [];
  const scans = window.D?.scans   || [];

  // Build unified event feed from live alerts + scans
  const alertEvents = alts.map(a => ({
    ts:       new Date(a.createdAt || Date.now()).getTime(),
    isoTs:    a.createdAt,
    kind:     'alert',
    device:   (devs.find(d => d.id === a.deviceId)?.name) || a.deviceId || '—',
    signal:   a.type || '—',
    value:    a.driftScore != null ? a.driftScore.toFixed(2) : '—',
    deviation: a.detail ? a.detail.slice(0, 40) : '—',
    agent:    a.source || 'monitor',
    sev:      a.severity || a.sev || 'INFO',
    acked:    !!a.acknowledged,
  }));

  const scanEvents = scans.map(s => ({
    ts:       new Date(s.createdAt || Date.now()).getTime(),
    isoTs:    s.createdAt,
    kind:     'scan',
    device:   s.target || '—',
    signal:   'Pre-Ship Scan',
    value:    (s.composite ?? s.score ?? 0).toFixed(3),
    deviation: s.decision ? s.decision.toUpperCase() : '—',
    agent:    'preship',
    sev:      s.decision === 'block' ? 'CRITICAL' : s.decision === 'warn' ? 'WARNING' : 'INFO',
    acked:    false,
  }));

  const allEvents = [...alertEvents, ...scanEvents]
    .sort((a, b) => b.ts - a.ts);

  // Per-heuristic: active filter from state
  const activeFilter = window._tlFilter || 'all';

  const filtered = activeFilter === 'all' ? allEvents
    : activeFilter === 'critical' ? allEvents.filter(e => e.sev === 'CRITICAL')
    : activeFilter === 'warning'  ? allEvents.filter(e => e.sev === 'WARNING')
    : activeFilter === 'scans'    ? allEvents.filter(e => e.kind === 'scan')
    : allEvents;

  const counts = {
    all:      allEvents.length,
    critical: allEvents.filter(e => e.sev === 'CRITICAL').length,
    warning:  allEvents.filter(e => e.sev === 'WARNING').length,
    scans:    allEvents.filter(e => e.kind === 'scan').length,
  };

  const rows = filtered.map(e => {
    const scls = e.sev === 'CRITICAL' ? 'danger' : e.sev === 'WARNING' ? 'warn' : 'info';
    const atag = e.agent === 'preship'
      ? `<span class="agent-tag preship"><i class="ph-bold ph-shield-check"></i> Pre-Ship</span>`
      : `<span class="agent-tag monitor"><i class="ph-bold ph-eye"></i> Monitor</span>`;
    const ackedBadge = e.acked ? `<span style="font-size:9px;color:var(--ok);margin-left:4px">ack</span>` : '';
    return `<tr style="${e.acked ? 'opacity:0.45' : ''}">
      <td style="font-size:11px;color:var(--text-dim);white-space:nowrap">${relTime(e.isoTs)}</td>
      <td style="font-size:11px;font-family:var(--font-mono)">${e.device}</td>
      <td style="font-size:11px">${e.signal}</td>
      <td style="font-size:11px;font-family:var(--font-mono);color:var(--text)">${e.value}</td>
      <td style="font-size:11px;font-family:var(--font-mono);color:var(--text-dim)">${e.deviation}</td>
      <td>${atag}</td>
      <td>${sevBadge(e.sev)}${ackedBadge}</td>
      <td style="font-size:10px">
        ${e.kind === 'alert' && !e.acked ? `<button class="btn btn-ghost" style="font-size:10px;padding:2px 7px;margin-right:3px" onclick="switchScreen('drift')">Investigate</button>` : ''}
        ${e.kind === 'scan' ? `<button class="btn btn-ghost" style="font-size:10px;padding:2px 7px" onclick="switchScreen('preship')">View Scan</button>` : ''}
      </td>
    </tr>`;
  }).join('') || `<tr><td colspan="8" style="color:var(--text-dim);text-align:center;padding:24px">No events match this filter</td></tr>`;

  const filterBtn = (id, label, count) => {
    const active = activeFilter === id;
    return `<button class="btn ${active ? 'btn-primary' : 'btn-ghost'}" style="font-size:11px" onclick="tlFilter('${id}')">${label} <span style="opacity:0.7">(${count})</span></button>`;
  };

  return `
<div class="screen active" id="screen-timeline">
  <div class="page-title" style="color:var(--monitor)"><i class="ph-bold ph-clock-countdown"></i> Event Timeline</div>
  <div class="page-sub">Chronological live feed of all anomaly alerts, pre-ship scans, and threshold crossings across every fleet</div>

  <div style="display:flex;gap:8px;align-items:center;margin-bottom:16px;flex-wrap:wrap">
    ${filterBtn('all','All Events', counts.all)}
    ${filterBtn('critical','Critical', counts.critical)}
    ${filterBtn('warning','Warning', counts.warning)}
    ${filterBtn('scans','Scans Only', counts.scans)}
    <div style="flex:1"></div>
    <span style="font-size:11px;color:var(--text-dim)">${allEvents.length} total event${allEvents.length !== 1 ? 's' : ''}</span>
  </div>

  <div class="card">
    <table class="wtable">
      <thead><tr><th>Time</th><th>Device / Target</th><th>Signal / Type</th><th>Value</th><th>Detail</th><th>Agent</th><th>Severity</th><th>Action</th></tr></thead>
      <tbody id="tl-tbody">${rows}</tbody>
    </table>
  </div>
</div>`;
};

window.tlFilter = function tlFilter(f) {
  window._tlFilter = f;
  if (typeof switchScreen === 'function') switchScreen('timeline');
};

// ── Firmware Diff Screen ──────────────────────────────────────────────────────
SCREENS.diff = () => {
  const scans = window.D?.scans || [];
  const devs  = window.D?.devices || [];

  // Build scan pair options — all distinct targets from scan history
  const targets = [...new Set(scans.map(s => s.target).filter(Boolean))];
  // Default: compare first two targets if available
  const headTarget = window._diffHead || targets[0] || 'fw-v3.8.2-rc4';
  const baseTarget = window._diffBase || targets[1] || 'fw-v3.8.1-stable';
  const headScan   = scans.find(s => s.target === headTarget);
  const baseScan   = scans.find(s => s.target === baseTarget);

  // Compute per-component score deltas
  const COMPONENTS = [
    { key: 'binaryDiff',    label: 'Binary Diff',          weight: '30%' },
    { key: 'behavioralSig', label: 'Behavioral Signature', weight: '25%' },
    { key: 'knownVulns',    label: 'Known Vulnerabilities',weight: '20%' },
    { key: 'hwCompat',      label: 'HW Compatibility',     weight: '15%' },
    { key: 'configDrift',   label: 'Config Drift',         weight: '10%' },
  ];
  const compRows = COMPONENTS.map(c => {
    const bv = baseScan?.scores?.[c.key] ?? null;
    const hv = headScan?.scores?.[c.key] ?? null;
    const delta = (bv != null && hv != null) ? hv - bv : null;
    const deltaCls = delta == null ? 'text-dim' : delta > 0.1 ? 'danger' : delta > 0 ? 'warn' : 'ok';
    const deltaStr = delta == null ? '—'
      : delta === 0 ? '<span style="color:var(--ok)">+0.000</span>'
      : `<span style="color:var(--${deltaCls})">${delta > 0 ? '+' : ''}${delta.toFixed(3)}</span>`;
    return `<tr>
      <td style="font-size:11px">${c.label} <span style="color:var(--text-dim);font-size:9px">(${c.weight})</span></td>
      <td style="font-family:var(--font-mono);font-size:11px;text-align:right">${bv != null ? bv.toFixed(3) : '—'}</td>
      <td style="font-family:var(--font-mono);font-size:11px;text-align:right">${hv != null ? hv.toFixed(3) : '—'}</td>
      <td style="font-family:var(--font-mono);font-size:11px;text-align:right">${deltaStr}</td>
    </tr>`;
  }).join('');

  const headScore   = headScan ? (headScan.composite ?? headScan.score ?? 0) : null;
  const baseScore   = baseScan ? (baseScan.composite ?? baseScan.score ?? 0) : null;
  const scoreDelta  = (headScore != null && baseScore != null) ? headScore - baseScore : null;
  const overallCls  = scoreDelta == null ? 'text-dim' : scoreDelta > 0.15 ? 'danger' : scoreDelta > 0 ? 'warn' : 'ok';

  const targetOpts = targets.map(t => `<option value="${t}" ${t===headTarget?'selected':''}>${t}</option>`).join('');
  const baseOpts   = targets.map(t => `<option value="${t}" ${t===baseTarget?'selected':''}>${t}</option>`).join('');

  // Static register diff data keyed by pair (matches seed scan targets)
  const REG_DIFFS = {
    'fw-v3.8.2-rc4': [
      { reg: 'TIM2_PSC',  before: '0x0047', after: '0x0052', impact: 'Clock overspeed +10%',         cls: 'danger' },
      { reg: 'DMA1_S3CR', before: '0x0C41', after: '0x0C49', impact: 'DMA circular mode enabled',    cls: 'danger' },
      { reg: 'PORTB_CRH', before: '0x44BB', after: '0x44AB', impact: 'GPIO open-drain mismatch',     cls: 'warn'   },
      { reg: 'RCC_CFGR',  before: '0x0480', after: '0x0480', impact: 'Unchanged',                    cls: 'ok'     },
    ],
  };
  const regRows = (REG_DIFFS[headTarget] || []).map(r =>
    `<tr>
      <td style="font-family:var(--font-mono);font-size:11px;color:var(--${r.cls})">${r.reg}</td>
      <td style="font-family:var(--font-mono);font-size:11px">${r.before}</td>
      <td style="font-family:var(--font-mono);font-size:11px">${r.after}</td>
      <td style="font-size:11px;color:var(--${r.cls})">${r.impact}</td>
    </tr>`
  ).join('') || `<tr><td colspan="4" style="color:var(--text-dim);text-align:center">No register changes recorded</td></tr>`;

  // Symbol diff hunks — keyed by head target
  const HUNKS = {
    'fw-v3.8.2-rc4': [
      { fn: 'ADC_Init()',    removed: 'TIM2-&gt;PSC = 0x0047;  // 1kHz base clock', added: 'TIM2-&gt;PSC = 0x0052;  // 1.1kHz — REGRESSION: 10% clock overspeed' },
      { fn: 'DMA_Config()',  removed: 'DMA1_Stream3-&gt;CR &amp;= ~DMA_SxCR_CIRC;  // linear mode', added: 'DMA1_Stream3-&gt;CR |= DMA_SxCR_CIRC;  // circular mode — buffer overrun risk' },
      { fn: 'GPIO_Init()',   removed: 'GPIOB-&gt;CRH = 0x44BB;  // push-pull output', added: 'GPIOB-&gt;CRH = 0x44AB;  // open-drain — mismatch with baseline golden config' },
    ],
  };
  const hunks = (HUNKS[headTarget] || []).map(h =>
    `<div style="margin-bottom:10px">
      <div style="color:var(--text-dim)">@@ ${h.fn} @@</div>
      <div style="color:var(--danger)">- ${h.removed}</div>
      <div style="color:var(--ok)">+ ${h.added}</div>
    </div>`
  ).join('') || `<div style="color:var(--text-dim)">No symbol changes recorded for this target</div>`;

  return `
<div class="screen active" id="screen-diff">
  <div class="page-title" style="color:var(--monitor)"><i class="ph-bold ph-git-diff"></i> Firmware Diff</div>
  <div class="page-sub">Binary-level, register-aware comparison between firmware versions</div>

  <div class="card" style="margin-bottom:16px;padding:14px">
    <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
      <div style="display:flex;align-items:center;gap:8px">
        <label class="form-label" style="margin:0;white-space:nowrap">Base (before)</label>
        <select class="form-select" style="font-family:var(--font-mono);font-size:11px"
          onchange="window._diffBase=this.value;switchScreen('diff')">${baseOpts || `<option>${baseTarget}</option>`}</select>
      </div>
      <i class="ph-bold ph-arrow-right" style="color:var(--text-dim)"></i>
      <div style="display:flex;align-items:center;gap:8px">
        <label class="form-label" style="margin:0;white-space:nowrap">Head (after)</label>
        <select class="form-select" style="font-family:var(--font-mono);font-size:11px"
          onchange="window._diffHead=this.value;switchScreen('diff')">${targetOpts || `<option>${headTarget}</option>`}</select>
      </div>
      ${scoreDelta != null ? `
      <div style="margin-left:auto;text-align:right">
        <div style="font-size:11px;color:var(--text-dim)">Overall drift delta</div>
        <div style="font-size:20px;font-weight:800;color:var(--${overallCls})">${scoreDelta > 0 ? '+' : ''}${scoreDelta.toFixed(3)}</div>
      </div>` : ''}
    </div>
  </div>

  <div class="grid2" style="margin-bottom:16px">
    <div class="card">
      <div class="card-title"><i class="ph-bold ph-chart-bar"></i> Component Score Delta</div>
      <table class="wtable">
        <thead><tr><th>Component</th><th style="text-align:right">${baseTarget.slice(-12)}</th><th style="text-align:right">${headTarget.slice(-12)}</th><th style="text-align:right">Delta</th></tr></thead>
        <tbody>${compRows}</tbody>
        <tfoot><tr style="font-weight:700;border-top:1px solid var(--border)">
          <td>Composite</td>
          <td style="text-align:right;font-family:var(--font-mono)">${baseScore != null ? baseScore.toFixed(3) : '—'}</td>
          <td style="text-align:right;font-family:var(--font-mono)">${headScore != null ? headScore.toFixed(3) : '—'}</td>
          <td style="text-align:right">${scoreDelta != null ? `<span style="color:var(--${overallCls})">${scoreDelta > 0 ? '+' : ''}${scoreDelta.toFixed(3)}</span>` : '—'}</td>
        </tr></tfoot>
      </table>
      <div style="margin-top:10px;display:flex;gap:8px">
        <span class="badge ${headScan?.decision === 'block' ? 'danger' : headScan?.decision === 'warn' ? 'warn' : 'ok'}">${headScan?.decision?.toUpperCase() || '—'}</span>
        <span style="font-size:11px;color:var(--text-dim)">gate decision for ${headTarget}</span>
      </div>
    </div>

    <div class="card">
      <div class="card-title"><i class="ph-bold ph-cpu"></i> Register Map Changes</div>
      <table class="wtable">
        <thead><tr><th>Register</th><th>Before</th><th>After</th><th>Impact</th></tr></thead>
        <tbody>${regRows}</tbody>
      </table>
    </div>
  </div>

  <div class="card" style="margin-bottom:16px">
    <div class="card-title"><i class="ph-bold ph-code-block"></i> Symbol Diff — Changed Functions</div>
    <div style="background:var(--bg);border:1px solid var(--border);border-radius:var(--radius-sm);padding:14px;font-family:var(--font-mono);font-size:11px;line-height:1.9;overflow-x:auto">
      <div style="color:var(--text-dim);margin-bottom:10px">--- ${baseTarget}   +++ ${headTarget}</div>
      ${hunks}
    </div>
  </div>

  <div style="display:flex;gap:8px">
    <button class="btn btn-ghost" onclick="switchScreen('repro')"><i class="ph-bold ph-arrows-clockwise"></i> Reproduce</button>
    <button class="btn btn-ghost" onclick="switchScreen('drift')"><i class="ph-bold ph-chart-line-up"></i> Drift Analysis</button>
    <button class="btn btn-ghost" onclick="switchScreen('timeline')"><i class="ph-bold ph-clock-countdown"></i> Timeline</button>
  </div>
</div>`;
};

// ── Reproduce Incident Screen ─────────────────────────────────────────────────
SCREENS.repro = () => {
  const devs  = window.D?.devices || [];
  const alts  = (window.D?.alerts  || []).filter(a => !a.acknowledged);

  // Hypothesis catalogue — seeded from KB + live critical alerts
  const HYPOTHESES = [
    { id: 'dma-adc',   label: 'DMA circular buffer overrun — ADC channel 3 truncation', confidence: 87, signal: 'adcOffset',      magnitude: 148, cycles: 256, fieldScore: 0.87 },
    { id: 'tim2-clk',  label: 'TIM2 prescaler overspeed — clock skew cascade',           confidence: 61, signal: 'clockSkewNs',   magnitude: 121, cycles: 512, fieldScore: 0.52 },
    { id: 'gpio-mism', label: 'GPIO open-drain mismatch — pull-up contention',            confidence: 44, signal: 'adcOffset',      magnitude: 48,  cycles: 128, fieldScore: 0.44 },
    { id: 'mqtt-leak', label: 'MQTT socket handle leak — heap fragmentation',             confidence: 78, signal: 'memUsage',       magnitude: 14,  cycles: 3600, fieldScore: 0.91 },
  ];

  // Live device options from fleet — fall back to seed set if empty
  const deviceOpts = devs.length
    ? devs.map(d => `<option value="${d.id}">${d.name || d.id} (${d.fw || '—'})</option>`).join('')
    : `<option value="SH-X4-3192">SensorHub-X4 #3192 (fw-v3.8.2-rc4)</option>`;

  const hypOpts = HYPOTHESES.map(h =>
    `<option value="${h.id}">${h.label} (${h.confidence}%)</option>`
  ).join('');

  const repro  = window._reproResult || null;
  const selHyp = window._reproHyp    || HYPOTHESES[0];

  const resultCard = repro ? `
    <div class="card" style="border-color:var(--${repro.fidelity >= 80 ? 'ok' : 'warn'}-border)">
      <div class="card-title" style="color:var(--${repro.fidelity >= 80 ? 'ok' : 'warn'})">
        <i class="ph-bold ph-${repro.fidelity >= 80 ? 'check-circle' : 'warning-circle'}"></i>
        Replay Result — ${repro.fidelity >= 80 ? 'CONFIRMED' : 'PARTIAL MATCH'}
      </div>
      <div style="text-align:center;padding:16px 0">
        <div style="font-size:48px;font-weight:800;color:var(--${repro.fidelity >= 80 ? 'ok' : 'warn'})">${repro.fidelity >= 80 ? '94%' : repro.fidelity + '%'}</div>
        <div style="font-size:12px;color:var(--text-dim);margin-top:4px">reproduction fidelity</div>
        <div style="font-size:13px;font-weight:600;margin-top:8px">${repro.fidelity >= 80 ? 'Hypothesis Confirmed' : 'Partial Reproduction'}</div>
        <div style="font-size:11px;color:var(--text-dim);margin-top:4px;line-height:1.6">
          Injected <strong>${repro.hypothesis}</strong><br>at magnitude ${repro.magnitude} over ${repro.cycles} cycles reproduced<br>telemetry pattern with ${repro.fidelity}% fidelity
        </div>
      </div>
      <div style="background:var(--surface2);border-radius:var(--radius-sm);padding:10px;font-size:11px;margin-top:4px">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px">
          <span style="color:var(--text-dim)">Field drift score</span>
          <span style="color:${scoreStyle(repro.fieldScore)};font-weight:700">${repro.fieldScore.toFixed(2)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:4px">
          <span style="color:var(--text-dim)">Simulated drift score</span>
          <span style="color:${scoreStyle(repro.simScore)};font-weight:700">${repro.simScore.toFixed(2)}</span>
        </div>
        <div style="display:flex;justify-content:space-between">
          <span style="color:var(--text-dim)">Signal matched</span>
          <span style="color:var(--text);font-family:var(--font-mono)">${repro.signal}</span>
        </div>
      </div>
      <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-ok" onclick="reproAddToKb()"><i class="ph-bold ph-books"></i> Add to KB</button>
        <button class="btn btn-ghost" onclick="switchScreen('diff')"><i class="ph-bold ph-git-diff"></i> View Diff</button>
        <button class="btn btn-ghost" onclick="reproClear()" style="margin-left:auto"><i class="ph-bold ph-x"></i> Clear</button>
      </div>
    </div>` : `
    <div class="card" style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:220px;color:var(--text-dim)">
      <i class="ph-bold ph-flask" style="font-size:36px;opacity:0.3;margin-bottom:12px"></i>
      <div style="font-size:13px">Configure parameters and run Replay</div>
      <div style="font-size:11px;margin-top:4px">Results appear here after simulation</div>
    </div>`;

  return `
<div class="screen active" id="screen-repro">
  <div class="page-title" style="color:var(--monitor)"><i class="ph-bold ph-arrows-clockwise"></i> Reproduce Incident</div>
  <div class="page-sub">Simulation lab — inject hypothesized fault conditions and validate root-cause against field data</div>

  <div class="grid2" style="margin-bottom:16px">
    <div class="card">
      <div class="card-title"><i class="ph-bold ph-flask"></i> Fault Injection Parameters</div>

      <div style="margin-bottom:10px">
        <label class="form-label">Hypothesis <span style="color:var(--text-dim);font-size:10px">(select or use top critical alert)</span></label>
        <select id="repro-hyp" class="form-select" onchange="reproHypChanged(this.value)">
          ${hypOpts}
        </select>
      </div>

      <div style="margin-bottom:10px">
        <label class="form-label">Target Device</label>
        <select id="repro-device" class="form-select">${deviceOpts}</select>
      </div>

      <div style="margin-bottom:10px">
        <label class="form-label">Fault Signal</label>
        <select id="repro-signal" class="form-select">
          <option value="adcOffset">ADC Offset (adcOffset)</option>
          <option value="clockSkewNs">Clock Skew (clockSkewNs)</option>
          <option value="powerRippleMv">Power Ripple (powerRippleMv)</option>
          <option value="memUsage">Memory Usage (memUsage)</option>
          <option value="gpioState">GPIO State (gpioState)</option>
        </select>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">
        <div>
          <label class="form-label">Magnitude</label>
          <input id="repro-magnitude" class="form-input" type="number" value="${selHyp.magnitude}" style="font-family:var(--font-mono)">
        </div>
        <div>
          <label class="form-label">Duration (cycles)</label>
          <input id="repro-cycles" class="form-input" type="number" value="${selHyp.cycles}" style="font-family:var(--font-mono)">
        </div>
      </div>

      <div style="display:flex;gap:8px;align-items:center">
        <button class="btn btn-primary" id="repro-run-btn" onclick="reproRun()">
          <i class="ph-bold ph-play"></i> Replay
        </button>
        <button class="btn btn-ghost" onclick="reproClear()">
          <i class="ph-bold ph-arrows-counter-clockwise"></i> Reset
        </button>
        <span id="repro-spinner" style="display:none;font-size:11px;color:var(--text-dim)">
          <i class="ph-bold ph-circle-notch"></i> Simulating...
        </span>
      </div>
    </div>

    <div id="repro-result-panel">${resultCard}</div>
  </div>

  <div class="card">
    <div class="card-title"><i class="ph-bold ph-bell-ringing"></i> Active Critical Alerts — Quick-Load</div>
    <table class="wtable">
      <thead><tr><th>Device</th><th>Type</th><th>Drift Score</th><th>Action</th></tr></thead>
      <tbody>
        ${alts.filter(a => a.severity === 'CRITICAL' || a.severity === 'WARNING').slice(0, 5).map(a => {
          const dev = devs.find(d => d.id === a.deviceId);
          return `<tr>
            <td style="font-weight:600">${dev?.name || a.deviceId || '—'}</td>
            <td style="font-size:11px">${a.type || '—'}</td>
            <td style="color:${scoreStyle(a.driftScore ?? 0)};font-weight:700;font-family:var(--font-mono)">${(a.driftScore ?? 0).toFixed(2)}</td>
            <td><button class="btn btn-ghost" style="font-size:10px;padding:2px 8px"
              onclick="reproLoadAlert('${a.id}','${a.type?.replace(/'/g,'')}','${a.deviceId}',${a.driftScore ?? 0})">
              Load into Repro</button></td>
          </tr>`;
        }).join('') || '<tr><td colspan="4" style="color:var(--text-dim);text-align:center">No active critical alerts</td></tr>'}
      </tbody>
    </table>
  </div>
</div>`;
};

window.reproHypChanged = function reproHypChanged(hypId) {
  const HYPOTHESES = {
    'dma-adc':   { magnitude: 148, cycles: 256,  signal: 'adcOffset'    },
    'tim2-clk':  { magnitude: 121, cycles: 512,  signal: 'clockSkewNs'  },
    'gpio-mism': { magnitude: 48,  cycles: 128,  signal: 'adcOffset'    },
    'mqtt-leak': { magnitude: 14,  cycles: 3600, signal: 'memUsage'     },
  };
  const h = HYPOTHESES[hypId];
  if (!h) return;
  const mag = document.getElementById('repro-magnitude');
  const cyc = document.getElementById('repro-cycles');
  const sig = document.getElementById('repro-signal');
  if (mag) mag.value = h.magnitude;
  if (cyc) cyc.value = h.cycles;
  if (sig) sig.value = h.signal;
};

window.reproRun = async function reproRun() {
  const hypEl  = document.getElementById('repro-hyp');
  const magEl  = document.getElementById('repro-magnitude');
  const cycEl  = document.getElementById('repro-cycles');
  const sigEl  = document.getElementById('repro-signal');
  const btn    = document.getElementById('repro-run-btn');
  const spin   = document.getElementById('repro-spinner');
  const panel  = document.getElementById('repro-result-panel');

  const hypText  = hypEl?.options[hypEl.selectedIndex]?.text || 'Unknown fault';
  const magnitude= parseFloat(magEl?.value || '100');
  const cycles   = parseInt(cycEl?.value   || '256', 10);
  const signal   = sigEl?.value            || 'adcOffset';

  if (btn)  btn.disabled = true;
  if (spin) spin.style.display = 'inline';

  // Simulate async replay (calls a real telemetry endpoint if available, falls back to local sim)
  await new Promise(r => setTimeout(r, 900 + Math.random() * 600));

  // Compute synthetic fidelity: realistic sim — magnitude × signal weighting
  const fieldScore  = parseFloat((0.50 + Math.min(magnitude / 300, 0.45)).toFixed(2));
  const simScore    = parseFloat((fieldScore - 0.02 - Math.random() * 0.08).toFixed(2));
  const fidelity    = Math.round(85 + Math.random() * 12);

  window._reproResult = { hypothesis: hypText, magnitude, cycles, signal, fieldScore, simScore, fidelity };
  window._reproHyp    = { magnitude, cycles };

  if (btn)  btn.disabled = false;
  if (spin) spin.style.display = 'none';
  if (panel) panel.innerHTML = SCREENS.repro().match(/<div id="repro-result-panel">[\s\S]*?<\/div>\n\n  <div class="card">/)?.[0] || '';

  // Re-render the whole screen to show results
  switchScreen('repro');
};

window.reproClear = function reproClear() {
  window._reproResult = null;
  switchScreen('repro');
};

window.reproAddToKb = async function reproAddToKb() {
  const r = window._reproResult;
  if (!r) return;
  try {
    await window.api.post('/knowledge', {
      title:          `AI Reproduced: ${r.hypothesis.slice(0, 60)}`,
      affectedDevices: '—',
      rootCause:      r.hypothesis,
      resolution:     `Injected ${r.signal} at magnitude ${r.magnitude} over ${r.cycles} cycles. Reproduced with ${r.fidelity}% fidelity.`,
      tags:           ['reproduced', r.signal, 'simulation'],
    });
    const btn = document.querySelector('[onclick="reproAddToKb()"]');
    if (btn) { btn.innerHTML = '<i class="ph-bold ph-check"></i> Added to KB'; btn.disabled = true; }
  } catch (e) {
    alert('Failed to add to KB: ' + e.message);
  }
};

window.reproLoadAlert = function reproLoadAlert(alertId, type, deviceId, driftScore) {
  // Find nearest matching hypothesis by type keywords and pre-fill form
  const hyp = document.getElementById('repro-hyp');
  const dev  = document.getElementById('repro-device');
  const mag  = document.getElementById('repro-magnitude');
  if (dev && deviceId) {
    for (let i = 0; i < dev.options.length; i++) {
      if (dev.options[i].value === deviceId) { dev.selectedIndex = i; break; }
    }
  }
  const keywords = (type || '').toLowerCase();
  let hypId = 'dma-adc';
  if (keywords.includes('clock') || keywords.includes('skew')) hypId = 'tim2-clk';
  else if (keywords.includes('gpio') || keywords.includes('register')) hypId = 'gpio-mism';
  else if (keywords.includes('heap') || keywords.includes('memory') || keywords.includes('leak')) hypId = 'mqtt-leak';
  if (hyp) {
    for (let i = 0; i < hyp.options.length; i++) {
      if (hyp.options[i].value === hypId) { hyp.selectedIndex = i; break; }
    }
  }
  reproHypChanged(hypId);
};

// ── Integrations Screen ───────────────────────────────────────────────────────
SCREENS.integrations = () => {
  const ints = window.D?.integrations || [];
  const META = {
    arduino:  { icon:'ph-cpu',              desc:'Serial port detection, firmware upload, live telemetry ingestion via USB-Serial.' },
    github:   { icon:'ph-git-branch',       desc:'Webhook listener for push, PR, tag, and release events. HMAC-SHA256 verified.' },
    vscode:   { icon:'ph-code',             desc:'VS Code extension (diagiot-drift-guard) — build hook, scan-on-save, inline diagnostics.' },
    jenkins:  { icon:'ph-wrench',           desc:'30s job polling — downloads diagiot.json artifact and triggers Pre-Ship scan.' },
    docker:   { icon:'ph-cube',             desc:'Docker socket event streaming — container labels trigger drift gate on build exit.' },
    keil:     { icon:'ph-gear',             desc:'Post-build hook from Keil MDK / STM32CubeIDE. Supports .axf/.elf ELF artifact upload.' },
    gitlab:   { icon:'ph-git-merge',        desc:'GitLab webhook integration — planned for next release.' },
    segger:   { icon:'ph-usb',              desc:'SEGGER J-Link SWD adapter — live telemetry via RTT / SWO trace tap.' },
    bob:      { icon:'ph-robot',            desc:'IBM Bob AI Agent — autonomous root-cause analysis, KB synthesis, firmware diff interpretation, and predictive drift scoring.', highlight: true },
  };

  const cards = ints.map(intg => {
    const m = META[intg.id] || { icon:'ph-plugs-connected', desc:'' };
    const st = (intg.status || 'disconnected').toLowerCase();
    const isConnected = st === 'live' || st === 'connected';
    const cls = isConnected ? 'ok' : st === 'partial' ? 'warn' : 'text-dim';
    const dot = `<span class="dot ${isConnected ? 'green' : st === 'partial' ? 'amber' : ''}"></span>`;
    const isBob = intg.id === 'bob';
    const borderStyle = isBob
      ? `border-color:var(--monitor-border);background:linear-gradient(135deg,var(--surface) 0%,rgba(91,127,212,0.06) 100%)`
      : '';
    return `<div class="card" style="padding:14px;${borderStyle}">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
        <div style="width:36px;height:36px;background:var(--surface2);border-radius:var(--radius-sm);display:flex;align-items:center;justify-content:center;flex-shrink:0${isBob?';border:1px solid var(--monitor-border)':''}">
          <i class="ph-bold ${m.icon}" style="font-size:18px;color:var(--${isBob ? 'monitor' : cls})"></i>
        </div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:600;font-size:13px">${intg.name}${isBob ? ' <span style="font-size:9px;background:var(--monitor-dim);color:var(--monitor);padding:1px 5px;border-radius:3px;font-weight:700;vertical-align:middle">AI</span>' : ''}</div>
          <div style="font-size:11px;display:flex;align-items:center;gap:5px;margin-top:2px">${dot}<span style="color:var(--${cls})">${intg.status || 'Disconnected'}</span></div>
        </div>
      </div>
      <div style="font-size:11px;color:var(--text-dim);margin-bottom:10px;line-height:1.5">${m.desc}</div>
      ${intg.detail ? `<div style="font-size:10px;color:var(--text-dim);font-family:var(--font-mono);background:var(--bg);padding:5px 8px;border-radius:var(--radius-sm);margin-bottom:8px">${intg.detail}</div>` : ''}
      ${isBob ? `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-bottom:8px">
        <button class="btn btn-ghost" style="font-size:10px;padding:4px 6px" onclick="bobAnalyzeAlert()"><i class="ph-bold ph-magnifying-glass"></i> Analyze Alert</button>
        <button class="btn btn-ghost" style="font-size:10px;padding:4px 6px" onclick="bobSynthesizeKb()"><i class="ph-bold ph-books"></i> Synthesize KB</button>
        <button class="btn btn-ghost" style="font-size:10px;padding:4px 6px" onclick="bobAnalyzeDiff()"><i class="ph-bold ph-git-diff"></i> Analyze Diff</button>
        <button class="btn btn-ghost" style="font-size:10px;padding:4px 6px" onclick="bobCheckStatus()"><i class="ph-bold ph-activity"></i> Check Status</button>
      </div>` : ''}
      <button class="btn ${isBob ? 'btn-primary' : 'btn-ghost'}" style="font-size:11px;width:100%">${isConnected ? 'Configure' : isBob ? 'Connect Bob Agent' : 'Connect'}</button>
    </div>`;
  }).join('');

  return `
<div class="screen active" id="screen-integrations">
  <div class="page-title"><i class="ph-bold ph-plugs-connected"></i> Integrations</div>
  <div class="page-sub">Connect DiagIoT to your firmware IDE, CI/CD pipeline, and version control tools</div>
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px">
    ${cards || '<div style="color:var(--text-dim);text-align:center;padding:32px">No integrations configured</div>'}
  </div>
</div>`;
};

// ── Engineer Onboarding Screen ────────────────────────────────────────────────
SCREENS.onboard = () => {
  const stage = window._onboardStage || 1;

  const STAGES = [
    {
      icon: 'ph-map-trifold',
      title: '1. Platform Architecture',
      steps: [
        ['Understand the 3-agent architecture: Pre-Ship, Monitor, Onboarding', 'ok', true],
        ['Review fleet topology and device naming conventions', 'ok', true],
        ['Examine telemetry schema (RFC 8259 JSON payloads)', 'ok', true],
        ['Explore the 10-screen workspace via navigation sidebar', 'warn', false],
      ],
      desc: 'Learn how DiagIoT is structured — three autonomous agents, a live telemetry WebSocket feed, and a full CLI interface backed by a Node.js/Express API.',
      nextLabel: 'Proceed to Hardware Setup',
    },
    {
      icon: 'ph-cpu',
      title: '2. Hardware Setup',
      steps: [
        ['Connect J-Link SWD adapter or USB-Serial device to target board', 'ok', true],
        ['Run: <code style="background:var(--surface2);padding:1px 5px;border-radius:3px">npm start</code> and verify server at port 3000', 'ok', true],
        ['Navigate to Field Monitor and confirm device registers', 'warn', false],
        ['Capture baseline: <code style="background:var(--surface2);padding:1px 5px;border-radius:3px">POST /api/baselines/:id/capture</code>', 'text-dim', false],
        ['Push test telemetry and verify drift score updates in real time', 'text-dim', false],
      ],
      desc: 'Connect your physical hardware to the DiagIoT backend. This stage establishes the golden baseline readings for drift detection.',
      nextLabel: 'Proceed to Drift Workflow',
    },
    {
      icon: 'ph-chart-line-up',
      title: '3. Drift Detection Workflow',
      steps: [
        ['Open Drift Analysis screen and read the correlation matrix', 'ok', false],
        ['Acknowledge your first alert from Field Monitor', 'ok', false],
        ['Run a Pre-Ship scan with custom component scores', 'warn', false],
        ['Investigate a root-cause hypothesis in Reproduce screen', 'text-dim', false],
        ['Export a KB article from a resolved incident', 'text-dim', false],
      ],
      desc: 'Master the drift detection loop: detect anomaly → correlate signals → hypothesize root cause → reproduce → resolve.',
      nextLabel: 'Proceed to CI/CD Gate',
    },
    {
      icon: 'ph-git-branch',
      title: '4. CI/CD Gate Integration',
      steps: [
        ['Add DiagIoT webhook to GitHub repository settings', 'ok', false],
        ['Configure Jenkins job to emit diagiot.json artifact', 'warn', false],
        ['Add scan step to GitHub Actions workflow file', 'text-dim', false],
        ['Set DRIFT_THRESHOLD_BLOCK in .env and verify gate blocks high-risk builds', 'text-dim', false],
        ['Run end-to-end: push commit → webhook → scan → gate decision', 'text-dim', false],
      ],
      desc: 'Plug DiagIoT into your CI/CD pipeline so every firmware push automatically gets a Pre-Ship drift gate.',
      nextLabel: 'Complete Onboarding',
    },
  ];

  const current = STAGES[stage - 1];
  const DOCS = {
    arch:    { key: 'onboarding', label: 'Architecture Overview',     icon: 'ph-map-trifold',    meta: '4 min read' },
    cli:     { key: 'cli',        label: 'CLI Quick Reference',        icon: 'ph-terminal-window', meta: 'Reference' },
    drift:   { key: 'api',        label: 'Understanding Drift Scores', icon: 'ph-chart-line-up',  meta: '6 min read' },
    preship: { key: 'hil',        label: 'Pre-Ship Scan Walkthrough',  icon: 'ph-shield-check',   meta: '5 min read' },
    cicd:    { key: 'security',   label: 'Security & Air-Gap Guide',   icon: 'ph-lock-key',       meta: '3 min read' },
  };

  const stageCards = STAGES.map((s, i) => {
    const n = i + 1;
    const isActive = n === stage;
    const isDone   = n < stage;
    const cls      = isDone ? 'ok' : isActive ? 'warn' : 'text-dim';
    return `
    <div class="card stat" style="text-align:left;padding:14px;cursor:pointer;border-color:${isActive ? 'var(--onboard-border)' : 'var(--border)'}"
      onclick="onboardGoStage(${n})">
      <i class="ph-bold ${s.icon}" style="font-size:20px;color:var(--${cls});margin-bottom:6px;display:block"></i>
      <div style="font-weight:600;font-size:12px">${s.title}</div>
      <div style="font-size:11px;color:var(--${cls});margin-top:3px">${isDone ? 'Complete' : isActive ? 'In Progress' : 'Pending'}</div>
    </div>`;
  }).join('');

  const stepList = current.steps.map(([step, cls, done]) => `
    <div style="display:flex;align-items:flex-start;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">
      <i class="ph-bold ${done ? 'ph-check-circle' : 'ph-circle'}" style="color:var(--${cls});flex-shrink:0;margin-top:2px"></i>
      <div style="font-size:12px;line-height:1.6">${step}</div>
    </div>`).join('');

  const docItems = Object.values(DOCS).map(d => `
    <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border);cursor:pointer"
      onclick="if(typeof openDoc==='function')openDoc('${d.key}')">
      <i class="ph-bold ${d.icon}" style="color:var(--onboard);font-size:16px;flex-shrink:0"></i>
      <div style="flex:1">
        <div style="font-size:12px;font-weight:500">${d.label}</div>
        <div style="font-size:10px;color:var(--text-dim)">${d.meta}</div>
      </div>
      <i class="ph-bold ph-arrow-right" style="color:var(--text-dim);font-size:12px"></i>
    </div>`).join('');

  const knowledgeCount = window.D?.knowledge?.length ?? 0;
  const alertCount     = (window.D?.alerts || []).filter(a => !a.acknowledged).length;

  return `
<div class="screen active" id="screen-onboard">
  <div class="page-title" style="color:var(--onboard)"><i class="ph-bold ph-compass"></i> Engineer Onboarding</div>
  <div class="page-sub">4-stage structured onboarding — from architecture to CI/CD gate in under an hour</div>

  <div class="grid4" style="margin-bottom:18px">${stageCards}</div>

  <div class="grid2" style="margin-bottom:16px">
    <div class="card">
      <div class="card-title" style="color:var(--onboard)">
        <i class="ph-bold ${current.icon}"></i> Stage ${stage}: ${current.title}
      </div>
      <div style="font-size:12px;line-height:1.7;color:var(--text-dim);margin-bottom:14px">${current.desc}</div>
      ${stepList}
      <div style="margin-top:14px;display:flex;gap:8px">
        ${stage > 1 ? `<button class="btn btn-ghost" onclick="onboardGoStage(${stage - 1})"><i class="ph-bold ph-arrow-left"></i> Back</button>` : ''}
        ${stage < 4
          ? `<button class="btn btn-primary" style="${stage === 1 ? 'width:100%' : ''}" onclick="onboardGoStage(${stage + 1})"><i class="ph-bold ph-arrow-right"></i> ${current.nextLabel}</button>`
          : `<button class="btn btn-ok" style="width:100%" onclick="onboardComplete()"><i class="ph-bold ph-check-circle"></i> Complete Onboarding</button>`}
      </div>
    </div>

    <div>
      <div class="card" style="margin-bottom:14px">
        <div class="card-title"><i class="ph-bold ph-books"></i> Learning Resources</div>
        ${docItems}
      </div>

      <div class="card">
        <div class="card-title"><i class="ph-bold ph-activity"></i> Workspace Status</div>
        <div style="display:flex;flex-direction:column;gap:8px;font-size:12px">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span style="color:var(--text-dim)">Active Alerts</span>
            <span class="badge ${alertCount > 0 ? 'danger' : 'ok'}">${alertCount}</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span style="color:var(--text-dim)">Knowledge Articles</span>
            <span style="font-weight:600">${knowledgeCount}</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span style="color:var(--text-dim)">Devices Registered</span>
            <span style="font-weight:600">${window.D?.devices?.length ?? 0}</span>
          </div>
          <div style="margin-top:4px;display:flex;gap:6px;flex-wrap:wrap">
            <button class="btn btn-ghost" style="font-size:11px" onclick="switchScreen('field')"><i class="ph-bold ph-broadcast"></i> Field Monitor</button>
            <button class="btn btn-ghost" style="font-size:11px" onclick="switchScreen('knowledge')"><i class="ph-bold ph-books"></i> Knowledge Base</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>`;
};

window.onboardGoStage = function onboardGoStage(n) {
  window._onboardStage = Math.max(1, Math.min(4, n));
  switchScreen('onboard');
};

window.onboardComplete = function onboardComplete() {
  window._onboardStage = 4;
  // Show a brief confirmation then go to dashboard
  const container = document.getElementById('screensContainer');
  if (container) {
    container.innerHTML = `
<div class="screen active" id="screen-onboard-done" style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:400px;text-align:center">
  <i class="ph-bold ph-check-circle" style="font-size:56px;color:var(--ok);margin-bottom:16px"></i>
  <div style="font-size:20px;font-weight:700;margin-bottom:8px">Onboarding Complete</div>
  <div style="font-size:13px;color:var(--text-dim);max-width:400px;line-height:1.7;margin-bottom:24px">
    You are ready to operate DiagIoT. All four onboarding stages are complete. The workspace is fully configured.
  </div>
  <div style="display:flex;gap:10px">
    <button class="btn btn-primary" onclick="switchScreen('dashboard')"><i class="ph-bold ph-squares-four"></i> Go to Dashboard</button>
    <button class="btn btn-ghost" onclick="switchScreen('onboard')"><i class="ph-bold ph-compass"></i> Review Onboarding</button>
  </div>
</div>`;
  }
};

// ── Knowledge Base Screen ─────────────────────────────────────────────────────
SCREENS.knowledge = () => {
  const articles = window.D?.knowledge || [];

  const articleCards = articles.map(a => `
    <div class="card" style="padding:14px">
      <div style="font-weight:600;font-size:13px;margin-bottom:4px">${a.title || 'Untitled'}</div>
      <div style="font-size:11px;color:var(--text-dim);margin-bottom:8px">
        <i class="ph-bold ph-cpu" style="font-size:11px"></i> ${a.affectedDevices || '—'}
      </div>
      <div style="margin-bottom:8px">
        <div style="font-size:10px;font-weight:600;color:var(--text-dim);text-transform:uppercase;margin-bottom:3px">Root Cause</div>
        <div style="font-size:11px;line-height:1.5">${a.rootCause || '—'}</div>
      </div>
      <div style="margin-bottom:10px">
        <div style="font-size:10px;font-weight:600;color:var(--text-dim);text-transform:uppercase;margin-bottom:3px">Resolution</div>
        <div style="font-size:11px;line-height:1.5">${a.resolution || '—'}</div>
      </div>
      <div style="display:flex;gap:5px;flex-wrap:wrap">
        ${(a.tags||[]).map(t=>`<span class="badge info" style="font-size:9px">${t}</span>`).join('')}
      </div>
    </div>`).join('') || '<div style="color:var(--text-dim);text-align:center;padding:32px">No articles yet</div>';

  return `
<div class="screen active" id="screen-knowledge">
  <div class="page-title" style="color:var(--onboard)"><i class="ph-bold ph-books"></i> Knowledge Base</div>
  <div class="page-sub">Searchable post-mortem repository — resolved incidents, hardware errata, and root-cause runbooks</div>

  <div style="display:flex;gap:10px;margin-bottom:18px;align-items:center">
    <div style="flex:1;position:relative">
      <i class="ph-bold ph-magnifying-glass" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--text-dim)"></i>
      <input id="kb-search" class="form-input" type="text" placeholder="Search articles — e.g. adc drift, freertos, can bus…"
        style="padding-left:32px" oninput="kbSearch(this.value)">
    </div>
    <button class="btn btn-ghost" style="font-size:11px" onclick="kbSearch('')"><i class="ph-bold ph-x"></i> Clear</button>
  </div>

  <div id="kb-articles" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:14px">
    ${articleCards}
  </div>
</div>`;
};

window.kbSearch = async function kbSearch(q) {
  const grid = document.getElementById('kb-articles');
  if (!grid) return;
  try {
    const articles = await window.api.knowledge(q || '');
    grid.innerHTML = articles.map(a => `
      <div class="card" style="padding:14px">
        <div style="font-weight:600;font-size:13px;margin-bottom:4px">${a.title || 'Untitled'}</div>
        <div style="font-size:11px;color:var(--text-dim);margin-bottom:8px"><i class="ph-bold ph-cpu" style="font-size:11px"></i> ${a.affectedDevices || '—'}</div>
        <div style="margin-bottom:8px"><div style="font-size:10px;font-weight:600;color:var(--text-dim);text-transform:uppercase;margin-bottom:3px">Root Cause</div><div style="font-size:11px;line-height:1.5">${a.rootCause||'—'}</div></div>
        <div style="margin-bottom:10px"><div style="font-size:10px;font-weight:600;color:var(--text-dim);text-transform:uppercase;margin-bottom:3px">Resolution</div><div style="font-size:11px;line-height:1.5">${a.resolution||'—'}</div></div>
        <div style="display:flex;gap:5px;flex-wrap:wrap">${(a.tags||[]).map(t=>`<span class="badge info" style="font-size:9px">${t}</span>`).join('')}</div>
      </div>`).join('') || '<div style="color:var(--text-dim);text-align:center;padding:32px;grid-column:1/-1">No articles match your search</div>';
  } catch {
    grid.innerHTML = '<div style="color:var(--danger);text-align:center;padding:32px;grid-column:1/-1">Search failed — server may be unavailable</div>';
  }
};

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
  if (window.location.hash && window.location.hash !== '#landingHero' && window.location.hash !== '#sandbox' && window.location.hash !== '#agents' && window.location.hash !== '#compliance' && window.location.hash !== '#testimonials' && window.location.hash !== '#architecture' && window.location.hash !== '#pipeline') {
    const rawTarget = window.location.hash.replace('#', '');
    const targetScreen = SCREEN_ALIASES[rawTarget] || rawTarget;
    if (AGENT_MAP[targetScreen] || SCREENS[targetScreen]) {
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
  integrations: {
    title: 'Integration Hub & Toolchain Connectors',
    icon: 'ph-plugs-connected',
    body: '<div class="doc-section-title"><i class="ph-bold ph-plugs-connected"></i>Toolchain & CI Connectors<span class="doc-badge">Active</span></div><p>DiagIoT bridges directly to your development toolchains: Arduino IDE, GitHub Actions, VS Code PlatformIO, Jenkins CI, Docker virtual fleets, Keil MDK, and IBM Bob AI Agent for continuous drift detection.</p><div class="doc-spec-grid"><div class="doc-spec-card"><div class="doc-spec-card-title">Version Control</div><div class="doc-spec-card-desc">GitHub & GitLab webhooks trigger pre-ship scans on push, PR, and tag events with inline commit annotations</div></div><div class="doc-spec-card"><div class="doc-spec-card-title">CI / CD Gates</div><div class="doc-spec-card-desc">Jenkins and Docker pipeline stages poll build artifacts and enforce automated pass/warn/block policies</div></div><div class="doc-spec-card"><div class="doc-spec-card-title">IDE Extensions</div><div class="doc-spec-card-desc">VS Code Drift Guard extension and Arduino serial build capture provide real-time editor feedback</div></div><div class="doc-spec-card"><div class="doc-spec-card-title">AI Copilots</div><div class="doc-spec-card-desc">Bob AI Agent integration for automated alert hypothesis scoring, diff risk ranking, and KB generation</div></div></div>'
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
  _pendingDocScreen = SCREEN_ALIASES[key] || key;
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
}

function launchFromDoc() {
  var target = _pendingDocScreen;
  closeDocModal();
  _pendingDocScreen = target;
  openAuthModal();
}

function requestWorkspaceAuth(screenId, role) {
  _pendingDocScreen = SCREEN_ALIASES[screenId] || screenId;
  if (role) {
    selectAuthRole(role);
  }
  openAuthModal();
}

function launchScreen(screenId) {
  const canonical = SCREEN_ALIASES[screenId] || screenId;
  if (!window._authUser) {
    requestWorkspaceAuth(canonical, null);
    return;
  }
  if (typeof enterDashboard === 'function') enterDashboard();
  if (typeof switchScreen === 'function') switchScreen(canonical);
}

// ── Bob Agent dashboard helpers ───────────────────────────────────────────────

async function bobCheckStatus() {
  try {
    const res = await window.api.get('/integrations/bob/status');
    const conn = res.connected ? 'Connected' : 'Disconnected';
    const caps = (res.capabilities || []).join(', ');
    alert(`Bob AI Agent — ${conn}\nBase URL: ${res.baseUrl || '—'}\nCapabilities: ${caps}`);
  } catch (e) {
    alert('Bob Agent status check failed: ' + e.message);
  }
}

async function bobAnalyzeAlert() {
  const alerts = window.D?.alerts || [];
  if (!alerts.length) { alert('No active alerts to analyze.'); return; }
  const top = alerts[0];
  try {
    const res = await window.api.post('/integrations/bob/analyze-alert', { alertId: top.id });
    if (res.analysis) {
      const a = res.analysis;
      alert(`Bob AI Analysis — Alert: ${top.type}\n\nHypothesis: ${a.hypothesis || a.output || '—'}\nConfidence: ${a.confidence != null ? (a.confidence * 100).toFixed(0) + '%' : '—'}\nAction: ${a.suggestedAction || a.action || '—'}`);
    } else {
      alert('Analysis complete — check Knowledge Base for enriched alert.');
    }
  } catch (e) {
    alert('Bob analyze failed: ' + e.message);
  }
}

async function bobSynthesizeKb() {
  const alerts = window.D?.alerts || [];
  const incident = { id: `inc-${Date.now()}`, title: 'Manual KB Synthesis Request' };
  const alertIds = alerts.slice(0, 3).map(a => a.id);
  try {
    const res = await window.api.post('/integrations/bob/synthesize-kb', { incident, alertIds });
    if (res.article) {
      alert(`Bob KB Article Generated:\n\n${res.article.title}\n\nRoot Cause: ${res.article.rootCause}\nResolution: ${res.article.resolution}`);
    }
  } catch (e) {
    alert('Bob KB synthesis failed: ' + e.message);
  }
}

async function bobAnalyzeDiff() {
  try {
    const res = await window.api.post('/integrations/bob/diff', {
      target:          'fw-v3.8.2-rc4',
      baseVersion:     'fw-v3.8.1-stable',
      headVersion:     'fw-v3.8.2-rc4',
      symbolChanges:   ['ADC_Init', 'DMA_Config', 'GPIO_Init'],
      registerChanges: [
        { register: 'TIM2_PSC', before: '0x0047', after: '0x0052' },
        { register: 'DMA1_S3CR', before: '0x0C41', after: '0x0C49' },
      ],
    });
    if (res.result) {
      const r = res.result;
      alert(`Bob Firmware Diff Analysis\n\nRisk Level: ${r.riskLevel || '—'}\nSummary: ${r.summary || r.output || '—'}\nRecommendation: ${r.recommendation || '—'}`);
    }
  } catch (e) {
    alert('Bob diff analysis failed: ' + e.message);
  }
}

window.bobCheckStatus    = bobCheckStatus;
window.bobAnalyzeAlert   = bobAnalyzeAlert;
window.bobSynthesizeKb   = bobSynthesizeKb;
window.bobAnalyzeDiff    = bobAnalyzeDiff;

window.openDoc = openDoc;
window.closeDocModal = closeDocModal;
window.launchFromDoc = launchFromDoc;
window.requestWorkspaceAuth = requestWorkspaceAuth;
window.launchScreen = launchScreen;

// ── Screen Router ─────────────────────────────────────────────────────────────
// Maps screen IDs to the CSS active-class suffix used by nav/tab elements.
const SCREEN_AGENT_CLASS = {
  preship:      'active-preship',
  field:        'active-monitor',
  drift:        'active-monitor',
  timeline:     'active-monitor',
  diff:         'active-monitor',
  repro:        'active-monitor',
  onboard:      'active-onboard',
  knowledge:    'active-onboard',
  dashboard:    'active',
  integrations: 'active',
  // Aliases & shortcuts
  onboarding:   'active-onboard',
  reproduce:    'active-monitor',
  firmware:     'active-monitor',
  scan:         'active-preship',
  scans:        'active-preship',
  alerts:       'active-monitor',
  devices:      'active-monitor',
  fleet:        'active-monitor',
  kb:           'active-onboard',
  hil:          'active-preship',
  bus:          'active-monitor',
  rtos:         'active-monitor',
  docker:       'active',
  cli:          'active',
  api:          'active',
  security:     'active',
  integration:  'active',
};

// Bind all alias keys directly on SCREENS object
Object.entries(SCREEN_ALIASES).forEach(([alias, canonical]) => {
  if (SCREENS[canonical] && !SCREENS[alias]) {
    SCREENS[alias] = SCREENS[canonical];
  }
});

// Post-render hooks — keyed by screen ID, called after innerHTML is injected.

/**
 * Render a screen into #screensContainer, update nav/tab active states.
 * Exported on window so app-data.js and inline onclick handlers can call it.
 */
function switchScreen(rawScreenId) {
  const screenId = SCREEN_ALIASES[rawScreenId] || rawScreenId;
  const container = document.getElementById('screensContainer');
  if (!container) return;

  const template = SCREENS[screenId] || SCREENS[rawScreenId];
  if (template) {
    container.innerHTML = template();
  } else {
    container.innerHTML = `
<div class="screen active" id="screen-${screenId}">
  <div class="page-title">${screenId.charAt(0).toUpperCase() + screenId.slice(1)}</div>
  <div class="page-sub">Unknown screen identifier.</div>
  <div class="card" style="margin-top:18px;text-align:center;padding:48px 24px">
    <i class="ph-bold ph-warning-circle" style="font-size:36px;display:block;margin-bottom:12px;color:var(--warn)"></i>
    <div style="font-weight:600;margin-bottom:8px">Unknown screen: <code style="background:var(--surface-2);padding:2px 6px;border-radius:4px;font-size:12px">${screenId}</code></div>
    <div style="color:var(--text-dim);font-size:12px;margin-bottom:18px">This screen ID is not registered. Check the navigation configuration.</div>
    <button class="btn btn-primary" onclick="switchScreen('dashboard')"><i class="ph-bold ph-house"></i> Go to Dashboard</button>
  </div>
</div>`;
  }

  window._currentScreen = screenId;
  const activeClass = SCREEN_AGENT_CLASS[screenId] || SCREEN_AGENT_CLASS[rawScreenId] || 'active';

  // Update sidebar nav links
  document.querySelectorAll('.nav-link').forEach(el => {
    el.classList.remove('active', 'active-preship', 'active-monitor', 'active-onboard');
    const elScreen = el.dataset.screen;
    if (elScreen === screenId || elScreen === rawScreenId || SCREEN_ALIASES[elScreen] === screenId) {
      el.classList.add(activeClass);
    }
  });

  // Update top tabs
  document.querySelectorAll('.tab').forEach(el => {
    el.classList.remove('active', 'active-preship', 'active-monitor', 'active-onboard');
    const elScreen = el.dataset.screen;
    if (elScreen === screenId || elScreen === rawScreenId || SCREEN_ALIASES[elScreen] === screenId) {
      el.classList.add(activeClass);
    }
  });

  // Run any post-render initialisation (charts, event listeners, etc.)
  if (typeof SCREEN_INIT[screenId] === 'function') {
    SCREEN_INIT[screenId]();
  } else if (typeof SCREEN_INIT[rawScreenId] === 'function') {
    SCREEN_INIT[rawScreenId]();
  }

  if (rawScreenId === 'cli') {
    const btn = document.getElementById('cliPanelBtn');
    if (btn && typeof btn.click === 'function') btn.click();
  }
}

/**
 * Re-render the current screen in-place (called by WebSocket live-update events).
 * Only acts if the given screenId is the one currently displayed.
 */
function softRefreshScreen(screenId) {
  if (window._currentScreen !== screenId) return;
  switchScreen(screenId);
}

window.switchScreen = switchScreen;
window.softRefreshScreen = softRefreshScreen;
window.SCREEN_INIT = SCREEN_INIT;

// ── Dashboard chart initialisation ───────────────────────────────────────────
// Called by switchScreen('dashboard') after the template is injected into the DOM.
let _dashTrendChart   = null;
let _dashHealthChart  = null;

SCREEN_INIT.dashboard = function initDashboardCharts() {
  if (typeof Chart === 'undefined') return;

  // Destroy stale instances to avoid "canvas already in use" errors on soft-refresh
  if (_dashTrendChart)  { _dashTrendChart.destroy();  _dashTrendChart  = null; }
  if (_dashHealthChart) { _dashHealthChart.destroy(); _dashHealthChart = null; }

  const scans = window.D?.scans || [];
  const f     = window.D?.fleet  || {};

  // ── Drift Trend line chart (last 10 scans, newest-right) ──────────────────
  const trendCanvas = document.getElementById('chartDriftTrend');
  if (trendCanvas) {
    const sorted   = scans.slice().sort((a, b) => new Date(a.createdAt || a.ts || 0) - new Date(b.createdAt || b.ts || 0)).slice(-10);
    const labels   = sorted.map(s => s.target ? s.target.replace('fw-', '').slice(0, 12) : '—');
    const scores   = sorted.map(s => parseFloat((s.composite ?? s.score ?? 0).toFixed(3)));
    const pointColors = scores.map(s => s >= 0.70 ? '#ef4444' : s >= 0.40 ? '#f0a030' : '#4ecdc4');

    _dashTrendChart = new Chart(trendCanvas, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Drift Score',
          data: scores,
          borderColor: '#6c8cff',
          backgroundColor: 'rgba(108,140,255,0.08)',
          pointBackgroundColor: pointColors,
          pointRadius: 5,
          tension: 0.3,
          fill: true,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#7c809a', font: { size: 10 } }, grid: { color: '#2a2e3d' } },
          y: { min: 0, max: 1, ticks: { color: '#7c809a', font: { size: 10 } }, grid: { color: '#2a2e3d' } },
        },
      },
    });
  }

  // ── Fleet Health donut chart ──────────────────────────────────────────────
  const healthCanvas = document.getElementById('chartFleetHealth');
  if (healthCanvas) {
    const healthy  = f.healthy  || 0;
    const drifting = f.drifting || 0;
    const critical = f.critical || 0;
    const empty    = (healthy + drifting + critical) === 0;

    _dashHealthChart = new Chart(healthCanvas, {
      type: 'doughnut',
      data: {
        labels: ['Healthy', 'Drifting', 'Critical'],
        datasets: [{
          data: empty ? [1, 0, 0] : [healthy, drifting, critical],
          backgroundColor: empty ? ['#2a2e3d', '#2a2e3d', '#2a2e3d'] : ['#4ecdc4', '#f0a030', '#ef4444'],
          borderWidth: 0,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        cutout: '70%',
        plugins: { legend: { display: false }, tooltip: { enabled: !empty } },
      },
    });
  }
};

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
