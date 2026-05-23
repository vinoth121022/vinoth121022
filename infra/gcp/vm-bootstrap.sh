#!/usr/bin/env bash
set -euo pipefail

export DEBIAN_FRONTEND=noninteractive

apt-get update
apt-get install -y ca-certificates curl gnupg caddy

if ! command -v node >/dev/null 2>&1 || ! node --version | grep -Eq '^v2[0-9]\.'; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

mkdir -p /opt/chessalive
chown -R "${SUDO_USER:-root}:${SUDO_USER:-root}" /opt/chessalive || true

cat >/etc/caddy/Caddyfile <<'CADDY'
{
	email lakshmi@chessalive.com
}

chessalive.com, www.chessalive.com {
	encode zstd gzip
	reverse_proxy 127.0.0.1:8080
}

http://34.30.115.188 {
	encode zstd gzip
	reverse_proxy 127.0.0.1:8080
}
CADDY

systemctl enable caddy
systemctl restart caddy
