// 匹配类型
export type MatchType = 'exact' | 'prefix' | 'regex' | 'contains'

// HTTP方法
export type HttpMethod = 'ALL' | 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS'

// 响应数据类型
export type ResponseType = 'json' | 'text' | 'html' | 'file'

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

  // 响应配置
  statusCode: number
  delay: number // 毫秒
  responseHeaders?: Record<string, string>
  responseType: ResponseType
  responseBody: string

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
}

// 存储数据结构
export interface StorageData {
  rules: MockRule[]
  scenes: MockScene[]
  config: GlobalConfig
  records: RequestRecord[]
}