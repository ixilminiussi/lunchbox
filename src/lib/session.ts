import crypto from 'node:crypto';

const COOKIE_NAME = 'lunchbox-session';
const MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

function getSecret(): string {
  return import.meta.env.SESSION_SECRET || 'dev-secret-change-me';
}

function sign(payload: string): string {
  const hmac = crypto.createHmac('sha256', getSecret());
  hmac.update(payload);
  return hmac.digest('hex');
}

function createToken(username: string): string {
  const payload = Buffer.from(JSON.stringify({ user: username })).toString('base64url');
  const sig = sign(payload);
  return `${payload}.${sig}`;
}

function verifyToken(token: string): string | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  if (sign(payload) !== sig) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return data.user || null;
  } catch {
    return null;
  }
}

export function getUser(request: Request): string | null {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return null;

  const match = cookieHeader
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${COOKIE_NAME}=`));

  if (!match) return null;
  const token = match.slice(COOKIE_NAME.length + 1);
  return verifyToken(token);
}

export function setSessionCookie(username: string): string {
  const token = createToken(username);
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE}`;
}

export function clearSessionCookie(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

const VALID_USERS: Record<string, string> = {
  ixil: 'IXIL_PASSWORD',
  mathilde: 'MATHILDE_PASSWORD',
};

export function validateLogin(username: string, password: string): string | null {
  const lower = username.toLowerCase();
  const envKey = VALID_USERS[lower];
  if (!envKey) return null;

  const expected = import.meta.env[envKey];
  if (!expected || password !== expected) return null;

  // Return canonical casing
  return lower === 'ixil' ? 'Ixil' : 'Mathilde';
}
