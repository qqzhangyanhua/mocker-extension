import type { MockRule, MatchType, HttpMethod, RequestBodyMatcher } from './types';

/**
 * 规范化 URL：提取路径部分用于匹配
 * 支持完整 URL 和相对路径
 */
function normalizeUrl(url: string): string {
  // 如果是完整 URL，提取 pathname + search + hash
  if (url.startsWith('http://') || url.startsWith('https://')) {
    try {
      const urlObj = new URL(url);
      return urlObj.pathname + urlObj.search + urlObj.hash;
    } catch (e) {
      return url;
    }
  }
  // 如果是相对路径，直接返回
  return url;
}

/**
 * 判断URL是否匹配规则
 * 支持完整 URL 和相对路径的智能匹配
 */
function matchUrl(url: string, pattern: string, matchType: MatchType): boolean {
  // 规范化请求 URL（提取路径部分）
  const normalizedUrl = normalizeUrl(url);
  
  console.log('[Matcher] 🔍 开始匹配测试')
  console.log('[Matcher]    ├─ 请求 URL:', url)
  console.log('[Matcher]    ├─ 规范化 URL:', normalizedUrl)
  console.log('[Matcher]    ├─ 匹配模式:', pattern)
  console.log('[Matcher]    └─ 匹配类型:', matchType)
  
  switch (matchType) {
    case 'exact':
      // 精确匹配：支持完整 URL 或路径匹配
      if (url === pattern) return true;
      if (normalizedUrl === pattern) return true;
      // 如果 pattern 是完整 URL，也尝试规范化后匹配
      const normalizedPattern = normalizeUrl(pattern);
      return normalizedUrl === normalizedPattern;

    case 'prefix':
      const prefixPattern = pattern.replace(/\*$/, '');
      // 尝试原始 URL 和规范化 URL
      if (url.startsWith(prefixPattern)) return true;
      if (normalizedUrl.startsWith(prefixPattern)) return true;
      const normalizedPrefixPattern = normalizeUrl(prefixPattern);
      return normalizedUrl.startsWith(normalizedPrefixPattern);

    case 'contains':
      const cleanPattern = pattern.replace(/^\*+|\*+$/g, '');
      const urlContains = url.includes(cleanPattern);
      const normalizedContains = normalizedUrl.includes(cleanPattern);
      const result = urlContains || normalizedContains;
      console.log('[Matcher]    ├─ 清理后模式:', cleanPattern);
      console.log('[Matcher]    ├─ 原始URL匹配:', urlContains);
      console.log('[Matcher]    ├─ 规范URL匹配:', normalizedContains);
      console.log('[Matcher]    └─ 最终结果:', result ? '✅ 匹配' : '❌ 不匹配');
      return result;

    case 'regex':
      try {
        const regex = new RegExp(pattern);
        // 同时测试原始 URL 和规范化 URL
        return regex.test(url) || regex.test(normalizedUrl);
      } catch (e) {
        console.error('[Matcher] Invalid regex pattern:', pattern, e);
        return false;
      }

    default:
      return false;
  }
}

/**
 * 判断HTTP方法是否匹配
 */
function matchMethod(method: string, ruleMethod: HttpMethod): boolean {
  if (ruleMethod === 'ALL') return true;
  return method.toUpperCase() === ruleMethod;
}

/**
 * 判断请求头是否匹配
 */
function matchHeaders(
  requestHeaders: Record<string, string> | undefined,
  ruleHeaders: Record<string, string> | undefined
): boolean {
  if (!ruleHeaders || Object.keys(ruleHeaders).length === 0) {
    return true;
  }

  if (!requestHeaders) {
    return false;
  }

  // 检查所有规则中的请求头是否都匹配
  return Object.entries(ruleHeaders).every(([key, value]) => {
    const headerKey = key.toLowerCase();
    const requestValue = Object.entries(requestHeaders).find(
      ([k]) => k.toLowerCase() === headerKey
    )?.[1];

    return requestValue === value;
  });
}

/**
 * 判断请求体是否匹配
 */
