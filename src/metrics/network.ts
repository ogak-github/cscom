import { file } from "bun";

interface NetworkInterface {
  name: string;
  rxBytes: number;
  rxPackets: number;
  rxErrors: number;
  rxDropped: number;
  txBytes: number;
  txPackets: number;
  txErrors: number;
  txDropped: number;
}

export async function getNetworkStats(): Promise<NetworkInterface[]> {
  const content = await file("/proc/net/dev").text();
  const lines = content.trim().split("\n").slice(2);
  
  const interfaces: NetworkInterface[] = [];
  for (const line of lines) {
    const parts = line.trim().split(/[\s:]+/);
    if (parts.length >= 17) {
      interfaces.push({
        name: parts[0]!,
        rxBytes: parseInt(parts[1]!, 10) || 0,
        rxPackets: parseInt(parts[2]!, 10) || 0,
        rxErrors: parseInt(parts[3]!, 10) || 0,
        rxDropped: parseInt(parts[4]!, 10) || 0,
        txBytes: parseInt(parts[9]!, 10) || 0,
        txPackets: parseInt(parts[10]!, 10) || 0,
        txErrors: parseInt(parts[11]!, 10) || 0,
        txDropped: parseInt(parts[12]!, 10) || 0,
      });
    }
  }
  return interfaces;
}

export async function getActiveInterfaces(): Promise<NetworkInterface[]> {
  const all = await getNetworkStats();
  return all.filter(iface => iface.name !== "lo");
}

let previousStats: Map<string, { rxBytes: number; txBytes: number; timestamp: number }> | null = null;

export async function getNetworkSpeed(): Promise<{ rxSpeed: number; txSpeed: number }[]> {
  const current = await getActiveInterfaces();
  const now = Date.now();
  
  if (!previousStats) {
    previousStats = new Map();
    for (const iface of current) {
      previousStats.set(iface.name, {
        rxBytes: iface.rxBytes,
        txBytes: iface.txBytes,
        timestamp: now,
      });
    }
    return current.map(() => ({ rxSpeed: 0, txSpeed: 0 }));
  }
  
  const speeds: { rxSpeed: number; txSpeed: number }[] = [];
  for (const iface of current) {
    const prev = previousStats.get(iface.name);
    if (prev) {
      const elapsed = (now - prev.timestamp) / 1000;
      if (elapsed > 0) {
        speeds.push({
          rxSpeed: Math.round((iface.rxBytes - prev.rxBytes) / elapsed),
          txSpeed: Math.round((iface.txBytes - prev.txBytes) / elapsed),
        });
      } else {
        speeds.push({ rxSpeed: 0, txSpeed: 0 });
      }
    } else {
      speeds.push({ rxSpeed: 0, txSpeed: 0 });
    }
    previousStats.set(iface.name, { rxBytes: iface.rxBytes, txBytes: iface.txBytes, timestamp: now });
  }
  
  return speeds;
}
