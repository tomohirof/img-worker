import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// @testing-library/jest-dom matchersを拡張
expect.extend(matchers);

// 各テスト後にDOMをクリーンアップ
afterEach(() => {
  cleanup();
});
