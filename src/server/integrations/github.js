/**
 * GitHub Integration Adapter
 *
 * - Receives webhook events (push, pull_request, release, create)
 * - Parses firmware artifact metadata from CI run contexts
 * - Triggers Pre-Ship scans for PRs and release tags
 * - Posts drift-check status back to GitHub via Checks API
 *
 * Setup in GitHub repo:
 *   Settings → Webhooks → Add webhook
 *   Payload URL : http://<your-server>:3000/api/integrations/github/webhook
 *   Content type: application/json
 *   Secret      : value from GITHUB_WEBHOOK_SECRET in .env
 *   Events      : Push, Pull requests, Releases
 */

'use strict';

const crypto = require('crypto');
const store  = require('../store');
const { computePreShipScore } = require('../drift-engine');

// Verify HMAC-SHA256 signature from GitHub
function verifySignature(body, signature, secret) {
  if (!secret) return true;  // skip verification in dev when secret not set
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(body);
  const expected = 'sha256=' + hmac.digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature || ''));
  } catch { return false; }
}

/**
 * Express middleware — mount at POST /api/integrations/github/webhook
 */
function webhookHandler(req, res) {
  const secret    = process.env.GITHUB_WEBHOOK_SECRET;
  const signature = req.headers['x-hub-signature-256'];
  const rawBody   = req.rawBody;   // populated by bodyParser with verify callback

  if (!verifySignature(rawBody, signature, secret)) {
    console.warn('[GitHub] Invalid webhook signature — rejected');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const event = req.headers['x-github-event'];
  const payload = req.body;

  console.log(`[GitHub] Event: ${event} — repo: ${payload?.repository?.full_name}`);

  try {
    switch (event) {
      case 'push':         handlePush(payload);         break;
      case 'pull_request': handlePullRequest(payload);  break;
      case 'create':       handleCreate(payload);       break;   // tag/branch create
      case 'release':      handleRelease(payload);      break;
      default:
        console.log(`[GitHub] Unhandled event: ${event}`);
    }
  } catch (err) {
    console.error('[GitHub] Handler error:', err.message);
  }

  res.status(200).json({ received: true });
}

// ── Event handlers ───────────────────────────────────────

function handlePush(payload) {
  const repo   = payload.repository?.full_name;
  const ref    = payload.ref;          // e.g. refs/heads/main
  const sha    = payload.after;
  const pusher = payload.pusher?.name;

  // Record the push event as a device/repo event
  store.emit('github:push', { repo, ref, sha, pusher, ts: new Date().toISOString() });

  // Mark GitHub integration as live
  store.setIntegrationStatus('github', 'live', `${repo} — push by ${pusher}`);

  console.log(`[GitHub] Push → ${repo} ${ref} by ${pusher}`);
}

function handlePullRequest(payload) {
  const { action, pull_request: pr, repository } = payload;
  if (!['opened', 'synchronize', 'reopened'].includes(action)) return;

  const repo   = repository?.full_name;
  const prNum  = pr?.number;
  const sha    = pr?.head?.sha;
  const branch = pr?.head?.ref;

  store.emit('github:pull_request', { repo, prNum, sha, branch, action, ts: new Date().toISOString() });
  store.setIntegrationStatus('github', 'live', `${repo} PR #${prNum} ${action}`);

  console.log(`[GitHub] PR #${prNum} ${action} → ${repo}@${branch}`);

  // The Pre-Ship agent will pick up this event and run a scan
  // when the firmware artifact arrives via the artifact upload endpoint
}

function handleCreate(payload) {
  if (payload.ref_type !== 'tag') return;
  const repo = payload.repository?.full_name;
  const tag  = payload.ref;

  store.emit('github:tag', { repo, tag, ts: new Date().toISOString() });
  console.log(`[GitHub] Tag created → ${repo} @ ${tag}`);

  // Release tags trigger baseline capture (handled by Pre-Ship Agent)
}

function handleRelease(payload) {
  if (payload.action !== 'published') return;
  const repo    = payload.repository?.full_name;
  const release = payload.release;
  const tag     = release?.tag_name;

  store.emit('github:release', { repo, tag, release, ts: new Date().toISOString() });
  store.setIntegrationStatus('github', 'live', `${repo} release ${tag}`);

  console.log(`[GitHub] Release published → ${repo} @ ${tag}`);
}

/**
 * Endpoint to receive a firmware artifact + metadata for drift scanning.
 * CI calls: POST /api/integrations/github/artifact
 * Body (multipart): { file, target, baseline, repo, prNumber, sha, checks, scores }
 */
function artifactHandler(req, res) {
  const { target, baseline, repo, prNumber, sha, checks, scores } = req.body;

  if (!target || !scores) {
    return res.status(400).json({ error: 'target and scores are required' });
  }

  let parsedChecks, parsedScores;
  try {
    parsedChecks = typeof checks === 'string' ? JSON.parse(checks) : (checks || []);
    parsedScores = typeof scores === 'string' ? JSON.parse(scores) : scores;
  } catch {
    return res.status(400).json({ error: 'Invalid JSON in checks or scores' });
  }

  const result = computePreShipScore(target, parsedChecks, parsedScores);

  // Record activity feed event
  store.emit('github:scan_complete', {
    repo, prNumber, sha, target, baseline,
    driftScore: result.composite,
    decision:   result.decision,
    ts:         new Date().toISOString(),
  });

  console.log(`[GitHub] Artifact scanned → ${target}  score: ${result.composite}  decision: ${result.decision}`);

  res.json({
    scanId:     result.id,
    target,
    driftScore: result.composite,
    decision:   result.decision,
    label:      result.label,
    checks:     result.checks,
  });
}

module.exports = { webhookHandler, artifactHandler };
