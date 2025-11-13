import {
  CheckCircleOutlined,
  CodeOutlined,
  CopyOutlined,
  FileAddOutlined,
  PlayCircleOutlined,
  RocketOutlined,
  SettingOutlined,
  ThunderboltOutlined
} from "@ant-design/icons"
import {
  Button,
  Card,
  Col,
  ConfigProvider,
  Divider,
  Layout,
  Row,
  Space,
  Steps,
  Typography,
  message
} from "antd"
import { useState } from "react"

import { addRule } from "~/lib/storage"
import type { MockRule } from "~/lib/types"
import { generateId } from "~/lib/utils"

import "./welcome.css"

const { Title, Paragraph, Text, Link } = Typography
const { Content } = Layout

// 示例规则模板
const sampleRules: Partial<MockRule>[] = [
  {
    name: "示例：Mock 用户信息接口",
    description: "返回模拟的用户信息数据",
    url: "*/api/user/info",
    matchType: "contains",
    method: "GET",
    statusCode: 200,
    delay: 300,
    responseType: "json",
    responseBody: JSON.stringify({
      code: 200,
      message: "success",
      data: {
        id: 1,
        name: "张三",
        email: "zhangsan@example.com",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg",
        role: "admin",
        createTime: "2024-01-01 10:00:00"
      }
    }, null, 2)
  },
  {
    name: "示例：Mock 列表数据",
    description: "返回分页列表数据",
    url: "*/api/list",
    matchType: "contains",
    method: "POST",
    statusCode: 200,
    delay: 500,
    responseType: "json",
    responseBody: JSON.stringify({
      code: 200,
      message: "success",
      data: {
        list: [
          { id: 1, title: "项目 1", status: "进行中" },
          { id: 2, title: "项目 2", status: "已完成" },
          { id: 3, title: "项目 3", status: "待开始" }
        ],
        total: 100,
        page: 1,
        pageSize: 10
      }
    }, null, 2)
  },
  {
    name: "示例：Mock 错误响应",
    description: "模拟服务器错误",
    url: "*/api/error",
    matchType: "contains",
    method: "ALL",
    statusCode: 500,
    delay: 100,
    responseType: "json",
    responseBody: JSON.stringify({
      code: 500,
      message: "Internal Server Error",
      error: "服务器内部错误，请稍后重试"
    }, null, 2)
  }
]

