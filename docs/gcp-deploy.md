# Google Cloud VM Deployment

This repo is ready to host the web app and realtime server from one small Google Compute Engine VM.

## Current Local Findings

- Active `gcloud` account: `sukanyamurugan198@gmail.com`
- Deployed `gcloud` account: `lakshmi@chessalive.com`
- Deployed project: `chessalive-495918`
- Active billing account: `011C12-C6555D-1BB606`
- VM: `chessalive-prod-1`
- Zone: `us-central1-a`
- Machine: `e2-micro`
- Static IP: `34.30.115.188`
- Compute API is enabled.
- No Cloud DNS managed zone for `chessalive.com` is visible in the accessible projects.
- Current public DNS for `chessalive.com` points to Azure:
  - `chessalive.com A 20.192.171.3`
  - `www.chessalive.com CNAME chessalive-live-260328sk.azurewebsites.net`
- Deployed VM target:
  - `chessalive.com A 34.30.115.188`
  - `www.chessalive.com A 34.30.115.188`

## Deployment Shape

```text
Google Compute Engine VM
  -> Caddy on :80
  -> Node realtime/static server on :8080
  -> Expo static web export from apps/player-app/dist
  -> /api proxied to realtime HTTP routes
  -> /ws proxied to realtime WebSocket rooms
```

The app automatically uses:

- local development: `http://localhost:8982` and `ws://localhost:8982`
- hosted web: same-origin `/api` and `/ws`

## Deploy VM

This creates billable resources, so the script requires an explicit environment flag.

```bash
PROJECT_ID=agentina-491902 \
ZONE=us-central1-a \
MACHINE_TYPE=e2-micro \
I_UNDERSTAND_COSTS=yes \
./infra/gcp/deploy-vm.sh
```

Current deployed command:

```bash
PROJECT_ID=chessalive-495918 \
ZONE=us-central1-a \
MACHINE_TYPE=e2-micro \
I_UNDERSTAND_COSTS=yes \
./infra/gcp/deploy-vm.sh
```

Free Tier-shaped defaults:

- `e2-micro`
- `us-central1-a`
- 20 GB `pd-standard` boot disk
- one public static IP attached to the VM

The script:

- enables Compute Engine
- reserves a static regional IP
- creates a Debian VM
- uses a 20 GB standard persistent disk by default
- opens ports `80` and `443`
- builds the Expo web bundle
- uploads this repo to `/opt/chessalive`
- installs a `systemd` service for the Node server
- configures Caddy as the public web proxy

## DNS Cutover

This can only run after the Google account/project has access to the Cloud DNS zone for `chessalive.com`.

```bash
PROJECT_ID=<project-that-owns-the-zone> \
REGION=us-central1 \
I_UNDERSTAND_DNS_CUTOVER=yes \
./infra/gcp/dns-cutover.sh
```

If the zone remains inaccessible, update the existing DNS provider manually:

```text
chessalive.com.      A      <VM_STATIC_IP>
www.chessalive.com.  A      <VM_STATIC_IP>
```

Use TTL `300` during cutover so rollback is fast.
