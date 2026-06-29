#!/bin/bash
set -e

INSTALL_DIR="/opt/sysmon"
SERVICE_NAME="sysmon"

echo "=== sysmon uninstaller ==="

# Stop and remove systemd service
if systemctl is-active --quiet "$SERVICE_NAME" 2>/dev/null; then
  echo "[1/3] Stopping service..."
  sudo systemctl stop "$SERVICE_NAME"
fi

if [ -f "/etc/systemd/system/${SERVICE_NAME}.service" ]; then
  echo "[2/3] Removing systemd service..."
  sudo systemctl disable "$SERVICE_NAME" 2>/dev/null || true
  sudo rm /etc/systemd/system/${SERVICE_NAME}.service
  sudo systemctl daemon-reload
else
  echo "[2/3] No systemd service found, skipping"
fi

# Remove installed files
if [ -d "$INSTALL_DIR" ]; then
  echo "[3/3] Removing $INSTALL_DIR..."
  sudo rm -rf "$INSTALL_DIR"
else
  echo "[3/3] No install directory found, skipping"
fi

echo ""
echo "=== Done! ==="
echo "sysmon has been uninstalled."
echo ""
echo "To also remove Bun, run:"
echo "  rm -rf ~/.bun"
echo "  sudo rm -f /usr/local/bin/bun"