function matchRequestBody(
  requestBody: string | undefined,
  bodyMatcher: RequestBodyMatcher | undefined
): boolean {
  // 如果没有配置请求体匹配，则通过
  if (!bodyMatcher || !bodyMatcher.enabled) {
    return true;
  }

  // 如果没有请求体，则不匹配
  if (!requestBody) {
    return false;
  }

  try {
    switch (bodyMatcher.matchType) {
      case 'none':
        return true;

      case 'json': {
        // JSON Path 匹配
        const jsonData = JSON.parse(requestBody);
        const value = getJsonPathValue(jsonData, bodyMatcher.pattern);
        
        // 如果指定了期望值，检查是否相等
        if (bodyMatcher.value !== undefined) {
          return String(value) === bodyMatcher.value;
        }
        
        // 否则只要路径存在就匹配
        return value !== undefined;
      }

      case 'text': {
        // 文本/正则匹配
        if (bodyMatcher.pattern) {
          try {
            const regex = new RegExp(bodyMatcher.pattern);
            return regex.test(requestBody);
          } catch {
            // 如果不是正则，则使用包含匹配
            return requestBody.includes(bodyMatcher.pattern);
          }
        }
        return true;
      }

      case 'formData': {
        // 表单数据匹配（key=value 格式）
        const params = new URLSearchParams(requestBody);
        const value = params.get(bodyMatcher.pattern);
        
        if (bodyMatcher.value !== undefined) {
          return value === bodyMatcher.value;
        }
        
        return value !== null;
      }

      default:
        return true;
    }
  } catch (error) {
    console.error('[Matcher] Error matching request body:', error);
    return false;
  }
}

/**
 * 简单的 JSON Path 获取器
 * 支持点号分隔的路径，如 "data.user.name"
 */
function getJsonPathValue(obj: any, path: string): any {
  if (!path) return obj;
  
  const keys = path.split('.');
  let current = obj;
  
  for (const key of keys) {
    if (current === null || current === undefined) {
      return undefined;
    }
    
    // 支持数组索引，如 "items[0]"
    const arrayMatch = key.match(/^(.+)\[(\d+)\]$/);
    if (arrayMatch) {
      const [, arrayKey, index] = arrayMatch;
      current = current[arrayKey];
      if (Array.isArray(current)) {
        current = current[parseInt(index, 10)];
      } else {
        return undefined;
      }
    } else {
      current = current[key];
    }
  }
  
  return current;
}

/**
 * 查找匹配的规则
 * @param url 请求URL
 * @param method 请求方法
 * @param headers 请求头
 * @param requestBody 请求体
 * @param rules 所有规则
 * @returns 匹配的规则，按优先级排序
 */
export function findMatchingRule(
  url: string,
  method: string,
  headers?: Record<string, string>,
  requestBody?: string,
  rules: MockRule[] = []
): MockRule | null {
  // 过滤出启用的规则
  const enabledRules = rules.filter(rule => rule.enabled);

  // 按优先级排序: exact > regex > prefix > contains
  const priorityOrder: Record<MatchType, number> = {
    exact: 4,
    regex: 3,
    prefix: 2,
    contains: 1,
  };

  const sortedRules = enabledRules.sort((a, b) => {
    return priorityOrder[b.matchType] - priorityOrder[a.matchType];
  });

  // 查找第一个匹配的规则
  for (const rule of sortedRules) {
    if (
      matchUrl(url, rule.url, rule.matchType) &&
      matchMethod(method, rule.method) &&
      matchHeaders(headers, rule.requestHeaders) &&
      matchRequestBody(requestBody, rule.requestBodyMatch)
    ) {
      return rule;
    }
  }

  return null;
}

/**
 * 批量查找匹配当前URL的所有规则
 */
export function findAllMatchingRules(
  url: string,
  method: string,
  headers?: Record<string, string>,
  requestBody?: string,
  rules: MockRule[] = []
): MockRule[] {
  const enabledRules = rules.filter(rule => rule.enabled);

  return enabledRules.filter(rule => {
    return (
      matchUrl(url, rule.url, rule.matchType) &&
      matchMethod(method, rule.method) &&
      matchHeaders(headers, rule.requestHeaders) &&
      matchRequestBody(requestBody, rule.requestBodyMatch)
    );
  });
}

/**
 * 验证URL模式是否有效
 */
export function validateUrlPattern(pattern: string, matchType: MatchType): boolean {
  if (!pattern || pattern.trim() === '') {
    return false;
  }

  if (matchType === 'regex') {
    try {
      new RegExp(pattern);
      return true;
    } catch (e) {
      return false;
    }
  }

  return true;
}

/**
 * 获取规则的优先级得分（用于排序）
 */
export function getRulePriority(rule: MockRule): number {
  const matchTypeScore: Record<MatchType, number> = {
    exact: 1000,
    regex: 100,
    prefix: 10,
    contains: 1,
  };

  let score = matchTypeScore[rule.matchType];

  // 如果有请求体匹配，增加优先级
  if (rule.requestBodyMatch && rule.requestBodyMatch.enabled) {
    score += 100000;
  }

  // 如果有请求头匹配，增加优先级
  if (rule.requestHeaders && Object.keys(rule.requestHeaders).length > 0) {
    score += 10000;
  }

  // 如果不是ALL方法，增加优先级
  if (rule.method !== 'ALL') {
    score += 1000;
  }

  return score;
}
