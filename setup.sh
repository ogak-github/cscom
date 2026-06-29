#!/bin/bash
set -e

INSTALL_DIR="/opt/sysmon-agent"
SERVICE_NAME="sysmon-agent"

echo "=== sysmon-agent installer ==="

# Install Bun
if ! command -v bun &> /dev/null; then
  echo "[1/4] Installing Bun..."
  curl -fsSL https://bun.sh/install | bash
  export BUN_INSTALL="$HOME/.bun"
  export PATH="$BUN_INSTALL/bin:$PATH"
else
  echo "[1/4] Bun already installed"
fi

# Copy project files
echo "[2/4] Copying files to $INSTALL_DIR..."
sudo mkdir -p "$INSTALL_DIR"
sudo cp -r ./* "$INSTALL_DIR/"
sudo chown -R "$USER:$USER" "$INSTALL_DIR"

# Install dependencies
echo "[3/4] Installing dependencies..."
cd "$INSTALL_DIR"
bun install --production

# Create systemd service
echo "[4/4] Creating systemd service..."
sudo tee /etc/systemd/system/${SERVICE_NAME}.service > /dev/null <<EOF
[Unit]
Description=Sysmon System Monitor
After=network.target docker.service

[Service]
Type=simple
WorkingDirectory=${INSTALL_DIR}
ExecStart=${HOME}/.bun/bin/bun run src/transport/server.ts
Restart=always
RestartSec=5
Environment=PORT=4040
Environment=SYSMON_KEY=

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now ${SERVICE_NAME}

echo ""
echo "=== Done! ==="
echo "Dashboard: http://$(hostname -I | awk '{print $1}'):4040"
echo "API:       http://$(hostname -I | awk '{print $1}'):4040/api/metrics"
echo ""
echo "To set API key:"
echo "  Edit /etc/systemd/system/sysmon-agent.service"
echo "  Add: Environment=SYSMON_KEY=your-secret-key"
echo "  Then: sudo systemctl restart sysmon-agent"
