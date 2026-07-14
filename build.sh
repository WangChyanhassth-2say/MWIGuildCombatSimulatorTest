#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="${SCRIPT_DIR}"
NGINX_ROOT="/usr/share/nginx/html"
NGINX_CONF="/etc/nginx/conf.d/default.conf"
PORT="5742"

if ! command -v nginx >/dev/null 2>&1; then
    apt-get update
    apt-get install -y nginx
fi

if ! command -v node >/dev/null 2>&1; then
    apt-get update
    apt-get install -y curl ca-certificates gnupg
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi

cd "${APP_DIR}"
npm install
npm run build

mkdir -p "${NGINX_ROOT}" /etc/nginx/conf.d
rm -rf "${NGINX_ROOT:?}/"*
cp -r "${APP_DIR}/dist/." "${NGINX_ROOT}/"

cat > "${NGINX_CONF}" <<EOF
server {
    listen ${PORT};
    server_name _;

    root ${NGINX_ROOT};
    index trial.html;

    location / {
        try_files \$uri \$uri/ /trial.html;
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss;
}
EOF

rm -f /etc/nginx/sites-enabled/default /etc/nginx/sites-available/default
nginx -t
