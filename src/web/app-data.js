

'use strict';

var D = window.D = {
  fleet:        { total: 0, healthy: 0, drifting: 0, critical: 0, uptime: '—', alertCount: 0, agentsOnline: 0 },
  devices:      [],
  alerts:       [],
  agents:       [],
  integrations: [],
  scans:        [],
  knowledge:    [],
  incidents:    [],
  activity:     [],   
  telemetry:    {},   
  connected:    false,
};

let ws = null;
let wsReconnectTimer = null;

async function connectWS() {
  let wsUrl = (window.DIAGIOT_SERVER || 'http://localhost:3000')
    .replace(/^http/, 'ws').replace(/\/$/, '');


  if (window.SB) {
    try {
      const { data } = await window.SB.auth.getSession();
      const token = data?.session?.access_token;
      if (token) wsUrl += '?token=' + encodeURIComponent(token);
    } catch {  }
  }

  try {
    ws = new WebSocket(wsUrl);
  } catch (e) {
    scheduleReconnect();
    return;
  }

  ws.onopen = () => {
    D.connected = true;
    clearTimeout(wsReconnectTimer);
    updateConnectionBadge(true);
    console.log('[DiagIoT] WebSocket connected');
  };

  ws.onmessage = (ev) => {
    let msg;
    try { msg = JSON.parse(ev.data); } catch { return; }
    handleServerMessage(msg);
  };

  ws.onclose = () => {
    D.connected = false;
    updateConnectionBadge(false);
    scheduleReconnect();
  };

  ws.onerror = () => {
    D.connected = false;
    updateConnectionBadge(false);
  };
}

function scheduleReconnect() {
  clearTimeout(wsReconnectTimer);
  wsReconnectTimer = setTimeout(connectWS, 4000);
}

function handleServerMessage(msg) {
  switch (msg.type) {

    case 'init':
      D.fleet        = msg.data.fleet        || D.fleet;
      D.devices      = msg.data.devices      || [];
      D.alerts       = msg.data.alerts       || [];
      D.agents       = msg.data.agents       || [];
      D.integrations = msg.data.integrations || [];
      D.scans        = msg.data.scans        || [];
      D.knowledge    = msg.data.knowledge    || [];
      refreshCurrentScreen();
      break;

    case 'device:updated': {
      const idx = D.devices.findIndex(d => d.id === msg.data.id);
      if (idx >= 0) D.devices[idx] = msg.data;
      else D.devices.push(msg.data);
      D.fleet = computeFleetSummary();
      refreshCurrentScreen();
      break;
    }

    case 'alert:created':
      D.alerts.unshift(msg.data);
      D.fleet.alertCount = D.alerts.filter(a => !a.acknowledged).length;
      refreshCurrentScreen();
      break;

    case 'alert:acknowledged': {
      const idx = D.alerts.findIndex(a => a.id === msg.data.id);
      if (idx >= 0) D.alerts[idx] = msg.data;
      D.fleet.alertCount = D.alerts.filter(a => !a.acknowledged).length;
      refreshCurrentScreen();
      break;
    }

    case 'scan:completed':
      D.scans.unshift(msg.data);
      refreshCurrentScreen();
      break;

    case 'integration:updated': {
      const idx = D.integrations.findIndex(i => i.id === msg.data.id);
      if (idx >= 0) D.integrations[idx] = msg.data;
      refreshTopBarAgents();
      refreshCurrentScreen();
      break;
    }

    case 'agent:updated': {
      const idx = D.agents.findIndex(a => a.id === msg.data.id);
      if (idx >= 0) D.agents[idx] = msg.data;
      refreshTopBarAgents();
      refreshCurrentScreen();
      break;
    }

    case 'telemetry': {
      const { deviceId, sample } = msg.data;
      if (!D.telemetry[deviceId]) D.telemetry[deviceId] = [];
      D.telemetry[deviceId].push(sample);
      if (D.telemetry[deviceId].length > 300) D.telemetry[deviceId].shift();
      patchTelemetryChart(deviceId, sample);
      break;
    }

    case 'activity':
      D.activity.unshift({ ...msg.data, ts: msg.ts });
      if (D.activity.length > 100) D.activity.pop();
      refreshCurrentScreen();
      break;

    case 'knowledge:updated':
      D.knowledge = [msg.data, ...D.knowledge.filter(a => a.id !== msg.data.id)];
      refreshCurrentScreen();
      break;

    case 'alert:enriched': {
      // Bob Agent enriched an alert with AI analysis — update in-cache copy
      const idx = D.alerts.findIndex(a => a.id === msg.data.id);
      if (idx >= 0) D.alerts[idx] = msg.data;
      refreshCurrentScreen();
      break;
    }
  }
}

