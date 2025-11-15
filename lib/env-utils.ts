import type { Environment } from './types'

/**
 * 环境变量替换引擎
 * 支持 ${VAR_NAME} 语法
 */

/**
 * 替换字符串中的环境变量
 * @param text 原始文本
 * @param environment 环境变量配置
 * @returns 替换后的文本
 */
export function replaceEnvVariables(text: string, environment?: Environment): string {
  if (!environment || !text) return text

  // 匹配 ${VAR_NAME} 模式
  const regex = /\$\{([^}]+)\}/g
  
  return text.replace(regex, (match, varName) => {
    const value = environment.variables[varName.trim()]
    if (value !== undefined) {
      return value
    }
    // 如果变量不存在，保持原样
    return match
  })
}

/**
 * 批量替换对象中的环境变量
 * @param obj 包含字符串的对象
 * @param environment 环境变量配置
 * @returns 替换后的对象
 */
export function replaceEnvInObject<T extends Record<string, any>>(
  obj: T,
  environment?: Environment
): T {
  if (!environment || !obj) return obj

  const result: any = Array.isArray(obj) ? [] : {}

  for (const key in obj) {
    const value = obj[key]
    
    if (typeof value === 'string') {
      result[key] = replaceEnvVariables(value, environment)
    } else if (typeof value === 'object' && value !== null) {
      result[key] = replaceEnvInObject(value, environment)
    } else {
      result[key] = value
    }
  }

  return result as T
}

/**
 * 提取字符串中使用的所有环境变量名
 * @param text 文本
 * @returns 变量名数组
 */
export function extractEnvVariables(text: string): string[] {
  if (!text) return []

  const regex = /\$\{([^}]+)\}/g
  const variables: string[] = []
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    variables.push(match[1].trim())
  }

  return [...new Set(variables)] // 去重
}

/**
 * 验证环境变量是否都存在
 * @param text 文本
 * @param environment 环境变量配置
 * @returns 缺失的变量名数组
 */
export function validateEnvVariables(
  text: string,
  environment?: Environment
): string[] {
  if (!text) return []
  
  const usedVars = extractEnvVariables(text)
  if (usedVars.length === 0) return []
  
  if (!environment) return usedVars

  return usedVars.filter(varName => !(varName in environment.variables))
}

/**
 * 预览替换后的文本（用于 UI 显示）
 * @param text 原始文本
 * @param environment 环境变量配置
 * @returns 替换后的文本和缺失变量列表
 */
export function previewEnvReplacement(
  text: string,
  environment?: Environment
): { result: string; missingVars: string[] } {
  const missingVars = validateEnvVariables(text, environment)
  const result = replaceEnvVariables(text, environment)
  
  return { result, missingVars }
}


