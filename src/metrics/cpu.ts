import os from "os";

export function getLoadAverages(): [number, number, number] {
  const avg = os.loadavg();
  return [avg[0]!, avg[1]!, avg[2]!];
}

export function getCpuCount(): number {
  return os.cpus().length;
}

export function getCpuModel(): string {
  return os.cpus()[0]?.model || "unknown";
}

export function getCpuTimes() {
  return os.cpus().map((cpu) => ({
    model: cpu.model,
    speed: cpu.speed,
    user: cpu.times.user,
    nice: cpu.times.nice,
    sys: cpu.times.sys,
    idle: cpu.times.idle,
    irq: cpu.times.irq,
  }));
}

export function getProcessCpuUsage() {
  const usage = process.cpuUsage();
  return {
    user: usage.user,
    system: usage.system,
    total: usage.user + usage.system,
  };
}
