import { existsSync, mkdirSync, writeFileSync, chmodSync } from "node:fs";
import { join } from "node:path";

const gitDirectory = join(process.cwd(), ".git");
const hooksDirectory = join(gitDirectory, "hooks");
const preCommitPath = join(hooksDirectory, "pre-commit");

if (!existsSync(gitDirectory)) {
  console.log("Git directory not found. Skipping hook installation.");
  process.exit(0);
}

mkdirSync(hooksDirectory, { recursive: true });

writeFileSync(
  preCommitPath,
  `#!/bin/sh

echo "Running Neuroartan quality gate..."
npm run check:quality
`,
);

chmodSync(preCommitPath, 0o755);

console.log("Neuroartan pre-commit quality gate installed.");
