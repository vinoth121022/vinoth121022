#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project 2>/dev/null)}"
ZONE="${ZONE:-us-central1-a}"
REGION="${REGION:-${ZONE%-*}}"
INSTANCE_NAME="${INSTANCE_NAME:-chessalive-prod-1}"
ADDRESS_NAME="${ADDRESS_NAME:-chessalive-prod-ip}"
MACHINE_TYPE="${MACHINE_TYPE:-e2-micro}"
DOMAIN="${DOMAIN:-chessalive.com}"
SERVICE_EXTRA_ENV_LINES=""

if [[ -z "${PROJECT_ID}" ]]; then
  echo "PROJECT_ID is required." >&2
  exit 1
fi

if [[ "${I_UNDERSTAND_COSTS:-}" != "yes" ]]; then
  cat >&2 <<MSG
This creates billable Google Cloud resources in project ${PROJECT_ID}.
Re-run with I_UNDERSTAND_COSTS=yes after confirming billing/free-credit status.
MSG
  exit 2
fi

append_service_env() {
  local name="$1"
  local value="${!name:-}"
  if [[ -n "${value}" ]]; then
    SERVICE_EXTRA_ENV_LINES+="Environment=${name}=${value}"$'\n'
  fi
}

append_service_env CHESSALIVE_SITE_PASSWORD
append_service_env CHESSALIVE_CLOUDFLARE_TURN_KEY_ID
append_service_env CHESSALIVE_CLOUDFLARE_TURN_API_TOKEN
append_service_env CHESSALIVE_TURN_TTL_SECONDS
append_service_env CHESSALIVE_P2P_INVITE_TTL_MS
append_service_env RAZORPAY_KEY_ID
append_service_env RAZORPAY_KEY_SECRET
append_service_env RAZORPAY_PREMIUM_PLAN_ID
append_service_env RAZORPAY_PREMIUM_AMOUNT_PAISE
append_service_env RAZORPAY_PREMIUM_CURRENCY
append_service_env RAZORPAY_PREMIUM_TOTAL_COUNT
append_service_env RAZORPAY_WEBHOOK_SECRET

echo "Deploying ChessAlive to ${PROJECT_ID}/${ZONE} on ${INSTANCE_NAME}..."

gcloud services enable compute.googleapis.com --project="${PROJECT_ID}"

if ! gcloud compute addresses describe "${ADDRESS_NAME}" --region="${REGION}" --project="${PROJECT_ID}" >/dev/null 2>&1; then
  gcloud compute addresses create "${ADDRESS_NAME}" --region="${REGION}" --project="${PROJECT_ID}"
fi

EXTERNAL_IP="$(gcloud compute addresses describe "${ADDRESS_NAME}" --region="${REGION}" --project="${PROJECT_ID}" --format='value(address)')"

if ! gcloud compute firewall-rules describe chessalive-allow-web --project="${PROJECT_ID}" >/dev/null 2>&1; then
  gcloud compute firewall-rules create chessalive-allow-web \
    --project="${PROJECT_ID}" \
    --allow=tcp:80,tcp:443 \
    --target-tags=chessalive-web \
    --description="Allow public web traffic to ChessAlive"
fi

if ! gcloud compute instances describe "${INSTANCE_NAME}" --zone="${ZONE}" --project="${PROJECT_ID}" >/dev/null 2>&1; then
  gcloud compute instances create "${INSTANCE_NAME}" \
    --project="${PROJECT_ID}" \
    --zone="${ZONE}" \
    --machine-type="${MACHINE_TYPE}" \
    --image-family=debian-12 \
    --image-project=debian-cloud \
    --address="${EXTERNAL_IP}" \
    --boot-disk-type=pd-standard \
    --boot-disk-size=20GB \
    --tags=chessalive-web \
    --metadata-from-file=startup-script="${ROOT_DIR}/infra/gcp/vm-bootstrap.sh"
fi

echo "Building static web bundle..."
(
  cd "${ROOT_DIR}"
  npm ci
  npm run build:web
)

ARCHIVE="/tmp/chessalive-deploy-$(date +%s).tgz"
COPYFILE_DISABLE=1 tar -C "${ROOT_DIR}" \
  --exclude='./.git' \
  --exclude='./node_modules' \
  --exclude='./apps/player-app/.expo' \
  --exclude='./apps/realtime-server/data' \
  -czf "${ARCHIVE}" .

echo "Uploading app archive to VM..."
for attempt in {1..36}; do
  if gcloud compute ssh "${INSTANCE_NAME}" --zone="${ZONE}" --project="${PROJECT_ID}" --quiet --command="command -v node >/dev/null && command -v npm >/dev/null && systemctl is-active caddy >/dev/null" >/dev/null 2>&1; then
    break
  fi
  if [[ "${attempt}" == "36" ]]; then
    echo "VM did not become Node/Caddy-ready in time." >&2
    exit 5
  fi
  sleep 10
done

gcloud compute scp "${ARCHIVE}" "${INSTANCE_NAME}:/tmp/chessalive.tgz" --zone="${ZONE}" --project="${PROJECT_ID}" --quiet

echo "Installing app on VM..."
gcloud compute ssh "${INSTANCE_NAME}" --zone="${ZONE}" --project="${PROJECT_ID}" --quiet --command="
  set -euo pipefail
  sudo mkdir -p /opt/chessalive
  sudo tar -xzf /tmp/chessalive.tgz -C /opt/chessalive
  sudo npm --prefix /opt/chessalive/apps/realtime-server install --omit=dev --ignore-scripts
  sudo tee /etc/systemd/system/chessalive.service >/dev/null <<'SERVICE'
[Unit]
Description=ChessAlive web and realtime server
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/chessalive
Environment=NODE_ENV=production
Environment=CHESSALIVE_WEB_ROOT=/opt/chessalive/apps/player-app/dist
Environment=CHESSALIVE_REALTIME_PORT=8080
${SERVICE_EXTRA_ENV_LINES}
ExecStart=/usr/bin/node /opt/chessalive/apps/realtime-server/src/server.mjs
Restart=always
RestartSec=3
User=root

[Install]
WantedBy=multi-user.target
SERVICE
  sudo tee /etc/caddy/Caddyfile >/dev/null <<'CADDY'
{
	email lakshmi@chessalive.com
}

${DOMAIN}, www.${DOMAIN} {
	encode zstd gzip
	reverse_proxy 127.0.0.1:8080
}

http://${EXTERNAL_IP} {
	encode zstd gzip
	reverse_proxy 127.0.0.1:8080
}
CADDY
  sudo systemctl daemon-reload
  sudo systemctl enable chessalive
  sudo systemctl restart chessalive
  sudo caddy validate --config /etc/caddy/Caddyfile
  sudo systemctl restart caddy
"

echo "ChessAlive deployed."
echo "IP: ${EXTERNAL_IP}"
echo "Temporary URL: http://${EXTERNAL_IP}"
echo "DNS target for ${DOMAIN}: A ${EXTERNAL_IP}"
