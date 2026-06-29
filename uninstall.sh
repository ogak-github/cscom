#!/bin/bash
set -e

if [ -z "$1" ]; then
  echo "Usage:"
  echo "  ./uninstall.sh local        # Uninstall from this machine"
  echo "  ./uninstall.sh <ssh-alias>  # Uninstall from remote server"
  exit 1
fi

INSTALL_DIR="/opt/cscom"
SERVICE_NAME="cscom"

do_uninstall() {
  if systemctl is-active --quiet "$SERVICE_NAME" 2>/dev/null; then
    echo "[1/4] Stopping service..."
    sudo systemctl stop "$SERVICE_NAME"
  else
    echo "[1/4] Service not running, skipping"
  fi

  if [ -f "/etc/systemd/system/${SERVICE_NAME}.service" ]; then
    echo "[2/4] Removing systemd service..."
    sudo systemctl disable "$SERVICE_NAME" 2>/dev/null || true
    sudo rm /etc/systemd/system/${SERVICE_NAME}.service
    sudo systemctl daemon-reload
  else
    echo "[2/4] No systemd service found, skipping"
  fi

  if [ -L "/usr/local/bin/cscom" ]; then
    echo "[3/4] Removing /usr/local/bin/cscom symlink..."
    sudo rm /usr/local/bin/cscom
  else
    echo "[3/4] No symlink found, skipping"
  fi

  if [ -d "$INSTALL_DIR" ]; then
    echo "[4/4] Removing $INSTALL_DIR..."
    sudo rm -rf "$INSTALL_DIR"
  else
    echo "[4/4] No install directory found, skipping"
  fi

  echo ""
  echo "=== Done! CSCom has been uninstalled. ==="
}

if [ "$1" = "local" ]; then
  do_uninstall
else
  SERVER="$1"
  echo "=== Uninstalling CSCom from ${SERVER} ==="
  ssh "${SERVER}" "$(declare -f do_uninstall); do_uninstall"
fi
