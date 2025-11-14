import { DeleteOutlined, SaveOutlined } from "@ant-design/icons"
import {
  Button,
  Col,
  Divider,
  Form,
  Input,
  InputNumber,
  Modal,
  Radio,
  Row,
  Select,
  Space,
  Switch,
  Tabs,
  message
} from "antd"
import { useEffect, useState } from "react"

import JsonEditor from "~/components/JsonEditor"
import type { MockRule, ResponseType } from "~/lib/types"

const { TextArea } = Input

interface EnhancedRuleEditorProps {
  rule: MockRule
  onSave: (rule: MockRule) => void
  onDelete: (id: string) => void
}

// Mock.js 示例模板
const mockTemplates = {
  user: `{
  "code": 200,
  "data": {
    "id": "@id",
    "name": "@cname",
    "email": "@email",
    "avatar": "@image('200x200')",
    "age|18-60": 1,
    "gender|1": ["男", "女"],
    "address": "@county(true)",
    "createTime": "@datetime"
  }
}`,
  list: `{
  "code": 200,
  "data": {
    "list|10-20": [{
      "id": "@id",
      "title": "@ctitle(5,10)",
      "content": "@cparagraph(1,3)",
      "author": "@cname",
      "views|100-10000": 1,
      "createTime": "@datetime",
      "status|1": ["published", "draft", "deleted"]
    }],
    "total": 100,
    "page": 1,
    "pageSize": 10
  }
}`,
  error: `{
  "code": 500,
  "message": "服务器错误",
  "error": "@pick(['数据库连接失败', '参数错误', '权限不足'])",
  "timestamp": "@now"
}`
}

