import { $ } from "bun";
import os from "os";

interface ProcessInfo {
  pid: number;
  name: string;
  cpuPercent: number;
  memPercent: number;
  memRss: number;
  state: string;
}

interface SystemCpuStats {
  user: number;
  nice: number;
  system: number;
  idle: number;
  iowait: number;
  irq: number;
  softirq: number;
  steal: number;
  total: number;
}

let prevCpuStats: SystemCpuStats | null = null;

function parseCpuStats(line: string): SystemCpuStats {
  const parts = line.split(/\s+/);
  const user = parseInt(parts[1]!, 10) || 0;
  const nice = parseInt(parts[2]!, 10) || 0;
  const system = parseInt(parts[3]!, 10) || 0;
  const idle = parseInt(parts[4]!, 10) || 0;
  const iowait = parseInt(parts[5]!, 10) || 0;
  const irq = parseInt(parts[6]!, 10) || 0;
  const softirq = parseInt(parts[7]!, 10) || 0;
  const steal = parseInt(parts[8]!, 10) || 0;
  const total = user + nice + system + idle + iowait + irq + softirq + steal;
  return { user, nice, system, idle, iowait, irq, softirq, steal, total };
}

export async function getCpuUsagePercent(): Promise<number> {
  const stdout = await $`head -1 /proc/stat`.text();
  const current = parseCpuStats(stdout.trim());
  
  if (!prevCpuStats) {
    prevCpuStats = current;
    return 0;
  }
  
  const totalDiff = current.total - prevCpuStats.total;
  const idleDiff = current.idle - prevCpuStats.idle;
  const usage = totalDiff > 0 ? Math.round(((totalDiff - idleDiff) / totalDiff) * 100) : 0;
  
  prevCpuStats = current;
  return usage;
}

export async function getProcessList(topN: number = 10): Promise<ProcessInfo[]> {
  const result = await $`ps aux --sort=-%cpu`.text();
  const lines = result.trim().split("\n").slice(1, topN + 1);
  
  return lines.map((line) => {
    const parts = line.trim().split(/\s+/);
    return {
      pid: parseInt(parts[1]!, 10) || 0,
      name: parts[10] || "unknown",
      cpuPercent: parseFloat(parts[2]!) || 0,
      memPercent: parseFloat(parts[3]!) || 0,
      memRss: parseInt(parts[5]!, 10) * 1024 || 0,
      state: parts[7] || "?",
    };
  });
}

export function getSystemInfo() {
  return {
    platform: os.platform(),
    arch: os.arch(),
    hostname: os.hostname(),
    uptime: os.uptime(),
    cpuCount: os.cpus().length,
    cpuModel: os.cpus()[0]?.model || "unknown",
  };
}
