import { readFileSync } from "fs";
import { join } from "path";

export function getDashboard(): string {
  return readFileSync(join(import.meta.dir, "dashboard.html"), "utf8");
}
