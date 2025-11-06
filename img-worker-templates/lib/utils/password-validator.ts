/**
 * パスワードバリデーションの結果
 */
export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * パスワードをバリデーションする
 *
 * 要件:
 * - 8文字以上
 * - 大文字を1文字以上含む
 * - 小文字を1文字以上含む
 * - 数字を1文字以上含む
 * - 記号を1文字以上含む
 *
 * @param password - バリデーション対象のパスワード
 * @returns バリデーション結果
 */
export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];

  // null, undefined チェック
  if (password === null || password === undefined) {
    errors.push('パスワードは8文字以上である必要があります');
    errors.push('パスワードは大文字を1文字以上含む必要があります');
    errors.push('パスワードは小文字を1文字以上含む必要があります');
    errors.push('パスワードは数字を1文字以上含む必要があります');
    errors.push('パスワードは記号を1文字以上含む必要があります');
    return {
      isValid: false,
      errors,
    };
  }

  // 文字列に変換
  const pwd = String(password);

  // 長さチェック
  if (pwd.length < 8) {
    errors.push('パスワードは8文字以上である必要があります');
  }

  // 大文字チェック
  if (!/[A-Z]/.test(pwd)) {
    errors.push('パスワードは大文字を1文字以上含む必要があります');
  }

  // 小文字チェック
  if (!/[a-z]/.test(pwd)) {
    errors.push('パスワードは小文字を1文字以上含む必要があります');
  }

  // 数字チェック
  if (!/[0-9]/.test(pwd)) {
    errors.push('パスワードは数字を1文字以上含む必要があります');
  }

  // 記号チェック
  // 一般的な記号をチェック: !@#$%^&*()-_+=[]{}|;:'",.<>?/
  if (!/[!@#$%^&*()\-_+=[\]{}|;:'",.<>?/]/.test(pwd)) {
    errors.push('パスワードは記号を1文字以上含む必要があります');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * パスワードの強度を計算する（0-4のスコア）
 *
 * @param password - パスワード
 * @returns 強度スコア (0: 非常に弱い, 1: 弱い, 2: 普通, 3: 強い, 4: 非常に強い)
 */
export function calculatePasswordStrength(password: string): number {
  if (!password) return 0;

  let strength = 0;
  const pwd = String(password);

  // 長さによる評価
  if (pwd.length >= 8) strength++;
  if (pwd.length >= 12) strength++;

  // 文字種による評価
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) strength++;
  if (/[0-9]/.test(pwd)) strength++;
  if (/[!@#$%^&*()\-_+=[\]{}|;:'",.<>?/]/.test(pwd)) strength++;

  // 最大4に制限
  return Math.min(strength, 4);
}

/**
 * パスワード強度を日本語のラベルで取得
 *
 * @param strength - 強度スコア (0-4)
 * @returns 強度ラベル
 */
export function getPasswordStrengthLabel(strength: number): string {
  const labels = ['非常に弱い', '弱い', '普通', '強い', '非常に強い'];
  return labels[Math.max(0, Math.min(strength, 4))];
}
