import { describe, it, expect } from 'vitest';
import { validatePassword, PasswordValidationResult } from '@/lib/utils/password-validator';

describe('validatePassword', () => {
  describe('成功パターン', () => {
    it('有効なパスワードに対してisValidがtrueを返す', () => {
      const result = validatePassword('Password123!');
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('複数の記号を含む有効なパスワードを受け入れる', () => {
      const result = validatePassword('P@ssw0rd!#$');
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('最小文字数ちょうどの有効なパスワードを受け入れる', () => {
      const result = validatePassword('Pass123!');
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('長いパスワードを受け入れる', () => {
      const result = validatePassword('ThisIsAVeryLongPassword123!@#$%^&*()');
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe('失敗パターン: 文字数', () => {
    it('7文字のパスワードは拒否される', () => {
      const result = validatePassword('Pass12!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('パスワードは8文字以上である必要があります');
    });

    it('空文字列は拒否される', () => {
      const result = validatePassword('');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('パスワードは8文字以上である必要があります');
    });
  });

  describe('失敗パターン: 大文字', () => {
    it('大文字がないパスワードは拒否される', () => {
      const result = validatePassword('password123!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('パスワードは大文字を1文字以上含む必要があります');
    });
  });

  describe('失敗パターン: 小文字', () => {
    it('小文字がないパスワードは拒否される', () => {
      const result = validatePassword('PASSWORD123!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('パスワードは小文字を1文字以上含む必要があります');
    });
  });

  describe('失敗パターン: 数字', () => {
    it('数字がないパスワードは拒否される', () => {
      const result = validatePassword('Password!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('パスワードは数字を1文字以上含む必要があります');
    });
  });

  describe('失敗パターン: 記号', () => {
    it('記号がないパスワードは拒否される', () => {
      const result = validatePassword('Password123');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('パスワードは記号を1文字以上含む必要があります');
    });
  });

  describe('失敗パターン: 複数のエラー', () => {
    it('複数の要件を満たさない場合、すべてのエラーメッセージを返す', () => {
      const result = validatePassword('pass');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('パスワードは8文字以上である必要があります');
      expect(result.errors).toContain('パスワードは大文字を1文字以上含む必要があります');
      expect(result.errors).toContain('パスワードは数字を1文字以上含む必要があります');
      expect(result.errors).toContain('パスワードは記号を1文字以上含む必要があります');
      expect(result.errors.length).toBe(4);
    });
  });

  describe('エッジケース', () => {
    it('nullは拒否される', () => {
      const result = validatePassword(null as any);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('undefinedは拒否される', () => {
      const result = validatePassword(undefined as any);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('スペースのみのパスワードは拒否される', () => {
      const result = validatePassword('        ');
      expect(result.isValid).toBe(false);
    });
  });

  describe('記号の定義', () => {
    const commonSymbols = ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '-', '_', '+', '=', '[', ']', '{', '}', '|', ';', ':', '"', "'", '<', '>', ',', '.', '?', '/'];

    commonSymbols.forEach((symbol) => {
      it(`記号 '${symbol}' を受け入れる`, () => {
        const result = validatePassword(`Pass123${symbol}`);
        expect(result.isValid).toBe(true);
      });
    });
  });
});
