import { existsSync, mkdirSync, writeFileSync, chmodSync } from "node:fs";
import { join } from "node:path";

const gitDirectory = join(process.cwd(), ".git");
const hooksDirectory = join(gitDirectory, "hooks");

if (!existsSync(gitDirectory)) {
  console.log("Git directory not found. Skipping hook installation.");
  process.exit(0);
}

mkdirSync(hooksDirectory, { recursive: true });

const hookBody = `#!/bin/sh

echo "Running Neuroartan duplicate icon cleaner..."
npm run clean:duplicate-icons

echo "Running Neuroartan duplicate icon quality gate..."
npm run check:duplicate-icons
`;

for (const hookName of ["pre-commit", "pre-push"]) {
  const hookPath = join(hooksDirectory, hookName);
  writeFileSync(hookPath, hookBody);
  chmodSync(hookPath, 0o755);
  console.log(`Installed Neuroartan ${hookName} quality gate.`);
}
