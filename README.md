# DiagIoT — Agentic Drift Detection Platform

An agentic drift detection system for embedded IoT devices. Monitors firmware and hardware across fleets, correlates signals, and root-causes drift — automatically.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Integrations (push real data)                                  │
│  GitHub   Arduino CLI   Jenkins   Docker   VS Code   Keil/STM32 │
└────────────────────────┬────────────────────────────────────────┘
                         │  REST API  /  Webhooks
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  Backend Server  (src/server)                                   │
│  Express REST API · WebSocket push · Drift Engine · Store       │
│  Three Agents: Pre-Ship · Monitor · Onboarding                  │
└──────────┬───────────────────────────────────┬──────────────────┘
           │  HTTP + WS                        │  REST API
           ▼                                   ▼
┌──────────────────────┐           ┌───────────────────────────────┐
│  Web Dashboard       │           │  CLI  (src/cli/diagiot.js)    │
│  src/web/index.html  │           │  Works standalone in any IDE: │
│  Live data via WS    │           │  Arduino CLI · VS Code        │
└──────────────────────┘           │  Jenkins · Docker · Terminal  │
                                   └───────────────────────────────┘
```

## Quick Start

### 1. Install dependencies

```sh
npm install
```

### 2. Configure environment

```sh
cp .env.example .env
# Edit .env with your GitHub token, Jenkins URL, etc.
```

### 3. Start the backend server

```sh
npm start
# or for auto-reload in development:
npm run dev
```

Open the web dashboard: **http://localhost:3000/**

### 4. Use the CLI

```sh
# Show help
node src/cli/diagiot.js help

# Or install globally:
npm link
diagiot help

# Common commands (all data is live from the backend):
diagiot fleet status
diagiot alerts list
diagiot agents status
diagiot integrations list
diagiot drift score --device <id>
diagiot scan run --target fw-v1.2.3
diagiot interactive        # REPL mode
```

## Integration Setup

### GitHub
1. Go to your repo → Settings → Webhooks → Add webhook
2. Payload URL: `http://your-server:3000/api/integrations/github/webhook`
3. Content type: `application/json`
4. Secret: value from `GITHUB_WEBHOOK_SECRET` in `.env`
5. Events: Push, Pull requests, Releases
6. In your CI, add a step to upload `diagiot.json`:
   ```yaml
   - name: Upload drift metadata
     run: |
       curl -X POST http://your-server:3000/api/integrations/github/artifact \
         -H 'Content-Type: application/json' \
         -d '{"target":"fw-v1.2.3","baseline":"fw-v1.2.2-gold","scores":{"binaryDiff":0.1,"behavioralSig":0.05,"knownVulns":0,"hwCompat":0,"configDrift":0.02}}'
   ```

### Arduino / Arduino CLI
- **Serial telemetry**: Firmware emits JSON on Serial:
  ```c
  // In your sketch loop():
  Serial.print("{\"adcOffset\":");
  Serial.print(analogRead(A0) - baseline_adc);
  Serial.print(",\"clockSkewNs\":0,\"powerRippleMv\":");
  Serial.print(measure_ripple());
  Serial.println("}");
  ```
- **IDE plugin upload**: POST to `http://localhost:3000/api/integrations/arduino/upload`
- **Connect serial**: `diagiot integrations connect --id arduino`

### Arduino CLI pipeline
```sh
# After building:
arduino-cli compile --fqbn arduino:avr:mega sketch/
diagiot scan run --target fw-$(git rev-parse --short HEAD) \
  --scores '{"binaryDiff":0.05,"behavioralSig":0,"knownVulns":0,"hwCompat":0,"configDrift":0}'
```

### Keil / STM32CubeIDE
Add a post-build command:
```
curl -s -X POST http://localhost:3000/api/integrations/keil/artifact \
  -F "file=@$(ProjectDir)/$(ProjectName).elf" \
  -F "target=$(ProjectVer)" \
  -F "deviceId=$(ProjectName)"
```

