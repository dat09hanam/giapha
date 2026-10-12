#!/usr/bin/env bash
# Chạy sau mỗi lần Plesk Git deploy (Git → "Enable additional deployment actions"):
#   bash scripts/deploy-plesk.sh
# Cài thư viện, build API + web, áp dụng migration rồi báo Passenger khởi động lại cả hai app.
set -euo pipefail

NODE_BIN="${NODE_BIN:-/opt/plesk/node/24/bin}"
export PATH="$NODE_BIN:$PATH"

cd "$(dirname "$0")/.."

echo "==> Cài thư viện (mọi workspace)"
npm install --include=dev --no-audit --no-fund

echo "==> Build API"
npm run build --workspace @giapha/api

echo "==> Áp dụng migration"
npm run prisma:deploy --workspace @giapha/api

echo "==> Build web"
# Hệ điều hành hosting quá cũ cho SWC native, nên Turbopack không chạy được; dùng Webpack.
(cd apps/web && npm exec -- next build --webpack)

echo "==> Khởi động lại app"
mkdir -p apps/api/tmp apps/web/tmp
touch apps/api/tmp/restart.txt apps/web/tmp/restart.txt

echo "==> Deploy xong"
