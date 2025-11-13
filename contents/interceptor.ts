import type { PlasmoCSConfig } from "plasmo"
import { findMatchingRule } from "~/lib/matcher"
import type { MockRule, RequestRecord } from "~/lib/types"
import { delay, generateId } from "~/lib/utils"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  all_frames: true,
  run_at: "document_start"
}

// 拦截器配置（由后台下发）
interface InterceptorConfig {
  enabled: boolean
  rules: MockRule[]
  interceptMode: "page" | "network"
}

let interceptorConfig: InterceptorConfig = {
  enabled: true,
  rules: [],
  interceptMode: "page"
}

// 发送请求记录到后台
function sendRequestRecord(record: RequestRecord): void {
  chrome.runtime
    .sendMessage({ type: "ADD_REQUEST_RECORD", payload: record })
    .catch(() => void 0)
}

// 注入到页面环境的 Hook（覆盖页面的 fetch 与 XHR）
function injectPageHook(): void {
  const script = document.createElement("script")
  // 使用外部脚本文件而不是内联脚本来避免 CSP 问题
  script.src = chrome.runtime.getURL("static/inject.js")
  script.onload = () => {
    console.log("[API Mocker] Injection script loaded")
    script.remove()
  }
  script.onerror = (e) => {
    console.error("[API Mocker] Failed to load injection script:", e)
  }
  ;(document.head || document.documentElement).appendChild(script)
}

// 解析响应头字符串为对象（用于真实 XHR 记录）
function parseResponseHeaders(headerStr: string): Record<string, string> {
  const headers: Record<string, string> = {}
  if (!headerStr) return headers
  headerStr.split("\r\n").forEach((line) => {
    const parts = line.split(": ")
    if (parts.length === 2) headers[parts[0]] = parts[1]
  })
  return headers
}

// 页面脚本与内容脚本的消息桥
function setupPageBridge(): void {
  console.log("[API Mocker] Setting up page bridge...")
  window.addEventListener("message", async (event) => {
    const data = (event as MessageEvent).data || {}
    if (data.type === "API_MOCKER_REQUEST") {
      const { id, url, method } = data
      console.log("[API Mocker] Received rule request from page - URL:", url, "Method:", method)
      const matchedRule = interceptorConfig.enabled
        ? findMatchingRule(url, method, undefined, interceptorConfig.rules)
        : null
      console.log("[API Mocker] Matched rule:", matchedRule ? matchedRule.name : "none")
      window.postMessage({ type: "API_MOCKER_RESPONSE", id, rule: matchedRule }, "*")
    } else if (data.type === "API_MOCKER_RECORD") {
      console.log("[API Mocker] Recording request:", data.payload)
      const p = data.payload || {}
      const record: RequestRecord = {
        id: generateId(),
        url: p.url,
        method: p.method,
        timestamp: Date.now(),
        isMocked: !!p.isMocked,
        statusCode: p.statusCode || 200,
        duration: 0,
        requestBody: undefined,
        responseBody: p.responseBody,
        responseHeaders: undefined,
        size: new Blob([p.responseBody || ""]).size
      }
      sendRequestRecord(record)
    }
  })
  console.log("[API Mocker] Page bridge setup complete")
}

// 合并更新配置，并同步模式到页面脚本
function updateConfig(newConfig: Partial<InterceptorConfig>): void {
  interceptorConfig = { ...interceptorConfig, ...newConfig }
  try {
    window.postMessage(
      {
        type: "API_MOCKER_SET_MODE",
        payload: { enabled: interceptorConfig.enabled, interceptMode: interceptorConfig.interceptMode }
      },
      "*"
    )
  } catch {}
}

// 从后台获取配置
async function loadConfig(): Promise<void> {
  try {
    const resp = await chrome.runtime.sendMessage({ type: "GET_CONFIG" })
    if (resp) updateConfig(resp)
  } catch (e) {
    console.error("Failed to load config:", e)
  }
}

// 监听后台配置推送
function setupMessageListener(): void {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === "UPDATE_CONFIG") {
      updateConfig(message.payload)
      sendResponse({ success: true })
    }
    return true
  })
}

// 初始化
async function init(): Promise<void> {
  console.log("[API Mocker] Starting interceptor initialization...")
  await loadConfig()
  console.log("[API Mocker] Config loaded:", interceptorConfig)
  setupPageBridge()
  if (interceptorConfig.enabled && interceptorConfig.interceptMode === "page") {
    console.log("[API Mocker] Injecting page hook...")
    injectPageHook()
  } else {
    console.log("[API Mocker] Page hook not injected. Enabled:", interceptorConfig.enabled, "Mode:", interceptorConfig.interceptMode)
  }
  setupMessageListener()
  console.log("[API Mocker] Interceptor initialized successfully")
}

console.log("[API Mocker] Content script loaded, initializing...")
init()