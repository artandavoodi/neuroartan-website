#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../../../..');
const DOCS = path.join(ROOT, 'docs');
const LOCALIZATION_ROOT = path.join(DOCS, 'assets/data/system/localization');
const LOCALES_ROOT = path.join(LOCALIZATION_ROOT, 'locales');
const MANIFEST_PATH = path.join(LOCALIZATION_ROOT, 'manifest.json');
const AUDIT_PATH = path.join(LOCALIZATION_ROOT, 'localization-audit.json');

const SCAN_ROOTS = [
  'docs/index.html',
  'docs/404.html',
  'docs/profile.html',
  'docs/feed/index.html',
  'docs/pages',
  'docs/assets/fragments',
  'docs/assets/js/layers/website',
  'docs/assets/js/core'
];

const SUPPORTED_EXTENSIONS = new Set(['.html', '.js']);
const I18N_ATTRIBUTE_PATTERN = /\s(data-i18n-key|data-i18n-placeholder-key|data-i18n-aria-label-key|data-i18n-title-key)=["']([^"']+)["']/g;

function toPosix(value) {
  return value.split(path.sep).join('/');
}

function normalizeText(value = '') {
  return String(value)
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function extractAttributeValue(fragment = '', attributeName = '') {
  const pattern = new RegExp(`${attributeName}=["']([^"']*)["']`, 'i');
  return fragment.match(pattern)?.[1]?.trim() || '';
}

function inferValueFromMatch(content = '', matchIndex = 0, attributeName = '') {
  const tagStart = content.lastIndexOf('<', matchIndex);
  const tagEnd = content.indexOf('>', matchIndex);
  if (tagStart < 0 || tagEnd < 0) return '';

  const openTag = content.slice(tagStart, tagEnd + 1);

  if (attributeName === 'data-i18n-placeholder-key') {
    return extractAttributeValue(openTag, 'placeholder');
  }

  if (attributeName === 'data-i18n-aria-label-key') {
    return extractAttributeValue(openTag, 'aria-label');
  }

  if (attributeName === 'data-i18n-title-key') {
    return extractAttributeValue(openTag, 'title');
  }

  const tagName = openTag.match(/^<\s*([a-zA-Z0-9-]+)/)?.[1] || '';
  if (tagName.toLowerCase() === 'meta') {
    return extractAttributeValue(openTag, 'content');
  }

  if (!tagName) return '';

  const closingPattern = new RegExp(`</${tagName}>`, 'i');
  const afterTag = content.slice(tagEnd + 1);
  const closeMatch = closingPattern.exec(afterTag);
  if (!closeMatch) return '';

  return normalizeText(afterTag.slice(0, closeMatch.index));
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function collectFiles(targetPath) {
  const absolute = path.join(ROOT, targetPath);
  if (!(await pathExists(absolute))) return [];

  const stat = await fs.stat(absolute);
  if (stat.isFile()) {
    return SUPPORTED_EXTENSIONS.has(path.extname(absolute)) ? [absolute] : [];
  }

  const entries = await fs.readdir(absolute, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const child = path.join(absolute, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectFiles(path.relative(ROOT, child)));
    } else if (SUPPORTED_EXTENSIONS.has(path.extname(child))) {
      files.push(child);
    }
  }
  return files;
}

function extractEntriesFromFile(content = '', relativePath = '') {
  const entries = new Map();
  const diagnostics = [];
  I18N_ATTRIBUTE_PATTERN.lastIndex = 0;

  let match;
  while ((match = I18N_ATTRIBUTE_PATTERN.exec(content))) {
    const attribute = match[1];
    const key = match[2].trim();
    if (!key || key.includes('${')) {
      diagnostics.push({ type: 'dynamic-key-skipped', key, file: relativePath });
      continue;
    }

    const value = inferValueFromMatch(content, match.index, attribute);
    if (!value) {
      diagnostics.push({ type: 'missing-source-text', key, file: relativePath, attribute });
      continue;
    }

    if (!entries.has(key)) {
      entries.set(key, { value, files: new Set([relativePath]), attributes: new Set([attribute]) });
      continue;
    }

    const existing = entries.get(key);
    existing.files.add(relativePath);
    existing.attributes.add(attribute);

    if (existing.value !== value) {
      diagnostics.push({
        type: 'conflicting-source-text',
        key,
        file: relativePath,
        existing: existing.value,
        incoming: value
      });
    }
  }

  return { entries, diagnostics };
}

async function readJson(targetPath, fallback) {
  try {
    return JSON.parse(await fs.readFile(targetPath, 'utf8'));
  } catch {
    return fallback;
  }
}

async function writeJson(targetPath, value) {
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function main() {
  const manifest = await readJson(MANIFEST_PATH, null);
  if (!manifest || !Array.isArray(manifest.languages)) {
    throw new Error(`Localization manifest is missing or invalid: ${MANIFEST_PATH}`);
  }

  const files = (await Promise.all(SCAN_ROOTS.map(collectFiles))).flat();
  const sourceEntries = new Map();
  const diagnostics = [];

  for (const absoluteFile of files) {
    const relativePath = toPosix(path.relative(ROOT, absoluteFile));
    const content = await fs.readFile(absoluteFile, 'utf8');
    const result = extractEntriesFromFile(content, relativePath);
    diagnostics.push(...result.diagnostics);

    for (const [key, entry] of result.entries) {
      if (!sourceEntries.has(key)) {
        sourceEntries.set(key, entry);
        continue;
      }

      const existing = sourceEntries.get(key);
      entry.files.forEach((file) => existing.files.add(file));
      entry.attributes.forEach((attribute) => existing.attributes.add(attribute));

      if (existing.value !== entry.value) {
        diagnostics.push({
          type: 'conflicting-source-text',
          key,
          file: Array.from(entry.files)[0] || '',
          existing: existing.value,
          incoming: entry.value
        });
      }
    }
  }

  const sortedEntries = Object.fromEntries(
    Array.from(sourceEntries.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, entry]) => [key, entry.value])
  );

  const audit = {
    generatedAt: new Date().toISOString(),
    sourceLanguage: manifest.sourceLanguage || 'en',
    scannedFiles: files.length,
    sourceEntryCount: Object.keys(sortedEntries).length,
    languages: {},
    diagnostics
  };

  for (const language of manifest.languages) {
    const code = language.code;
    const catalogPath = path.join(LOCALES_ROOT, language.catalog || `${code}.json`);
    const existingCatalog = await readJson(catalogPath, {
      language: code,
      direction: language.direction || 'ltr',
      sourceLanguage: manifest.sourceLanguage || 'en',
      entries: {}
    });

    const nextEntries = code === manifest.sourceLanguage
      ? sortedEntries
      : Object.fromEntries(
          Object.entries(existingCatalog.entries || {})
            .filter(([key]) => Object.prototype.hasOwnProperty.call(sortedEntries, key))
            .sort(([a], [b]) => a.localeCompare(b))
        );

    const nextCatalog = {
      $schema: '../schemas/neuroartan-localization-catalog.schema.json',
      language: code,
      direction: language.direction || existingCatalog.direction || 'ltr',
      sourceLanguage: manifest.sourceLanguage || 'en',
      entries: nextEntries
    };

    await writeJson(catalogPath, nextCatalog);

    const missingKeys = code === manifest.sourceLanguage
      ? []
      : Object.keys(sortedEntries).filter((key) => !nextEntries[key]);

    audit.languages[code] = {
      direction: nextCatalog.direction,
      entries: Object.keys(nextEntries).length,
      missingFromSource: Object.keys(nextEntries).filter((key) => !sortedEntries[key]),
      missingTranslations: missingKeys
    };
  }

  await writeJson(AUDIT_PATH, audit);

  process.stdout.write([
    `Localization source entries: ${audit.sourceEntryCount}`,
    `Scanned files: ${audit.scannedFiles}`,
    `Diagnostics: ${audit.diagnostics.length}`,
    `Audit: ${toPosix(path.relative(ROOT, AUDIT_PATH))}`
  ].join('\n'));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
