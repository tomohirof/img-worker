import { initWasm } from '@resvg/resvg-wasm'
import wasmModule from '../../node_modules/@resvg/resvg-wasm/index_bg.wasm'

// WASM初期化フラグ
let wasmInitialized = false

/**
 * WASMを初期化（一度だけ実行）
 * PNG生成に必要なresvg-wasmを初期化します
 */
export async function ensureWasmInitialized() {
  if (!wasmInitialized) {
    await initWasm(wasmModule)
    wasmInitialized = true
  }
}
