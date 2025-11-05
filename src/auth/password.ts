import bcrypt from 'bcryptjs';

/**
 * パスワードの最小長
 */
export const MIN_PASSWORD_LENGTH = 8;

/**
 * bcryptのソルトラウンド（セキュリティと速度のバランス）
 */
const SALT_ROUNDS = 10;

/**
 * パスワードの強度を検証
 */
export function validatePasswordStrength(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < MIN_PASSWORD_LENGTH) {
    errors.push(`パスワードは${MIN_PASSWORD_LENGTH}文字以上である必要があります`);
  }

  // 少なくとも1つの数字を含む
  if (!/\d/.test(password)) {
    errors.push('パスワードには少なくとも1つの数字を含める必要があります');
  }

  // 少なくとも1つの英字を含む
  if (!/[a-zA-Z]/.test(password)) {
    errors.push('パスワードには少なくとも1つの英字を含める必要があります');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * パスワードをハッシュ化
 */
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * パスワードを検証
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}
