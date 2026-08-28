/**
 * Jenkins CI Integration Adapter
 *
 * Polls the Jenkins REST API for build status changes.
 * When a build completes that includes a firmware artifact, it downloads
 * the artifact metadata and triggers a Pre-Ship scan.
 *
 * ENV:
 *   JENKINS_URL    e.g. http://localhost:8080
 *   JENKINS_USER   Jenkins username
 *   JENKINS_TOKEN  Jenkins API token (User → Configure → API Token)
 *
 * The adapter watches all configured jobs. When a build finishes,
 * it checks for a diagiot.json artifact produced by the build
 * (add a pipeline step to generate this — see README).
 */

'use strict';

const store  = require('../store');
const { computePreShipScore } = require('../drift-engine');

let pollInterval = null;
const POLL_MS    = 30_000;  // poll every 30s

function auth() {
  const user  = process.env.JENKINS_USER;
  const token = process.env.JENKINS_TOKEN;
  if (!user || !token) return {};
  return { headers: { Authorization: 'Basic ' + Buffer.from(`${user}:${token}`).toString('base64') } };
}

async function fetchJson(url) {
  const { default: fetch } = await import('node-fetch');
  const resp = await fetch(url, auth());
  if (!resp.ok) throw new Error(`Jenkins HTTP ${resp.status} for ${url}`);
  return resp.json();
}

// ── Job tracking ──────────────────────────────────────────
const seenBuilds = new Set();   // track build numbers we've already processed

async function pollJobs() {
  const base = process.env.JENKINS_URL;
  if (!base) return;

  try {
    const info = await fetchJson(`${base}/api/json?tree=jobs[name,url,lastCompletedBuild[number,result,url]]`);
    store.setIntegrationStatus('jenkins', 'connected', `${info.jobs?.length || 0} jobs monitored`);
    store.setAgentStatus('preship', 'active');

    for (const job of (info.jobs || [])) {
      const build = job.lastCompletedBuild;
      if (!build) continue;
      const key = `${job.name}#${build.number}`;
      if (seenBuilds.has(key)) continue;
      seenBuilds.add(key);

      await processBuild(job.name, build.url, build.number, build.result);
    }
  } catch (err) {
    console.error('[Jenkins] Poll error:', err.message);
    store.setIntegrationStatus('jenkins', 'error', err.message);
  }
}

async function processBuild(jobName, buildUrl, buildNumber, result) {
  console.log(`[Jenkins] Processing build ${jobName}#${buildNumber} (${result})`);

  try {
    // Look for diagiot.json artifact in the build
    const artifacts = await fetchJson(`${buildUrl}api/json?tree=artifacts[fileName,relativePath]`);
    const diagiotArtifact = artifacts.artifacts?.find(a => a.fileName === 'diagiot.json');

    if (!diagiotArtifact) {
      console.log(`[Jenkins] No diagiot.json artifact in ${jobName}#${buildNumber} — skipping drift scan`);
      store.emit('jenkins:build', { jobName, buildNumber, result, scanned: false, ts: new Date().toISOString() });
      return;
    }

    // Download diagiot.json
    const { default: fetch } = await import('node-fetch');
    const artifactUrl = `${buildUrl}artifact/${diagiotArtifact.relativePath}`;
    const resp = await fetch(artifactUrl, auth());
    if (!resp.ok) throw new Error(`Failed to fetch artifact: HTTP ${resp.status}`);
    const diagiot = await resp.json();

    // diagiot.json expected schema:
    // { target, baseline, checks: [{name, passed, delta}], scores: {binaryDiff, behavioralSig, knownVulns, hwCompat, configDrift} }
    const scanResult = computePreShipScore(
      diagiot.target || `${jobName}#${buildNumber}`,
      diagiot.checks || [],
      diagiot.scores || {},
    );

    store.emit('jenkins:build', {
      jobName, buildNumber, result,
      scanned:    true,
      driftScore: scanResult.composite,
      decision:   scanResult.decision,
      ts:         new Date().toISOString(),
    });

    store.setIntegrationStatus('jenkins', 'live', `${jobName}#${buildNumber} — score ${scanResult.composite} [${scanResult.decision}]`);
    console.log(`[Jenkins] Scan complete → ${jobName}#${buildNumber}  score: ${scanResult.composite}  decision: ${scanResult.decision}`);

  } catch (err) {
    console.error(`[Jenkins] Build processing error for ${jobName}#${buildNumber}:`, err.message);
  }
}

function start() {
  const base = process.env.JENKINS_URL;
  if (!base) {
    console.log('[Jenkins] JENKINS_URL not set — integration disabled');
    return;
  }
  console.log(`[Jenkins] Starting poll every ${POLL_MS / 1000}s → ${base}`);
  pollJobs();   // immediate first poll
  pollInterval = setInterval(pollJobs, POLL_MS);
}

function stop() {
  if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
  store.setIntegrationStatus('jenkins', 'disconnected', null);
}

/**
 * Manual trigger — POST /api/integrations/jenkins/scan
 * Body: { target, checks, scores }  — allows manual submission from the dashboard
 */
function scanHandler(req, res) {
  const { target, checks, scores } = req.body;
  if (!target || !scores) return res.status(400).json({ error: 'target and scores are required' });
  const result = computePreShipScore(target, checks || [], scores);
  res.json({ scanId: result.id, driftScore: result.composite, decision: result.decision, label: result.label });
}

module.exports = { start, stop, scanHandler };
