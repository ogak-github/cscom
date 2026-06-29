#!/bin/bash
set -e

if [ -z "$1" ]; then
  echo "Usage:"
  echo "  ./deploy.sh local          # Install on this machine"
  echo "  ./deploy.sh <ssh-alias>    # Deploy to remote server"
  echo ""
  echo "SSH config example (~/.ssh/config):"
  echo "  Host cscom-server"
  echo "      HostName 192.168.1.100"
  echo "      User root"
  exit 1
fi

SERVER="$1"

read -rsp "CSCOM_KEY (leave empty to disable auth): " CSCOM_KEY
echo

echo "[1/3] Typecheck..."
bun run tsgo --noEmit

echo "[2/3] Building binaries..."
bun build --compile --outfile dist/cscom index.ts
bun build --compile --outfile dist/cscom-serve src/transport/server.ts

if [ "$SERVER" = "local" ]; then
  echo "[3/3] Installing locally..."
  sudo mkdir -p /opt/cscom
  sudo cp dist/cscom dist/cscom-serve /opt/cscom/
  sudo chmod +x /opt/cscom/cscom /opt/cscom/cscom-serve
  sudo ln -sf /opt/cscom/cscom /usr/local/bin/cscom

  sudo tee /etc/systemd/system/cscom.service > /dev/null << SVC
[Unit]
Description=Control System Commander (CSCom)
After=network.target docker.service

[Service]
Type=simple
ExecStart=/opt/cscom/cscom-serve
Restart=always
RestartSec=5
Environment=PORT=4040
Environment=CSCOM_KEY=${CSCOM_KEY}

[Install]
WantedBy=multi-user.target
SVC

  sudo systemctl daemon-reload
  sudo systemctl enable --now cscom
  sudo systemctl restart cscom

  echo "Done!"
  echo "Dashboard: http://localhost:4040"
  echo "Terminal:  cscom"
else
  echo "[3/3] Deploying to ${SERVER}..."
  scp dist/cscom dist/cscom-serve ${SERVER}:/tmp/

  ssh ${SERVER} << EOF
sudo mkdir -p /opt/cscom
sudo mv /tmp/cscom /tmp/cscom-serve /opt/cscom/
sudo chmod +x /opt/cscom/cscom /opt/cscom/cscom-serve
sudo ln -sf /opt/cscom/cscom /usr/local/bin/cscom

sudo tee /etc/systemd/system/cscom.service > /dev/null << SVC
[Unit]
Description=Control System Commander (CSCom)
After=network.target docker.service

[Service]
Type=simple
ExecStart=/opt/cscom/cscom-serve
Restart=always
RestartSec=5
Environment=PORT=4040
Environment=CSCOM_KEY=${CSCOM_KEY}

[Install]
WantedBy=multi-user.target
SVC

sudo systemctl daemon-reload
sudo systemctl enable --now cscom
sudo systemctl restart cscom
EOF

  HOST=$(ssh -G ${SERVER} | grep "^hostname " | awk '{print $2}')
  echo "Done!"
  echo "Dashboard: http://${HOST}:4040"
  echo "Terminal:  ssh ${SERVER} /opt/cscom/cscom"
fi
