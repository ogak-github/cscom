import os from "os";
import { getDiskInfo } from "./src/metrics/disk";
import { getActiveInterfaces, getNetworkSpeed } from "./src/metrics/network";
import { getCpuUsagePercent, getProcessList, getSystemInfo } from "./src/metrics/process";
import { readableRam, getTotalMemory, getUsedMemory, getSwapInfo } from "./src/metrics/ram";
import { isDockerAvailable, getContainerStats } from "./src/metrics/docker";

const REFRESH_INTERVAL_MS = 1000;

function formatBytes(bytes: number): string {
  return readableRam(bytes);
}

function formatSpeed(bytesPerSec: number): string {
  if (bytesPerSec === 0) return "0 B/s";
  return `${formatBytes(bytesPerSec)}/s`;
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${days}d ${hours}h ${mins}m`;
}

function formatTime(): string {
  return new Date().toLocaleTimeString("en-GB", { hour12: false });
}

let dockerAvailable = false;

async function render() {
  const totalMem = getTotalMemory();
  const usedMem = getUsedMemory();
  const freeMem = totalMem - usedMem;
  const usagePct = ((usedMem / totalMem) * 100).toFixed(1);

  const sysInfo = getSystemInfo();
  const cpuUsage = await getCpuUsagePercent();
  const loadAvg = os.loadavg().map((v) => v.toFixed(2)).join(", ");
  const disks = await getDiskInfo();
  const interfaces = await getActiveInterfaces();
  const speeds = await getNetworkSpeed();
  const processes = await getProcessList(5);

  const lines: string[] = [];
  lines.push(`\x1b[1m\x1b[36mcscom\x1b[0m \x1b[90m${formatTime()}\x1b[0m  Refresh: ${REFRESH_INTERVAL_MS}ms  Press Ctrl+C to exit`);
  lines.push(`${"─".repeat(60)}`);

  lines.push(`\x1b[1m Platform\x1b[0m   ${sysInfo.platform} (${sysInfo.arch})  ${sysInfo.hostname}`);
  lines.push(`\x1b[1m Uptime\x1b[0m     ${formatUptime(sysInfo.uptime)}`);
  lines.push(`\x1b[1m CPU\x1b[0m        ${sysInfo.cpuModel}`);
  lines.push(`\x1b[1m Cores\x1b[0m      ${sysInfo.cpuCount}   Load: ${loadAvg}   Usage: \x1b[33m${cpuUsage}%\x1b[0m`);

  lines.push(`${"─".repeat(60)}`);
  lines.push(`\x1b[1m Memory\x1b[0m`);
  const memBar = makeBar(usedMem / totalMem, 30);
  lines.push(`  \x1b[1mRAM \x1b[0m ${memBar}  ${usagePct}%  ${formatBytes(usedMem)} / ${formatBytes(totalMem)}`);

  const swap = getSwapInfo();
  if (swap) {
    const swapBar = makeBar(swap.usagePercent / 100, 30);
    lines.push(`  \x1b[1mSwap\x1b[0m ${swapBar}  ${swap.usagePercent}%  ${formatBytes(swap.used)} / ${formatBytes(swap.total)}`);
  }

  lines.push(`${"─".repeat(60)}`);
  lines.push(`\x1b[1m Disk\x1b[0m`);
  for (const d of disks) {
    const bar = makeBar(d.usagePercent / 100, 30);
    lines.push(`  ${d.mountPoint.padEnd(12)} ${bar}  ${String(d.usagePercent).padStart(3)}%  ${formatBytes(d.usedBytes)}`);
  }

  lines.push(`${"─".repeat(60)}`);
  lines.push(`\x1b[1m Network\x1b[0m`);
  for (let i = 0; i < interfaces.length; i++) {
    const iface = interfaces[i]!;
    const speed = speeds[i]!;
    lines.push(`  ${iface.name.padEnd(16)} RX ${formatBytes(iface.rxBytes).padStart(10)} (${formatSpeed(speed.rxSpeed)})  TX ${formatBytes(iface.txBytes).padStart(10)} (${formatSpeed(speed.txSpeed)})`);
  }

  if (dockerAvailable) {
    const containers = await getContainerStats();
    if (containers.length > 0) {
      lines.push(`${"─".repeat(60)}`);
      lines.push(`\x1b[1m Docker Containers\x1b[0m`);
      lines.push(`  ${"NAME".padEnd(18)} ${"CPU%".padEnd(8)} ${"MEM%".padEnd(8)} ${"Mem Usage".padEnd(20)} Net I/O`);
      for (const c of containers) {
        lines.push(`  ${c.name.padEnd(18)} ${c.cpuPercent.padEnd(8)} ${c.memPercent.padEnd(8)} ${c.memUsage.padEnd(20)} ${c.netIo}`);
      }
    }
  }

  lines.push(`${"─".repeat(60)}`);
  lines.push(`\x1b[1m Top Processes\x1b[0m`);
  lines.push(`  ${"PID".padEnd(8)} ${"CPU%".padEnd(8)} ${"MEM%".padEnd(8)} ${"RSS".padEnd(12)} Name`);
  for (const p of processes) {
    lines.push(`  ${String(p.pid).padEnd(8)} ${String(p.cpuPercent).padEnd(8)} ${String(p.memPercent).padEnd(8)} ${formatBytes(p.memRss).padEnd(12)} ${p.name}`);
  }

  process.stdout.write(`\x1b[H${lines.join("\n")}\n\x1b[J`);
}

function makeBar(ratio: number, width: number): string {
  const filled = Math.round(ratio * width);
  const empty = width - filled;
  const color = ratio > 0.9 ? "\x1b[31m" : ratio > 0.7 ? "\x1b[33m" : "\x1b[32m";
  return `${color}${"█".repeat(filled)}\x1b[90m${"░".repeat(empty)}\x1b[0m`;
}

function cleanup() {
  process.stdout.write("\x1b[?1049l\x1b[?25h");
  process.exit(0);
}

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);

process.stdout.write("\x1b[?1049h\x1b[?25l");

async function loop() {
  dockerAvailable = await isDockerAvailable();
  while (true) {
    await render();
    await new Promise((r) => setTimeout(r, REFRESH_INTERVAL_MS));
  }
}

loop();
