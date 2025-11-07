export async function hashPassword(password: string): Promise<string> {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveBits", "deriveKey"]
  );
  const iterations = 150000;
  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
  const raw = await crypto.subtle.exportKey("raw", key);
  const b64salt = btoa(String.fromCharCode(...salt));
  const b64key = btoa(String.fromCharCode(...new Uint8Array(raw)));
  return `pbkdf2$${iterations}$${b64salt}$${b64key}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const [algo, iterStr, b64salt, b64key] = stored.split("$");
    if (algo !== "pbkdf2") return false;
    const iterations = parseInt(iterStr, 10);
    const salt = Uint8Array.from(atob(b64salt), c => c.charCodeAt(0));
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      enc.encode(password),
      "PBKDF2",
      false,
      ["deriveBits", "deriveKey"]
    );
    const key = await crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt,
        iterations,
        hash: "SHA-256"
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );
    const raw = new Uint8Array(await crypto.subtle.exportKey("raw", key));
    const rawB64 = btoa(String.fromCharCode(...raw));
    return rawB64 === b64key;
  } catch {
    return false;
  }
}
