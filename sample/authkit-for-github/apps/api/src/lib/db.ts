import { D1Database } from '@cloudflare/workers-types';

export type Env = {
  DB: D1Database;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  API_BASE_URL: string;
  SESSION_COOKIE_NAME: string;
  SESSION_COOKIE_SECURE?: string;
  ORIGIN_ALLOWLIST?: string;
};

export async function getUserByEmail(env: Env, email: string) {
  return env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();
}

export async function getUserById(env: Env, id: string) {
  return env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first();
}

export async function createUser(env: Env, id: string, email: string, hashed_password: string | null) {
  await env.DB.prepare('INSERT INTO users (id, email, hashed_password) VALUES (?, ?, ?)')
    .bind(id, email, hashed_password).run();
  return getUserById(env, id);
}

export async function createSession(env: Env, id: string, user_id: string, expires_at: number) {
  await env.DB.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)')
    .bind(id, user_id, expires_at).run();
}

export async function findSession(env: Env, id: string) {
  return env.DB.prepare('SELECT * FROM sessions WHERE id = ?').bind(id).first();
}

export async function deleteSession(env: Env, id: string) {
  await env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(id).run();
}

export async function linkGithub(env: Env, provider_user_id: string, user_id: string) {
  await env.DB.prepare('INSERT OR IGNORE INTO oauth_accounts (provider, provider_user_id, user_id) VALUES ("github", ?, ?)')
    .bind(provider_user_id, user_id).run();
}

export async function findUserByGithub(env: Env, provider_user_id: string) {
  return env.DB.prepare(`
    SELECT u.* FROM oauth_accounts oa
    JOIN users u ON u.id = oa.user_id
    WHERE oa.provider = "github" AND oa.provider_user_id = ?
  `).bind(provider_user_id).first();
}
