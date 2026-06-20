#!/usr/bin/env node
import { readdir, unlink, readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';

const neuroartanRoot = path.resolve('/Users/artan/Documents/Neuroartan');
const websiteRoot = path.join(neuroartanRoot, 'website');

const scanRoots = [
  neuroartanRoot
].filter((target) => existsSync(target));

const ignoredPathParts = new Set([
  '.git',
  'node_modules',
  '.icon-quarantine'
]);

const duplicatePattern = /(?:\s+\d+|\s+\(\d+\)|\s+copy(?:\s+\d+)?|-copy(?:-\d+)?)\.svg$/i;
const reportsRoot = path.join(websiteRoot, 'tools/icon-governance/reports');

async function walk(dir, files = []) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (ignoredPathParts.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(full, files);
    else files.push(full);
  }
  return files;
}

function canonicalName(filename) {
  return filename.replace(/(?:\s+\d+|\s+\(\d+\)|\s+copy(?:\s+\d+)?|-copy(?:-\d+)?)\.svg$/i, '.svg');
}

async function sha256(file) {
  return createHash('sha256').update(await readFile(file)).digest('hex');
}

const allFiles = [];
for (const root of scanRoots) {
  allFiles.push(...await walk(root));
}

const duplicateSvgFiles = allFiles
  .filter((file) => file.toLowerCase().endsWith('.svg'))
  .filter((file) => duplicatePattern.test(path.basename(file)));

const deleted = [];
const conflicts = [];
const missingCanonical = [];

for (const duplicateFile of duplicateSvgFiles) {
  const canonicalFile = path.join(path.dirname(duplicateFile), canonicalName(path.basename(duplicateFile)));

  if (!existsSync(canonicalFile)) {
    missingCanonical.push(duplicateFile);
    continue;
  }

  const [duplicateHash, canonicalHash] = await Promise.all([
    sha256(duplicateFile),
    sha256(canonicalFile)
  ]);

  if (duplicateHash !== canonicalHash) {
    conflicts.push(`${duplicateFile} :: canonical=${canonicalFile}`);
    continue;
  }

  await unlink(duplicateFile);
  deleted.push(duplicateFile);
}

const remaining = [];
for (const root of scanRoots) {
  const files = await walk(root);
  remaining.push(
    ...files
      .filter((file) => file.toLowerCase().endsWith('.svg'))
      .filter((file) => duplicatePattern.test(path.basename(file)))
  );
}

const report = [
  '# Icon Duplicate Repair Report',
  '',
  `Generated: ${new Date().toISOString()}`,
  '',
  '## Policy',
  'Duplicate copy artifacts are deleted when byte-identical to a canonical SVG in the same folder. No quarantine folder is created.',
  '',
  '## Scan Roots',
  ...scanRoots.map((root) => `- ${root}`),
  '',
  '## Deleted duplicate copy artifacts',
  deleted.length ? deleted.map((line) => `- ${line}`).join('\n') : '- None',
  '',
  '## Missing canonical files',
  missingCanonical.length ? missingCanonical.map((line) => `- ${line}`).join('\n') : '- None',
  '',
  '## Content conflicts requiring manual review',
  conflicts.length ? conflicts.map((line) => `- ${line}`).join('\n') : '- None',
  '',
  '## Remaining duplicate copy artifacts',
  remaining.length ? remaining.map((line) => `- ${line}`).join('\n') : '- None',
  ''
].join('\n');

await mkdir(reportsRoot, { recursive: true });
await writeFile(path.join(reportsRoot, 'latest-repair-report.md'), report);

console.log(report);

if (missingCanonical.length || conflicts.length || remaining.length) {
  process.exit(1);
}
