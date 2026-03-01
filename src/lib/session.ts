export interface SessionEnv {
  SESSION_SECRET: string;
  IXIL_PASSWORD: string;
  MATHILDE_PASSWORD: string;
}

const COOKIE_NAME = 'lunchbox-session';
const MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

function toBase64Url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(s: string): Uint8Array {
  const padded = s.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function getKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

export async function sign(payload: string, secret: string): Promise<string> {
  const key = await getKey(secret);
  const enc = new TextEncoder();
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
  return toBase64Url(sig);
}

export async function verifyToken(token: string, secret: string): Promise<string | null> {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const expected = await sign(payload, secret);
  if (expected !== sig) return null;
  try {
    const decoded = new TextDecoder().decode(fromBase64Url(payload));
    const data = JSON.parse(decoded);
    return data.user || null;
  } catch {
    return null;
  }
}

async function createToken(username: string, secret: string): Promise<string> {
  const payload = toBase64Url(new TextEncoder().encode(JSON.stringify({ user: username })));
  const sig = await sign(payload, secret);
  return `${payload}.${sig}`;
}

export async function getUser(request: Request, env: SessionEnv): Promise<string | null> {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return null;

  const match = cookieHeader
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${COOKIE_NAME}=`));

  if (!match) return null;
  const token = match.slice(COOKIE_NAME.length + 1);
  return verifyToken(token, env.SESSION_SECRET);
}

export async function setSessionCookie(username: string, env: SessionEnv): Promise<string> {
  const token = await createToken(username, env.SESSION_SECRET);
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE}`;
}

export function clearSessionCookie(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

const VALID_USERS: Record<string, keyof Pick<SessionEnv, 'IXIL_PASSWORD' | 'MATHILDE_PASSWORD'>> = {
  ixil: 'IXIL_PASSWORD',
  mathilde: 'MATHILDE_PASSWORD',
};

export function validateLogin(username: string, password: string, env: SessionEnv): string | null {
  const lower = username.toLowerCase();
  const envKey = VALID_USERS[lower];
  if (!envKey) return null;

  const expected = env[envKey];
  if (!expected || password !== expected) return null;

  // Return canonical casing
  return lower === 'ixil' ? 'Ixil' : 'Mathilde';
}
