import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const vitest = path.join(root, "node_modules", "vitest", "vitest.mjs");
const files = [
  "tests/calculations.test.ts",
  "tests/storage.test.ts",
  "tests/catalog-import.test.ts",
  "tests/pdf.test.tsx",
];

for (const file of files) {
  const result = spawnSync(
    process.execPath,
    [vitest, "run", file, "--reporter=verbose", "--no-file-parallelism"],
    {
      cwd: root,
      stdio: "inherit",
    },
  );
  process.stdout.write(
    `[runner] ${file}: status=${result.status} signal=${result.signal ?? "none"}\n`,
  );
  if (result.status !== 0) process.exit(result.status ?? 1);
}
