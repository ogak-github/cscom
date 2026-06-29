#!/bin/bash
set -e

INSTALL_DIR="/opt/cscom"
SERVICE_NAME="cscom"

echo "=== Control System Commander (CSCom) installer ==="

# Install Bun (needed for building)
if ! command -v bun &> /dev/null; then
  echo "[1/5] Installing Bun..."
  curl -fsSL https://bun.sh/install | bash
  export BUN_INSTALL="$HOME/.bun"
  export PATH="$BUN_INSTALL/bin:$PATH"
else
  echo "[1/5] Bun already installed"
fi

# Build binaries
echo "[2/5] Building binaries..."
bun run build

# Install binaries
echo "[3/5] Installing to $INSTALL_DIR..."
sudo mkdir -p "$INSTALL_DIR"
sudo cp dist/cscom dist/cscom-serve dist/dashboard.html "$INSTALL_DIR/"
sudo chmod +x "$INSTALL_DIR/cscom" "$INSTALL_DIR/cscom-serve"
sudo chown -R "$USER:$USER" "$INSTALL_DIR"

# Create systemd service
echo "[4/5] Creating systemd service..."
sudo tee /etc/systemd/system/${SERVICE_NAME}.service > /dev/null <<EOF
[Unit]
Description=Control System Commander (CSCom)
After=network.target docker.service

[Service]
Type=simple
ExecStart=${INSTALL_DIR}/cscom-serve
Restart=always
RestartSec=5
Environment=PORT=4040
Environment=CSCOM_KEY=

[Install]
WantedBy=multi-user.target
EOF

# Enable and start
echo "[5/5] Starting service..."
sudo systemctl daemon-reload
sudo systemctl enable --now ${SERVICE_NAME}

echo ""
echo "=== Done! ==="
echo "Dashboard: http://$(hostname -I | awk '{print $1}'):4040"
echo "API:       http://$(hostname -I | awk '{print $1}'):4040/api/metrics"
echo "Binary:    ${INSTALL_DIR}/cscom-serve"
echo ""
echo "Terminal mode (run locally):"
echo "  ${INSTALL_DIR}/cscom"
echo ""
echo "To set API key:"
echo "  Edit /etc/systemd/system/cscom.service"
echo "  Add: Environment=CSCOM_KEY=your-secret-key"
echo "  Then: sudo systemctl restart cscom"
