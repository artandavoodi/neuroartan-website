import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const ignored = new Set([".git", "node_modules", "dist", "build"]);
const duplicatePattern = /(?: \d+| copy(?: \d+)?|\(\d+\))\.(?:svg|png|jpg|jpeg|webp)$/i;
const violations = [];

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (ignored.has(entry)) continue;

    const path = join(dir, entry);
    const stat = statSync(path);

    if (stat.isDirectory()) {
      walk(path);
      continue;
    }

    if (stat.isFile() && duplicatePattern.test(entry)) {
      violations.push(relative(root, path));
    }
  }
}

walk(root);

if (violations.length) {
  console.error("Duplicate numbered/copy image artifacts are forbidden:");
  for (const file of violations.sort()) {
    console.error(`- ${file}`);
  }
  process.exit(1);
}

console.log("No duplicate numbered/copy image artifacts found.");