### Jenkins CI
```groovy
stage('DiagIoT Drift Check') {
  steps {
    sh '''
      diagiot scan run \
        --target ${BUILD_TAG} \
        --scores '{"binaryDiff":0.08,"behavioralSig":0.03,"knownVulns":0,"hwCompat":0.01,"configDrift":0.02}'
    '''
  }
}
```
Or use the Jenkins adapter (set `JENKINS_URL`, `JENKINS_USER`, `JENKINS_TOKEN` in `.env`) — it polls automatically.

### Docker / OCI
Label your firmware build image:
```dockerfile
LABEL diagiot.target="fw-v1.2.3"
LABEL diagiot.baseline="fw-v1.2.2-gold"
LABEL diagiot.scores='{"binaryDiff":0.1,"behavioralSig":0.05,"knownVulns":0,"hwCompat":0,"configDrift":0.02}'
```
The Docker adapter watches daemon events automatically.

### VS Code / PlatformIO
The DiagIoT Drift Guard extension connects via WebSocket to `http://localhost:3000`.
Set in `settings.json`:
```json
"diagiot.serverUrl": "http://localhost:3000"
```

## API Reference

| Endpoint | Method | Description |
|---|---|---|
| `/api/health` | GET | Server health + all statuses |
| `/api/fleet/summary` | GET | Fleet KPIs |
| `/api/fleet/devices` | GET | All registered devices |
| `/api/fleet/devices/:id` | GET | Device detail |
| `/api/fleet/devices/:id/telemetry` | GET/POST | Telemetry samples |
| `/api/alerts` | GET | Active alerts |
| `/api/alerts/:id/acknowledge` | POST | Acknowledge alert |
| `/api/scans` | GET | All Pre-Ship scans |
| `/api/scans/latest` | GET | Last scan result |
| `/api/scans/run` | POST | Submit scan |
| `/api/baselines/:id/capture` | POST | Capture baseline |
| `/api/agents` | GET | Agent statuses |
| `/api/integrations` | GET | All integration statuses |
| `/api/knowledge` | GET/POST | Knowledge articles |
| `/api/integrations/github/webhook` | POST | GitHub webhook |
| `/api/integrations/arduino/upload` | POST | Arduino build upload |
| `/api/integrations/arduino/telemetry` | POST | Arduino telemetry push |
| `/api/integrations/keil/artifact` | POST | Keil/STM32 ELF upload |
| `/api/integrations/jenkins/scan` | POST | Jenkins manual scan |
| `/api/integrations/docker/artifact` | POST | Docker artifact scan |
| `/api/integrations/vscode/build` | POST | VS Code build hook |

## Drift Score Thresholds

| Range | Label | Decision |
|---|---|---|
| 0.00 – 0.19 | SAFE | Pass |
| 0.20 – 0.39 | LOW | Pass |
| 0.40 – 0.69 | WARNING | Warn |
| 0.70 – 1.00 | CRITICAL | Block |

Configure via `DRIFT_THRESHOLD_WARN` and `DRIFT_THRESHOLD_BLOCK` in `.env`.

## Project Structure

```
src/
  server/
    index.js              Backend entry point (Express + WebSocket)
    store.js              In-process state store (all live data)
    drift-engine.js       Drift scoring algorithms
    routes/api.js         REST API routes
    integrations/
      github.js           GitHub webhook + artifact upload
      arduino.js          Arduino CLI serial + IDE plugin
      jenkins.js          Jenkins CI polling adapter
      docker.js           Docker daemon event adapter
      keil.js             Keil/STM32CubeIDE post-build hook
      vscode.js           VS Code extension WebSocket adapter
  cli/
    diagiot.js            Standalone CLI (calls backend API)
  shared/
    api-client.js         Shared API client (Node + browser)
  web/
    index.html            Web dashboard shell
    styles.css            Design system + component styles
    app.js                Screen templates + CLI panel + controller
    app-data.js           WebSocket + API live data layer
```
