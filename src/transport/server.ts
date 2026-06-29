import os from "os";
import { getDiskInfo } from "../metrics/disk";
import { getActiveInterfaces } from "../metrics/network";
import { getCpuUsagePercent, getProcessList, getSystemInfo } from "../metrics/process";
import { getSwapInfo } from "../metrics/ram";
import { isDockerAvailable, getContainerStats } from "../metrics/docker";

const PORT = parseInt(process.env.PORT || "4040", 10);
const API_KEY = process.env.CSCOM_KEY || "";
const AUTH_ENABLED = API_KEY.length > 0;
const dockerAvailable = await isDockerAvailable();

import { dashboardHtml } from "./dashboard-embed";

function checkAuth(req: Request): boolean {
  if (!AUTH_ENABLED) return true;

  const url = new URL(req.url);

  const authHeader = req.headers.get("Authorization");
  if (authHeader === `Bearer ${API_KEY}`) return true;

  const queryKey = url.searchParams.get("key");
  if (queryKey === API_KEY) return true;

  return false;
}

function unauthorized(): Response {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

async function getMetrics() {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const cpuUsage = await getCpuUsagePercent();
  const disks = await getDiskInfo();
  const interfaces = await getActiveInterfaces();
  const processes = await getProcessList(10);
  const sysInfo = getSystemInfo();

  return {
    timestamp: Date.now(),
    system: {
      platform: sysInfo.platform,
      arch: sysInfo.arch,
      hostname: sysInfo.hostname,
      uptime: sysInfo.uptime,
      cpuCount: sysInfo.cpuCount,
      cpuModel: sysInfo.cpuModel,
      loadAverage: os.loadavg(),
    },
    cpu: {
      usagePercent: cpuUsage,
      cores: os.cpus().map((c) => ({
        model: c.model,
        speed: c.speed,
        times: c.times,
      })),
    },
    memory: {
      total: totalMem,
      used: usedMem,
      free: freeMem,
      usagePercent: parseFloat(((usedMem / totalMem) * 100).toFixed(1)),
    },
    swap: getSwapInfo(),
    disk: disks.map((d) => ({
      filesystem: d.filesystem,
      mountPoint: d.mountPoint,
      total: d.totalBytes,
      used: d.usedBytes,
      free: d.freeBytes,
      usagePercent: d.usagePercent,
    })),
    network: interfaces.map((n) => ({
      name: n.name,
      rxBytes: n.rxBytes,
      txBytes: n.txBytes,
      rxPackets: n.rxPackets,
      txPackets: n.txPackets,
    })),
    processes: processes.map((p) => ({
      pid: p.pid,
      name: p.name,
      cpuPercent: p.cpuPercent,
      memPercent: p.memPercent,
      memRss: p.memRss,
      state: p.state,
    })),
    docker: dockerAvailable ? (await getContainerStats()).map((c) => ({
      name: c.name,
      cpuPercent: c.cpuPercent,
      memPercent: c.memPercent,
      memUsage: c.memUsage,
      netIo: c.netIo,
    })) : [],
  };
}

const clients = new Set<any>();

const server = Bun.serve({
  port: PORT,
  fetch(req, server) {
    const url = new URL(req.url);

    if (url.pathname === "/") {
      return new Response(dashboardHtml, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    if (url.pathname === "/api/auth") {
      return Response.json({ authRequired: AUTH_ENABLED });
    }

    if (url.pathname === "/ws") {
      if (AUTH_ENABLED) {
        const wsKey = url.searchParams.get("key");
        if (wsKey !== API_KEY) {
          return new Response("Unauthorized", { status: 401 });
        }
      }
      if (server.upgrade(req)) {
        return undefined;
      }
      return new Response("WebSocket upgrade failed", { status: 500 });
    }

    if (url.pathname === "/api/metrics") {
      if (!checkAuth(req)) return unauthorized();
      return getMetrics().then((m) => Response.json(m));
    }

    return new Response("Not Found", { status: 404 });
  },
  websocket: {
    open(ws) {
      clients.add(ws);
      getMetrics().then((m) => ws.send(JSON.stringify(m)));
    },
    message() {},
    close(ws) {
      clients.delete(ws);
    },
  },
});

async function broadcast() {
  if (clients.size === 0) return;
  const metrics = await getMetrics();
  const data = JSON.stringify(metrics);
  for (const client of clients) {
    client.send(data);
  }
}

setInterval(broadcast, 1000);

console.log(`cscom API running at http://localhost:${PORT}`);
console.log(`  Dashboard: http://localhost:${PORT}/`);
console.log(`  REST API:  http://localhost:${PORT}/api/metrics`);
console.log(`  WebSocket: ws://localhost:${PORT}/ws`);
if (AUTH_ENABLED) {
  console.log(`  Auth:      ENABLED (CSCOM_KEY set)`);
} else {
  console.log(`  Auth:      DISABLED (set CSCOM_KEY to enable)`);
}
