import { $ } from "bun";

interface DiskInfo {
  filesystem: string;
  mountPoint: string;
  totalBytes: number;
  usedBytes: number;
  freeBytes: number;
  usagePercent: number;
}

function parseSize(sizeStr: string): number {
  const size = parseInt(sizeStr, 10);
  return isNaN(size) ? 0 : size;
}

export async function getDiskInfo(): Promise<DiskInfo[]> {
  const result = await $`df -B1 --output=source,target,size,used,avail,pcent`.text();
  const lines = result.trim().split("\n").slice(1);
  
  const disks: DiskInfo[] = [];
  for (const line of lines) {
    const parts = line.trim().split(/\s+/);
    const fs = parts[0];
    const mount = parts[1];
    const total = parts[2];
    const used = parts[3];
    const avail = parts[4];
    const pct = parts[5];
    if (parts.length >= 6 && fs && fs.startsWith("/dev/") && mount && total && used && avail && pct) {
      disks.push({
        filesystem: fs,
        mountPoint: mount,
        totalBytes: parseSize(total),
        usedBytes: parseSize(used),
        freeBytes: parseSize(avail),
        usagePercent: parseInt(pct.replace("%", ""), 10),
      });
    }
  }
  return disks;
}

export async function getTotalDiskUsage(): Promise<{
  totalBytes: number;
  usedBytes: number;
  freeBytes: number;
  usagePercent: number;
}> {
  const disks = await getDiskInfo();
  let totalBytes = 0;
  let usedBytes = 0;
  let freeBytes = 0;
  
  for (const disk of disks) {
    totalBytes += disk.totalBytes;
    usedBytes += disk.usedBytes;
    freeBytes += disk.freeBytes;
  }
  
  return {
    totalBytes,
    usedBytes,
    freeBytes,
    usagePercent: totalBytes > 0 ? Math.round((usedBytes / totalBytes) * 100) : 0,
  };
}
