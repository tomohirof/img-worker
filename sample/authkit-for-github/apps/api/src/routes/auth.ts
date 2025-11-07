import { Hono } from 'hono';
import { Env, getUserByEmail, createUser, createSession, findSession, deleteSession, findUserByGithub, linkGithub } from '../lib/db';
import { hashPassword, verifyPassword, createSessionId, cookieSerialize } from '../../../packages/auth-lib/src';
import { HTTPException } from 'hono/http-exception';

export const auth = new Hono<{ Bindings: Env }>();

function getCookieName(env: Env) {
  return env.SESSION_COOKIE_NAME || 'authkit_session';
}

function sessionCookie(env: Env, value: string, maxAgeSeconds: number) {
  const secure = (env.SESSION_COOKIE_SECURE ?? 'true') === 'true';
  return cookieSerialize(getCookieName(env), value, {
    httpOnly: true,
    secure,
    sameSite: 'Lax',
    path: '/',
    maxAge: maxAgeSeconds
  });
}

auth.post('/register', async c => {
  const { email, password } = await c.req.json<{ email: string; password: string }>();
  if (!email || !password) throw new HTTPException(400, { message: 'email and password are required' });
  const exists = await getUserByEmail(c.env, email);
  if (exists) throw new HTTPException(409, { message: 'email already registered' });
  const hpw = await hashPassword(password);
  const id = crypto.randomUUID();
  const user = await createUser(c.env, id, email, hpw);
  return c.json({ ok: true, user: { id: user.id, email: user.email } });
});

auth.post('/login', async c => {
  const { email, password } = await c.req.json<{ email: string; password: string }>();
  const user = await getUserByEmail(c.env, email);
  if (!user || !user.hashed_password) throw new HTTPException(401, { message: 'invalid credentials' });
  const ok = await verifyPassword(password, user.hashed_password);
  if (!ok) throw new HTTPException(401, { message: 'invalid credentials' });
  const sid = createSessionId();
  const ttl = 60 * 60 * 24 * 30; // 30 days
  const exp = Math.floor(Date.now() / 1000) + ttl;
  await createSession(c.env, sid, user.id, exp);
  c.header('Set-Cookie', sessionCookie(c.env, sid, ttl));
  return c.json({ ok: true });
});

auth.post('/logout', async c => {
  const cookie = c.req.cookie(getCookieName(c.env));
  if (cookie) {
    await deleteSession(c.env, cookie);
  }
  c.header('Set-Cookie', sessionCookie(c.env, '', 0));
  return c.json({ ok: true });
});

auth.get('/me', async c => {
  const sid = c.req.cookie(getCookieName(c.env));
  if (!sid) return c.json({ user: null });
  const sess = await findSession(c.env, sid);
  if (!sess || sess.expires_at < Math.floor(Date.now() / 1000)) {
    return c.json({ user: null });
  }
  const user = await c.env.DB.prepare('SELECT id, email FROM users WHERE id = ?').bind(sess.user_id).first();
  return c.json({ user });
});

auth.get('/github', async c => {
  const clientId = c.env.GITHUB_CLIENT_ID;
  const redirectUri = `${c.env.API_BASE_URL}/auth/github/callback`;
  const scope = 'read:user user:email';
  const state = crypto.randomUUID();
  c.header('Set-Cookie', cookieSerialize('gh_state', state, { httpOnly: true, secure: true, sameSite: 'Lax', path: '/', maxAge: 600 }));
  const url = new URL('https://github.com/login/oauth/authorize');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('scope', scope);
  url.searchParams.set('state', state);
  return c.redirect(url.toString(), 302);
});

auth.get('/github/callback', async c => {
  const url = new URL(c.req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const saved = c.req.cookie('gh_state');
  if (!code || !state || !saved || state !== saved) {
    throw new HTTPException(400, { message: 'invalid state' });
  }
  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: c.env.GITHUB_CLIENT_ID,
      client_secret: c.env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: `${c.env.API_BASE_URL}/auth/github/callback`
    })
  });
  const tokenJson: any = await tokenRes.json();
  const accessToken = tokenJson.access_token;
  if (!accessToken) throw new HTTPException(401, { message: 'oauth token exchange failed' });

  const ghUserRes = await fetch('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${accessToken}`, 'User-Agent': 'authkit' }
  });
  const ghUser: any = await ghUserRes.json();
  const ghId = String(ghUser.id);
  let user = await findUserByGithub(c.env, ghId);
  if (!user) {
    let email = ghUser.email;
    if (!email) {
      const emailsRes = await fetch('https://api.github.com/user/emails', { headers: { Authorization: `Bearer ${accessToken}`, 'User-Agent': 'authkit' } });
      const emails: any[] = await emailsRes.json();
      const primary = emails.find(e => e.primary) || emails[0];
      email = primary?.email ?? `${ghId}@users.noreply.github.com`;
    }
    const id = crypto.randomUUID();
    await createUser(c.env, id, email, null);
    await linkGithub(c.env, ghId, id);
    user = await findUserByGithub(c.env, ghId);
  }
  const sid = createSessionId();
  const ttl = 60 * 60 * 24 * 30;
  const exp = Math.floor(Date.now() / 1000) + ttl;
  await createSession(c.env, sid, user.id, exp);
  c.header('Set-Cookie', sessionCookie(c.env, sid, ttl));
  const target = new URL('/', 'https://app.localhost');
  return c.redirect(target.toString(), 302);
});

auth.post('/password/change', async c => {
  const sid = c.req.cookie(getCookieName(c.env));
  if (!sid) throw new HTTPException(401, { message: 'not logged in' });
  const sess: any = await findSession(c.env, sid);
  if (!sess) throw new HTTPException(401, { message: 'invalid session' });
  const { currentPassword, newPassword } = await c.req.json<{ currentPassword: string; newPassword: string }>();
  const user: any = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(sess.user_id).first();
  if (user.hashed_password) {
    const ok = await verifyPassword(currentPassword, user.hashed_password);
    if (!ok) throw new HTTPException(400, { message: 'current password incorrect' });
  }
  const hpw = await hashPassword(newPassword);
  await c.env.DB.prepare('UPDATE users SET hashed_password = ? WHERE id = ?').bind(hpw, user.id).run();
  return c.json({ ok: true });
});

auth.post('/user/delete', async c => {
  const sid = c.req.cookie(getCookieName(c.env));
  if (!sid) throw new HTTPException(401, { message: 'not logged in' });
  const sess: any = await findSession(c.env, sid);
  if (!sess) throw new HTTPException(401, { message: 'invalid session' });
  await c.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(sess.user_id).run();
  await deleteSession(c.env, sid);
  c.header('Set-Cookie', sessionCookie(c.env, '', 0));
  return c.json({ ok: true });
});
