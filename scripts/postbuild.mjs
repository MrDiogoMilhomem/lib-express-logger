import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const targets = [
  { dir: join(root, "dist", "esm"), type: "module" },
  { dir: join(root, "dist", "cjs"), type: "commonjs" },
];

for (const target of targets) {
  mkdirSync(target.dir, { recursive: true });
  writeFileSync(join(target.dir, "package.json"), `${JSON.stringify({ type: target.type }, null, 2)}\n`, "utf8");
}
