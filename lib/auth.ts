// Single-account login for a private Cinebox site. Uses Web Crypto only, so it runs in both
// the Edge middleware and Node route handlers.
//
// Session cookie: base64url(JSON payload) + "." + base64url(HMAC-SHA256). The HMAC key mixes in
// the password, so changing CINEBOX_PASSWORD signs every existing session out.

export const SESSION_COOKIE = 'cinebox_session';
export const SESSION_MAX_AGE = 7 * 24 * 60 * 60; // seconds

interface AuthConfig {
  username: string;
  password: string;
  secret: string;
}

interface SessionPayload {
  u: string;
  exp: number;
}

export function getAuthConfig(): AuthConfig | null {
  const username = process.env.CINEBOX_USERNAME?.trim();
  const password = process.env.CINEBOX_PASSWORD;
  const secret = process.env.CINEBOX_AUTH_SECRET;
  // Fail closed: without full configuration nobody can sign in.
  if (!username || !password || !secret || secret.length < 32) return null;
  return { username, password, secret };
}

const encoder = new TextEncoder();

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach(b => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(value: string): Uint8Array | null {
  try {
    const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from(binary, c => c.charCodeAt(0));
  } catch {
    return null;
  }
}

async function hmac(keyMaterial: string, data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(keyMaterial), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(data)));
}

function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

const signingKey = (config: AuthConfig) => `${config.secret}:${config.password}`;

/** Constant-time credential check: both sides are HMACed first so lengths never leak. */
export async function checkCredentials(config: AuthConfig, username: string, password: string): Promise<boolean> {
  const [givenUser, expectedUser, givenPass, expectedPass] = await Promise.all([
    hmac(config.secret, `u:${username}`),
    hmac(config.secret, `u:${config.username}`),
    hmac(config.secret, `p:${password}`),
    hmac(config.secret, `p:${config.password}`)
  ]);
  const userOk = sameBytes(givenUser, expectedUser);
  const passOk = sameBytes(givenPass, expectedPass);
  return userOk && passOk;
}

export async function createSessionToken(config: AuthConfig): Promise<string> {
  const payload: SessionPayload = { u: config.username, exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE };
  const body = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const signature = toBase64Url(await hmac(signingKey(config), body));
  return `${body}.${signature}`;
}

export async function verifySessionToken(config: AuthConfig, token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const [body, signature] = token.split('.');
  if (!body || !signature) return false;
  const given = fromBase64Url(signature);
  if (!given || !sameBytes(given, await hmac(signingKey(config), body))) return false;
  try {
    const bytes = fromBase64Url(body);
    if (!bytes) return false;
    const payload = JSON.parse(new TextDecoder().decode(bytes)) as SessionPayload;
    return payload.u === config.username && typeof payload.exp === 'number' && payload.exp > Date.now() / 1000;
  } catch {
    return false;
  }
}

/** Only same-site relative paths are allowed as post-login destinations (no open redirects). */
export function safeNextPath(value: string | null | undefined): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\') || value.startsWith('/login')) return '/';
  return value;
}
