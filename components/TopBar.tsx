import {
  AppstoreOutlined,
  DownloadOutlined,
  PlusOutlined,
  SearchOutlined,
  UploadOutlined
} from "@ant-design/icons"
import { Button, Input, Layout, Select, Space, Upload, message } from "antd"

import type { MockRule, InterceptMode } from "~/lib/types"

const { Header } = Layout

interface TopBarProps {
  onCreateRule: () => void
  onImport: (rules: MockRule[]) => void
  onExport: () => void
  onSearch: (keyword: string) => void
  onSceneManage?: () => void
  interceptMode?: InterceptMode
  onInterceptModeChange?: (mode: InterceptMode) => void
}

function TopBar({ onCreateRule, onImport, onExport, onSearch, onSceneManage, interceptMode, onInterceptModeChange }: TopBarProps) {
  const handleFileUpload = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
        const rules = JSON.parse(content)

        if (!Array.isArray(rules)) {
          message.error("导入文件格式错误，应为规则数组")
          return
        }

        onImport(rules)
      } catch (err) {
        message.error("导入失败，请检查文件格式")
      }
    }
    reader.readAsText(file)
    return false // 阻止自动上传
  }

  return (
    <Header
      style={{
        background: "#fff",
        padding: "0 24px",
        borderBottom: "1px solid #f0f0f0",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <h1 style={{ margin: 0, fontSize: 20 }}>API Mocker - 规则管理</h1>
        
        {/* 拦截模式选择 */}
        {interceptMode && onInterceptModeChange && (
          <Select
            value={interceptMode}
            onChange={onInterceptModeChange}
            style={{ width: 140 }}
            options={[
              { label: "页面 Hook", value: "page" },
              { label: "网络拦截", value: "network" }
            ]}
          />
        )}
      </div>

      <Space>
        <Input
          placeholder="搜索规则..."
          prefix={<SearchOutlined />}
          style={{ width: 200 }}
          onChange={(e) => onSearch(e.target.value)}
          allowClear
        />

        <Button icon={<AppstoreOutlined />} onClick={onSceneManage}>
          场景管理
        </Button>

        <Button type="primary" icon={<PlusOutlined />} onClick={onCreateRule}>
          新建规则
        </Button>

        <Upload accept=".json" showUploadList={false} beforeUpload={handleFileUpload}>
          <Button icon={<UploadOutlined />}>导入</Button>
        </Upload>

        <Button icon={<DownloadOutlined />} onClick={onExport}>
          导出
        </Button>
      </Space>
    </Header>
  )
}

export default TopBar
