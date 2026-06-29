#!/bin/bash
set -e

if [ -z "$1" ] || [ -z "$2" ]; then
  echo "Usage: ./deploy.sh <host> <user>"
  echo "Example: ./deploy.sh 192.168.1.100 root"
  exit 1
fi

HOST="$1"
USER="$2"

echo "=== Deploying cscom to ${USER}@${HOST} ==="

echo "[1/4] Building binaries..."
bun run build

echo "[2/4] Copying to server..."
scp dist/cscom dist/cscom-serve dist/dashboard.html ${USER}@${HOST}:/tmp/

echo "[3/4] Installing on server..."
ssh ${USER}@${HOST} << 'EOF'
sudo mkdir -p /opt/cscom
sudo mv /tmp/cscom /tmp/cscom-serve /tmp/dashboard.html /opt/cscom/
sudo chmod +x /opt/cscom/cscom /opt/cscom/cscom-serve
sudo systemctl daemon-reload
sudo systemctl restart cscom
EOF

echo "[4/4] Done!"
echo "Dashboard: http://${HOST}:4040"
echo "Terminal:  ssh ${USER}@${HOST} /opt/cscom/cscom"
