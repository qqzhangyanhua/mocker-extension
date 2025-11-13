// Monaco Editor configuration for Chrome Extension
// This configuration ensures Monaco works within Chrome Extension CSP restrictions

import { loader } from "@monaco-editor/react"
import * as monaco from "monaco-editor/esm/vs/editor/editor.api"

// Configure Monaco to use the bundled version instead of CDN
// This prevents CSP violations in Chrome extensions
loader.config({
  monaco,
  // Disable automatic CDN loading
  'vs/nls': {
    availableLanguages: {
      '*': 'en'
    }
  }
})

// Initialize the loader with the bundled Monaco
loader.init().then((monacoInstance) => {
  console.log("Monaco Editor initialized successfully")
}).catch((error) => {
  console.error("Failed to initialize Monaco Editor:", error)
})

export { loader, monaco }