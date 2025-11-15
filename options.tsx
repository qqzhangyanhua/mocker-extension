import { ConfigProvider, Layout, Modal, message } from "antd"
import { useCallback, useEffect, useMemo, useState } from "react"

import EnhancedRuleEditor from "~/components/EnhancedRuleEditor"
import EnhancedRuleList from "~/components/EnhancedRuleList"
import SceneManager from "~/components/SceneManager"
import TopBar from "~/components/TopBar"
import {
  addRule,
  deleteRule,
  deleteRules,
  getRules,
  saveRules,
  updateRule,
  getConfig,
  updateConfig,
  getScenes
} from "~/lib/storage"
import type { MockRule, GlobalConfig, MockScene } from "~/lib/types"
import { generateId } from "~/lib/utils"

import "./options.css"

const { Sider, Content } = Layout

function OptionsIndex() {
  const [rules, setRules] = useState<MockRule[]>([])
  const [config, setConfig] = useState<GlobalConfig>({ enabled: true, maxRecords: 1000, autoClean: true, interceptMode: "page" })
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null)
  const [searchKeyword, setSearchKeyword] = useState("")
  const [loading, setLoading] = useState(false)
  const [showSceneManager, setShowSceneManager] = useState(false)
  const [saving, setSaving] = useState(false)
  const [scenes, setScenes] = useState<MockScene[]>([])
  const [currentScene, setCurrentScene] = useState<MockScene | null>(null)

  // 统一的广播机制
  const broadcastConfig = useCallback(async () => {
    try {
      await chrome.runtime.sendMessage({ type: "BROADCAST_CONFIG" })
    } catch (error) {
      console.error("广播配置失败:", error)
    }
  }, [])

  const loadRules = useCallback(async () => {
    setLoading(true)
    const rulesData = await getRules()
    setRules(rulesData)
    setLoading(false)
  }, [])

  const loadConfig = useCallback(async () => {
    const cfg = await getConfig()
    setConfig(cfg)
  }, [])

  const loadScenes = useCallback(async () => {
    const scenesData = await getScenes()
    setScenes(scenesData)
  }, [])

  // 加载配置与规则
  useEffect(() => {
    loadRules()
    loadConfig()
    loadScenes()
  }, [loadRules, loadConfig, loadScenes])

  // 当搜索关键词变化时，检查选中的规则是否在搜索结果中
  useEffect(() => {
    if (searchKeyword && selectedRuleId) {
      const selectedRule = rules.find(r => r.id === selectedRuleId)
      if (selectedRule) {
        const keyword = searchKeyword.toLowerCase()
        const matchesSearch = 
          selectedRule.name.toLowerCase().includes(keyword) ||
          selectedRule.description?.toLowerCase().includes(keyword) ||
          selectedRule.url.toLowerCase().includes(keyword)
        
        if (!matchesSearch) {
          setSelectedRuleId(null)
        }
      }
    }
  }, [searchKeyword, selectedRuleId, rules])

  // 当配置加载后，更新当前场景
  useEffect(() => {
    if (config.currentScene) {
      const scene = scenes.find(s => s.id === config.currentScene)
      setCurrentScene(scene || null)
    } else {
      setCurrentScene(null)
    }
  }, [config.currentScene, scenes])

  // 创建新规则
  const handleCreateRule = useCallback(async () => {
    const newRule: MockRule = {
      id: generateId(),
      name: "新建规则",
      description: "",
      enabled: true,
      url: "",
      matchType: "exact",
      method: "ALL",
      statusCode: 200,
      delay: 0,
      responseType: "json",
      responseBody: "{}",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      usageCount: 0
    }

    await addRule(newRule)
    await loadRules()
    setSelectedRuleId(newRule.id)
    message.success("创建成功")
  }, [loadRules])

  // 保存规则
  const handleSaveRule = useCallback(async (rule: MockRule) => {
    setSaving(true)
    try {
      await updateRule(rule.id, rule)
      await loadRules()
      await broadcastConfig()
      message.success("保存成功")
    } catch (error) {
      console.error("保存规则失败:", error)
      message.error("保存失败，请重试")
    } finally {
      setSaving(false)
    }
  }, [loadRules, broadcastConfig])

  // 删除规则
  const handleDeleteRule = useCallback(async (id: string) => {
    try {
      await deleteRule(id)
      await loadRules()
      if (selectedRuleId === id) setSelectedRuleId(null)
      await broadcastConfig()
      message.success("删除成功")
    } catch (error) {
      console.error("删除规则失败:", error)
      message.error("删除失败，请重试")
    }
  }, [loadRules, broadcastConfig, selectedRuleId])

  // 批量删除规则
  const handleBatchDelete = useCallback(async (ids: string[]) => {
    try {
      await deleteRules(ids)
      await loadRules()
      if (selectedRuleId && ids.includes(selectedRuleId)) setSelectedRuleId(null)
      await broadcastConfig()
      message.success(`已删除 ${ids.length} 条规则`)
    } catch (error) {
      console.error("批量删除失败:", error)
      message.error("批量删除失败，请重试")
    }
  }, [loadRules, broadcastConfig, selectedRuleId])

  // 复制规则
  const handleCopyRule = useCallback(async (rule: MockRule) => {
    try {
      const newRule: MockRule = {
        ...rule,
        id: generateId(),
        name: `${rule.name} - 副本`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        usageCount: 0
      }
      await addRule(newRule)
      await loadRules()
      setSelectedRuleId(newRule.id)
      message.success("复制成功")
    } catch (error) {
      console.error("复制规则失败:", error)
      message.error("复制失败，请重试")
    }
  }, [loadRules])

  // 导入规则
  const handleImport = useCallback(async (importedRules: MockRule[]) => {
    try {
      const newRules = importedRules.map((rule) => ({
        ...rule,
        id: generateId(),
        createdAt: Date.now(),
        updatedAt: Date.now()
      }))
      const allRules = [...rules, ...newRules]
      await saveRules(allRules)
      await loadRules()
      await broadcastConfig()
      message.success(`成功导入 ${newRules.length} 条规则`)
    } catch (error) {
      console.error("导入规则失败:", error)
      message.error("导入失败，请检查文件格式")
    }
  }, [rules, loadRules, broadcastConfig])

  // 导出规则
  const handleExport = useCallback(() => {
    const dataStr = JSON.stringify(rules, null, 2)
    const blob = new Blob([dataStr], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `api-mocker-rules-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
    message.success("导出成功")
  }, [rules])

  // 更新规则（供子组件调用）
  const handleUpdateRule = useCallback(async (id: string, updates: Partial<MockRule>) => {
    try {
      await updateRule(id, updates)
      await loadRules()
      await broadcastConfig()
    } catch (error) {
      console.error("更新规则失败:", error)
      message.error("更新失败，请重试")
      throw error // 重新抛出错误，让调用方可以处理
    }
  }, [loadRules, broadcastConfig])

  // 打开场景管理
  const handleSceneManage = useCallback(() => setShowSceneManager(true), [])

  // 关闭场景管理，刷新场景和配置
  const handleSceneManagerClose = useCallback(() => {
    setShowSceneManager(false)
    loadScenes()
    loadConfig()
  }, [loadScenes, loadConfig])

  // 打开环境变量管理
  const handleEnvManage = useCallback(() => {
    chrome.tabs.create({ url: chrome.runtime.getURL("tabs/environments.html") })
  }, [])

  // 切换拦截模式
  const handleInterceptModeChange = useCallback(async (mode: "page" | "network") => {
    try {
      await updateConfig({ interceptMode: mode })
      setConfig({ ...config, interceptMode: mode })
      await broadcastConfig()
      message.success("已切换拦截模式，刷新页面后生效")
    } catch (error) {
      console.error("切换拦截模式失败:", error)
      message.error("切换失败，请重试")
    }
  }, [config, broadcastConfig])

  // 使用 useMemo 优化选中规则的计算
  const selectedRule = useMemo(
    () => rules.find((r) => r.id === selectedRuleId),
    [rules, selectedRuleId]
  )

  return (
    <ConfigProvider theme={{ token: { colorPrimary: "#1890ff" } }}>
      <Layout style={{ height: "100vh" }}>
        <TopBar
          onCreateRule={handleCreateRule}
          onImport={handleImport}
          onExport={handleExport}
          onSearch={setSearchKeyword}
          onSceneManage={handleSceneManage}
          onEnvManage={handleEnvManage}
          interceptMode={config.interceptMode}
          onInterceptModeChange={handleInterceptModeChange}
        />

        <Layout>
          <Sider width={400} theme="light" style={{ borderRight: "1px solid #f0f0f0" }}>
            <EnhancedRuleList
              rules={rules}
              selectedRuleId={selectedRuleId}
              searchKeyword={searchKeyword}
              loading={loading}
              onSelectRule={setSelectedRuleId}
              onDeleteRule={handleDeleteRule}
              onCopyRule={handleCopyRule}
              onBatchDelete={handleBatchDelete}
              onUpdateRule={handleUpdateRule}
              currentScene={currentScene}
            />
          </Sider>

          <Content style={{ background: "#fff", padding: 24 }}>
            {selectedRule ? (
              <EnhancedRuleEditor rule={selectedRule} onSave={handleSaveRule} onDelete={handleDeleteRule} />
            ) : (
              <div style={{ textAlign: "center", padding: "100px 0", color: "#999" }}>
                <p style={{ fontSize: 16 }}>请选择或创建一个规则</p>
              </div>
            )}
          </Content>
        </Layout>
      </Layout>

      {/* 场景管理弹窗 */}
      <Modal
        title="场景管理"
        open={showSceneManager}
        onCancel={handleSceneManagerClose}
        footer={null}
        width={1000}
        destroyOnClose
      >
        <SceneManager onClose={handleSceneManagerClose} />
      </Modal>
    </ConfigProvider>
  )
}

export default OptionsIndex