import type { MockRule, MatchType, HttpMethod } from './types';

/**
 * 判断URL是否匹配规则
 */
function matchUrl(url: string, pattern: string, matchType: MatchType): boolean {
  switch (matchType) {
    case 'exact':
      return url === pattern;

    case 'prefix':
      return url.startsWith(pattern.replace(/\*$/, ''));

    case 'contains':
      const cleanPattern = pattern.replace(/^\*+|\*+$/g, '');
      return url.includes(cleanPattern);

    case 'regex':
      try {
        const regex = new RegExp(pattern);
        return regex.test(url);
      } catch (e) {
        console.error('Invalid regex pattern:', pattern, e);
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
 * 查找匹配的规则
 * @param url 请求URL
 * @param method 请求方法
 * @param headers 请求头
 * @param rules 所有规则
 * @returns 匹配的规则，按优先级排序
 */
export function findMatchingRule(
  url: string,
  method: string,
  headers?: Record<string, string>,
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
      matchHeaders(headers, rule.requestHeaders)
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
  rules: MockRule[] = []
): MockRule[] {
  const enabledRules = rules.filter(rule => rule.enabled);

  return enabledRules.filter(rule => {
    return (
      matchUrl(url, rule.url, rule.matchType) &&
      matchMethod(method, rule.method) &&
      matchHeaders(headers, rule.requestHeaders)
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
