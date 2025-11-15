// 匹配类型
export type MatchType = 'exact' | 'prefix' | 'regex' | 'contains'

// HTTP方法
export type HttpMethod = 'ALL' | 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS'

// 响应数据类型
export type ResponseType = 'json' | 'text' | 'html' | 'file'

// 代理模式类型
export type ProxyMode = 'mock' | 'proxy' | 'record'

// 请求体匹配类型
export type RequestBodyMatchType = 'none' | 'json' | 'text' | 'formData'

// 请求体匹配配置
export interface RequestBodyMatcher {
  enabled: boolean
  matchType: RequestBodyMatchType
  pattern: string  // JSON Path, 正则表达式或表单字段
  value?: string   // 期望值（可选）
}

// 代理配置
export interface ProxyConfig {
  enabled: boolean
  mode: ProxyMode
  targetUrl?: string          // 代理目标 URL
  modifyRequest?: boolean     // 是否修改请求
  modifyResponse?: boolean    // 是否修改响应
  followRedirect?: boolean    // 是否跟随重定向
}

// 录制配置
export interface RecordConfig {
  autoSave: boolean           // 是否自动保存为规则
  autoEnable: boolean         // 自动启用生成的规则
  groupName?: string          // 保存到的分组
}

// Mock规则接口
export interface MockRule {
  id: string
  name: string
  description?: string
  enabled: boolean

  // 匹配条件
  url: string
  matchType: MatchType
  method: HttpMethod
  requestHeaders?: Record<string, string>
  
  // 【新增】请求体匹配
  requestBodyMatch?: RequestBodyMatcher

  // 响应配置
  statusCode: number
  delay: number // 毫秒
  responseHeaders?: Record<string, string>
  responseType: ResponseType
  responseBody: string

  // 【新增】代理和录制配置
  proxyConfig?: ProxyConfig
  recordConfig?: RecordConfig

  // 元数据
  group?: string
  createdAt: number
  updatedAt: number
  usageCount: number
}

// 场景配置
export interface MockScene {
  id: string
  name: string
  description?: string
  rules: Array<{
    ruleId: string
    enabled: boolean
  }>
  createdAt: number
  updatedAt: number
}

// 请求记录
export interface RequestRecord {
  id: string
  url: string
  method: string
  timestamp: number
  isMocked: boolean
  ruleId?: string
  ruleName?: string
  statusCode: number
  duration: number
  requestHeaders?: Record<string, string>
  requestBody?: string
  responseHeaders?: Record<string, string>
  responseBody?: string
  size: number
}

// 全局配置
export type InterceptMode = 'page' | 'network'

export interface GlobalConfig {
  enabled: boolean
  currentScene?: string
  maxRecords: number
  autoClean: boolean
  interceptMode: InterceptMode
  
  // 【新增】录制模式配置
  recordingEnabled?: boolean
  currentEnvironment?: string  // 当前激活的环境 ID
}

// 【新增】环境变量配置
export interface Environment {
  id: string
  name: string
  description?: string
  variables: Record<string, string>  // 变量名 -> 变量值
  createdAt: number
  updatedAt: number
}

// 存储数据结构
export interface StorageData {
  rules: MockRule[]
  scenes: MockScene[]
  config: GlobalConfig
  records: RequestRecord[]
  environments?: Environment[]  // 【新增】环境变量列表
}

// 【图片下载功能】图片来源类型
export type ImageSourceType = 'img' | 'background' | 'canvas' | 'svg' | 'video'

// 【图片下载功能】图片格式
export type ImageFormat = 'png' | 'jpg' | 'jpeg' | 'gif' | 'webp' | 'svg' | 'bmp' | 'ico' | 'unknown'

// 【图片下载功能】单个图片信息
export interface ImageInfo {
  id: string                    // 唯一标识
  src: string                   // 图片地址（URL或base64）
  sourceType: ImageSourceType   // 来源类型
  format: ImageFormat           // 图片格式
  filename: string              // 建议的文件名
  width?: number                // 宽度（像素）
  height?: number               // 高度（像素）
  size?: number                 // 文件大小（字节，base64图片可计算）
  alt?: string                  // 图片描述（如果有）
  sourceElement?: string        // 来源元素的CSS选择器或描述
}