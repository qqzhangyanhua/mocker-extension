import { addRecord, getConfig, getRules, onStorageChange, updateConfig } from "~/lib/storage"
import type { RequestRecord, ImageInfo } from "~/lib/types"
import { syncNetworkInterception } from "~/lib/net-intercept"

// 更新扩展图标和徽章状态
async function updateExtensionIcon(): Promise<void> {
  const config = await getConfig()
  const rules = await getRules()
  const enabledRulesCount = rules.filter(r => r.enabled).length

  if (config.enabled) {
    // 开启状态：显示绿色徽章和启用规则数量
    await chrome.action.setBadgeText({ text: String(enabledRulesCount) })
    await chrome.action.setBadgeBackgroundColor({ color: "#52c41a" }) // 绿色
    await chrome.action.setTitle({ 
      title: `API Mocker - 已开启\n启用规则: ${enabledRulesCount} 个\n拦截模式: ${config.interceptMode === 'page' ? '页面 Hook' : '网络拦截'}` 
    })
  } else {
    // 关闭状态：显示灰色徽章
    await chrome.action.setBadgeText({ text: "OFF" })
    await chrome.action.setBadgeBackgroundColor({ color: "#999999" }) // 灰色
    await chrome.action.setTitle({ title: "API Mocker - 已关闭" })
  }
}

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
  
  // 更新图标状态
  await updateExtensionIcon()
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
        case "GET_COLLECTED_IMAGES": {
          // 从临时存储获取收集的图片数据
          const result = await chrome.storage.local.get('temp_collected_images')
          sendResponse({ images: result.temp_collected_images || [] })
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
    // 规则或配置变化时也更新图标
    updateExtensionIcon()
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
  // 安装或更新后初始化图标状态
  await updateExtensionIcon()

  // 创建右键菜单
  chrome.contextMenus.create({
    id: 'collect-images',
    title: '收集页面图片',
    contexts: ['page', 'image']
  })
})

// On browser startup
chrome.runtime.onStartup.addListener(async () => {
  console.log("[API Mocker] Extension started")
  // 浏览器启动时初始化图标状态
  await updateExtensionIcon()
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
;(async()=>{
  try{
    await syncNetworkInterception()
    // 初始化时更新图标状态
    await updateExtensionIcon()
  }catch{}
})()

// ========== 图片下载功能 ==========

// 处理右键菜单点击
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'collect-images' && tab?.id) {
    try {
      // 向当前页面的content script发送消息收集图片
      const response = await chrome.tabs.sendMessage(tab.id, { type: 'COLLECT_IMAGES' })

      if (response.success && response.images) {
        const images: ImageInfo[] = response.images

        // 临时存储收集的图片数据
        await chrome.storage.local.set({ temp_collected_images: images })

        // 打开新标签页显示图片管理界面
        await chrome.tabs.create({
          url: chrome.runtime.getURL('tabs/images.html')
        })
      } else {
        console.error('收集图片失败:', response.error)
      }
    } catch (error) {
      console.error('收集图片时出错:', error)
    }
  }
})