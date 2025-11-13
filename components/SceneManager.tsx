import {
  AppstoreOutlined,
  CheckCircleOutlined,
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  ExportOutlined,
  ImportOutlined,
  PlusOutlined,
  SettingOutlined
} from "@ant-design/icons"
import {
  Button,
  Card,
  Col,
  Dropdown,
  Empty,
  Form,
  Input,
  List,
  Modal,
  Row,
  Space,
  Switch,
  Tag,
  Tooltip,
  Typography,
  message,
  type MenuProps
} from "antd"
import { useEffect, useState } from "react"

import {
  addScene,
  deleteScene,
  getConfig,
  getRules,
  getScenes,
  updateConfig,
  updateScene
} from "~/lib/storage"
import type { MockRule, MockScene } from "~/lib/types"
import { generateId } from "~/lib/utils"

const { Title, Text, Paragraph } = Typography
const { TextArea } = Input

interface SceneManagerProps {
  onClose?: () => void
}

function SceneManager({ onClose }: SceneManagerProps) {
  const [scenes, setScenes] = useState<MockScene[]>([])
  const [rules, setRules] = useState<MockRule[]>([])
  const [currentSceneId, setCurrentSceneId] = useState<string | undefined>()
  const [editingScene, setEditingScene] = useState<MockScene | null>(null)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)

  // 加载数据
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [scenesData, rulesData, config] = await Promise.all([
        getScenes(),
        getRules(),
        getConfig()
      ])
      setScenes(scenesData)
      setRules(rulesData)
      setCurrentSceneId(config.currentScene)
    } finally {
      setLoading(false)
    }
  }

  // 创建新场景
  const handleCreateScene = () => {
    setEditingScene(null)
    form.resetFields()
    setIsModalVisible(true)
  }

  // 编辑场景
  const handleEditScene = (scene: MockScene) => {
    setEditingScene(scene)
    form.setFieldsValue({
      name: scene.name,
      description: scene.description
    })
    setIsModalVisible(true)
  }

  // 保存场景
  const handleSaveScene = async () => {
    try {
      const values = await form.validateFields()

      if (editingScene) {
        // 更新场景
        await updateScene(editingScene.id, {
          name: values.name,
          description: values.description,
          updatedAt: Date.now()
        })
        message.success("场景更新成功")
      } else {
        // 创建新场景
        const newScene: MockScene = {
          id: generateId(),
          name: values.name,
          description: values.description,
          rules: [],
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
        await addScene(newScene)
        message.success("场景创建成功")
      }

      setIsModalVisible(false)
      loadData()
    } catch (err) {
      console.error("Save scene error:", err)
    }
  }

  // 删除场景
  const handleDeleteScene = (scene: MockScene) => {
    Modal.confirm({
      title: "确认删除",
      content: `确定要删除场景 "${scene.name}" 吗？`,
      okText: "确定",
      cancelText: "取消",
      okButtonProps: { danger: true },
      onOk: async () => {
        await deleteScene(scene.id)
        if (currentSceneId === scene.id) {
          await updateConfig({ currentScene: undefined })
        }
        message.success("删除成功")
        loadData()
      }
    })
  }

  // 复制场景
  const handleCopyScene = async (scene: MockScene) => {
    const newScene: MockScene = {
      ...scene,
      id: generateId(),
      name: `${scene.name} - 副本`,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    await addScene(newScene)
    message.success("复制成功")
    loadData()
  }

  // 切换场景
  const handleSwitchScene = async (sceneId: string | undefined) => {
    await updateConfig({ currentScene: sceneId })
    setCurrentSceneId(sceneId)

    // 广播配置更新
    await chrome.runtime.sendMessage({ type: "BROADCAST_CONFIG" })

    if (sceneId) {
      const scene = scenes.find(s => s.id === sceneId)
      message.success(`已切换到场景: ${scene?.name}`)
    } else {
      message.success("已切换到默认场景")
    }
  }

  // 更新场景规则
  const handleUpdateSceneRules = async (scene: MockScene, ruleId: string, enabled: boolean) => {
    const existingRule = scene.rules.find(r => r.ruleId === ruleId)

    let newRules
    if (existingRule) {
      newRules = scene.rules.map(r =>
        r.ruleId === ruleId ? { ...r, enabled } : r
      )
    } else {
      newRules = [...scene.rules, { ruleId, enabled }]
    }

    await updateScene(scene.id, {
      rules: newRules,
      updatedAt: Date.now()
    })

    message.success("场景规则已更新")
    loadData()
  }

  // 导出场景
  const handleExportScene = (scene: MockScene) => {
    const exportData = {
      scene,
      rules: rules.filter(r => scene.rules.some(sr => sr.ruleId === r.id))
    }

    const dataStr = JSON.stringify(exportData, null, 2)
    const blob = new Blob([dataStr], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `scene-${scene.name}-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
    message.success("导出成功")
  }

  // 导入场景
  const handleImportScene = () => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".json"
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      try {
        const text = await file.text()
        const data = JSON.parse(text)

        if (!data.scene || !data.rules) {
          throw new Error("无效的场景文件格式")
        }

        // 导入场景
        const newScene: MockScene = {
          ...data.scene,
          id: generateId(),
          createdAt: Date.now(),
          updatedAt: Date.now()
        }

        await addScene(newScene)
        message.success("场景导入成功")
        loadData()
      } catch (err: any) {
        message.error(`导入失败: ${err.message}`)
      }
    }
    input.click()
  }

  // 获取场景中启用的规则数
  const getActiveRulesCount = (scene: MockScene) => {
    return scene.rules.filter(r => r.enabled).length
  }

  // 场景操作菜单
  const getSceneActions = (scene: MockScene): MenuProps["items"] => [
    {
      key: "edit",
      label: "编辑",
      icon: <EditOutlined />,
      onClick: () => handleEditScene(scene)
    },
    {
      key: "copy",
      label: "复制",
      icon: <CopyOutlined />,
      onClick: () => handleCopyScene(scene)
    },
    {
      key: "export",
      label: "导出",
      icon: <ExportOutlined />,
      onClick: () => handleExportScene(scene)
    },
    {
      type: "divider"
    },
    {
      key: "delete",
      label: "删除",
      icon: <DeleteOutlined />,
      danger: true,
      onClick: () => handleDeleteScene(scene)
    }
  ]

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Title level={3} style={{ margin: 0 }}>
          <AppstoreOutlined /> 场景管理
        </Title>
        <Space>
          <Button icon={<ImportOutlined />} onClick={handleImportScene}>
            导入场景
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateScene}>
            新建场景
          </Button>
        </Space>
      </div>

      {/* 默认场景卡片 */}
      <Card
        style={{ marginBottom: 16 }}
        className={!currentSceneId ? "active-scene" : ""}
        onClick={() => handleSwitchScene(undefined)}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Space>
            <Title level={5} style={{ margin: 0 }}>默认场景</Title>
            {!currentSceneId && <Tag color="blue">当前使用</Tag>}
          </Space>
          <Space>
            <Text type="secondary">{rules.filter(r => r.enabled).length} 条活动规则</Text>
            {!currentSceneId && <CheckCircleOutlined style={{ color: "#1890ff", fontSize: 20 }} />}
          </Space>
        </div>
        <Paragraph type="secondary" style={{ margin: "8px 0 0 0" }}>
          不使用场景过滤，应用所有已启用的规则
        </Paragraph>
      </Card>

      {/* 场景列表 */}
      {scenes.length > 0 ? (
        <Row gutter={[16, 16]}>
          {scenes.map(scene => (
            <Col key={scene.id} xs={24} sm={12} lg={8}>
              <Card
                className={currentSceneId === scene.id ? "active-scene" : ""}
                hoverable
                onClick={() => handleSwitchScene(scene.id)}
                actions={[
                  <Dropdown menu={{ items: getSceneActions(scene) }} trigger={["click"]}>
                    <SettingOutlined key="setting" onClick={(e) => e.stopPropagation()} />
                  </Dropdown>
                ]}
              >
                <Card.Meta
                  title={
                    <Space>
                      {scene.name}
                      {currentSceneId === scene.id && <Tag color="blue">当前使用</Tag>}
                    </Space>
                  }
                  description={scene.description || "暂无描述"}
                />
                <div style={{ marginTop: 16 }}>
                  <Space>
                    <Text type="secondary">{getActiveRulesCount(scene)} 条活动规则</Text>
                    {currentSceneId === scene.id && (
                      <CheckCircleOutlined style={{ color: "#1890ff", fontSize: 20 }} />
                    )}
                  </Space>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      ) : (
        <Empty description="暂无场景，点击新建场景创建第一个场景" />
      )}

      {/* 编辑场景弹窗 */}
      <Modal
        title={editingScene ? "编辑场景" : "新建场景"}
        open={isModalVisible}
        onOk={handleSaveScene}
        onCancel={() => setIsModalVisible(false)}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="场景名称"
            name="name"
            rules={[{ required: true, message: "请输入场景名称" }]}
          >
            <Input placeholder="例如：开发环境、测试环境" />
          </Form.Item>
          <Form.Item label="场景描述" name="description">
            <TextArea
              rows={4}
              placeholder="描述这个场景的用途..."
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default SceneManager