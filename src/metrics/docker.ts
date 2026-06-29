import { $ } from "bun";

interface ContainerStats {
  id: string;
  name: string;
  cpuPercent: string;
  memPercent: string;
  memUsage: string;
  netIo: string;
  blockIo: string;
  pids: string;
}

export async function isDockerAvailable(): Promise<boolean> {
  try {
    await $`docker info`.quiet();
    return true;
  } catch {
    return false;
  }
}

export async function getContainerStats(): Promise<ContainerStats[]> {
  try {
    const result = await $`docker stats --no-stream --format "{{.ID}}\t{{.Name}}\t{{.CPUPerc}}\t{{.MemPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}\t{{.PIDs}}"`.text();
    
    return result.trim().split("\n").filter(Boolean).map((line) => {
      const parts = line.split("\t");
      return {
        id: parts[0] || "",
        name: parts[1] || "",
        cpuPercent: parts[2] || "0%",
        memPercent: parts[3] || "0%",
        memUsage: parts[4] || "0B / 0B",
        netIo: parts[5] || "0B / 0B",
        blockIo: parts[6] || "0B / 0B",
        pids: parts[7] || "0",
      };
    });
  } catch {
    return [];
  }
}
