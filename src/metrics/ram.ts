import os from "os";
import { readFileSync } from "fs";

export function getTotalMemory(): number {
  return os.totalmem();
}

export function getFreeMemory(): number {
  return os.freemem();
}

export function getUsedMemory(): number {
  return getTotalMemory() - getFreeMemory();
}

export function getMemoryUsagePercent(): number {
  const total = getTotalMemory();
  const used = getUsedMemory();
  return total > 0 ? parseFloat(((used / total) * 100).toFixed(1)) : 0;
}

interface SwapInfo {
  total: number;
  free: number;
  used: number;
  usagePercent: number;
}

export function getSwapInfo(): SwapInfo | null {
  try {
    const meminfo = readFileSync("/proc/meminfo", "utf-8");
    const totalMatch = meminfo.match(/SwapTotal:\s+(\d+)\s+kB/);
    const freeMatch = meminfo.match(/SwapFree:\s+(\d+)\s+kB/);

    const total = totalMatch ? parseInt(totalMatch[1]!, 10) * 1024 : 0;
    const free = freeMatch ? parseInt(freeMatch[1]!, 10) * 1024 : 0;

    if (total === 0) return null;

    const used = total - free;
    return {
      total,
      free,
      used,
      usagePercent: parseFloat(((used / total) * 100).toFixed(1)),
    };
  } catch {
    return null;
  }
}

export function readableRam(bytes: number): string {
  const units = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  let unitIndex = 0;
  let value = bytes;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }
  return `${value.toFixed(2)} ${units[unitIndex]}`;
}
