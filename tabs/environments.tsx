import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons"
import { Button, Card, ConfigProvider, Divider, Form, Input, message, Modal, Space, Table, Typography } from "antd"
import { useEffect, useState } from "react"

import { addEnvironment, deleteEnvironment, getConfig, getEnvironments, updateConfig, updateEnvironment } from "~/lib/storage"
import type { Environment } from "~/lib/types"
import { generateId } from "~/lib/utils"

const { Title, Text } = Typography
const { TextArea } = Input

function EnvironmentsPage() {
  const [environments, setEnvironments] = useState<Environment[]>([])
  const [currentEnvId, setCurrentEnvId] = useState<string | undefined>()
  const [modalVisible, setModalVisible] = useState(false)
  const [editingEnv, setEditingEnv] = useState<Environment | null>(null)
  const [form] = Form.useForm()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const [envs, config] = await Promise.all([
      getEnvironments(),
      getConfig()
    ])
    setEnvironments(envs)
    setCurrentEnvId(config.currentEnvironment)
  }

  const handleAdd = () => {
    setEditingEnv(null)
    form.resetFields()
    setModalVisible(true)
  }

  const handleEdit = (env: Environment) => {
    setEditingEnv(env)
    form.setFieldsValue({
      name: env.name,
      description: env.description,
      variables: JSON.stringify(env.variables, null, 2)
    })
    setModalVisible(true)
  }

  const handleDelete = async (id: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个环境吗？',
      okText: '删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        await deleteEnvironment(id)
        if (currentEnvId === id) {
          await updateConfig({ currentEnvironment: undefined })
          setCurrentEnvId(undefined)
        }
        message.success('环境已删除')
        await loadData()
      }
    })
  }

  const handleActivate = async (id: string) => {
    await updateConfig({ currentEnvironment: id })
    setCurrentEnvId(id)
    message.success('环境已激活')
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      
      // 解析变量 JSON
      let variables: Record<string, string> = {}
      try {
        const parsed = JSON.parse(values.variables || '{}')
        if (typeof parsed !== 'object' || Array.isArray(parsed)) {
          throw new Error('变量必须是键值对对象')
        }
        variables = parsed
      } catch (e) {
        message.error('变量格式错误，必须是有效的 JSON 对象')
        return
      }

      if (editingEnv) {
        // 更新
        await updateEnvironment(editingEnv.id, {
          name: values.name,
          description: values.description,
          variables
        })
        message.success('环境已更新')
      } else {
        // 新建
        const newEnv: Environment = {
          id: generateId(),
          name: values.name,
          description: values.description,
          variables,
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
        await addEnvironment(newEnv)
        message.success('环境已创建')
      }

      setModalVisible(false)
      await loadData()
    } catch (error: any) {
      console.error('Save error:', error)
    }
  }

  const columns = [
    {
      title: '环境名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Environment) => (
        <Space>
          <Text strong>{text}</Text>
          {currentEnvId === record.id && (
            <span style={{ color: '#52c41a', fontSize: 12 }}>● 已激活</span>
          )}
        </Space>
      )
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      render: (text: string) => <Text type="secondary">{text || '-'}</Text>
    },
    {
      title: '变量数量',
      key: 'varCount',
      render: (_, record: Environment) => (
        <Text>{Object.keys(record.variables).length} 个</Text>
      )
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      render: (time: number) => new Date(time).toLocaleString()
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record: Environment) => (
        <Space>
          {currentEnvId !== record.id && (
            <Button 
              size="small" 
              type="link" 
              onClick={() => handleActivate(record.id)}
            >
              激活
            </Button>
          )}
          <Button 
            size="small" 
            type="link" 
            icon={<EditOutlined />} 
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Button 
            size="small" 
            type="link" 
            danger 
            icon={<DeleteOutlined />} 
            onClick={() => handleDelete(record.id)}
          >
            删除
          </Button>
        </Space>
      )
    }
  ]

  return (
    <ConfigProvider theme={{ token: { colorPrimary: "#1890ff" } }}>
      <div style={{ minHeight: "100vh", backgroundColor: "#f5f5f5" }}>
        <div style={{ 
          background: "#fff", 
          padding: "16px 24px", 
          borderBottom: "1px solid #f0f0f0",
          marginBottom: 24 
        }}>
          <Title level={3} style={{ margin: 0 }}>环境变量管理</Title>
        </div>
        
        <div style={{ padding: 24, maxWidth: 1400, margin: "0 auto" }}>
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <Title level={4} style={{ margin: 0 }}>环境变量管理</Title>
                <Text type="secondary">
                  在规则中使用 ${"${VAR_NAME}"} 语法引用环境变量
                </Text>
              </div>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                新建环境
              </Button>
            </div>

            <Divider />

            <Table
              dataSource={environments}
              columns={columns}
              rowKey="id"
              pagination={false}
              locale={{ emptyText: '暂无环境，点击"新建环境"开始' }}
            />
          </Card>

          {/* 使用说明 */}
          <Card style={{ marginTop: 16 }}>
            <Title level={5}>使用说明</Title>
            <Space direction="vertical" size="small">
              <Text>1. 创建环境并定义变量（如 API_HOST、TOKEN 等）</Text>
              <Text>2. 在规则的 URL、响应内容等字段中使用 ${"${VAR_NAME}"} 引用变量</Text>
              <Text>3. 激活环境后，所有规则中的变量都会被替换为当前环境的值</Text>
              <Text>4. 不同环境可以有相同的变量名但不同的值，方便快速切换</Text>
            </Space>
            
            <Divider />
            
            <Title level={5}>示例</Title>
            <Text>环境变量配置：</Text>
            <pre style={{ 
              background: '#f5f5f5', 
              padding: 12, 
              borderRadius: 4,
              marginTop: 8 
            }}>
{`{
  "API_HOST": "https://api.example.com",
  "TOKEN": "your-auth-token",
  "USER_ID": "12345"
}`}
            </pre>
            
            <Text style={{ marginTop: 12, display: 'block' }}>在规则中使用：</Text>
            <pre style={{ 
              background: '#f5f5f5', 
              padding: 12, 
              borderRadius: 4,
              marginTop: 8 
            }}>
{`URL: \${API_HOST}/users/\${USER_ID}
响应: { "token": "\${TOKEN}" }`}
            </pre>
          </Card>
        </div>
      </div>

      {/* 编辑/新建 Modal */}
      <Modal
        title={editingEnv ? '编辑环境' : '新建环境'}
        open={modalVisible}
        onOk={handleSave}
        onCancel={() => setModalVisible(false)}
        width={600}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="name"
            label="环境名称"
            rules={[{ required: true, message: '请输入环境名称' }]}
          >
            <Input placeholder="例如: 开发环境、测试环境、生产环境" />
          </Form.Item>

          <Form.Item
            name="description"
            label="描述"
          >
            <Input placeholder="选填，环境的简短描述" />
          </Form.Item>

          <Form.Item
            name="variables"
            label="环境变量（JSON 格式）"
            rules={[
              { required: true, message: '请输入环境变量' },
              {
                validator: (_, value) => {
                  if (!value) return Promise.resolve()
                  try {
                    const parsed = JSON.parse(value)
                    if (typeof parsed !== 'object' || Array.isArray(parsed)) {
                      return Promise.reject('必须是键值对对象')
                    }
                    return Promise.resolve()
                  } catch {
                    return Promise.reject('JSON 格式错误')
                  }
                }
              }
            ]}
          >
            <TextArea 
              rows={12}
              placeholder={'{\n  "API_HOST": "https://api.example.com",\n  "TOKEN": "your-token"\n}'}
              style={{ fontFamily: 'monospace' }}
            />
          </Form.Item>
        </Form>
      </Modal>
    </ConfigProvider>
  )
}

export default EnvironmentsPage