function WelcomeIndex() {
  const [currentStep, setCurrentStep] = useState(0)
  const [installing, setInstalling] = useState(false)

  // 安装示例规则
  const installSampleRules = async () => {
    setInstalling(true)
    try {
      for (const rule of sampleRules) {
        const newRule: MockRule = {
          ...rule,
          id: generateId(),
          enabled: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          usageCount: 0
        } as MockRule

        await addRule(newRule)
      }
      message.success("示例规则安装成功！")
      setCurrentStep(1)
    } catch (err) {
      message.error("安装失败，请重试")
    } finally {
      setInstalling(false)
    }
  }

  // 打开选项页
  const openOptions = () => {
    chrome.runtime.openOptionsPage()
  }

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#1890ff"
        }
      }}>
      <Layout style={{ minHeight: "100vh", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
        <Content style={{ padding: "50px" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            {/* 标题区域 */}
            <div style={{ textAlign: "center", marginBottom: 50 }}>
              <Space align="center" size="large">
                <RocketOutlined style={{ fontSize: 48, color: "#fff" }} />
                <Title level={1} style={{ color: "#fff", margin: 0 }}>
                  欢迎使用 API Mocker
                </Title>
              </Space>
              <Paragraph style={{ fontSize: 18, color: "rgba(255, 255, 255, 0.9)", marginTop: 16 }}>
                强大的浏览器请求拦截和模拟工具，让前端开发更高效
              </Paragraph>
            </div>

            {/* 快速开始步骤 */}
            <Card style={{ marginBottom: 32 }}>
              <Title level={3}>
                <PlayCircleOutlined /> 快速开始
              </Title>
              <Steps current={currentStep} style={{ marginBottom: 32 }}>
                <Steps.Step title="安装示例规则" description="一键导入常用模板" />
                <Steps.Step title="创建自定义规则" description="根据需求定制" />
                <Steps.Step title="开始使用" description="访问网站测试" />
              </Steps>

              <div style={{ padding: "24px 0" }}>
                {currentStep === 0 && (
                  <div>
                    <Paragraph>
                      我们准备了一些常用的示例规则，帮助您快速了解 API Mocker 的功能：
                    </Paragraph>
                    <ul>
                      <li>用户信息接口模拟</li>
                      <li>列表数据分页模拟</li>
                      <li>错误响应模拟</li>
                    </ul>
                    <Button
                      type="primary"
                      size="large"
                      icon={<FileAddOutlined />}
                      loading={installing}
                      onClick={installSampleRules}>
                      安装示例规则
                    </Button>
                  </div>
                )}
                {currentStep === 1 && (
                  <div>
                    <Paragraph>
                      <CheckCircleOutlined style={{ color: "#52c41a", marginRight: 8 }} />
                      示例规则已安装！现在您可以创建自己的规则了。
                    </Paragraph>
                    <Space>
                      <Button
                        type="primary"
                        size="large"
                        icon={<SettingOutlined />}
                        onClick={openOptions}>
                        打开规则管理
                      </Button>
                      <Button size="large" onClick={() => setCurrentStep(2)}>
                        下一步
                      </Button>
                    </Space>
                  </div>
                )}
                {currentStep === 2 && (
                  <div>
                    <Paragraph>
                      <CheckCircleOutlined style={{ color: "#52c41a", marginRight: 8 }} />
                      恭喜！您已经完成了基础设置。
                    </Paragraph>
                    <Paragraph>
                      访问任何网站，匹配的请求将自动被拦截并返回模拟数据。
                      您可以通过扩展图标查看当前页面的活动规则。
                    </Paragraph>
                    <Button
                      type="primary"
                      size="large"
                      icon={<RocketOutlined />}
                      onClick={() => window.close()}>
                      开始使用
                    </Button>
                  </div>
                )}
              </div>
            </Card>

            {/* 功能特性 */}
            <Row gutter={24} style={{ marginBottom: 32 }}>
              <Col span={8}>
                <Card>
                  <Space direction="vertical" size="small">
                    <ThunderboltOutlined style={{ fontSize: 32, color: "#1890ff" }} />
                    <Title level={4}>实时拦截</Title>
                    <Text type="secondary">
                      自动拦截 XMLHttpRequest 和 Fetch API 请求，无需修改代码
                    </Text>
                  </Space>
                </Card>
              </Col>
              <Col span={8}>
                <Card>
                  <Space direction="vertical" size="small">
                    <CodeOutlined style={{ fontSize: 32, color: "#52c41a" }} />
                    <Title level={4}>灵活匹配</Title>
                    <Text type="secondary">
                      支持精确匹配、前缀匹配、包含匹配和正则表达式
                    </Text>
                  </Space>
                </Card>
              </Col>
              <Col span={8}>
                <Card>
                  <Space direction="vertical" size="small">
                    <CopyOutlined style={{ fontSize: 32, color: "#722ed1" }} />
                    <Title level={4}>场景管理</Title>
                    <Text type="secondary">
                      创建多个场景配置，一键切换不同的测试环境
                    </Text>
                  </Space>
                </Card>
              </Col>
            </Row>

            {/* 使用提示 */}
            <Card>
              <Title level={3}>💡 使用技巧</Title>
              <Row gutter={24}>
                <Col span={12}>
                  <Title level={5}>创建规则</Title>
                  <ol>
                    <li>点击扩展图标，选择"规则管理"</li>
                    <li>点击"新建规则"按钮</li>
                    <li>填写 URL 匹配模式和响应数据</li>
                    <li>保存并启用规则</li>
                  </ol>
                </Col>
                <Col span={12}>
                  <Title level={5}>快捷操作</Title>
                  <ul>
                    <li><Text keyboard>Popup</Text> - 查看当前页面活动规则</li>
                    <li><Text keyboard>监控面板</Text> - 查看所有请求记录</li>
                    <li><Text keyboard>导入/导出</Text> - 分享规则配置</li>
                    <li><Text keyboard>全局开关</Text> - 快速启用/禁用</li>
                  </ul>
                </Col>
              </Row>
            </Card>

            <Divider />

            {/* 底部链接 */}
            <div style={{ textAlign: "center", color: "rgba(255, 255, 255, 0.8)" }}>
              <Space size="large">
                <Link href="https://github.com" target="_blank" style={{ color: "rgba(255, 255, 255, 0.8)" }}>
                  GitHub
                </Link>
                <Link onClick={openOptions} style={{ color: "rgba(255, 255, 255, 0.8)" }}>
                  规则管理
                </Link>
                <Link href="#" style={{ color: "rgba(255, 255, 255, 0.8)" }}>
                  使用文档
                </Link>
              </Space>
              <Paragraph style={{ marginTop: 16, color: "rgba(255, 255, 255, 0.6)" }}>
                API Mocker v1.0.0 - Make Frontend Development Easier
              </Paragraph>
            </div>
          </div>
        </Content>
      </Layout>
    </ConfigProvider>
  )
}

export default WelcomeIndex