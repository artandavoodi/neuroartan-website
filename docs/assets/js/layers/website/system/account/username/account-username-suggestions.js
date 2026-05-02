/* =============================================================================
   00) FILE INDEX
   01) MODULE IDENTITY
   02) IMPORTS
   03) LOCAL HELPERS
   04) SOURCE EXTRACTION
   05) CANDIDATE BUILDERS
   06) SUGGESTION ENGINE
   07) PUBLIC API
   08) END OF FILE
============================================================================= */

/* =============================================================================
   01) MODULE IDENTITY
============================================================================= */
const MODULE_ID = 'account-username-suggestions';
const MODULE_PATH = '/website/docs/assets/js/layers/website/system/account/username/account-username-suggestions.js';

/* =============================================================================
   02) IMPORTS
============================================================================= */
import {
  normalizeAccountUsernameInput,
  validateAccountUsernamePolicy
} from './account-username-policy.js';

/* =============================================================================
   03) LOCAL HELPERS
============================================================================= */
function uniqueList(values = []) {
  const seen = new Set();
  const output = [];

  values.forEach((value) => {
    const normalized = normalizeAccountUsernameInput(value);
    if (!normalized || seen.has(normalized)) return;

    seen.add(normalized);
    output.push(normalized);
  });

  return output;
}

function compactParts(parts = [], separator = '-') {
  return parts
    .map((part) => normalizeAccountUsernameInput(part))
    .filter(Boolean)
    .join(separator);
}

function resolveSuggestionSeparator(options = {}) {
  const separator = String(options?.policy?.suggestions?.separator || options.separator || '.').trim();
  return separator === '_' ? '_' : '.';
}

function numericSuffixes(seed = '') {
  const base = String(seed || '').replace(/\D/g, '');
  const year = new Date().getFullYear();
  const random = Math.floor(100 + Math.random() * 900);

  return uniqueList([
    base.slice(-2),
    base.slice(-3),
    String(year).slice(-2),
    String(random),
    String(random + 1)
  ]).filter(Boolean);
}

/* =============================================================================
   04) SOURCE EXTRACTION
============================================================================= */
export function getUsernameSourceFromEmail(email = '') {
  const localPart = String(email || '').split('@')[0] || '';
  return normalizeAccountUsernameInput(localPart);
}

export function getUsernameSuggestionSources(values = {}) {
  const emailSource = getUsernameSourceFromEmail(values.email || values.userEmail || '');
  const firstName = normalizeAccountUsernameInput(values.first_name || values.firstName || '');
  const lastName = normalizeAccountUsernameInput(values.last_name || values.lastName || '');
  const displayName = normalizeAccountUsernameInput(values.display_name || values.displayName || '');
  const username = normalizeAccountUsernameInput(values.username || '');

  return {
    username,
    emailSource,
    firstName,
    lastName,
    displayName
  };
}

/* =============================================================================
   05) CANDIDATE BUILDERS
============================================================================= */
export function buildUsernameCandidates(values = {}, options = {}) {
  const sources = getUsernameSuggestionSources(values);
  const separator = resolveSuggestionSeparator(options);
  const suffixes = numericSuffixes(`${sources.emailSource}${sources.firstName}${sources.lastName}`);
  const baseCandidates = uniqueList([
    sources.username,
    sources.emailSource,
    sources.displayName,
    compactParts([sources.firstName, sources.lastName], separator),
    compactParts([sources.firstName, sources.lastName], '.'),
    compactParts([sources.firstName, sources.lastName], '_'),
    compactParts([sources.firstName, sources.lastName], ''),
    compactParts([sources.displayName, sources.firstName], separator),
    compactParts([sources.emailSource, sources.firstName], separator)
  ]);

  const suffixedCandidates = [];
  baseCandidates.forEach((candidate) => {
    suffixes.forEach((suffix) => {
      suffixedCandidates.push(`${candidate}${suffix}`);
      suffixedCandidates.push(`${candidate}${separator}${suffix}`);
    });
  });

  return uniqueList([
    ...baseCandidates,
    ...suffixedCandidates
  ]);
}

/* =============================================================================
   06) SUGGESTION ENGINE
============================================================================= */
export async function suggestAccountUsernames(values = {}, options = {}) {
  const maxSuggestions = Number(options.maxSuggestions || 6);
  const candidates = buildUsernameCandidates(values, options);
  const suggestions = [];

  for (const candidate of candidates) {
    const validation = await validateAccountUsernamePolicy(candidate, options);
    if (!validation.ok) continue;

    suggestions.push({
      username:validation.normalized,
      state:'candidate',
      source:'local_policy',
      message:'Suggested username.'
    });

    if (suggestions.length >= maxSuggestions) break;
  }

  return suggestions;
}

export async function suggestAvailableAccountUsernames(values = {}, options = {}) {
  const availabilityChecker = typeof options.availabilityChecker === 'function'
    ? options.availabilityChecker
    : null;

  if (!availabilityChecker) {
    return suggestAccountUsernames(values, options);
  }

  const maxSuggestions = Number(options.maxSuggestions || 6);
  const candidates = buildUsernameCandidates(values, options);
  const suggestions = [];

  for (const candidate of candidates) {
    const validation = await validateAccountUsernamePolicy(candidate, options);
    if (!validation.ok) continue;

    const availability = await availabilityChecker(validation.normalized);
    if (!availability?.ok && availability?.state !== 'available') continue;

    suggestions.push({
      username:validation.normalized,
      state:'available',
      source:'availability_checker',
      message:availability?.message || 'Available username.'
    });

    if (suggestions.length >= maxSuggestions) break;
  }

  return suggestions;
}

/* =============================================================================
   07) PUBLIC API
============================================================================= */
export const ACCOUNT_USERNAME_SUGGESTIONS_META = Object.freeze({
  moduleId:MODULE_ID,
  modulePath:MODULE_PATH
});

if (typeof window !== 'undefined') {
  window.NeuroartanAccountUsernameSuggestions = Object.freeze({
    getUsernameSourceFromEmail,
    getUsernameSuggestionSources,
    buildUsernameCandidates,
    suggestAccountUsernames,
    suggestAvailableAccountUsernames
  });
}

/* =============================================================================
   08) END OF FILE
============================================================================= */
