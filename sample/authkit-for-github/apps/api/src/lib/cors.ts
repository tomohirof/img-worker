import { Context, Next } from 'hono';

export function withCORS() {
  return async (c: Context, next: Next) => {
    const allow = c.env.ORIGIN_ALLOWLIST?.split(',').map(s => s.trim()) ?? ['*'];
    const origin = c.req.header('Origin') ?? '*';
    const allowed = allow.includes('*') || allow.includes(origin);
    c.header('Vary', 'Origin');
    c.header('Access-Control-Allow-Origin', allowed ? origin : 'null');
    c.header('Access-Control-Allow-Credentials', 'true');
    c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    c.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    if (c.req.method === 'OPTIONS') return c.text('', 204);
    await next();
  };
}
