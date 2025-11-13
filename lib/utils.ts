import type { MockRule, MockScene, RequestRecord } from './types';

/**
 * 生成唯一ID
 */
export function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 格式化时间戳
 */
export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * 格式化文件大小
 */
export function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * 格式化字节数（别名）
 */
export function formatBytes(bytes: number): string {
  return formatSize(bytes);
}

/**
 * 格式化持续时间
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * 深拷贝对象
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * 延迟执行
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 解析JSON字符串
 */
export function parseJSON(str: string): unknown {
  try {
    return JSON.parse(str);
  } catch (e) {
    return null;
  }
}

/**
 * 格式化JSON字符串
 */
export function formatJSON(obj: unknown): string {
  try {
    return JSON.stringify(obj, null, 2);
  } catch (e) {
    return String(obj);
  }
}

/**
 * 验证JSON字符串
 */
export function isValidJSON(str: string): boolean {
  try {
    JSON.parse(str);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * 下载文件
 */
export function downloadFile(content: string, filename: string, type: string = 'application/json'): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * 读取文件内容
 */
export function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      resolve(e.target?.result as string);
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

/**
 * 复制到剪贴板
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    console.error('Failed to copy to clipboard:', e);
    return false;
  }
}

/**
 * 创建默认规则
 */
export function createDefaultRule(): Omit<MockRule, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'> {
  return {
    name: '新建规则',
    description: '',
    enabled: true,
    url: '',
    matchType: 'exact',
    method: 'ALL',
    statusCode: 200,
    delay: 0,
    responseType: 'json',
    responseBody: '{}',
  };
}

/**
 * 创建默认场景
 */
export function createDefaultScene(): Omit<MockScene, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    name: '新建场景',
    description: '',
    rules: [],
  };
}

/**
 * 从请求创建规则
 */
export function createRuleFromRequest(record: RequestRecord): Omit<MockRule, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'> {
  return {
    name: `从请求创建 - ${record.url}`,
    description: `基于 ${record.method} 请求创建`,
    enabled: true,
    url: record.url,
    matchType: 'exact',
    method: record.method.toUpperCase() as MockRule['method'],
    statusCode: record.statusCode,
    delay: 0,
    responseType: 'json',
    responseBody: record.responseBody || '{}',
    responseHeaders: record.responseHeaders,
  };
}

/**
 * 导出规则为JSON
 */
export function exportRulesToJSON(rules: MockRule[]): string {
  return formatJSON(rules);
}

/**
 * 导出场景为JSON
 */
export function exportScenesToJSON(scenes: MockScene[]): string {
  return formatJSON(scenes);
}

/**
 * 搜索规则
 */
export function searchRules(rules: MockRule[], keyword: string): MockRule[] {
  const lowerKeyword = keyword.toLowerCase();
  return rules.filter(rule => {
    return (
      rule.name.toLowerCase().includes(lowerKeyword) ||
      rule.url.toLowerCase().includes(lowerKeyword) ||
      rule.description?.toLowerCase().includes(lowerKeyword)
    );
  });
}

/**
 * 按分组过滤规则
 */
export function filterRulesByGroup(rules: MockRule[], group: string | null): MockRule[] {
  if (!group) return rules;
  return rules.filter(rule => rule.group === group);
}

/**
 * 获取所有分组
 */
export function getAllGroups(rules: MockRule[]): string[] {
  const groups = new Set<string>();
  rules.forEach(rule => {
    if (rule.group) groups.add(rule.group);
  });
  return Array.from(groups).sort();
}
