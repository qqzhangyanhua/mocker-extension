import {
  ClearOutlined,
  CloudDownloadOutlined,
  CopyOutlined,
  EyeOutlined,
  FilterOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  ReloadOutlined
} from "@ant-design/icons"
import {
  Badge,
  Button,
  Card,
  Col,
  ConfigProvider,
  Descriptions,
  Divider,
  Drawer,
  Dropdown,
  Empty,
  Input,
  Layout,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  message,
  type MenuProps,
  type TabsProps
} from "antd"
import type { ColumnsType } from "antd/es/table"
import { useEffect, useState, useRef } from "react"

import { addRule, getRecords, clearRecords } from "~/lib/storage"
import type { MockRule, RequestRecord } from "~/lib/types"
import { formatBytes, formatDuration, generateId, createRuleFromRequest } from "~/lib/utils"

import "./monitor.css"

const { Header, Content } = Layout
const { Search } = Input
const { Text, Title } = Typography

interface MonitorStats {
  totalRequests: number
  mockedRequests: number
  failedRequests: number
  avgResponseTime: number
  totalDataSize: number
}

function MonitorIndex() {
  const [records, setRecords] = useState<RequestRecord[]>([])
  const [filteredRecords, setFilteredRecords] = useState<RequestRecord[]>([])
  const [isRecording, setIsRecording] = useState(true)
  const [searchText, setSearchText] = useState("")
  const [filterMethod, setFilterMethod] = useState<string>("ALL")
  const [filterStatus, setFilterStatus] = useState<string>("ALL")
  const [stats, setStats] = useState<MonitorStats>({
    totalRequests: 0,
    mockedRequests: 0,
    failedRequests: 0,
    avgResponseTime: 0,
    totalDataSize: 0
  })
  const [selectedRecord, setSelectedRecord] = useState<RequestRecord | null>(null)
  const [detailDrawerVisible, setDetailDrawerVisible] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout>()

  // 加载请求记录
  const loadRecords = async () => {
    if (!isRecording) return

    const data = await getRecords()
    setRecords(data)

    // 计算统计数据
    const stats: MonitorStats = {
      totalRequests: data.length,
      mockedRequests: data.filter(r => r.isMocked).length,
      failedRequests: data.filter(r => r.statusCode >= 400).length,
      avgResponseTime: data.length > 0
        ? data.reduce((sum, r) => sum + r.duration, 0) / data.length
        : 0,
      totalDataSize: data.reduce((sum, r) => sum + (r.size || 0), 0)
    }
    setStats(stats)
  }

  // 定时刷新
  useEffect(() => {
    loadRecords()

    if (isRecording) {
      intervalRef.current = setInterval(loadRecords, 1000)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isRecording])

  // 过滤记录
  useEffect(() => {
    let filtered = [...records]

    // 搜索过滤
    if (searchText) {
      filtered = filtered.filter(r =>
        r.url.toLowerCase().includes(searchText.toLowerCase()) ||
        r.ruleName?.toLowerCase().includes(searchText.toLowerCase())
      )
    }

    // 方法过滤
    if (filterMethod !== "ALL") {
      filtered = filtered.filter(r => r.method === filterMethod)
    }

    // 状态过滤
    if (filterStatus === "MOCKED") {
      filtered = filtered.filter(r => r.isMocked)
    } else if (filterStatus === "REAL") {
      filtered = filtered.filter(r => !r.isMocked)
    } else if (filterStatus === "ERROR") {
      filtered = filtered.filter(r => r.statusCode >= 400)
    }

    setFilteredRecords(filtered)
  }, [records, searchText, filterMethod, filterStatus])

  // 清空记录
  const handleClear = async () => {
    await clearRecords()
    setRecords([])
    message.success("已清空所有记录")
  }

  // 导出记录
  const handleExport = () => {
    const dataStr = JSON.stringify(filteredRecords, null, 2)
    const blob = new Blob([dataStr], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `api-records-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
    message.success("导出成功")
  }

  // 导出为 HAR 格式
  const handleExportHAR = () => {
    const har = {
      log: {
        version: "1.2",
        creator: {
          name: "API Mocker",
          version: "1.0.0"
        },
        entries: filteredRecords.map(r => ({
          startedDateTime: new Date(r.timestamp).toISOString(),
          time: r.duration,
          request: {
            method: r.method,
            url: r.url,
            headers: Object.entries(r.requestHeaders || {}).map(([name, value]) => ({ name, value })),
            postData: r.requestBody ? {
              text: r.requestBody
            } : undefined
          },
          response: {
            status: r.statusCode,
            headers: Object.entries(r.responseHeaders || {}).map(([name, value]) => ({ name, value })),
            content: {
              size: r.size,
              text: r.responseBody
            }
          },
          _isMocked: r.isMocked,
          _ruleName: r.ruleName
        }))
      }
    }

    const dataStr = JSON.stringify(har, null, 2)
    const blob = new Blob([dataStr], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `api-records-${Date.now()}.har`
    a.click()
    URL.revokeObjectURL(url)
    message.success("HAR 文件导出成功")
  }

  // 查看请求详情
  const handleViewDetail = (record: RequestRecord) => {
    setSelectedRecord(record)
    setDetailDrawerVisible(true)
  }

  // 从请求创建规则
  const handleCreateRuleFromRequest = async () => {
    if (!selectedRecord) return

    const newRule = createRuleFromRequest(selectedRecord)
    const rule: MockRule = {
      ...newRule,
      id: generateId(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      usageCount: 0
    } as MockRule

    await addRule(rule)
    message.success("规则创建成功，请在规则管理中查看")
    setDetailDrawerVisible(false)
  }

  // 复制请求信息
  const handleCopyRequest = (type: "url" | "response" | "headers") => {
    if (!selectedRecord) return

    let content = ""
    switch (type) {
      case "url":
        content = selectedRecord.url
        break
      case "response":
        content = selectedRecord.responseBody || ""
        break
      case "headers":
        content = JSON.stringify(selectedRecord.responseHeaders || {}, null, 2)
        break
    }

    navigator.clipboard.writeText(content).then(() => {
      message.success("已复制到剪贴板")
    }).catch(() => {
      message.error("复制失败")
    })
  }

  // 表格列定义
  const columns: ColumnsType<RequestRecord> = [
    {
      title: "时间",
      dataIndex: "timestamp",
      key: "timestamp",
      width: 100,
      render: (timestamp: number) => new Date(timestamp).toLocaleTimeString(),
      sorter: (a, b) => a.timestamp - b.timestamp
    },
    {
      title: "方法",
      dataIndex: "method",
      key: "method",
      width: 80,
      render: (method: string) => {
        const colorMap: Record<string, string> = {
          GET: "blue",
          POST: "green",
          PUT: "orange",
          DELETE: "red",
          PATCH: "purple"
        }
        return <Tag color={colorMap[method] || "default"}>{method}</Tag>
      },
      filters: [
        { text: "GET", value: "GET" },
        { text: "POST", value: "POST" },
        { text: "PUT", value: "PUT" },
        { text: "DELETE", value: "DELETE" },
        { text: "PATCH", value: "PATCH" }
      ],
      onFilter: (value, record) => record.method === value
    },
    {
      title: "URL",
      dataIndex: "url",
      key: "url",
      ellipsis: true,
      render: (url: string) => (
        <Tooltip title={url}>
          <span>{url}</span>
        </Tooltip>
      )
    },
    {
      title: "状态",
      dataIndex: "statusCode",
      key: "statusCode",
      width: 80,
      render: (code: number) => {
        let color = "success"
        if (code >= 400 && code < 500) color = "warning"
        if (code >= 500) color = "error"
        return <Badge status={color as any} text={code} />
      },
      sorter: (a, b) => a.statusCode - b.statusCode
    },
    {
      title: "类型",
      dataIndex: "isMocked",
      key: "isMocked",
      width: 100,
      render: (isMocked: boolean, record) =>
        isMocked ? (
          <Tooltip title={`规则: ${record.ruleName}`}>
            <Tag color="purple">MOCK</Tag>
          </Tooltip>
        ) : (
          <Tag color="default">真实</Tag>
        ),
      filters: [
        { text: "Mock", value: true },
        { text: "真实", value: false }
      ],
      onFilter: (value, record) => record.isMocked === value
    },
    {
      title: "耗时",
      dataIndex: "duration",
      key: "duration",
      width: 100,
      render: (duration: number) => formatDuration(duration),
      sorter: (a, b) => a.duration - b.duration
    },
    {
      title: "大小",
      dataIndex: "size",
      key: "size",
      width: 100,
      render: (size: number) => formatBytes(size),
      sorter: (a, b) => (a.size || 0) - (b.size || 0)
    },
    {
      title: "操作",
      key: "action",
      width: 80,
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => handleViewDetail(record)}
        >
          详情
        </Button>
      )
    }
  ]

  const exportMenuItems: MenuProps["items"] = [
    {
      key: "json",
      label: "导出为 JSON",
      icon: <CloudDownloadOutlined />,
      onClick: handleExport
    },
    {
      key: "har",
      label: "导出为 HAR",
      icon: <CloudDownloadOutlined />,
      onClick: handleExportHAR
    }
  ]

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#1890ff"
        }
      }}>
      <Layout style={{ height: "100vh", background: "#f0f2f5" }}>
        <Header style={{
          background: "#fff",
          padding: "0 24px",
          borderBottom: "1px solid #f0f0f0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}>
          <h2 style={{ margin: 0 }}>请求监控面板</h2>
          <Space>
            <Button
              type={isRecording ? "primary" : "default"}
              icon={isRecording ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
              onClick={() => setIsRecording(!isRecording)}
            >
              {isRecording ? "暂停" : "继续"}
            </Button>
            <Button icon={<ReloadOutlined />} onClick={loadRecords}>
              刷新
            </Button>
            <Dropdown menu={{ items: exportMenuItems }}>
              <Button icon={<CloudDownloadOutlined />}>
                导出
              </Button>
            </Dropdown>
            <Button danger icon={<ClearOutlined />} onClick={handleClear}>
              清空
            </Button>
          </Space>
        </Header>

        <Content style={{ padding: 24, overflow: "auto" }}>
          {/* 统计卡片 */}
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col span={4}>
              <Card>
                <Statistic
                  title="总请求数"
                  value={stats.totalRequests}
                  suffix="个"
                />
              </Card>
            </Col>
            <Col span={4}>
              <Card>
                <Statistic
                  title="Mock 请求"
                  value={stats.mockedRequests}
                  suffix="个"
                  valueStyle={{ color: "#722ed1" }}
                />
              </Card>
            </Col>
            <Col span={4}>
              <Card>
                <Statistic
                  title="失败请求"
                  value={stats.failedRequests}
                  suffix="个"
                  valueStyle={{ color: stats.failedRequests > 0 ? "#cf1322" : undefined }}
                />
              </Card>
            </Col>
            <Col span={4}>
              <Card>
                <Statistic
                  title="平均响应时间"
                  value={stats.avgResponseTime}
                  suffix="ms"
                  precision={0}
                />
              </Card>
            </Col>
            <Col span={4}>
              <Card>
                <Statistic
                  title="总数据量"
                  value={formatBytes(stats.totalDataSize)}
                />
              </Card>
            </Col>
            <Col span={4}>
              <Card>
                <Statistic
                  title="Mock 覆盖率"
                  value={stats.totalRequests > 0
                    ? (stats.mockedRequests / stats.totalRequests * 100)
                    : 0}
                  suffix="%"
                  precision={1}
                  valueStyle={{ color: "#3f8600" }}
                />
              </Card>
            </Col>
          </Row>

          {/* 过滤工具栏 */}
          <Card style={{ marginBottom: 16 }}>
            <Space size="middle" wrap>
              <Search
                placeholder="搜索 URL 或规则名"
                style={{ width: 300 }}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                allowClear
              />
              <Select
                style={{ width: 120 }}
                value={filterMethod}
                onChange={setFilterMethod}
                options={[
                  { label: "所有方法", value: "ALL" },
                  { label: "GET", value: "GET" },
                  { label: "POST", value: "POST" },
                  { label: "PUT", value: "PUT" },
                  { label: "DELETE", value: "DELETE" }
                ]}
              />
              <Select
                style={{ width: 120 }}
                value={filterStatus}
                onChange={setFilterStatus}
                options={[
                  { label: "所有状态", value: "ALL" },
                  { label: "Mock", value: "MOCKED" },
                  { label: "真实", value: "REAL" },
                  { label: "错误", value: "ERROR" }
                ]}
              />
              <span style={{ color: "#999" }}>
                共 {filteredRecords.length} 条记录
              </span>
            </Space>
          </Card>

          {/* 请求列表 */}
          <Card>
            {filteredRecords.length > 0 ? (
              <Table
                columns={columns}
                dataSource={filteredRecords}
                rowKey="id"
                size="small"
                pagination={{
                  pageSize: 20,
                  showSizeChanger: true,
                  showTotal: (total) => `共 ${total} 条`
                }}
                onRow={(record) => ({
                  onClick: () => handleViewDetail(record),
                  style: { cursor: "pointer" }
                })}
              />
            ) : (
              <Empty description={isRecording ? "暂无请求记录" : "记录已暂停"} />
            )}
          </Card>
        </Content>
      </Layout>

      {/* 请求详情抽屉 */}
      <Drawer
        title="请求详情"
        placement="right"
        open={detailDrawerVisible}
        onClose={() => setDetailDrawerVisible(false)}
        width={800}
        extra={
          <Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleCreateRuleFromRequest}
            >
              创建规则
            </Button>
          </Space>
        }
      >
        {selectedRecord && (
          <div>
            <Descriptions bordered column={1} size="small">
              <Descriptions.Item label="URL">
                <Space>
                  <Text copyable>{selectedRecord.url}</Text>
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="方法">
                <Tag color={
                  selectedRecord.method === "GET" ? "blue" :
                  selectedRecord.method === "POST" ? "green" :
                  selectedRecord.method === "PUT" ? "orange" :
                  selectedRecord.method === "DELETE" ? "red" : "default"
                }>
                  {selectedRecord.method}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="状态码">
                <Badge
                  status={
                    selectedRecord.statusCode < 400 ? "success" :
                    selectedRecord.statusCode < 500 ? "warning" : "error"
                  }
                  text={selectedRecord.statusCode}
                />
              </Descriptions.Item>
              <Descriptions.Item label="类型">
                {selectedRecord.isMocked ? (
                  <Tag color="purple">MOCK - {selectedRecord.ruleName}</Tag>
                ) : (
                  <Tag>真实请求</Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="耗时">
                {formatDuration(selectedRecord.duration)}
              </Descriptions.Item>
              <Descriptions.Item label="大小">
                {formatBytes(selectedRecord.size)}
              </Descriptions.Item>
              <Descriptions.Item label="时间">
                {new Date(selectedRecord.timestamp).toLocaleString()}
              </Descriptions.Item>
            </Descriptions>

            <Tabs
              style={{ marginTop: 24 }}
              items={[
                {
                  key: "request",
                  label: "请求",
                  children: (
                    <div>
                      {selectedRecord.requestHeaders && (
                        <>
                          <Title level={5}>请求头</Title>
                          <pre style={{
                            background: "#f5f5f5",
                            padding: 12,
                            borderRadius: 4,
                            overflow: "auto"
                          }}>
                            {JSON.stringify(selectedRecord.requestHeaders, null, 2)}
                          </pre>
                        </>
                      )}
                      {selectedRecord.requestBody && (
                        <>
                          <Title level={5} style={{ marginTop: 16 }}>请求体</Title>
                          <pre style={{
                            background: "#f5f5f5",
                            padding: 12,
                            borderRadius: 4,
                            overflow: "auto",
                            maxHeight: 400
                          }}>
                            {typeof selectedRecord.requestBody === "string"
                              ? selectedRecord.requestBody
                              : JSON.stringify(selectedRecord.requestBody, null, 2)}
                          </pre>
                        </>
                      )}
                    </div>
                  )
                },
                {
                  key: "response",
                  label: "响应",
                  children: (
                    <div>
                      {selectedRecord.responseHeaders && (
                        <>
                          <Title level={5}>响应头</Title>
                          <pre style={{
                            background: "#f5f5f5",
                            padding: 12,
                            borderRadius: 4,
                            overflow: "auto"
                          }}>
                            {JSON.stringify(selectedRecord.responseHeaders, null, 2)}
                          </pre>
                        </>
                      )}
                      {selectedRecord.responseBody && (
                        <>
                          <Title level={5} style={{ marginTop: 16 }}>
                            响应体
                            <Button
                              size="small"
                              type="link"
                              icon={<CopyOutlined />}
                              onClick={() => handleCopyRequest("response")}
                              style={{ marginLeft: 8 }}
                            >
                              复制
                            </Button>
                          </Title>
                          <pre style={{
                            background: "#f5f5f5",
                            padding: 12,
                            borderRadius: 4,
                            overflow: "auto",
                            maxHeight: 400
                          }}>
                            {typeof selectedRecord.responseBody === "string"
                              ? selectedRecord.responseBody
                              : JSON.stringify(selectedRecord.responseBody, null, 2)}
                          </pre>
                        </>
                      )}
                    </div>
                  )
                }
              ]}
            />
          </div>
        )}
      </Drawer>
    </ConfigProvider>
  )
}

export default MonitorIndex