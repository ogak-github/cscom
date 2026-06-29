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

## Deploy

Both local and remote deploy use the same script. It will prompt for an API key before building.

### Local machine

```bash
./deploy.sh local
```

### Remote server

Setup `~/.ssh/config` first:

```
Host my-vps
    HostName 192.168.1.100
    User root
```

Then:

```bash
./deploy.sh my-vps
```

Both commands will:
1. Prompt for `CSCOM_KEY` (leave empty to disable auth)
2. Typecheck with TS7
3. Build standalone binaries
4. Install to `/opt/cscom` + create systemd service
5. Start/restart the service

## Usage

### Terminal (TUI)

```bash
cscom
```

### Web Dashboard

The dashboard is served by the `cscom-serve` binary (managed by systemd):

- Dashboard: `http://<host>:4040`
- REST API: `http://<host>:4040/api/metrics`
- WebSocket: `ws://<host>:4040/ws`

If `CSCOM_KEY` is set, the dashboard will show a login dialog on first visit.

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `4040` | Web server port |
| `CSCOM_KEY` | (empty) | API key. If empty, auth is disabled |

To change the key after deploy, edit the systemd service:

```bash
sudo nano /etc/systemd/system/cscom.service
sudo systemctl restart cscom
```

## Systemd

```bash
sudo systemctl status cscom
sudo systemctl restart cscom
sudo systemctl stop cscom
sudo journalctl -u cscom -f
```

## Project Structure

```
cscom/
├── index.ts                 # Terminal UI entry point
├── deploy.sh                # Deploy (local or remote)
├── src/
│   ├── metrics/
│   │   ├── cpu.ts
│   │   ├── ram.ts
│   │   ├── disk.ts
│   │   ├── network.ts
│   │   ├── process.ts
│   │   └── docker.ts
│   └── transport/
│       ├── server.ts        # Bun HTTP + WebSocket server
│       ├── dashboard.html   # Web dashboard UI
│       └── dashboard-macro.ts  # Embeds HTML at compile time
├── dist/                    # Build output
├── package.json
└── tsconfig.json
```

## Tech Stack

- Runtime: [Bun](https://bun.sh)
- Language: TypeScript (experimental TS7 via `@typescript/native-preview`)
- Binaries are fully standalone — no runtime dependencies on the target server

## Notes

- **Docker metrics**: Auto-detected on bare metal via `docker stats`.
- **Running in Docker**: Not recommended for host monitoring — metrics will reflect the container, not the host.
