import { ConfigProvider, Layout, Modal, message } from "antd"
import { useEffect, useState } from "react"

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
  updateConfig
} from "~/lib/storage"
import type { MockRule, GlobalConfig } from "~/lib/types"
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

  // 加载配置与规则
  useEffect(() => {
    loadRules()
    loadConfig()
  }, [])

  const loadRules = async () => {
    setLoading(true)
    const rulesData = await getRules()
    setRules(rulesData)
    setLoading(false)
  }

  const loadConfig = async () => {
    const cfg = await getConfig()
    setConfig(cfg)
  }

  // 创建新规则
  const handleCreateRule = async () => {
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
  }

  // 保存规则
  const handleSaveRule = async (rule: MockRule) => {
    await updateRule(rule.id, rule)
    await loadRules()
    message.success("保存成功")
    await chrome.runtime.sendMessage({ type: "BROADCAST_CONFIG" })
  }

  // 删除规则
  const handleDeleteRule = async (id: string) => {
    await deleteRule(id)
    await loadRules()
    if (selectedRuleId === id) setSelectedRuleId(null)
    message.success("删除成功")
    await chrome.runtime.sendMessage({ type: "BROADCAST_CONFIG" })
  }

  // 批量删除规则
  const handleBatchDelete = async (ids: string[]) => {
    await deleteRules(ids)
    await loadRules()
    if (selectedRuleId && ids.includes(selectedRuleId)) setSelectedRuleId(null)
    message.success(`已删除 ${ids.length} 条规则`)
    await chrome.runtime.sendMessage({ type: "BROADCAST_CONFIG" })
  }

  // 复制规则
  const handleCopyRule = async (rule: MockRule) => {
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
  }

  // 导入规则
  const handleImport = async (importedRules: MockRule[]) => {
    const newRules = importedRules.map((rule) => ({
      ...rule,
      id: generateId(),
      createdAt: Date.now(),
      updatedAt: Date.now()
    }))
    const allRules = [...rules, ...newRules]
    await saveRules(allRules)
    await loadRules()
    message.success(`成功导入 ${newRules.length} 条规则`)
    await chrome.runtime.sendMessage({ type: "BROADCAST_CONFIG" })
  }

  // 导出规则
  const handleExport = () => {
    const dataStr = JSON.stringify(rules, null, 2)
    const blob = new Blob([dataStr], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `api-mocker-rules-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
    message.success("导出成功")
  }

  // 分组更新
  const handleUpdateRule = async (id: string, updates: Partial<MockRule>) => {
    await updateRule(id, updates)
    await loadRules()
  }

  // 打开场景管理
  const handleSceneManage = () => setShowSceneManager(true)

  const selectedRule = rules.find((r) => r.id === selectedRuleId)

  return (
    <ConfigProvider theme={{ token: { colorPrimary: "#1890ff" } }}>
      <Layout style={{ height: "100vh" }}>
        <TopBar
          onCreateRule={handleCreateRule}
          onImport={handleImport}
          onExport={handleExport}
          onSearch={setSearchKeyword}
          onSceneManage={handleSceneManage}
        />

        {/* 全局拦截模式设置 */}
        <div style={{ padding: "8px 16px", borderBottom: "1px solid #f0f0f0", background: "#fff" }}>
          <span style={{ marginRight: 8, color: "#555" }}>拦截模式</span>
          <select
            value={config.interceptMode}
            onChange={async (e) => {
              const v = e.target.value as any
              await updateConfig({ interceptMode: v })
              setConfig({ ...config, interceptMode: v })
              await chrome.runtime.sendMessage({ type: "BROADCAST_CONFIG" })
              message.success("已切换拦截模式，刷新页面后生效")
            }}
            style={{ padding: "4px 8px", border: "1px solid #d9d9d9", borderRadius: 4 }}
          >
            <option value="page">页面 Hook</option>
            <option value="network">网络拦截</option>
          </select>
          <span style={{ marginLeft: 8, color: "#999" }}>切换后刷新页面生效</span>
        </div>

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
        onCancel={() => setShowSceneManager(false)}
        footer={null}
        width={1000}
        destroyOnClose
      >
        <SceneManager onClose={() => setShowSceneManager(false)} />
      </Modal>
    </ConfigProvider>
  )
}

export default OptionsIndex