// lib/net-intercept.ts
// ?? webRequest ?????????MV3 Service Worker ????
import { getConfig, getRules, addRecord } from "~/lib/storage"
import { findMatchingRule } from "~/lib/matcher"
import type { GlobalConfig, MockRule, RequestRecord } from "~/lib/types"

let currentRules: MockRule[] = []
let currentConfig: GlobalConfig | null = null
let handler: ((d: chrome.webRequest.WebRequestBodyDetails) => chrome.webRequest.BlockingResponse | void) | null = null

function toDataUrl(rule: MockRule): string {
  const mime = rule.responseType === "json" ? "application/json" : rule.responseType === "html" ? "text/html" : "text/plain"
  const body = rule.responseBody || ""
  return `data:${mime};charset=utf-8,${encodeURIComponent(body)}`
}

function ensureListener() {
  if (handler) return
  handler = (details) => {
    if (!currentConfig?.enabled) return
    if (currentConfig.interceptMode !== "network") return
    const url = details.url
    const method = details.method || "GET"
    const rule = findMatchingRule(url, method, undefined, currentRules)
    if (rule) {
      const record: RequestRecord = {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        url,
        method,
        timestamp: Date.now(),
        isMocked: true,
        ruleId: rule.id,
        ruleName: rule.name,
        statusCode: rule.statusCode,
        duration: 0,
        requestBody: undefined,
        responseBody: rule.responseBody,
        responseHeaders: rule.responseHeaders,
        size: new Blob([rule.responseBody || ""]).size
      }
      addRecord(record)
      return { redirectUrl: toDataUrl(rule) }
    }
  }
  chrome.webRequest.onBeforeRequest.addListener(handler, { urls: ["<all_urls>"] }, ["blocking"])
}

function disableListener() {
  if (handler && chrome.webRequest.onBeforeRequest.hasListener(handler)) {
    chrome.webRequest.onBeforeRequest.removeListener(handler)
  }
  handler = null
}

export async function syncNetworkInterception(): Promise<void> {
  const [rules, cfg] = await Promise.all([getRules(), getConfig()])
  currentRules = rules
  currentConfig = cfg
  if (cfg.enabled && cfg.interceptMode === "network") {
    ensureListener()
  } else {
    disableListener()
  }
}