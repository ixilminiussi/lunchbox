import { describe, it, expect } from 'vitest';
import { sign, verifyToken, getUser, validateLogin, setSessionCookie, type SessionEnv } from '../../src/lib/session';

const testEnv: SessionEnv = {
  SESSION_SECRET: 'test-secret-key-12345',
  IXIL_PASSWORD: 'ixilpass',
  MATHILDE_PASSWORD: 'mathildepass',
};

describe('sign + verifyToken round-trip', () => {
  it('produces a valid token that verifies', async () => {
    const payload = btoa(JSON.stringify({ user: 'Ixil' }))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const sig = await sign(payload, testEnv.SESSION_SECRET);
    const user = await verifyToken(`${payload}.${sig}`, testEnv.SESSION_SECRET);
    expect(user).toBe('Ixil');
  });

  it('rejects tampered signature', async () => {
    const payload = btoa(JSON.stringify({ user: 'Ixil' }))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const sig = await sign(payload, testEnv.SESSION_SECRET);
    const tampered = sig.slice(0, -2) + 'xx';
    const user = await verifyToken(`${payload}.${tampered}`, testEnv.SESSION_SECRET);
    expect(user).toBeNull();
  });

  it('rejects malformed token', async () => {
    const user = await verifyToken('not-a-token', testEnv.SESSION_SECRET);
    expect(user).toBeNull();
  });
});

describe('getUser', () => {
  it('returns user from valid cookie', async () => {
    const cookie = await setSessionCookie('Ixil', testEnv);
    const cookieValue = cookie.split(';')[0]; // just "lunchbox-session=..."
    const request = new Request('https://example.com', {
      headers: { cookie: cookieValue },
    });
    const user = await getUser(request, testEnv);
    expect(user).toBe('Ixil');
  });

  it('returns null with no cookie', async () => {
    const request = new Request('https://example.com');
    const user = await getUser(request, testEnv);
    expect(user).toBeNull();
  });

  it('returns null with tampered cookie', async () => {
    const request = new Request('https://example.com', {
      headers: { cookie: 'lunchbox-session=tampered.value' },
    });
    const user = await getUser(request, testEnv);
    expect(user).toBeNull();
  });
});

describe('validateLogin', () => {
  it('accepts correct password for Ixil', () => {
    expect(validateLogin('Ixil', 'ixilpass', testEnv)).toBe('Ixil');
    expect(validateLogin('ixil', 'ixilpass', testEnv)).toBe('Ixil');
  });

  it('accepts correct password for Mathilde', () => {
    expect(validateLogin('Mathilde', 'mathildepass', testEnv)).toBe('Mathilde');
  });

  it('rejects wrong password', () => {
    expect(validateLogin('Ixil', 'wrong', testEnv)).toBeNull();
  });

  it('rejects unknown user', () => {
    expect(validateLogin('Unknown', 'pass', testEnv)).toBeNull();
  });
});
