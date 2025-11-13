# API Mocker Extension

<div align="center">

一个强大的 Chrome 浏览器扩展，用于拦截和模拟 HTTP 请求，支持前端开发、接口测试和调试。

[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-blue.svg)](https://reactjs.org/)
[![Plasmo](https://img.shields.io/badge/Plasmo-0.89-purple.svg)](https://www.plasmo.com/)
[![Ant Design](https://img.shields.io/badge/Ant%20Design-5.21-blue.svg)](https://ant.design/)

</div>

---

## ✨ 功能特性

### 核心功能
- 🎯 **灵活的 URL 匹配**：支持精确匹配、前缀匹配、包含匹配和正则表达式匹配
- 🔄 **双模式拦截**：
  - **页面 Hook 模式**：在页面环境中拦截 `fetch` 和 `XMLHttpRequest`，完全控制响应
  - **网络拦截模式**：使用 Chrome WebRequest API 拦截网络请求
- 🎨 **可视化编辑器**：基于 Monaco Editor 的 JSON 响应编辑器
- 📊 **Mock.js 支持**：内置 Mock.js，轻松生成随机数据
- 🌐 **HTTP 方法支持**：支持 GET、POST、PUT、DELETE、PATCH 等所有常见方法
- ⏱️ **延迟模拟**：自定义响应延迟，模拟真实网络环境
- 📝 **请求监控**：实时记录和查看所有拦截的请求

### 高级功能
- 🎬 **场景管理**：创建多个场景，快速切换不同的 Mock 规则组合
- 📋 **规则分组**：支持规则分组管理，便于组织和查找
- 🔍 **智能搜索**：快速搜索和过滤规则
- 💾 **数据导入导出**：支持 JSON 格式的规则导入导出
- 🎯 **当前页面规则提示**：Popup 中显示当前页面匹配的规则
- 📈 **使用统计**：记录每个规则的使用次数

---

## 🚀 快速开始

### 安装依赖

```bash
pnpm install
```

### 开发模式

```bash
pnpm dev
```

开发服务器将自动在 `build/chrome-mv3-dev` 目录生成扩展文件，支持热重载。

### 加载扩展到 Chrome

1. 打开 Chrome 浏览器，访问 `chrome://extensions/`
2. 开启右上角的**开发者模式**
3. 点击**加载已解压的扩展程序**
4. 选择项目中的 `build/chrome-mv3-dev` 目录

### 生产构建

```bash
pnpm build
```

构建产物将输出到 `build/chrome-mv3-prod` 目录。

### 打包发布

```bash
pnpm package
```

将生成 `.zip` 文件，可直接上传到 Chrome Web Store。

---

## 📖 使用指南

### 1. 基础使用

#### 创建第一个 Mock 规则

1. 点击浏览器工具栏中的扩展图标
2. 点击 **规则管理** 按钮，打开选项页面
3. 点击 **添加规则** 按钮
4. 填写规则信息：
   - **规则名称**：给规则起个易于识别的名称
   - **请求 URL**：要拦截的 URL
   - **匹配类型**：选择 URL 匹配方式
   - **HTTP 方法**：选择要拦截的请求方法
   - **状态码**：设置响应的 HTTP 状态码
   - **响应内容**：输入 Mock 数据（支持 JSON）
5. 点击 **保存** 按钮

#### URL 匹配类型说明

| 匹配类型 | 说明 | 示例 |
|---------|------|------|
| **精确匹配** | URL 必须完全一致 | `https://api.example.com/users` |
| **前缀匹配** | URL 以指定前缀开头 | `https://api.example.com/api/*` |
| **包含匹配** | URL 包含指定字符串 | `*example.com*` |
| **正则匹配** | 使用正则表达式匹配 | `https://api\.example\.com/user/\d+` |

### 2. 拦截模式

扩展提供两种拦截模式，可在 Popup 中切换：

#### 页面 Hook 模式（推荐）

- **工作原理**：在页面加载前注入脚本，覆盖 `window.fetch` 和 `XMLHttpRequest`
- **优势**：
  - ✅ 完全控制响应内容、响应头和状态码
  - ✅ 支持自定义延迟
  - ✅ 不受 CORS 限制
  - ✅ 适合复杂的 API Mock 场景
- **适用场景**：
  - 前端开发时模拟后端接口
  - 测试各种响应状态和数据
  - 模拟网络延迟和超时

#### 网络拦截模式

- **工作原理**：使用 Chrome WebRequest API 在网络层拦截请求
- **优势**：
  - ✅ 可拦截所有类型的网络请求（包括图片、CSS、JS 等静态资源）
  - ✅ 不受页面脚本限制
- **限制**：
  - ⚠️ 无法完全控制响应码和响应头
  - ⚠️ POST 等请求语义可能改变
- **适用场景**：
  - 替换静态资源（图片、JS、CSS）
  - 简单的 URL 重定向

**💡 建议**：大多数情况下使用**页面 Hook 模式**，它提供了更好的控制和兼容性。

### 3. 高级功能

#### 使用 Mock.js 生成数据

在响应内容中使用 Mock.js 语法：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": "@id",
    "name": "@cname",
    "email": "@email",
    "avatar": "@image('200x200')",
    "age": "@integer(18, 60)",
    "address": "@city(true)"
  }
}
```

#### 自定义响应头

在规则编辑器中添加响应头：

```json
{
  "Content-Type": "application/json",
  "X-Custom-Header": "custom-value",
  "Access-Control-Allow-Origin": "*"
}
```

#### 模拟网络延迟

在规则编辑器中设置延迟时间（毫秒）：

- **0ms**：立即响应
- **100-500ms**：快速网络
- **1000-3000ms**：普通网络
- **5000ms+**：慢速网络

#### 场景管理

场景功能允许你创建不同的规则组合，快速切换测试环境：

1. 打开 **场景管理** 页面
2. 点击 **新建场景**
3. 选择要包含的规则
4. 保存场景
5. 在 Popup 中快速切换场景

#### 请求监控

实时监控所有拦截的请求：

1. 点击 Popup 中的 **监控面板** 按钮
2. 查看请求列表，包含：
   - 请求 URL 和方法
   - 是否被 Mock
   - 响应状态码
   - 请求时长
   - 响应大小
3. 点击请求查看详细信息

### 4. 数据管理

#### 导出规则

```bash
规则管理 → 更多操作 → 导出规则
```

将导出 JSON 格式的规则文件，可用于备份或分享。

#### 导入规则

```bash
规则管理 → 更多操作 → 导入规则
```

选择之前导出的 JSON 文件，一键导入所有规则。

---

## 📁 项目结构

```
api-mocker-extension/
├── background.ts              # Service Worker，处理后台逻辑
├── popup.tsx                  # 弹窗页面，快速开关和查看状态
├── options.tsx                # 选项页面，规则管理主界面
├── monitor.tsx                # 监控页面，查看请求记录
├── scenes.tsx                 # 场景管理页面
├── contents/
│   └── interceptor.ts         # 内容脚本，注入页面进行请求拦截
├── components/
│   ├── TopBar.tsx             # 顶部导航栏
│   ├── RuleList.tsx           # 规则列表组件
│   ├── RuleEditor.tsx         # 规则编辑器
│   ├── EnhancedRuleList.tsx   # 增强的规则列表
│   ├── EnhancedRuleEditor.tsx # 增强的规则编辑器
│   ├── JsonEditor.tsx         # JSON 编辑器
│   └── SceneManager.tsx       # 场景管理组件
├── lib/
│   ├── types.ts              # TypeScript 类型定义
│   ├── storage.ts            # Chrome Storage API 封装
│   ├── matcher.ts            # URL 匹配引擎
│   ├── net-intercept.ts      # 网络拦截逻辑
│   └── utils.ts              # 工具函数
├── assets/
│   └── icons/                # 扩展图标
├── tabs/
│   └── welcome.tsx           # 欢迎页面
├── package.json              # 项目配置和依赖
├── tsconfig.json             # TypeScript 配置
└── README.md                 # 项目文档
```

### 核心模块说明

#### `background.ts` - 后台服务

- 管理全局配置和规则
- 处理内容脚本的消息
- 广播配置更新到所有标签页
- 初始化网络拦截

#### `contents/interceptor.ts` - 请求拦截器

- 注入页面 Hook 脚本
- 拦截 `fetch` 和 `XMLHttpRequest`
- 与后台通信获取匹配规则
- 记录请求信息

#### `lib/matcher.ts` - 匹配引擎

- 实现四种 URL 匹配算法
- 支持 HTTP 方法过滤
- 支持请求头匹配

#### `lib/storage.ts` - 存储管理

- 封装 Chrome Storage API
- 提供规则、场景、配置的 CRUD 操作
- 监听存储变化

---

## 🛠️ 技术栈

- **框架**：[Plasmo](https://www.plasmo.com/) - 专为浏览器扩展设计的开发框架
- **语言**：[TypeScript](https://www.typescriptlang.org/) 5.5 - 类型安全
- **UI 框架**：[React](https://reactjs.org/) 18.3 - 函数式组件 + Hooks
- **组件库**：[Ant Design](https://ant.design/) 5.21 - 企业级 UI 组件
- **代码编辑器**：[Monaco Editor](https://microsoft.github.io/monaco-editor/) - VS Code 同款编辑器
- **Mock 库**：[Mock.js](http://mockjs.com/) - 生成随机数据
- **代码规范**：Prettier 3 + TypeScript ESLint
- **包管理器**：pnpm

---

## 🔧 开发指南

### 代码规范

项目遵循以下规范：

1. **严格的类型安全**：TypeScript 禁止使用 `any`，所有类型必须明确定义
2. **组件拆分**：单个组件不超过 400 行，复杂组件需要拆分
3. **样式统一**：优先使用 Tailwind CSS，避免自定义 CSS
4. **命名规范**：
   - React 组件和文件：`PascalCase`
   - 变量和函数：`camelCase`
   - 常量：`UPPER_SNAKE_CASE`
5. **导入路径**：使用 `~/` 别名导入项目文件，例如 `~/lib/types`

### 添加新的 Content Script

创建新文件 `contents/xxx.ts`：

```typescript
import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["https://example.com/*"],
  run_at: "document_start"
}

// 你的代码
```

### 类型检查

```bash
pnpm type-check
```

### 修改权限

在 `package.json` 中的 `manifest` 字段修改：

```json
{
  "manifest": {
    "host_permissions": ["<all_urls>"],
    "permissions": ["storage", "activeTab", "webRequest", "webRequestBlocking"]
  }
}
```

---

## 🔒 安全与隐私

### 权限说明

扩展请求以下权限：

| 权限 | 用途 |
|------|------|
| `storage` | 保存规则、场景和配置 |
| `activeTab` | 获取当前标签页信息 |
| `webRequest` | 拦截网络请求（网络拦截模式） |
| `webRequestBlocking` | 阻塞和修改请求（网络拦截模式） |
| `<all_urls>` | 在所有网站上工作 |

### 最小权限原则

发布到 Chrome Web Store 时，建议限制 `host_permissions` 的范围：

1. 创建 `.env` 文件：

```env
PLASMO_PUBLIC_HOSTS=https://api.example.com/*,https://*.mycorp.com/*
```

2. 构建时将自动使用配置的域名替换 `<all_urls>`

### 数据隐私

- ✅ 所有数据仅存储在本地（Chrome Storage）
- ✅ 不会上传任何数据到远程服务器
- ✅ 不会收集用户隐私信息
- ✅ 开源代码，可审计

---

## 🐛 常见问题

### Q: 修改代码后扩展没有更新？

**A**: 
1. 确保 `pnpm dev` 服务器正在运行
2. 在 `chrome://extensions/` 中点击扩展的刷新按钮
3. 刷新测试页面

### Q: 规则不生效？

**A**: 检查以下几点：
1. 全局开关是否开启（Popup 中查看）
2. 规则本身是否启用
3. URL 匹配类型是否正确
4. 拦截模式是否合适（建议使用页面 Hook 模式）
5. 刷新页面后再测试

### Q: 如何调试 Content Script？

**A**: 
1. 打开测试页面的 DevTools（F12）
2. 在 Console 中可以看到 `[API Mocker]` 开头的日志
3. 使用 `debugger` 断点调试

### Q: 如何查看拦截的请求？

**A**: 点击 Popup 中的 **监控面板** 按钮，可以看到所有被拦截的请求详情。

### Q: 支持哪些响应类型？

**A**: 支持以下类型：
- `json` - JSON 数据（自动设置 Content-Type）
- `text` - 纯文本
- `html` - HTML 内容
- `file` - 文件内容

### Q: 如何模拟错误响应？

**A**: 
1. 设置状态码为 4xx 或 5xx（如 404, 500）
2. 在响应内容中填写错误信息
3. 可以自定义响应头

---

## 📚 更多资源

- [Plasmo 官方文档](https://docs.plasmo.com/)
- [Chrome 扩展开发文档](https://developer.chrome.com/docs/extensions/)
- [Mock.js 文档](http://mockjs.com/)
- [Ant Design 组件库](https://ant.design/components/overview-cn/)

---

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

提交 PR 前请确保：

1. 代码通过类型检查：`pnpm type-check`
2. 在 Chrome 中手动测试功能
3. 遵循项目代码规范
4. 提供清晰的 PR 描述

---

## 📄 许可证

MIT License

---

## 📮 支持

如有问题或建议，请：

1. 查看 [常见问题](#-常见问题) 部分
2. 搜索或创建 [GitHub Issue](https://github.com/your-repo/issues)
3. 查阅项目文档

---

<div align="center">

**⭐ 如果这个项目对你有帮助，请给个 Star！**

</div>
