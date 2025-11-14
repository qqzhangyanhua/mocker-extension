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

// 默认启用，避免初始化时的请求被漏掉
let interceptorConfig: InterceptorConfig = {
  enabled: true,  // 默认启用
  rules: [],
  interceptMode: "page"
}

// 标记配置是否已加载
let configLoaded = false

// 发送请求记录到后台
function sendRequestRecord(record: RequestRecord): void {
  chrome.runtime
    .sendMessage({ type: "ADD_REQUEST_RECORD", payload: record })
    .catch(() => void 0)
}

// 注入到页面环境的 Hook（覆盖页面的 fetch 与 XHR）
function injectPageHook(): void {
  // 尝试内联注入以确保最早执行
  try {
    // 首先尝试同步加载外部脚本（更快）
    const script = document.createElement("script")
    script.src = chrome.runtime.getURL("static/inject.js")
    
    // 同步插入到最前面
    const target = document.head || document.documentElement || document.body
    if (target.firstChild) {
      target.insertBefore(script, target.firstChild)
    } else {
      target.appendChild(script)
    }
    
    script.onload = () => script.remove()
    script.onerror = (e) => console.error("[API Mocker] ❌ 注入脚本加载失败:", e)
  } catch (e) {
    console.error("[API Mocker] Failed to inject script:", e)
  }
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
  window.addEventListener("message", async (event) => {
    const data = (event as MessageEvent).data || {}
    if (data.type === "API_MOCKER_REQUEST") {
      const { id, url, method } = data
      console.log("[API Mocker] 📨 收到规则查询请求")
      console.log("[API Mocker]    ├─ URL:", url)
      console.log("[API Mocker]    └─ Method:", method)
      
      // 如果配置还未加载，尝试立即从后台获取
      if (!configLoaded) {
        console.log("[API Mocker] ⚠️ 配置未加载,从后台获取中...")
        try {
          const resp = await chrome.runtime.sendMessage({ type: "GET_CONFIG" })
          if (resp) {
            updateConfig(resp)
            configLoaded = true
            console.log("[API Mocker] ✅ 配置已加载:", interceptorConfig.rules.length, "条规则")
          }
        } catch (e) {
          console.error("[API Mocker] ❌ 配置加载失败:", e)
        }
      }
      
      console.log("[API Mocker] 🔧 当前配置:")
      console.log("[API Mocker]    ├─ 启用状态:", interceptorConfig.enabled)
      console.log("[API Mocker]    ├─ 规则总数:", interceptorConfig.rules.length)
      console.log("[API Mocker]    └─ 已启用规则:", interceptorConfig.rules.filter(r => r.enabled).length, "条")
      
      const matchedRule = interceptorConfig.enabled
        ? findMatchingRule(url, method, undefined, interceptorConfig.rules)
        : null
      
      if (matchedRule) {
        console.log("[API Mocker] ✅ 匹配成功!")
        console.log("[API Mocker]    ├─ 规则名称:", matchedRule.name)
        console.log("[API Mocker]    ├─ 匹配模式:", matchedRule.url)
        console.log("[API Mocker]    ├─ 匹配类型:", matchedRule.matchType)
        console.log("[API Mocker]    └─ 响应状态:", matchedRule.statusCode)
      } else {
        console.warn("[API Mocker] ❌ 未找到匹配规则")
        if (!interceptorConfig.enabled) {
          console.warn("[API Mocker]    原因: 拦截器已关闭")
        } else if (interceptorConfig.rules.length === 0) {
          console.warn("[API Mocker]    原因: 未配置规则")
        } else {
          console.log("[API Mocker]    所有规则:")
          interceptorConfig.rules.forEach((r, i) => {
            console.log(`[API Mocker]    ${i + 1}. ${r.name} [${r.enabled ? '✓' : '✗'}]`)
            console.log(`[API Mocker]       URL: ${r.url}`)
            console.log(`[API Mocker]       类型: ${r.matchType} | 方法: ${r.method}`)
          })
        }
      }
      
      window.postMessage({ type: "API_MOCKER_RESPONSE", id, rule: matchedRule }, "*")
    } else if (data.type === "API_MOCKER_RECORD") {
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
    if (resp) {
      updateConfig(resp)
      configLoaded = true
    }
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
  console.log("[API Mocker] 🚀 拦截器初始化中...")
  
  injectPageHook()
  setupPageBridge()
  await loadConfig()
  setupMessageListener()
  
  console.log("[API Mocker] ✅ 拦截器初始化完成")
  console.log("[API Mocker]    ├─ 启用状态:", interceptorConfig.enabled)
  console.log("[API Mocker]    ├─ 拦截模式:", interceptorConfig.interceptMode)
  console.log("[API Mocker]    └─ 规则数量:", interceptorConfig.rules.length, "条")
}

init()