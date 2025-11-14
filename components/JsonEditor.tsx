import Editor from "@monaco-editor/react"
import { Button, Card, Space, Tooltip, message, Modal, Input, Dropdown } from "antd"
import type { MenuProps } from "antd"
import {
  CheckCircleOutlined,
  CompressOutlined,
  ExpandOutlined,
  FormatPainterOutlined,
  CopyOutlined,
  FileTextOutlined,
  ClearOutlined,
  UndoOutlined,
  RedoOutlined,
  SearchOutlined,
  DownloadOutlined,
  UploadOutlined,
  SwapOutlined,
  AppstoreAddOutlined
} from "@ant-design/icons"
import { useState, useRef, useEffect } from "react"
import type { editor } from "monaco-editor"

// Import Monaco configuration for Chrome Extension
import { loader } from "~/lib/monaco-config"

// Ensure Monaco is properly configured before rendering
loader.init().catch(console.error)

const { TextArea } = Input

// JSON 示例模板
const jsonTemplates = {
  empty: "{}",
  array: "[]",
  basicObject: `{
  "id": 1,
  "name": "示例名称",
  "description": "这是一个示例描述",
  "status": "active",
  "createdAt": "2024-01-01T00:00:00Z"
}`,
  userInfo: `{
  "userId": 12345,
  "username": "john_doe",
  "email": "john@example.com",
  "profile": {
    "firstName": "John",
    "lastName": "Doe",
    "age": 30,
    "avatar": "https://example.com/avatar.jpg"
  },
  "roles": ["user", "admin"],
  "isActive": true,
  "lastLogin": "2024-01-01T12:00:00Z"
}`,
  apiResponse: `{
  "code": 200,
  "message": "success",
  "data": {
    "items": [
      {
        "id": 1,
        "title": "项目一",
        "content": "这是项目描述"
      },
      {
        "id": 2,
        "title": "项目二",
        "content": "这是项目描述"
      }
    ],
    "total": 100,
    "page": 1,
    "pageSize": 10
  },
  "timestamp": 1640995200000
}`,
  errorResponse: `{
  "code": 500,
  "message": "服务器内部错误",
  "error": {
    "type": "InternalServerError",
    "details": "数据库连接失败",
    "stack": "Error: Connection timeout\\n    at Database.connect..."
  },
  "timestamp": 1640995200000
}`
}

interface JsonEditorProps {
  value: string
  onChange: (value: string) => void
  height?: string | number
  readOnly?: boolean
  language?: string
  theme?: "vs" | "vs-dark" | "hc-black"
}