function computeFleetSummary() {
  const total    = D.devices.length;
  const healthy  = D.devices.filter(d => (d.driftScore ?? 0) < 0.4).length;
  const drifting = D.devices.filter(d => (d.driftScore ?? 0) >= 0.4 && (d.driftScore ?? 0) < 0.7).length;
  const critical = D.devices.filter(d => (d.driftScore ?? 0) >= 0.7).length;
  const uptime   = total > 0 ? ((healthy + drifting) / total * 100).toFixed(1) + '%' : '—';
  const alertCount = D.alerts.filter(a => !a.acknowledged).length;
  const agentsOnline = D.agents.filter(a => a.status === 'active').length;
  return { ...D.fleet, total, healthy, drifting, critical, uptime, alertCount, agentsOnline };
}

function relTime(isoString) {
  if (!isoString) return '—';
  const ms = Date.now() - new Date(isoString).getTime();
  if (ms < 60000)    return `${Math.round(ms / 1000)}s ago`;
  if (ms < 3600000)  return `${Math.round(ms / 60000)}m ago`;
  if (ms < 86400000) return `${Math.round(ms / 3600000)}h ago`;
  return new Date(isoString).toLocaleDateString();
}

function scoreLabel(s) {
  if (s == null) return '—';
  if (s < 0.20) return 'SAFE';
  if (s < 0.40) return 'LOW';
  if (s < 0.70) return 'WARNING';
  return 'CRITICAL';
}

function scoreStyle(s) {
  if (s == null) return 'var(--text-dim)';
  if (s < 0.40) return 'var(--ok)';
  if (s < 0.70) return 'var(--warn)';
  return 'var(--danger)';
}

function healthStyle(health, score) {
  const h = health || (score >= 0.70 ? 'CRITICAL' : score >= 0.40 ? 'DRIFTING' : 'HEALTHY');
  if (h === 'HEALTHY')  return 'var(--ok)';
  if (h === 'DRIFTING') return 'var(--warn)';
  return 'var(--danger)';
}

function healthBadge(health, score) {
  const h = health || (score >= 0.70 ? 'CRITICAL' : score >= 0.40 ? 'DRIFTING' : 'HEALTHY');
  const cls = h === 'HEALTHY' ? 'ok' : h === 'DRIFTING' ? 'warn' : 'danger';
  return `<span class="badge ${cls}">${h}</span>`;
}

function sevBadge(sev) {
  const cls = sev === 'CRITICAL' ? 'danger' : sev === 'WARNING' ? 'warn' : sev === 'INFO' ? 'info' : 'ok';
  return `<span class="badge ${cls}">${sev || '—'}</span>`;
}

function statusBadge(status) {
  const s = (status || '').toUpperCase();
  const cls = s === 'LIVE' || s === 'CONNECTED' || s === 'ACTIVE' ? 'ok'
            : s === 'PARTIAL' ? 'warn'
            : 'info';
  const dot  = `<span class="dot ${s === 'LIVE' || s === 'CONNECTED' || s === 'ACTIVE' ? 'on' : s === 'PARTIAL' ? 'partial' : 'off'}"></span>`;
  const color = s === 'LIVE' || s === 'CONNECTED' || s === 'ACTIVE' ? 'var(--ok)'
              : s === 'PARTIAL' ? 'var(--warn)' : 'var(--text-dim)';
  return `<span class="int-status">${dot}<span style="color:${color}">${status || '—'}</span></span>`;
}

