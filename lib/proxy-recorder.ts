import type { MockRule, ProxyConfig, RecordConfig } from './types'
import { generateId } from './utils'
import { addRule } from './storage'

/**
 * 代理和录制工具模块
 */

/**
 * 执行代理请求
 * @param originalUrl 原始请求 URL
 * @param proxyConfig 代理配置
 * @param init 原始请求配置
 * @returns 代理响应
 */
export async function proxyRequest(
  originalUrl: string,
  proxyConfig: ProxyConfig,
  init?: RequestInit
): Promise<Response> {
  if (!proxyConfig.enabled || !proxyConfig.targetUrl) {
    throw new Error('Proxy not configured')
  }

  // 构建目标 URL
  const targetUrl = buildTargetUrl(originalUrl, proxyConfig.targetUrl)
  
  console.log('[Proxy] 🔀 代理请求')
  console.log('[Proxy]    ├─ 原始 URL:', originalUrl)
  console.log('[Proxy]    └─ 目标 URL:', targetUrl)

  try {
    // 执行代理请求
    const response = await fetch(targetUrl, {
      ...init,
      redirect: proxyConfig.followRedirect ? 'follow' : 'manual'
    })

    console.log('[Proxy] ✅ 代理响应:', response.status)
    return response
  } catch (error) {
    console.error('[Proxy] ❌ 代理请求失败:', error)
    throw error
  }
}

/**
 * 构建代理目标 URL
 * @param originalUrl 原始 URL
 * @param targetBaseUrl 目标基础 URL
 * @returns 完整的目标 URL
 */
function buildTargetUrl(originalUrl: string, targetBaseUrl: string): string {
  try {
    const original = new URL(originalUrl)
    const target = new URL(targetBaseUrl)
    
    // 合并路径、查询参数和哈希
    target.pathname = original.pathname
    target.search = original.search
    target.hash = original.hash
    
    return target.toString()
  } catch {
    // 如果 URL 解析失败，直接拼接
    return targetBaseUrl + originalUrl
  }
}

/**
 * 录制请求并自动生成规则
 * @param url 请求 URL
 * @param method HTTP 方法
 * @param response 响应对象
 * @param recordConfig 录制配置
 * @returns 生成的规则
 */
export async function recordRequest(
  url: string,
  method: string,
  response: Response,
  recordConfig?: RecordConfig
): Promise<MockRule | null> {
  if (!recordConfig || !recordConfig.autoSave) {
    return null
  }

  console.log('[Recorder] 📝 录制请求:', url)

  try {
    // 读取响应内容
    const responseBody = await response.clone().text()
    const responseHeaders: Record<string, string> = {}
    
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value
    })

    // 生成规则名称
    const urlObj = new URL(url)
    const ruleName = `[录制] ${method} ${urlObj.pathname}`

    // 创建规则
    const rule: MockRule = {
      id: generateId(),
      name: ruleName,
      description: `自动录制于 ${new Date().toLocaleString()}`,
      enabled: recordConfig.autoEnable ?? true,
      
      // 匹配条件
      url: url,
      matchType: 'exact',
      method: method.toUpperCase() as any,
      
      // 响应配置
      statusCode: response.status,
      delay: 0,
      responseHeaders,
      responseType: detectResponseType(responseHeaders),
      responseBody,
      
      // 元数据
      group: recordConfig.groupName || '录制规则',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      usageCount: 0
    }

    // 保存规则
    await addRule(rule)
    
    console.log('[Recorder] ✅ 规则已保存:', rule.name)
    return rule
  } catch (error) {
    console.error('[Recorder] ❌ 录制失败:', error)
    return null
  }
}

/**
 * 检测响应类型
 */
function detectResponseType(headers: Record<string, string>): 'json' | 'text' | 'html' | 'file' {
  const contentType = headers['content-type'] || headers['Content-Type'] || ''
  
  if (contentType.includes('application/json')) {
    return 'json'
  } else if (contentType.includes('text/html')) {
    return 'html'
  } else if (contentType.includes('text/')) {
    return 'text'
  } else {
    return 'file'
  }
}

/**
 * 处理代理和录制的完整流程
 * @param url 请求 URL
 * @param method HTTP 方法
 * @param init 请求配置
 * @param rule 匹配的规则
 * @returns 响应
 */
export async function handleProxyAndRecord(
  url: string,
  method: string,
  init: RequestInit | undefined,
  rule: MockRule
): Promise<Response | null> {
  const proxyConfig = rule.proxyConfig
  const recordConfig = rule.recordConfig
  
  // 如果没有启用代理，返回 null
  if (!proxyConfig || !proxyConfig.enabled) {
    return null
  }

  try {
    // 执行代理请求
    const response = await proxyRequest(url, proxyConfig, init)
    
    // 如果是录制模式，保存规则
    if (proxyConfig.mode === 'record' && recordConfig) {
      await recordRequest(url, method, response, recordConfig)
    }
    
    return response
  } catch (error) {
    console.error('[ProxyRecorder] ❌ 处理失败:', error)
    return null
  }
}

/**
 * 批量录制请求
 * @param requests 请求列表
 * @param recordConfig 录制配置
 * @returns 生成的规则列表
 */
export async function batchRecordRequests(
  requests: Array<{
    url: string
    method: string
    response: Response
  }>,
  recordConfig: RecordConfig
): Promise<MockRule[]> {
  const rules: MockRule[] = []
  
  for (const req of requests) {
    const rule = await recordRequest(
      req.url,
      req.method,
      req.response,
      recordConfig
    )
    
    if (rule) {
      rules.push(rule)
    }
  }
  
  console.log(`[Recorder] 📝 批量录制完成，共生成 ${rules.length} 条规则`)
  return rules
}