function JsonEditor({
  value,
  onChange,
  height = 400,
  readOnly = false,
  language = "json",
  theme = "vs"
}: JsonEditorProps) {
  const [isValid, setIsValid] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const [errorMessage, setErrorMessage] = useState<string>("")
  const [pasteModalVisible, setPasteModalVisible] = useState(false)
  const [tempPasteContent, setTempPasteContent] = useState("")
  const [currentTheme, setCurrentTheme] = useState<"vs" | "vs-dark" | "hc-black">(theme)

  // 验证 JSON
  const validateJSON = (content: string) => {
    if (language !== "json") return true

    try {
      if (content.trim()) {
        JSON.parse(content)
      }
      setIsValid(true)
      setErrorMessage("")
      return true
    } catch (err: any) {
      setIsValid(false)
      setErrorMessage(err.message)
      return false
    }
  }

  // 格式化 JSON
  const handleFormat = () => {
    if (!editorRef.current) return

    try {
      if (language === "json") {
        const currentValue = editorRef.current.getValue()
        if (!currentValue.trim()) {
          message.warning("内容为空，无需格式化")
          return
        }

        const parsed = JSON.parse(currentValue)
        const formatted = JSON.stringify(parsed, null, 2)
        editorRef.current.setValue(formatted)
        message.success("格式化成功")
      } else {
        // 触发 Monaco 内置格式化
        editorRef.current.getAction("editor.action.formatDocument")?.run()
        message.success("格式化成功")
      }
    } catch (err: any) {
      message.error(`格式化失败: ${err.message}`)
    }
  }

  // 压缩 JSON
  const handleMinify = () => {
    if (!editorRef.current || language !== "json") return

    try {
      const currentValue = editorRef.current.getValue()
      const parsed = JSON.parse(currentValue)
      const minified = JSON.stringify(parsed)
      editorRef.current.setValue(minified)
      message.success("压缩成功")
    } catch (err: any) {
      message.error(`压缩失败: ${err.message}`)
    }
  }

  // 复制内容
  const handleCopy = () => {
    if (!editorRef.current) return

    const content = editorRef.current.getValue()
    navigator.clipboard.writeText(content).then(() => {
      message.success("已复制到剪贴板")
    }).catch(() => {
      message.error("复制失败")
    })
  }

  // 切换全屏
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  // 处理大文本粘贴
  const handleLargePaste = () => {
    setPasteModalVisible(true)
    setTempPasteContent("")
  }

  // 清空内容
  const handleClear = () => {
    Modal.confirm({
      title: "确认清空",
      content: "确定要清空所有内容吗？此操作不可撤销。",
      okText: "确定",
      cancelText: "取消",
      okButtonProps: { danger: true },
      onOk: () => {
        if (editorRef.current) {
          editorRef.current.setValue("")
          onChange("")
          message.success("已清空内容")
        }
      }
    })
  }

  // 撤销
  const handleUndo = () => {
    if (editorRef.current) {
      editorRef.current.trigger("keyboard", "undo", null)
    }
  }

  // 重做
  const handleRedo = () => {
    if (editorRef.current) {
      editorRef.current.trigger("keyboard", "redo", null)
    }
  }

  // 查找/替换
  const handleFind = () => {
    if (editorRef.current) {
      editorRef.current.trigger("keyboard", "actions.find", null)
    }
  }

  // 导入文件
  const handleImport = () => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".json,.txt"
    input.onchange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = (event) => {
        const content = event.target?.result as string
        if (editorRef.current) {
          editorRef.current.setValue(content)
          onChange(content)
          validateJSON(content)
          message.success(`已导入文件: ${file.name}`)
        }
      }
      reader.onerror = () => {
        message.error("读取文件失败")
      }
      reader.readAsText(file)
    }
    input.click()
  }

  // 导出文件
  const handleExport = () => {
    if (!editorRef.current) return

    const content = editorRef.current.getValue()
    if (!content.trim()) {
      message.warning("内容为空，无法导出")
      return
    }

    try {
      // 如果是JSON，先验证并格式化
      let exportContent = content
      if (language === "json") {
        const parsed = JSON.parse(content)
        exportContent = JSON.stringify(parsed, null, 2)
      }

      const blob = new Blob([exportContent], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `export-${Date.now()}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      message.success("导出成功")
    } catch (err: any) {
      message.error(`导出失败: ${err.message}`)
    }
  }

  // 转义JSON字符串
  const handleEscape = () => {
    if (!editorRef.current) return

    try {
      const content = editorRef.current.getValue()
      if (!content.trim()) {
        message.warning("内容为空")
        return
      }

      // 将JSON对象转为转义的字符串
      const escaped = JSON.stringify(content)
      editorRef.current.setValue(escaped)
      onChange(escaped)
      message.success("已转义")
    } catch (err: any) {
      message.error(`转义失败: ${err.message}`)
    }
  }

  // 反转义JSON字符串
  const handleUnescape = () => {
    if (!editorRef.current) return

    try {
      const content = editorRef.current.getValue()
      if (!content.trim()) {
        message.warning("内容为空")
        return
      }

      // 将转义的字符串转回JSON对象
      const unescaped = JSON.parse(content)
      const result = typeof unescaped === "string" ? unescaped : JSON.stringify(unescaped, null, 2)
      editorRef.current.setValue(result)
      onChange(result)
      message.success("已反转义")
    } catch (err: any) {
      message.error(`反转义失败: ${err.message}`)
    }
  }

  // 插入示例模板
  const insertTemplate = (template: string) => {
    if (editorRef.current) {
      const currentValue = editorRef.current.getValue()
      if (currentValue.trim()) {
        Modal.confirm({
          title: "覆盖当前内容？",
          content: "当前编辑器有内容，是否覆盖？",
          okText: "覆盖",
          cancelText: "取消",
          onOk: () => {
            editorRef.current?.setValue(template)
            onChange(template)
            message.success("已插入模板")
          }
        })
      } else {
        editorRef.current.setValue(template)
        onChange(template)
        message.success("已插入模板")
      }
    }
  }

  // 确认粘贴大文本
  const confirmLargePaste = () => {
    if (editorRef.current && tempPasteContent) {
      editorRef.current.setValue(tempPasteContent)
      onChange(tempPasteContent)
      validateJSON(tempPasteContent)
      message.success("内容已粘贴")
    }
    setPasteModalVisible(false)
    setTempPasteContent("")
  }

  // 切换主题
  const toggleTheme = () => {
    const newTheme = currentTheme === "vs" ? "vs-dark" : "vs"
    setCurrentTheme(newTheme)
    message.success(`已切换到${newTheme === "vs" ? "浅色" : "深色"}主题`)
  }

  // 编辑器挂载
  const handleEditorMount = (editor: editor.IStandaloneCodeEditor) => {
    editorRef.current = editor

    // 配置编辑器选项 - 保留语法高亮的同时移除大小限制
    editor.updateOptions({
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      wordWrap: "on",
      automaticLayout: true,
      formatOnPaste: false, // 禁用自动格式化，避免处理大文本时卡顿
      formatOnType: false,
      suggestOnTriggerCharacters: true,
      quickSuggestions: {
        other: true,
        comments: false,
        strings: true
      },
      scrollbar: {
        verticalScrollbarSize: 10,
        horizontalScrollbarSize: 10,
        useShadows: false
      },
      // 保留语法高亮，但增加行长度限制
      maxTokenizationLineLength: 20000, // 增加到合理的大小
      stopRenderingLineAfter: -1,
      largeFileOptimizations: false,
      // 启用验证装饰以支持JSON错误提示
      renderValidationDecorations: "on",
      renderWhitespace: "selection",
      renderControlCharacters: false,
      renderLineHighlight: "line",
      // 增加最大内容长度
      unicodeHighlight: {
        ambiguousCharacters: false,
        invisibleCharacters: false
      },
      // 启用语法高亮相关选项
      colorDecorators: true,
      bracketPairColorization: {
        enabled: true
      }
    })

    // 设置编辑器模型的最大长度（允许更大的文本）
    const model = editor.getModel()
    if (model) {
      // 移除模型的大小限制
      model.updateOptions({
        trimAutoWhitespace: false
      })
    }

    // 添加自定义粘贴处理器以处理大文本
    editor.onDidPaste((e) => {
      // 粘贴事件发生时，确保内容完整
      const currentValue = editor.getValue()
      // 触发onChange以更新外部状态
      onChange(currentValue)
      validateJSON(currentValue)
    })

    // 监听键盘事件，捕获Ctrl+V粘贴
    editor.onKeyDown((e) => {
      if (e.ctrlKey && e.keyCode === 52) { // 52 是 V 键的键码
        // 延迟一下以确保粘贴完成
        setTimeout(() => {
          const currentValue = editor.getValue()
          onChange(currentValue)
          validateJSON(currentValue)
        }, 100)
      }
    })

    // 添加快捷键
    // 注意：我们直接使用格式化功能，不需要添加额外的快捷键

    // 初始验证
    validateJSON(value)
  }

  // 内容变化处理
  const handleEditorChange = (newValue: string | undefined) => {
    const content = newValue || ""
    onChange(content)
    validateJSON(content)
  }

  // Monaco Editor 配置
  const editorOptions: editor.IStandaloneEditorConstructionOptions = {
    selectOnLineNumbers: true,
    roundedSelection: false,
    readOnly,
    cursorStyle: "line",
    automaticLayout: true,
    glyphMargin: true,
    fontSize: 14,
    lineHeight: 21,
    lineNumbers: "on",
    folding: true,
    scrollBeyondLastLine: false,
    wordWrap: "on",
    minimap: {
      enabled: false
    },
    suggestOnTriggerCharacters: true,
    quickSuggestions: {
      other: true,
      comments: false,
      strings: true
    },
    // 保留语法高亮，设置合理的行长度限制
    maxTokenizationLineLength: 20000,
    stopRenderingLineAfter: -1,
    largeFileOptimizations: false,
    // 启用验证装饰以支持JSON错误提示和语法高亮
    renderValidationDecorations: "on",
    renderWhitespace: "selection",
    renderControlCharacters: false,
    renderLineHighlight: "line",
    // 增加滚动条大小以便于导航
    scrollbar: {
      verticalScrollbarSize: 10,
      horizontalScrollbarSize: 10,
      useShadows: false
    },
    // 禁用自动格式化以避免处理大文本时的性能问题
    formatOnPaste: false,
    formatOnType: false,
    // 禁用Unicode高亮以提高性能
    unicodeHighlight: {
      ambiguousCharacters: false,
      invisibleCharacters: false
    },
    // 启用语法高亮相关的重要选项
    colorDecorators: true,
    bracketPairColorization: {
      enabled: true,
      independentColorPoolPerBracketType: true
    },
    // 启用代码片段和参数提示
    snippetSuggestions: "inline",
    parameterHints: {
      enabled: true
    },
    // 启用自动闭合
    autoClosingBrackets: "always",
    autoClosingQuotes: "always"
  }

  const containerStyle: React.CSSProperties = isFullscreen
    ? {
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1000,
        background: "#fff"
      }
    : {}

  const editorHeight = isFullscreen ? "100vh" : height

  return (
    <Card
      style={containerStyle}
      styles={{ body: { padding: 0 } }}
      title={
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Space>
            <span>
              {language === "json" ? "JSON 编辑器" : "代码编辑器"}
            </span>
            {language === "json" && (
              <Tooltip title={isValid ? "JSON 格式正确" : errorMessage}>
                <CheckCircleOutlined
                  style={{ color: isValid ? "#52c41a" : "#ff4d4f" }}
                />
              </Tooltip>
            )}
          </Space>
          <Space wrap>
            {/* 编辑操作 */}
            {!readOnly && (
              <>
                <Tooltip title="撤销 (Ctrl+Z)">
                  <Button
                    size="small"
                    icon={<UndoOutlined />}
                    onClick={handleUndo}
                  />
                </Tooltip>
                <Tooltip title="重做 (Ctrl+Shift+Z)">
                  <Button
                    size="small"
                    icon={<RedoOutlined />}
                    onClick={handleRedo}
                  />
                </Tooltip>
                <Tooltip title="查找/替换 (Ctrl+F)">
                  <Button
                    size="small"
                    icon={<SearchOutlined />}
                    onClick={handleFind}
                  />
                </Tooltip>
                <Tooltip title="清空内容">
                  <Button
                    size="small"
                    danger
                    icon={<ClearOutlined />}
                    onClick={handleClear}
                  />
                </Tooltip>
              </>
            )}

            {/* 格式化操作 */}
            {!readOnly && language === "json" && (
              <>
                <Tooltip title="格式化">
                  <Button
                    size="small"
                    icon={<FormatPainterOutlined />}
                    onClick={handleFormat}
                  />
                </Tooltip>
                <Tooltip title="压缩">
                  <Button
                    size="small"
                    icon={<CompressOutlined />}
                    onClick={handleMinify}
                  />
                </Tooltip>
              </>
            )}

            {/* 转换操作 */}
            {!readOnly && language === "json" && (
              <Dropdown
                menu={{
                  items: [
                    {
                      key: "escape",
                      label: "转义字符串",
                      icon: <SwapOutlined />,
                      onClick: handleEscape
                    },
                    {
                      key: "unescape",
                      label: "反转义字符串",
                      icon: <SwapOutlined rotate={180} />,
                      onClick: handleUnescape
                    }
                  ]
                }}
              >
                <Tooltip title="转换工具">
                  <Button size="small" icon={<SwapOutlined />}>
                    转换
                  </Button>
                </Tooltip>
              </Dropdown>
            )}

            {/* 文件操作 */}
            {!readOnly && (
              <>
                <Tooltip title="导入文件">
                  <Button
                    size="small"
                    icon={<UploadOutlined />}
                    onClick={handleImport}
                  />
                </Tooltip>
                <Tooltip title="导出文件">
                  <Button
                    size="small"
                    icon={<DownloadOutlined />}
                    onClick={handleExport}
                  />
                </Tooltip>
              </>
            )}

            {/* 模板插入 */}
            {!readOnly && language === "json" && (
              <Dropdown
                menu={{
                  items: [
                    {
                      key: "empty",
                      label: "空对象",
                      onClick: () => insertTemplate(jsonTemplates.empty)
                    },
                    {
                      key: "array",
                      label: "空数组",
                      onClick: () => insertTemplate(jsonTemplates.array)
                    },
                    {
                      type: "divider"
                    },
                    {
                      key: "basic",
                      label: "基础对象",
                      onClick: () => insertTemplate(jsonTemplates.basicObject)
                    },
                    {
                      key: "user",
                      label: "用户信息",
                      onClick: () => insertTemplate(jsonTemplates.userInfo)
                    },
                    {
                      key: "api",
                      label: "API 响应",
                      onClick: () => insertTemplate(jsonTemplates.apiResponse)
                    },
                    {
                      key: "error",
                      label: "错误响应",
                      onClick: () => insertTemplate(jsonTemplates.errorResponse)
                    }
                  ]
                }}
              >
                <Tooltip title="插入模板">
                  <Button size="small" icon={<AppstoreAddOutlined />}>
                    模板
                  </Button>
                </Tooltip>
              </Dropdown>
            )}

            {/* 其他操作 */}
            <Tooltip title="复制">
              <Button
                size="small"
                icon={<CopyOutlined />}
                onClick={handleCopy}
              />
            </Tooltip>

            {!readOnly && (
              <Tooltip title="粘贴大文本">
                <Button
                  size="small"
                  icon={<FileTextOutlined />}
                  onClick={handleLargePaste}
                />
              </Tooltip>
            )}

            <Tooltip title={currentTheme === "vs" ? "深色主题" : "浅色主题"}>
              <Button
                size="small"
                onClick={toggleTheme}
              >
                {currentTheme === "vs" ? "🌙" : "☀️"}
              </Button>
            </Tooltip>

            <Tooltip title={isFullscreen ? "退出全屏" : "全屏"}>
              <Button
                size="small"
                icon={isFullscreen ? <CompressOutlined /> : <ExpandOutlined />}
                onClick={toggleFullscreen}
              />
            </Tooltip>
          </Space>
        </div>
      }
    >
      <div style={{ position: "relative" }}>
        <Editor
          height={editorHeight}
          language={language}
          value={value}
          onChange={handleEditorChange}
          onMount={handleEditorMount}
          theme={currentTheme}
          options={editorOptions}
          loading={
            <div style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: editorHeight,
              color: "#999"
            }}>
              加载编辑器...
            </div>
          }
        />
        {!isValid && errorMessage && (
          <div style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            background: "#fff2f0",
            borderTop: "1px solid #ffccc7",
            padding: "4px 12px",
            color: "#ff4d4f",
            fontSize: 12
          }}>
            {errorMessage}
          </div>
        )}
      </div>

      {/* 大文本粘贴模态框 */}
      <Modal
        title="粘贴大文本内容"
        open={pasteModalVisible}
        onOk={confirmLargePaste}
        onCancel={() => {
          setPasteModalVisible(false)
          setTempPasteContent("")
        }}
        width={800}
        okText="确认粘贴"
        cancelText="取消"
        bodyStyle={{ padding: 16 }}
      >
        <div style={{ marginBottom: 8 }}>
          <span style={{ color: "#666" }}>
            请在下方文本框中粘贴您的内容（支持超大JSON文本）：
          </span>
        </div>
        <TextArea
          value={tempPasteContent}
          onChange={(e) => setTempPasteContent(e.target.value)}
          placeholder="在此粘贴大文本内容..."
          rows={20}
          style={{ fontFamily: "monospace", fontSize: 13 }}
        />
      </Modal>
    </Card>
  )
}

export default JsonEditor