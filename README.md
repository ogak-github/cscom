# Control System Commander (CSCom)

A lightweight system monitoring agent for Linux servers. Monitors CPU, RAM, disk, network, processes, and Docker containers in real-time.

## Features

- **CPU** — usage per core, load average, model info
- **RAM** — used/free/total with usage bar
- **Swap** — usage tracking
- **Disk** — usage per mount point
- **Network** — RX/TX bytes, packets per interface
- **Processes** — top processes sorted by CPU usage
- **Docker** — container CPU%, memory, network I/O (auto-detect, hidden if no containers)

## Modes

### 1. Terminal (TUI)

Real-time dashboard rendered directly in your terminal. Refreshes every 1 second.

```
bun run index.ts
```

### 2. Web Dashboard + API

Web-based dashboard with WebSocket real-time updates and REST API.

```
bun run src/transport/server.ts
```

- Dashboard: `http://localhost:4040`
- REST API: `http://localhost:4040/api/metrics`
- WebSocket: `ws://localhost:4040/ws`

## Installation

### Prerequisites

- Linux (tested on Ubuntu/Debian)
- Docker installed (optional, for container metrics)

### Quick Install (VPS)

```bash
git clone https://github.com/ogak-github/cscom /opt/cscom
cd /opt/cscom
bash setup.sh
```

This will:
1. Install Bun (if not present)
2. Copy project to `/opt/cscom`
3. Install production dependencies
4. Create and start a systemd service

Dashboard will be available at `http://<your-server-ip>:4040`.

### Manual Install

```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"

# Clone and install
git clone https://github.com/ogak-github/cscom /opt/cscom
cd /opt/cscom
bun install

# Run terminal mode
bun run index.ts

# Or run web server mode
bun run src/transport/server.ts
```

## Configuration

Environment variables (set in systemd service or `.env`):

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `4040` | Web server port |
| `CSCOM_KEY` | (empty) | API key for authentication. If empty, auth is disabled |

### Setting API Key

Edit the systemd service:

```bash
sudo nano /etc/systemd/system/cscom.service
```

Add or modify:

```
Environment=CSCOM_KEY=your-secret-key
```

Then restart:

```bash
sudo systemctl restart cscom
```

## Systemd Service

The setup script creates a systemd service at `/etc/systemd/system/cscom.service`.

Useful commands:

```bash
sudo systemctl status cscom     # Check status
sudo systemctl restart cscom    # Restart
sudo systemctl stop cscom       # Stop
sudo journalctl -u cscom -f     # View logs
```

## Project Structure

```
cscom/
├── index.ts                 # Terminal UI entry point
├── setup.sh                 # VPS installer script
├── src/
│   ├── metrics/
│   │   ├── cpu.ts           # CPU load averages and times
│   │   ├── ram.ts           # Memory and swap info
│   │   ├── disk.ts          # Disk usage via df
│   │   ├── network.ts       # Network stats from /proc/net/dev
│   │   ├── process.ts       # Top processes and CPU usage
│   │   └── docker.ts        # Docker container stats
│   └── transport/
│       ├── server.ts        # Bun HTTP + WebSocket server
│       └── dashboard.html   # Web dashboard UI
├── package.json
└── tsconfig.json
```

## Tech Stack

- Runtime: [Bun](https://bun.sh)
- Language: TypeScript (experimental TS7 via `@typescript/native-preview`)

## Notes

- **Docker metrics**: When running on bare metal, Docker containers are auto-detected. Metrics come from `docker stats` (container-level), while host metrics come from `/proc` (system-level).
- **Running in Docker**: Not recommended for host monitoring. Container metrics will only reflect the container's own resource usage, not the host.
