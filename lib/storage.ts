import type { StorageData, MockRule, MockScene, GlobalConfig, RequestRecord } from './types';

// 榛樿閰嶇疆
const DEFAULT_CONFIG: GlobalConfig = {
  enabled: true,
  maxRecords: 1000,
  autoClean: true,
  interceptMode: 'page'
};

// Storage閿悕
const STORAGE_KEYS = {
  RULES: 'mock_rules',
  SCENES: 'mock_scenes',
  CONFIG: 'mock_config',
  RECORDS: 'mock_records',
} as const;

/**
 * 鑾峰彇鎵€鏈夎鍒? */
export async function getRules(): Promise<MockRule[]> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.RULES);
  return result[STORAGE_KEYS.RULES] || [];
}

/**
 * 淇濆瓨瑙勫垯
 */
export async function saveRules(rules: MockRule[]): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.RULES]: rules });
}

/**
 * 娣诲姞瑙勫垯
 */
export async function addRule(rule: MockRule): Promise<void> {
  const rules = await getRules();
  rules.push(rule);
  await saveRules(rules);
}

/**
 * 鏇存柊瑙勫垯
 */
export async function updateRule(id: string, updates: Partial<MockRule>): Promise<void> {
  const rules = await getRules();
  const index = rules.findIndex(r => r.id === id);
  if (index !== -1) {
    rules[index] = { ...rules[index], ...updates, updatedAt: Date.now() };
    await saveRules(rules);
  }
}

/**
 * 鍒犻櫎瑙勫垯
 */
export async function deleteRule(id: string): Promise<void> {
  const rules = await getRules();
  const filtered = rules.filter(r => r.id !== id);
  await saveRules(filtered);
}

/**
 * 鎵归噺鍒犻櫎瑙勫垯
 */
export async function deleteRules(ids: string[]): Promise<void> {
  const rules = await getRules();
  const filtered = rules.filter(r => !ids.includes(r.id));
  await saveRules(filtered);
}

/**
 * 鑾峰彇鍗曚釜瑙勫垯
 */
export async function getRule(id: string): Promise<MockRule | undefined> {
  const rules = await getRules();
  return rules.find(r => r.id === id);
}

/**
 * 鑾峰彇鎵€鏈夊満鏅? */
export async function getScenes(): Promise<MockScene[]> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.SCENES);
  return result[STORAGE_KEYS.SCENES] || [];
}

/**
 * 淇濆瓨鍦烘櫙
 */
export async function saveScenes(scenes: MockScene[]): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.SCENES]: scenes });
}

/**
 * 娣诲姞鍦烘櫙
 */
export async function addScene(scene: MockScene): Promise<void> {
  const scenes = await getScenes();
  scenes.push(scene);
  await saveScenes(scenes);
}

/**
 * 鏇存柊鍦烘櫙
 */
export async function updateScene(id: string, updates: Partial<MockScene>): Promise<void> {
  const scenes = await getScenes();
  const index = scenes.findIndex(s => s.id === id);
  if (index !== -1) {
    scenes[index] = { ...scenes[index], ...updates, updatedAt: Date.now() };
    await saveScenes(scenes);
  }
}

/**
 * 鍒犻櫎鍦烘櫙
 */
export async function deleteScene(id: string): Promise<void> {
  const scenes = await getScenes();
  const filtered = scenes.filter(s => s.id !== id);
  await saveScenes(filtered);
}

/**
 * 鑾峰彇鍏ㄥ眬閰嶇疆
 */
export async function getConfig(): Promise<GlobalConfig> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.CONFIG);
  const stored = (result as any)[STORAGE_KEYS.CONFIG] || {};
  return { ...DEFAULT_CONFIG, ...stored } as GlobalConfig;
}

/**
 * 鏇存柊鍏ㄥ眬閰嶇疆
 */
export async function updateConfig(updates: Partial<GlobalConfig>): Promise<void> {
  const config = await getConfig();
  await chrome.storage.local.set({
    [STORAGE_KEYS.CONFIG]: { ...config, ...updates },
  });
}

/**
 * 鑾峰彇璇锋眰璁板綍
 */
export async function getRecords(): Promise<RequestRecord[]> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.RECORDS);
  return result[STORAGE_KEYS.RECORDS] || [];
}

/**
 * 娣诲姞璇锋眰璁板綍
 */
export async function addRecord(record: RequestRecord): Promise<void> {
  const records = await getRecords();
  const config = await getConfig();

  // 添加新记录
  records.unshift(record);

  // 自动清理超出限制的记录
  if (config.autoClean && records.length > config.maxRecords) {
    records.splice(config.maxRecords);
  }

  await chrome.storage.local.set({ [STORAGE_KEYS.RECORDS]: records });
}

/**
 * 清空请求记录
 */
export async function clearRecords(): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.RECORDS]: [] });
}
export async function exportData(): Promise<StorageData> {
  const [rules, scenes, config, records] = await Promise.all([
    getRules(),
    getScenes(),
    getConfig(),
    getRecords(),
  ]);

  return { rules, scenes, config, records };
}

/**
 * 瀵煎叆鏁版嵁
 */
export async function importData(data: Partial<StorageData>, merge: boolean = false): Promise<void> {
  if (merge) {
    // 鍚堝苟妯″紡
    if (data.rules) {
      const existingRules = await getRules();
      await saveRules([...existingRules, ...data.rules]);
    }
    if (data.scenes) {
      const existingScenes = await getScenes();
      await saveScenes([...existingScenes, ...data.scenes]);
    }
    if (data.config) {
      await updateConfig(data.config);
    }
  } else {
    // 瑕嗙洊妯″紡
    const updates: Record<string, unknown> = {};
    if (data.rules) updates[STORAGE_KEYS.RULES] = data.rules;
    if (data.scenes) updates[STORAGE_KEYS.SCENES] = data.scenes;
    if (data.config) updates[STORAGE_KEYS.CONFIG] = data.config;
    if (data.records) updates[STORAGE_KEYS.RECORDS] = data.records;

    await chrome.storage.local.set(updates);
  }
}

/**
 * 娓呯┖鎵€鏈夋暟鎹? */
export async function clearAllData(): Promise<void> {
  await chrome.storage.local.clear();
}

/**
 * 鐩戝惉瀛樺偍鍙樺寲
 */
export function onStorageChange(
  callback: (changes: { [key: string]: chrome.storage.StorageChange }) => void
): void {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local') {
      callback(changes);
    }
  });
}