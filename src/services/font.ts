/**
 * フォント管理サービス
 * Google Fonts APIから日本語フォントを読み込んで、Satoriで使用できるようにします
 */

// フォントキャッシュ
let fontSansData: ArrayBuffer | null = null
let fontSerifData: ArrayBuffer | null = null

/**
 * テスト用: フォントキャッシュをリセット
 * @internal テスト専用関数
 */
export function __resetFontsForTesting() {
  fontSansData = null
  fontSerifData = null
}

/**
 * Google Fonts APIからフォントを読み込む
 * @param family フォントファミリー名（例: "Noto Sans JP"）
 * @param weight フォントウェイト（例: 400, 700）
 * @returns フォントデータのArrayBuffer
 */
async function loadFont(family: string, weight: number): Promise<ArrayBuffer> {
  try {
    // Google Fonts CSS APIを使ってフォントURLを取得
    const familyParam = family.replace(/ /g, '+')
    const cssUrl = `https://fonts.googleapis.com/css2?family=${familyParam}:wght@${weight}&display=swap`

    const cssResponse = await fetch(cssUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })

    if (!cssResponse.ok) {
      throw new Error(`Failed to fetch font CSS for ${family}: ${cssResponse.status} ${cssResponse.statusText}`)
    }

    const css = await cssResponse.text()

    // CSSからフォントファイルのURLを抽出
    const urlMatch = css.match(/url\(([^)]+)\)/)
    if (!urlMatch) {
      throw new Error(`Failed to extract font URL from CSS for ${family}`)
    }

    const fontUrl = urlMatch[1]

    // フォントファイルをダウンロード
    const fontResponse = await fetch(fontUrl)
    if (!fontResponse.ok) {
      throw new Error(`Failed to fetch font file for ${family}: ${fontResponse.status} ${fontResponse.statusText}`)
    }

    return await fontResponse.arrayBuffer()
  } catch (error) {
    console.error(`Error loading font ${family} (weight: ${weight}):`, error)
    throw error
  }
}

/**
 * フォントを初期化（一度だけ読み込み）
 * Noto Sans JP (400) と Noto Serif JP (700) を読み込みます
 */
export async function ensureFontsLoaded() {
  try {
    if (!fontSansData) {
      fontSansData = await loadFont('Noto Sans JP', 400)
    }
    if (!fontSerifData) {
      fontSerifData = await loadFont('Noto Serif JP', 700)
    }
  } catch (error) {
    console.error('Failed to load fonts:', error)
    throw new Error('フォントの読み込みに失敗しました')
  }
}

/**
 * 読み込み済みのフォントデータを取得
 * @returns Satori用のフォント設定配列
 */
export function getFonts() {
  if (!fontSansData || !fontSerifData) {
    throw new Error('Fonts are not loaded yet. Call ensureFontsLoaded() first.')
  }

  return [
    { name: 'Noto Sans JP', data: fontSansData, weight: 400, style: 'normal' as const },
    { name: 'Noto Serif JP', data: fontSerifData, weight: 700, style: 'normal' as const }
  ]
}
