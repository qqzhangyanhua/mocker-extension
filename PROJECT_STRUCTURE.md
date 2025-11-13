# API Mocker - 项目结构说明

## 📂 目录结构

```
api-mocker-extension/
│
├── 📄 配置文件
│   ├── .plasmorc.ts           # Plasmo框架配置
│   ├── package.json            # 项目依赖和脚本
│   ├── tsconfig.json           # TypeScript配置
│   └── .gitignore              # Git忽略规则
│
├── 🔧 核心功能
│   ├── background.ts           # Service Worker后台服务
│   ├── popup.tsx               # 弹窗页面（React）
│   ├── popup.css               # 弹窗样式
│   ├── options.tsx             # 选项/规则管理页面（React）
│   └── options.css             # 选项页样式
│
├── 📁 contents/                # Content Scripts（内容脚本）
│   └── interceptor.ts          # 请求拦截器（核心功能）
│
├── 📁 components/              # React组件
│   ├── TopBar.tsx              # 顶部工具栏组件
│   ├── RuleList.tsx            # 规则列表组件
│   └── RuleEditor.tsx          # 规则编辑器组件
│
├── 📁 lib/                     # 共享库
│   ├── types.ts                # TypeScript类型定义
│   ├── storage.ts              # Chrome Storage封装
│   ├── matcher.ts              # 规则匹配引擎
│   └── utils.ts                # 工具函数
│
├── 📁 assets/                  # 静态资源
│   └── icons/                  # 扩展图标（需要添加）
│       ├── icon16.png          # 16x16 图标
│       ├── icon48.png          # 48x48 图标
│       └── icon128.png         # 128x128 图标
│
└── 📚 文档
    ├── README.md               # 项目说明
    ├── QUICK_START.md          # 快速开始指南
    └── MIGRATION.md            # Vite迁移说明
```

## 📝 文件说明

### 核心文件

#### background.ts
- **作用**: Service Worker后台服务
- **功能**:
  - 处理扩展消息
  - 管理规则和配置
  - 广播更新到content scripts
  - 监听存储变化

#### popup.tsx/popup.css
- **作用**: 点击扩展图标显示的弹窗
- **功能**:
  - 全局开关
  - 显示当前页面规则
  - 快速操作入口

#### options.tsx/options.css
- **作用**: 扩展的选项/设置页面
- **功能**:
  - 完整的规则管理界面
  - 创建/编辑/删除规则
  - 导入/导出规则

### 内容脚本

#### contents/interceptor.ts
- **作用**: 注入到网页的脚本
- **功能**:
  - 拦截XMLHttpRequest
  - 拦截Fetch API
  - 根据规则返回Mock数据
  - 记录请求信息

### React组件

#### components/TopBar.tsx
- 规则管理页面的顶部工具栏
- 包含搜索、新建、导入、导出功能

#### components/RuleList.tsx
- 规则列表显示
- 支持选择、批量操作、搜索

#### components/RuleEditor.tsx
- 规则编辑表单
- 包含所有规则配置项

### 共享库

#### lib/types.ts
- 所有TypeScript类型定义
- 接口定义（MockRule, RequestRecord等）

#### lib/storage.ts
- Chrome Storage API封装
- 规则CRUD操作
- 配置管理

#### lib/matcher.ts
- URL匹配算法
- 规则优先级计算
- 支持多种匹配模式

#### lib/utils.ts
- 通用工具函数
- 格式化、验证等

## 🔄 数据流

```
用户操作 (options.tsx)
    ↓
Storage API (lib/storage.ts)
    ↓
Background Worker (background.ts)
    ↓
Content Script (contents/interceptor.ts)
    ↓
拦截请求 & 返回Mock数据
```

## 🎯 Plasmo约定

### 文件命名自动识别

- `background.ts` → 自动识别为Service Worker
- `popup.tsx` → 自动生成popup页面
- `options.tsx` → 自动生成选项页面
- `contents/*.ts` → 自动识别为Content Scripts

### 导入路径

使用 `~/` 前缀访问项目根目录：

```typescript
import { MockRule } from '~/lib/types'
import { getRules } from '~/lib/storage'
```

### 样式文件

- 与组件同名的CSS文件会自动关联
- 支持CSS Modules、Less、Sass

## 🚀 构建产物

### 开发模式 (`pnpm dev`)
```
build/chrome-mv3-dev/
├── manifest.json          # 自动生成
├── background.js          # 编译后的Service Worker
├── popup.html            # 弹窗页面
├── options.html          # 选项页面
└── ...
```

### 生产模式 (`pnpm build`)
```
build/chrome-mv3-prod/
├── manifest.json         # 优化后的manifest
├── background.js         # 压缩后的代码
├── popup.html           # 优化后的页面
└── ...
```

## 📦 依赖说明

### 核心依赖
- **plasmo**: 浏览器扩展开发框架
- **react**: UI框架
- **antd**: UI组件库
- **mockjs**: Mock数据生成

### 开发依赖
- **typescript**: 类型检查
- **prettier**: 代码格式化
- **@types/***: TypeScript类型定义

## 🎨 代码组织原则

1. **模块化**: 功能按模块划分
2. **单一职责**: 每个文件职责明确
3. **可复用**: 共享代码提取到lib/
4. **类型安全**: 完整的TypeScript类型
5. **约定优于配置**: 遵循Plasmo约定

## 🔍 关键概念

### MockRule（Mock规则）
定义如何拦截和响应请求：
- URL匹配规则
- HTTP方法
- 响应状态码
- 响应数据
- 延迟时间

### 匹配模式
- **精确匹配**: URL完全相同
- **前缀匹配**: URL以指定字符串开头
- **包含匹配**: URL包含指定字符串
- **正则匹配**: 使用正则表达式

### 数据流向
```
网页发起请求
    ↓
Content Script拦截
    ↓
查找匹配规则
    ↓
返回Mock数据 OR 放行请求
    ↓
记录到Storage
```

## 📖 相关文档

- [快速开始](./QUICK_START.md)
- [完整说明](./README.md)
- [迁移指南](./MIGRATION.md)

---

最后更新: 2025-11-12
