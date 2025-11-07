export type SessionRecord = {
  id: string;
  user_id: string;
  expires_at: number;
};

export function createSessionId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return [...bytes].map(b => b.toString(16).padStart(2, "0")).join("");
}

export function cookieSerialize(name: string, value: string, opts: {
  httpOnly?: boolean;
  secure?: boolean;
  path?: string;
  sameSite?: "Lax" | "Strict" | "None";
  maxAge?: number;
  domain?: string;
} = {}) {
  const parts = [`${name}=${value}`];
  if (opts.maxAge !== undefined) parts.push(`Max-Age=${opts.maxAge}`);
  parts.push(`Path=${opts.path ?? "/"}`);
  parts.push(`SameSite=${opts.sameSite ?? "Lax"}`);
  if (opts.httpOnly !== false) parts.push("HttpOnly");
  if (opts.secure !== false) parts.push("Secure");
  if (opts.domain) parts.push(`Domain=${opts.domain}`);
  return parts.join("; ");
}
