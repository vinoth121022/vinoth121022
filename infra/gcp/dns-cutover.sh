#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project 2>/dev/null)}"
DOMAIN="${DOMAIN:-chessalive.com}"
ADDRESS_NAME="${ADDRESS_NAME:-chessalive-prod-ip}"
REGION="${REGION:-us-central1}"

if [[ -z "${PROJECT_ID}" ]]; then
  echo "PROJECT_ID is required." >&2
  exit 1
fi

if [[ "${I_UNDERSTAND_DNS_CUTOVER:-}" != "yes" ]]; then
  cat >&2 <<MSG
This changes public DNS records for ${DOMAIN}.
Re-run with I_UNDERSTAND_DNS_CUTOVER=yes after verifying the zone and target IP.
MSG
  exit 2
fi

ZONE_NAME="$(gcloud dns managed-zones list \
  --project="${PROJECT_ID}" \
  --filter="dnsName=${DOMAIN}." \
  --format='value(name)' \
  --limit=1)"

if [[ -z "${ZONE_NAME}" ]]; then
  echo "No Cloud DNS managed zone for ${DOMAIN}. found in project ${PROJECT_ID}." >&2
  exit 3
fi

EXTERNAL_IP="$(gcloud compute addresses describe "${ADDRESS_NAME}" \
  --region="${REGION}" \
  --project="${PROJECT_ID}" \
  --format='value(address)')"

if [[ -z "${EXTERNAL_IP}" ]]; then
  echo "No reserved IP found for ${ADDRESS_NAME} in ${REGION}." >&2
  exit 4
fi

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "${TMP_DIR}"' EXIT

gcloud dns record-sets transaction start --zone="${ZONE_NAME}" --project="${PROJECT_ID}" --transaction-file="${TMP_DIR}/tx.yaml"

for name in "${DOMAIN}." "www.${DOMAIN}."; do
  while IFS=$'\t' read -r record_type ttl rrdatas; do
    [[ -z "${record_type}" || -z "${ttl}" || -z "${rrdatas}" ]] && continue
    IFS=';' read -r -a record_values <<<"${rrdatas}"
    gcloud dns record-sets transaction remove "${record_values[@]}" \
      --zone="${ZONE_NAME}" \
      --project="${PROJECT_ID}" \
      --transaction-file="${TMP_DIR}/tx.yaml" \
      --name="${name}" \
      --ttl="${ttl}" \
      --type="${record_type}"
  done < <(
    gcloud dns record-sets list \
      --zone="${ZONE_NAME}" \
      --project="${PROJECT_ID}" \
      --name="${name}" \
      --filter='type=(A CNAME)' \
      --format='value(type,ttl,rrdatas)' || true
  )

  gcloud dns record-sets transaction add "${EXTERNAL_IP}" \
    --zone="${ZONE_NAME}" \
    --project="${PROJECT_ID}" \
    --transaction-file="${TMP_DIR}/tx.yaml" \
    --name="${name}" \
    --ttl=300 \
    --type=A
done

gcloud dns record-sets transaction execute --zone="${ZONE_NAME}" --project="${PROJECT_ID}" --transaction-file="${TMP_DIR}/tx.yaml"

echo "DNS cutover submitted:"
echo "${DOMAIN}. A ${EXTERNAL_IP}"
echo "www.${DOMAIN}. A ${EXTERNAL_IP}"
