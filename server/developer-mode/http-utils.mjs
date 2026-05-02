/* =============================================================================
   00) FILE INDEX
   01) COOKIE HELPERS
   02) RESPONSE HELPERS
   03) REQUEST HELPERS
   04) END OF FILE
============================================================================= */

/* =============================================================================
   01) COOKIE HELPERS
============================================================================= */
export function parseCookies(request) {
  const cookieHeader = request.headers.cookie || '';
  return Object.fromEntries(cookieHeader.split(';').map((part) => {
    const [key, ...valueParts] = part.trim().split('=');
    return [decodeURIComponent(key || ''), decodeURIComponent(valueParts.join('=') || '')];
  }).filter(([key]) => Boolean(key)));
}

export function buildCookie(name, value, { maxAge = 60 * 60 * 8 } = {}) {
  return [
    `${encodeURIComponent(name)}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAge}`
  ].join('; ');
}

/* =============================================================================
   02) RESPONSE HELPERS
============================================================================= */
export function sendJson(response, statusCode, payload, headers = {}) {
  response.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    ...headers
  });
  response.end(JSON.stringify(payload, null, 2));
}

export function sendText(response, statusCode, text, headers = {}) {
  response.writeHead(statusCode, {
    'content-type': 'text/plain; charset=utf-8',
    'cache-control': 'no-store',
    ...headers
  });
  response.end(text);
}

export function redirect(response, location, headers = {}) {
  response.writeHead(302, {
    location,
    'cache-control': 'no-store',
    ...headers
  });
  response.end();
}

/* =============================================================================
   03) REQUEST HELPERS
============================================================================= */
export async function readJsonBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }

  const text = Buffer.concat(chunks).toString('utf8').trim();
  if (!text) return {};

  return JSON.parse(text);
}

/* =============================================================================
   04) END OF FILE
============================================================================= */
