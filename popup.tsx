import {
  BarChartOutlined,
  PoweroffOutlined,
  QuestionCircleOutlined,
  SettingOutlined
} from "@ant-design/icons"
import { Badge, Button, ConfigProvider, Divider, List, Space, Switch, Typography, Select , message } from "antd"
import { useEffect, useState } from "react"

import { getConfig, getRules, updateConfig } from "~/lib/storage"
import type { GlobalConfig, MockRule } from "~/lib/types"

import "./popup.css"

const { Title, Text } = Typography

function IndexPopup() {
  const [config, setConfig] = useState<GlobalConfig>({
    enabled: true,
    maxRecords: 1000,
    autoClean: true,
    interceptMode: "page"
  })
  const [rules, setRules] = useState<MockRule[]>([])
  const [currentUrl, setCurrentUrl] = useState<string>("")
  const [loading, setLoading] = useState(false)

  // 加载配置和规则
  useEffect(() => {
    loadData()
    getCurrentTabUrl()
  }, [])

  const loadData = async () => {
    const [configData, rulesData] = await Promise.all([getConfig(), getRules()])
    setConfig(configData)
    setRules(rulesData)
  }

  const getCurrentTabUrl = async () => {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
    if (tabs[0]?.url) {
      setCurrentUrl(tabs[0].url)
    }
  }

  // 切换全局开关
  const handleToggleEnabled = async (checked: boolean) => {
    setLoading(true)
    await updateConfig({ enabled: checked })
    setConfig({ ...config, enabled: checked })
    await chrome.runtime.sendMessage({ type: "BROADCAST_CONFIG" })
                    message.success("已切换拦截模式，刷新页面后生效")
    setLoading(false)
  }

  const openOptionsPage = () => {
    chrome.runtime.openOptionsPage()
  }

  const openMonitorPanel = () => {
    chrome.tabs.create({ url: chrome.runtime.getURL("tabs/monitor.html") })
  }

  // 获取当前页面相关的规则
  const getPageRules = () => {
    return rules.filter((rule) => {
      if (!currentUrl) return false
      switch (rule.matchType) {
        case "exact":
          return currentUrl === rule.url
        case "prefix":
          return currentUrl.startsWith(rule.url.replace(/\*$/, ""))
        case "contains":
          return currentUrl.includes(rule.url.replace(/^\*+|\*+$/g, ""))
        case "regex":
          try {
            return new RegExp(rule.url).test(currentUrl)
          } catch {
            return false
          }
        default:
          return false
      }
    })
  }

  const pageRules = getPageRules()
  const enabledRules = pageRules.filter((r) => r.enabled)

  return (
    <ConfigProvider theme={{ token: { colorPrimary: "#1890ff" } }}>
      <div className="popup-container">
        <div className="popup-header">
          <Title level={4} style={{ margin: 0 }}>API Mocker</Title>
          <Space>
            <Button type="text" icon={<QuestionCircleOutlined />} onClick={() => window.open("https://github.com")} />
          </Space>
        </div>

        <div className="popup-content">
          <div className="status-section">
            <Space direction="vertical" style={{ width: "100%" }} size="middle">
              <div className="status-item">
                <Space>
                  <PoweroffOutlined />
                  <Text strong>全局开关</Text>
                </Space>
                <Switch checked={config.enabled} onChange={handleToggleEnabled} loading={loading} />
              </div>

              <div className="status-item">
                <Space>
                  <SettingOutlined />
                  <Text strong>拦截模式</Text>
                </Space>
                <Select
                  size="small"
                  style={{ width: 160 }}
                  value={config.interceptMode}
                  onChange={async (v) => {
                    setLoading(true)
                    await updateConfig({ interceptMode: v as any })
                    setConfig({ ...config, interceptMode: v as any })
                    await chrome.runtime.sendMessage({ type: "BROADCAST_CONFIG" })
                    message.success("已切换拦截模式，刷新页面后生效")
                    setLoading(false)
                  }}
                  options={[
                    { label: "页面 Hook", value: "page" },
                    { label: "网络拦截", value: "network" }
                  ]}
                />
              </div>

              <div className="status-item">
                <Text type="secondary">当前页面规则数</Text>
                <Badge count={pageRules.length} showZero style={{ backgroundColor: "#52c41a" }} />
              </div>

              <div className="status-item">
                <Text type="secondary">已启用规则</Text>
                <Badge count={enabledRules.length} showZero style={{ backgroundColor: "#1890ff" }} />
              </div>
            </Space>
          </div>

          <Divider />

          <div className="rules-section">
            <Text strong>当前页面规则</Text>
            {pageRules.length > 0 ? (
              <List
                size="small"
                dataSource={pageRules.slice(0, 5)}
                renderItem={(rule) => (
                  <List.Item>
                    <Space>
                      <Badge status={rule.enabled ? "success" : "default"} />
                      <Text ellipsis style={{ maxWidth: 280 }}>{rule.name}</Text>
                    </Space>
                  </List.Item>
                )}
                style={{ marginTop: 12 }}
              />
            ) : (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <Text type="secondary">当前页面暂无匹配规则</Text>
              </div>
            )}
          </div>
        </div>

        <div className="popup-footer">
          <Space direction="vertical" style={{ width: "100%" }} size="small">
            <Button type="primary" icon={<SettingOutlined />} block onClick={openOptionsPage}>规则管理</Button>
            <Button icon={<BarChartOutlined />} block onClick={openMonitorPanel}>监控面板</Button>
          </Space>
        </div>
      </div>
    </ConfigProvider>
  )
}

export default IndexPopup