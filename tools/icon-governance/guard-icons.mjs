#!/usr/bin/env node
import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const neuroartanRoot = path.resolve('/Users/artan/Documents/Neuroartan');

const scanRoots = [
  neuroartanRoot
].filter((target) => existsSync(target));

const ignoredPathParts = new Set([
  '.git',
  'node_modules',
  '.icon-quarantine'
]);

const duplicateSvgPattern = /(?:\s+\d+|\s+\(\d+\)|\s+copy(?:\s+\d+)?|-copy(?:-\d+)?)\.svg$/i;
const duplicateReferencePattern = /(?:\s+\d+|\s+\(\d+\)|\s+copy(?:\s+\d+)?|-copy(?:-\d+)?)\.svg/gi;
const searchableExtensions = new Set(['.html', '.css', '.js', '.mjs', '.json', '.md', '.svg']);

async function walk(dir, files = []) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (ignoredPathParts.has(entry.name)) continue;
    if (full === path.join(process.cwd(), 'tools')) continue;
    if (entry.isDirectory()) await walk(full, files);
    else files.push(full);
  }
  return files;
}

const allFiles = [];
for (const root of scanRoots) {
  allFiles.push(...await walk(root));
}

const duplicateFiles = allFiles
  .filter((file) => file.toLowerCase().endsWith('.svg'))
  .filter((file) => duplicateSvgPattern.test(path.basename(file)));

const duplicateReferences = [];

for (const file of allFiles) {
  if (!searchableExtensions.has(path.extname(file).toLowerCase())) continue;
  const text = await readFile(file, 'utf8').catch(() => '');
  const matches = text.match(duplicateReferencePattern);
  if (matches?.length) {
    duplicateReferences.push(`${file} :: ${[...new Set(matches)].join(', ')}`);
  }
}

if (duplicateFiles.length || duplicateReferences.length) {
  console.error('');
  console.error('ICON GOVERNANCE FAILED');
  console.error('');
  console.error('Scan roots:');
  for (const root of scanRoots) console.error(`- ${root}`);
  console.error('');

  if (duplicateFiles.length) {
    console.error('Duplicate icon copy artifacts:');
    for (const file of duplicateFiles) console.error(`- ${file}`);
  }

  if (duplicateReferences.length) {
    console.error('');
    console.error('References to duplicate icon copy artifacts:');
    for (const ref of duplicateReferences) console.error(`- ${ref}`);
  }

  console.error('');
  console.error('Run: node tools/icon-governance/repair-icon-duplicates.mjs');
  console.error('');
  process.exit(1);
}

console.log('ICON GOVERNANCE PASSED');
