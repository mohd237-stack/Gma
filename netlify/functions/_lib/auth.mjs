import crypto from 'node:crypto';

const encoder = value => Buffer.from(value).toString('base64url');
const decoder = value => Buffer.from(value, 'base64url').toString('utf8');

function getPassword() {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) throw new Error('ADMIN_PASSWORD_NOT_CONFIGURED');
  return password;
}

function signingSecret() {
  return crypto.createHash('sha256').update(`${getPassword()}|${process.env.SITE_ID || 'qama-cultural'}`).digest();
}

function timingSafeEqual(a, b) {
  const aa = Buffer.from(String(a)); const bb = Buffer.from(String(b));
  if (aa.length !== bb.length) return false;
  return crypto.timingSafeEqual(aa, bb);
}

export function verifyPassword(input) { return timingSafeEqual(input || '', getPassword()); }

export function issueToken() {
  const payload = encoder(JSON.stringify({ role: 'admin', exp: Date.now() + 12 * 60 * 60 * 1000 }));
  const signature = crypto.createHmac('sha256', signingSecret()).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

export function requireAdmin(req) {
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return false;
  const expected = crypto.createHmac('sha256', signingSecret()).update(payload).digest('base64url');
  if (!timingSafeEqual(signature, expected)) return false;
  try {
    const data = JSON.parse(decoder(payload));
    return data.role === 'admin' && Number(data.exp) > Date.now();
  } catch { return false; }
}
