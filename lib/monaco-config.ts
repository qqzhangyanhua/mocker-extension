// Monaco Editor configuration for Chrome Extension
// This configuration ensures Monaco works within Chrome Extension CSP restrictions

import { loader } from "@monaco-editor/react"
import * as monaco from "monaco-editor"

// Configure Monaco Editor environment for Chrome Extension
// Disable workers to avoid CSP and build issues in Chrome Extension context
// Monaco will fall back to synchronous mode (still provides syntax highlighting)
;(self as any).MonacoEnvironment = {
  getWorker() {
    // Return a dummy worker to disable worker usage
    // This is necessary for Chrome Extension CSP compatibility
    return {
      postMessage: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      terminate: () => {},
      dispatchEvent: () => true,
      onerror: null,
      onmessage: null,
      onmessageerror: null
    } as unknown as Worker
  }
}

// Configure Monaco loader to use the bundled version
loader.config({ monaco })

// Initialize Monaco with language features
const initMonaco = async () => {
  try {
    const monacoInstance = await loader.init()
    
    // 配置 JSON 语言特性
    monacoInstance.languages.json.jsonDefaults.setDiagnosticsOptions({
      validate: true,
      allowComments: true,
      schemas: [],
      enableSchemaRequest: false,
      schemaValidation: 'warning' as any,
      schemaRequest: 'warning' as any,
      trailingCommas: 'warning' as any,
      comments: 'warning' as any
    })
    
    // 设置 JSON 格式化选项
    monacoInstance.languages.json.jsonDefaults.setModeConfiguration({
      documentFormattingEdits: true,
      documentRangeFormattingEdits: true,
      completionItems: true,
      hovers: true,
      documentSymbols: true,
      tokens: true,
      colors: true,
      foldingRanges: true,
      diagnostics: true,
      selectionRanges: true
    })
    
    console.log("Monaco Editor initialized successfully with JSON support")
    return monacoInstance
  } catch (error) {
    console.error("Failed to initialize Monaco Editor:", error)
    throw error
  }
}

// 立即初始化
initMonaco()

export { loader, monaco }