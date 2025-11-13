import { addRecord, getConfig, getRules, onStorageChange, updateConfig } from "~/lib/storage"
import type { RequestRecord } from "~/lib/types"
import { syncNetworkInterception } from "~/lib/net-intercept"

// Broadcast config to all tabs
async function broadcastConfigUpdate(): Promise<void> {
  const [rules, config] = await Promise.all([getRules(), getConfig()])
  const tabs = await chrome.tabs.query({})
  const updatePromises = tabs.map((tab) => {
    if (tab.id) {
      return chrome.tabs
        .sendMessage(tab.id, {
          type: "UPDATE_CONFIG",
          payload: {
            enabled: config.enabled,
            interceptMode: (config as any).interceptMode,
            rules
          }
        })
        .catch((_err) => void 0)
    }
    return Promise.resolve()
  })
  await Promise.all(updatePromises)
}

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  ;(async () => {
    try {
      switch (message.type) {
        case "GET_CONFIG": {
          const [rules, config] = await Promise.all([getRules(), getConfig()])
          sendResponse({ enabled: config.enabled, interceptMode: (config as any).interceptMode, rules })
          break
        }
        case "ADD_REQUEST_RECORD": {
          const record: RequestRecord = message.payload
          await addRecord(record)
          sendResponse({ success: true })
          break
        }
        case "BROADCAST_CONFIG": {
          await broadcastConfigUpdate()
          await syncNetworkInterception()
          sendResponse({ success: true })
          break
        }
        default:
          sendResponse({ error: "Unknown message type" })
      }
    } catch (err) {
      console.error("Error handling message:", err)
      sendResponse({ error: String(err) })
    }
  })()
  return true
})

// Watch storage changes and broadcast
onStorageChange((changes) => {
  if (changes.mock_rules || changes.mock_config) {
    broadcastConfigUpdate()
    syncNetworkInterception()
  }
})

// Initialize on install
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === "install") {
    console.log("[API Mocker] Extension installed")
    await updateConfig({ enabled: true, maxRecords: 1000, autoClean: true })
    chrome.tabs.create({ url: chrome.runtime.getURL("tabs/welcome.html") })
  } else if (details.reason === "update") {
    console.log("[API Mocker] Extension updated")
  }
})

// On browser startup
chrome.runtime.onStartup.addListener(() => {
  console.log("[API Mocker] Extension started")
})

// Ensure config injection on tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "loading" && tab.url) {
    ;(async () => {
      const [rules, config] = await Promise.all([getRules(), getConfig()])
      try {
        await chrome.tabs.sendMessage(tabId, {
          type: "UPDATE_CONFIG",
          payload: { enabled: config.enabled, interceptMode: (config as any).interceptMode, rules }
        })
      } catch (_err) {
        // Tab may not be ready
      }
    })()
  }
})

console.log("[API Mocker] Service worker initialized")
;(async()=>{ try{ await syncNetworkInterception() }catch{} })()
console.log("[API Mocker] Service worker initialized")