function updateConnectionBadge(connected) {
  const badge = document.querySelector('.env-pill');
  if (!badge) return;
  if (connected) {
    badge.textContent = 'Live';
    badge.style.background = 'var(--ok-dim)';
    badge.style.color = 'var(--ok)';
    badge.style.borderColor = 'var(--ok-border)';
  } else {
    badge.textContent = 'Offline';
    badge.style.background = 'var(--warn-dim)';
    badge.style.color = 'var(--warn)';
    badge.style.borderColor = 'var(--warn-border)';
  }
}

function refreshTopBarAgents() {
  const agentPills = document.querySelectorAll('.agent-pill');
  if (!agentPills.length) return;
  const names = ['preship','monitor','onboard'];
  agentPills.forEach((pill, i) => {
    const agent = D.agents.find(a => a.id === names[i]);
    if (!agent) return;
    const dot = pill.querySelector('.pulse-dot');
    if (dot) dot.title = agent.status;
  });
}

let fieldChart = null;
function patchTelemetryChart(deviceId, sample) {
  if (!fieldChart) return;
  fieldChart.data.datasets[0].data.push(sample.adcOffset ?? 0);
  fieldChart.data.labels.push('');
  if (fieldChart.data.datasets[0].data.length > 60) {
    fieldChart.data.datasets[0].data.shift();
    fieldChart.data.labels.shift();
  }
  fieldChart.update('none');
}

function refreshCurrentScreen() {
  if (typeof window._currentScreen === 'string') {
    window.softRefreshScreen(window._currentScreen);
  }
}

async function initialLoad() {
  try {
    const [fleet, devices, alerts, agents, integrations, scans] = await Promise.all([
      window.api.fleetSummary(),
      window.api.fleetDevices(),
      window.api.alerts({ acknowledged: false }),
      window.api.agents(),
      window.api.integrations(),
      window.api.scans(),
    ]);
    D.fleet        = fleet;
    D.devices      = devices;
    D.alerts       = alerts;
    D.agents       = agents;
    D.integrations = integrations;
    D.scans        = scans;
    refreshCurrentScreen();
  } catch (e) {
    console.warn('[DiagIoT] Initial API load failed (server may be starting):', e.message);
    refreshCurrentScreen();
  }
}

window.D = D;
window.relTime = relTime;
window.scoreLabel = scoreLabel;
window.scoreStyle = scoreStyle;
window.healthStyle = healthStyle;
window.healthBadge = healthBadge;
window.sevBadge = sevBadge;
window.statusBadge = statusBadge;
window.getFieldChart = () => fieldChart;
window.setFieldChart = (c) => { fieldChart = c; };

window.addEventListener('DOMContentLoaded', () => {

  async function restoreSession() {
    if (!window._sbInitPromise) { connectWS(); initialLoad(); return; }
    await window._sbInitPromise;
    if (!window.SB) { connectWS(); initialLoad(); return; }

    const { data } = await window.SB.auth.getSession().catch(() => ({ data: null }));
    if (data?.session?.user) {
      if (typeof _applySessionUser === 'function') _applySessionUser(data.session.user);
      if (typeof enterDashboard   === 'function') enterDashboard();
    }


    window.SB.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        if (typeof _applySessionUser === 'function') _applySessionUser(session.user);
      }
      if (event === 'SIGNED_OUT') {
        if (typeof authSignOut === 'function') authSignOut();
      }
      if (event === 'TOKEN_REFRESHED' && session?.user) {
        window._authUser = session.user;
      }
    });

    connectWS();
    initialLoad();
  }

  restoreSession();
});
