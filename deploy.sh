#!/bin/bash
set -e

if [ -z "$1" ]; then
  echo "Usage: ./deploy.sh <ssh-alias>"
  echo ""
  echo "SSH config example (~/.ssh/config):"
  echo "  Host cscom-server"
  echo "      HostName 192.168.1.100"
  echo "      User root"
  echo ""
  echo "Then run:"
  echo "  ./deploy.sh cscom-server"
  exit 1
fi

SERVER="$1"

echo "=== Deploying cscom to ${SERVER} ==="

echo "[1/4] Building binaries..."
bun run build

echo "[2/4] Copying to server..."
scp dist/cscom dist/cscom-serve dist/dashboard.html ${SERVER}:/tmp/

echo "[3/4] Installing on server..."
ssh ${SERVER} << 'EOF'
sudo mkdir -p /opt/cscom
sudo mv /tmp/cscom /tmp/cscom-serve /tmp/dashboard.html /opt/cscom/
sudo chmod +x /opt/cscom/cscom /opt/cscom/cscom-serve
sudo ln -sf /opt/cscom/cscom /usr/local/bin/cscom

if [ ! -f /etc/systemd/system/cscom.service ]; then
  sudo tee /etc/systemd/system/cscom.service > /dev/null << 'SVC'
[Unit]
Description=Control System Commander (CSCom)
After=network.target docker.service

[Service]
Type=simple
ExecStart=/opt/cscom/cscom-serve
Restart=always
RestartSec=5
Environment=PORT=4040
Environment=CSCOM_KEY=

[Install]
WantedBy=multi-user.target
SVC
fi

sudo systemctl daemon-reload
sudo systemctl enable --now cscom
EOF

HOST=$(ssh -G ${SERVER} | grep "^hostname " | awk '{print $2}')
echo "[4/4] Done!"
echo "Dashboard: http://${HOST}:4040"
echo "Terminal:  ssh ${SERVER} /opt/cscom/cscom"
