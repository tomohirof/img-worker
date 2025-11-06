import bcrypt from 'bcryptjs';
import { validatePassword } from './password-validator';

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
 *
 * @param password - 検証するパスワード
 * @returns バリデーション結果
 */
export function validatePasswordStrength(password: string): {
  valid: boolean;
  errors: string[];
} {
  const result = validatePassword(password);
  return {
    valid: result.isValid,
    errors: result.errors,
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
