import Editor from "@monaco-editor/react"
import { Button, Card, Space, Tooltip, message, Modal, Input } from "antd"
import {
  CheckCircleOutlined,
  CompressOutlined,
  ExpandOutlined,
  FormatPainterOutlined,
  CopyOutlined,
  FileTextOutlined
} from "@ant-design/icons"
import { useState, useRef, useEffect } from "react"
import type { editor } from "monaco-editor"

// Import Monaco configuration for Chrome Extension
import { loader } from "~/lib/monaco-config"

// Ensure Monaco is properly configured before rendering
loader.init().catch(console.error)

const { TextArea } = Input

interface JsonEditorProps {
  value: string
  onChange: (value: string) => void
  height?: string | number
  readOnly?: boolean
  language?: string
  theme?: "vs-dark" | "light"
}

function JsonEditor({
  value,
  onChange,
  height = 400,
  readOnly = false,
  language = "json",
  theme = "light"
}: JsonEditorProps) {
  const [isValid, setIsValid] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const [errorMessage, setErrorMessage] = useState<string>("")
  const [pasteModalVisible, setPasteModalVisible] = useState(false)
  const [tempPasteContent, setTempPasteContent] = useState("")

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

  // 编辑器挂载
  const handleEditorMount = (editor: editor.IStandaloneCodeEditor) => {
    editorRef.current = editor

    // 配置编辑器选项 - 移除所有限制
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
      // 完全移除所有文本大小限制
      maxTokenizationLineLength: Number.MAX_SAFE_INTEGER,
      stopRenderingLineAfter: -1,
      largeFileOptimizations: false,
      // 禁用某些可能限制大文本的功能
      renderValidationDecorations: "off",
      renderWhitespace: "none",
      renderControlCharacters: false,
      renderLineHighlight: "none",
      // 增加最大内容长度
      unicodeHighlight: {
        ambiguousCharacters: false,
        invisibleCharacters: false
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
    // 完全移除所有大小限制
    maxTokenizationLineLength: Number.MAX_SAFE_INTEGER,
    // 禁用语法高亮的长行限制
    stopRenderingLineAfter: -1,
    // 禁用大文件优化以允许处理大文本
    largeFileOptimizations: false,
    // 禁用可能影响大文本性能的渲染选项
    renderValidationDecorations: "off",
    renderWhitespace: "none",
    renderControlCharacters: false,
    renderLineHighlight: "none",
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
    }
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
          <Space>
            {!readOnly && (
              <>
                <Tooltip title="粘贴大文本">
                  <Button
                    size="small"
                    icon={<FileTextOutlined />}
                    onClick={handleLargePaste}
                  >
                    粘贴大文本
                  </Button>
                </Tooltip>
                <Tooltip title="格式化 (Ctrl+S)">
                  <Button
                    size="small"
                    icon={<FormatPainterOutlined />}
                    onClick={handleFormat}
                  >
                    格式化
                  </Button>
                </Tooltip>
                {language === "json" && (
                  <Tooltip title="压缩 JSON">
                    <Button
                      size="small"
                      icon={<CompressOutlined />}
                      onClick={handleMinify}
                    >
                      压缩
                    </Button>
                  </Tooltip>
                )}
              </>
            )}
            <Tooltip title="复制">
              <Button
                size="small"
                icon={<CopyOutlined />}
                onClick={handleCopy}
              >
                复制
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
          theme={theme}
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