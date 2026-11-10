import crypto from 'node:crypto';

const CANONICAL = 'https://gmu2027.space';

/**
 * Host and protocol come from request headers, which the sender controls. They are only used when
 * they look exactly like a hostname (letters, digits, dots, hyphens, optional port) and http/https.
 * Anything else (quotes, angle brackets, spaces, paths...) is ignored, so a crafted Host or
 * X-Forwarded-Host header can never inject markup into the page.
 */
export function safeBaseUrl({ host, proto } = {}) {
  const h = String(host || '').split(',')[0].trim().toLowerCase();
  const p = String(proto || '').split(',')[0].trim().toLowerCase();
  if (!/^(?=.{1,253}$)[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*(:\d{1,5})?$/.test(h)) return null;
  if (p !== 'http' && p !== 'https') return null;
  return `${p}://${h}`;
}

/** Points the link-preview tags at the host the page was requested on, when that host is safe. */
export function renderIndexHtml(html, request) {
  const base = safeBaseUrl(request);
  return base ? html.replaceAll(CANONICAL, base) : html;
}

/** True for paths that name a file or a hidden entry (/.env, /backup.zip, /app.js.map). Pages never do. */
export function looksLikeFile(pathname) {
  const p = String(pathname || '');
  return /(^|\/)\.[^/]/.test(p) || /\.[a-z0-9]{1,8}$/i.test(p);
}

/**
 * Content-Security-Policy for the HTML shell. Scripts may only come from this site; the one inline
 * script in index.html is allowed by its SHA-256 hash, computed here from the exact HTML being sent,
 * so the policy keeps working when that script changes and no 'unsafe-inline' is needed for scripts.
 */
export function buildCsp(html, { imgOrigins = [] } = {}) {
  const hashes = [];
  const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    // Browsers normalise CRLF and lone CR to LF while parsing HTML, and hash the normalised text.
    const body = m[1].replace(/\r\n?/g, '\n');
    if (body.trim()) hashes.push(`'sha256-${crypto.createHash('sha256').update(body, 'utf8').digest('base64')}'`);
  }
  const extraImg = imgOrigins.filter((o) => /^https?:\/\/[a-z0-9.-]+(:\d+)?$/i.test(o));
  return [
    "default-src 'self'",
    `script-src 'self' ${hashes.join(' ')}`.trim(),
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    `img-src 'self' data: blob: https: ${extraImg.join(' ')}`.trim(),
    "connect-src 'self'",
    "manifest-src 'self'",
    "worker-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
  ].join('; ');
}
