import { describe, it, expect } from 'vitest';

describe('テスト環境のセットアップ', () => {
  it('Vitestが正しく動作する', () => {
    expect(true).toBe(true);
  });

  it('基本的な計算が動作する', () => {
    expect(1 + 1).toBe(2);
  });
});
