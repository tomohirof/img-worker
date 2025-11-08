import { useState, useCallback } from 'react';

export interface UseClipboardReturn {
  copied: boolean;
  copy: (text: string) => Promise<void>;
}

/**
 * クリップボードにテキストをコピーするためのカスタムフック
 */
export function useClipboard(): UseClipboardReturn {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);

      // 2秒後にcopiedをfalseに戻す
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      setCopied(false);
    }
  }, []);

  return { copied, copy };
}