function EnhancedRuleEditor({ rule, onSave, onDelete }: EnhancedRuleEditorProps) {
  const [form] = Form.useForm()
  const [hasChanges, setHasChanges] = useState(false)
  const [responseType, setResponseType] = useState<ResponseType>(rule.responseType)
  const [responseBody, setResponseBody] = useState(rule.responseBody)
  const [responseHeaders, setResponseHeaders] = useState(
    rule.responseHeaders ? JSON.stringify(rule.responseHeaders, null, 2) : ""
  )
  const [requestHeaders, setRequestHeaders] = useState(
    rule.requestHeaders ? JSON.stringify(rule.requestHeaders, null, 2) : ""
  )
  const [activeTab, setActiveTab] = useState("basic")
  const [enableMockJs, setEnableMockJs] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    form.setFieldsValue(rule)
    setResponseType(rule.responseType)
    setResponseBody(rule.responseBody)
    setResponseHeaders(
      rule.responseHeaders ? JSON.stringify(rule.responseHeaders, null, 2) : ""
    )
    setRequestHeaders(
      rule.requestHeaders ? JSON.stringify(rule.requestHeaders, null, 2) : ""
    )
    setHasChanges(false)

    // 检测是否使用了 Mock.js 语法
    const hasMockSyntax = rule.responseBody.includes("@")
    setEnableMockJs(hasMockSyntax)
  }, [rule, form])

  const handleValuesChange = () => {
    setHasChanges(true)
  }

  const handleSave = async () => {
    if (saving) return
    
    setSaving(true)
    try {
      const values = await form.validateFields()

      // 验证响应体
      if (responseType === "json" && !enableMockJs) {
        try {
          JSON.parse(responseBody)
        } catch {
          message.error("响应体不是有效的 JSON 格式")
          setActiveTab("response")
          return
        }
      }

      // 解析 responseHeaders 和 requestHeaders
      let parsedResponseHeaders = undefined
      let parsedRequestHeaders = undefined

      if (responseHeaders.trim()) {
        try {
          parsedResponseHeaders = JSON.parse(responseHeaders)
        } catch {
          message.error("响应头格式不正确，必须是有效的 JSON")
          setActiveTab("advanced")
          return
        }
      }

      if (requestHeaders.trim()) {
        try {
          parsedRequestHeaders = JSON.parse(requestHeaders)
        } catch {
          message.error("请求头匹配格式不正确，必须是有效的 JSON")
          setActiveTab("advanced")
          return
        }
      }

      const updatedRule: MockRule = {
        ...rule,
        ...values,
        responseBody,
        responseType,
        responseHeaders: parsedResponseHeaders,
        requestHeaders: parsedRequestHeaders,
        updatedAt: Date.now()
      }

      await onSave(updatedRule)
      setHasChanges(false)
    } catch (err: any) {
      const errorFields = err?.errorFields
      if (errorFields && errorFields.length > 0) {
        const firstError = errorFields[0]
        const fieldName = firstError.name[0]
        const errorMsg = firstError.errors[0]
        message.error(`${fieldName}: ${errorMsg}`)
        form.scrollToField(fieldName)
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = () => {
    Modal.confirm({
      title: "确认删除",
      content: `确定要删除规则 "${rule.name}" 吗？`,
      okText: "确定",
      cancelText: "取消",
      okButtonProps: { danger: true },
      onOk: () => onDelete(rule.id)
    })
  }

  // 应用模板
  const applyTemplate = (template: string) => {
    setResponseBody(template)
    setEnableMockJs(true)
    message.success("模板已应用")
  }

  // 快速添加响应头
  const addResponseHeader = (key: string, value: string) => {
    try {
      const headers = responseHeaders.trim() ? JSON.parse(responseHeaders) : {}
      headers[key] = value
      const newHeaders = JSON.stringify(headers, null, 2)
      setResponseHeaders(newHeaders)
      setHasChanges(true)
      message.success(`已添加响应头: ${key}`)
    } catch {
      message.error("当前响应头格式不正确，请先修正")
    }
  }

  // 快速添加请求头匹配
  const addRequestHeader = (key: string, value: string) => {
    try {
      const headers = requestHeaders.trim() ? JSON.parse(requestHeaders) : {}
      headers[key] = value
      const newHeaders = JSON.stringify(headers, null, 2)
      setRequestHeaders(newHeaders)
      setHasChanges(true)
      message.success(`已添加请求头匹配: ${key}`)
    } catch {
      message.error("当前请求头格式不正确，请先修正")
    }
  }

  return (
    <div style={{ maxWidth: 1200 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24
        }}
      >
        <h2 style={{ margin: 0 }}>编辑规则</h2>
        <Space>
          <Button danger icon={<DeleteOutlined />} onClick={handleDelete} disabled={saving}>
            删除
          </Button>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSave}
            loading={saving}
            disabled={!hasChanges && !saving}
          >
            保存
          </Button>
        </Space>
      </div>

      <Form
        form={form}
        layout="vertical"
        onValuesChange={handleValuesChange}
        initialValues={rule}
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'basic',
              label: '基础信息',
              children: (
                <>
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item
                        label="规则名称"
                        name="name"
                        rules={[
                          { required: true, message: "请输入规则名称" },
                          { max: 50, message: "名称不能超过50个字符" }
                        ]}
                      >
                        <Input placeholder="请输入规则名称" />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="分组" name="group">
                        <Input placeholder="输入分组名称（可选）" />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Form.Item label="描述" name="description">
                    <TextArea rows={2} placeholder="输入规则描述（可选）" />
                  </Form.Item>

                  <Form.Item
                    label="启用状态"
                    name="enabled"
                    valuePropName="checked"
                  >
                    <Switch checkedChildren="启用" unCheckedChildren="禁用" />
                  </Form.Item>

                  <Divider />

                  <Row gutter={16}>
                    <Col span={16}>
                      <Form.Item
                        label="URL 模式"
                        name="url"
                        rules={[
                          { required: true, message: "请输入 URL 模式" },
                          {
                            validator: (_, value) => {
                              if (!value) return Promise.resolve()
                              // 简单验证，不检查匹配类型
                              if (value.trim() === '') {
                                return Promise.reject("URL 模式不能为空")
                              }
                              return Promise.resolve()
                            }
                          }
                        ]}
                        extra="支持通配符 * 和正则表达式"
                      >
                        <Input placeholder="例如: */api/user/* 或 https://api.example.com/.*" />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item
                        label="匹配类型"
                        name="matchType"
                        rules={[{ required: true }]}
                      >
                        <Select>
                          <Select.Option value="exact">精确匹配</Select.Option>
                          <Select.Option value="prefix">前缀匹配</Select.Option>
                          <Select.Option value="contains">包含匹配</Select.Option>
                          <Select.Option value="regex">正则表达式</Select.Option>
                        </Select>
                      </Form.Item>
                    </Col>
                  </Row>

                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item
                        label="请求方法"
                        name="method"
                        rules={[{ required: true }]}
                      >
                        <Select>
                          <Select.Option value="ALL">所有方法</Select.Option>
                          <Select.Option value="GET">GET</Select.Option>
                          <Select.Option value="POST">POST</Select.Option>
                          <Select.Option value="PUT">PUT</Select.Option>
                          <Select.Option value="DELETE">DELETE</Select.Option>
                          <Select.Option value="PATCH">PATCH</Select.Option>
                          <Select.Option value="HEAD">HEAD</Select.Option>
                          <Select.Option value="OPTIONS">OPTIONS</Select.Option>
                        </Select>
                      </Form.Item>
                    </Col>
                    <Col span={6}>
                      <Form.Item
                        label="状态码"
                        name="statusCode"
                        rules={[
                          { required: true, message: "请输入状态码" },
                          { type: "number", min: 100, max: 599, message: "状态码范围: 100-599" }
                        ]}
                      >
                        <InputNumber min={100} max={599} style={{ width: "100%" }} />
                      </Form.Item>
                    </Col>
                    <Col span={6}>
                      <Form.Item
                        label="延迟 (ms)"
                        name="delay"
                        rules={[
                          { type: "number", min: 0, max: 10000, message: "延迟范围: 0-10000ms" }
                        ]}
                      >
                        <InputNumber min={0} max={10000} style={{ width: "100%" }} />
                      </Form.Item>
                    </Col>
                  </Row>
                </>
              )
            },
            {
              key: 'response',
              label: '响应配置',
              children: (
                <Space direction="vertical" style={{ width: "100%" }}>
                  <Row gutter={16} align="middle">
                    <Col span={12}>
                      <Radio.Group
                        value={responseType}
                        onChange={(e) => {
                          const newType = e.target.value
                          if (newType !== responseType) {
                            setResponseType(newType)
                            setHasChanges(true)
                          }
                        }}
                      >
                        <Radio.Button value="json">JSON</Radio.Button>
                        <Radio.Button value="text">Text</Radio.Button>
                        <Radio.Button value="html">HTML</Radio.Button>
                        <Radio.Button value="file">File</Radio.Button>
                      </Radio.Group>
                    </Col>
                    <Col span={12} style={{ textAlign: "right" }}>
                      {responseType === "json" && (
                        <Space>
                          <Switch
                            checked={enableMockJs}
                            onChange={setEnableMockJs}
                            checkedChildren="Mock.js"
                            unCheckedChildren="纯 JSON"
                          />
                          {enableMockJs && (
                            <Select
                              placeholder="选择模板"
                              style={{ width: 150 }}
                              onChange={(value) => applyTemplate(mockTemplates[value as keyof typeof mockTemplates])}
                              allowClear={false}
                            >
                              <Select.Option value="user">用户信息</Select.Option>
                              <Select.Option value="list">列表数据</Select.Option>
                              <Select.Option value="error">错误响应</Select.Option>
                            </Select>
                          )}
                        </Space>
                      )}
                    </Col>
                  </Row>

                  <JsonEditor
                    value={responseBody}
                    onChange={(value) => {
                      if (value !== responseBody) {
                        setResponseBody(value)
                        setHasChanges(true)
                      }
                    }}
                    height={400}
                    language={responseType === "html" ? "html" : responseType === "json" ? "json" : "plaintext"}
                  />

                  {enableMockJs && responseType === "json" && (
                    <div style={{
                      background: "#f6f8fa",
                      padding: 12,
                      borderRadius: 4,
                      marginTop: 8
                    }}>
                      <strong>Mock.js 语法说明：</strong>
                      <ul style={{ marginBottom: 0, paddingLeft: 20 }}>
                        <li>@id - 生成随机 ID</li>
                        <li>@cname - 生成中文姓名</li>
                        <li>@email - 生成邮箱地址</li>
                        <li>@datetime - 生成日期时间</li>
                        <li>"age|18-60": 1 - 生成 18-60 之间的数字</li>
                        <li>"list|10": [{`{...}`}] - 生成 10 条数据</li>
                      </ul>
                    </div>
                  )}
                </Space>
              )
            },
            {
              key: 'advanced',
              label: '高级设置',
              children: (
                <Space direction="vertical" style={{ width: "100%" }} size="large">
                  {/* 响应头 */}
                  <div>
                    <div style={{ 
                      display: "flex", 
                      justifyContent: "space-between", 
                      alignItems: "center",
                      marginBottom: 8 
                    }}>
                      <label style={{ fontWeight: 500 }}>响应头</label>
                      <Select
                        placeholder="快速添加常用响应头"
                        style={{ width: 300 }}
                        onChange={(value) => {
                          const [key, val] = value.split(':::')
                          addResponseHeader(key, val)
                        }}
                        value={undefined}
                      >
                        <Select.Option value="Content-Type:::application/json">
                          Content-Type: application/json
                        </Select.Option>
                        <Select.Option value="Content-Type:::text/html; charset=utf-8">
                          Content-Type: text/html
                        </Select.Option>
                        <Select.Option value="Content-Type:::text/plain">
                          Content-Type: text/plain
                        </Select.Option>
                        <Select.Option value="Access-Control-Allow-Origin:::*">
                          Access-Control-Allow-Origin: *
                        </Select.Option>
                        <Select.Option value="Access-Control-Allow-Methods:::GET, POST, PUT, DELETE, OPTIONS">
                          Access-Control-Allow-Methods
                        </Select.Option>
                        <Select.Option value="Access-Control-Allow-Headers:::*">
                          Access-Control-Allow-Headers: *
                        </Select.Option>
                        <Select.Option value="Access-Control-Allow-Credentials:::true">
                          Access-Control-Allow-Credentials: true
                        </Select.Option>
                        <Select.Option value="Cache-Control:::no-cache">
                          Cache-Control: no-cache
                        </Select.Option>
                        <Select.Option value="X-Custom-Header:::custom-value">
                          X-Custom-Header (自定义)
                        </Select.Option>
                      </Select>
                    </div>
                    <JsonEditor
                      value={responseHeaders}
                      onChange={(value) => {
                        if (value !== responseHeaders) {
                          setResponseHeaders(value)
                          setHasChanges(true)
                        }
                      }}
                      height={200}
                      language="json"
                    />
                    <div style={{ 
                      fontSize: 12, 
                      color: "#666", 
                      marginTop: 4 
                    }}>
                      JSON 格式，例如: {`{"Content-Type": "application/json"}`}
                    </div>
                  </div>

                  {/* 请求头匹配 */}
                  <div>
                    <div style={{ 
                      display: "flex", 
                      justifyContent: "space-between", 
                      alignItems: "center",
                      marginBottom: 8 
                    }}>
                      <label style={{ fontWeight: 500 }}>请求头匹配</label>
                      <Select
                        placeholder="快速添加常用请求头"
                        style={{ width: 300 }}
                        onChange={(value) => {
                          const [key, val] = value.split(':::')
                          addRequestHeader(key, val)
                        }}
                        value={undefined}
                      >
                        <Select.Option value="Authorization:::Bearer token">
                          Authorization: Bearer token
                        </Select.Option>
                        <Select.Option value="Content-Type:::application/json">
                          Content-Type: application/json
                        </Select.Option>
                        <Select.Option value="X-Requested-With:::XMLHttpRequest">
                          X-Requested-With: XMLHttpRequest
                        </Select.Option>
                        <Select.Option value="Accept:::application/json">
                          Accept: application/json
                        </Select.Option>
                        <Select.Option value="X-Custom-Token:::your-token">
                          X-Custom-Token (自定义)
                        </Select.Option>
                      </Select>
                    </div>
                    <JsonEditor
                      value={requestHeaders}
                      onChange={(value) => {
                        if (value !== requestHeaders) {
                          setRequestHeaders(value)
                          setHasChanges(true)
                        }
                      }}
                      height={200}
                      language="json"
                    />
                    <div style={{ 
                      fontSize: 12, 
                      color: "#666", 
                      marginTop: 4 
                    }}>
                      可选，仅当请求包含这些头部时才匹配。例如: {`{"Authorization": "Bearer token"}`}
                    </div>
                  </div>
                </Space>
              )
            }
          ]}
        />
      </Form>
    </div>
  )
}

export default EnhancedRuleEditor