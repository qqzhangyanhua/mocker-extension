# 🎉 欢迎使用 API Mocker

> Chrome浏览器扩展 - HTTP请求拦截和Mock工具 (Plasmo版本)

## 👋 新手？从这里开始！

### 1️⃣ 你现在在哪里

你现在看到的是一个**完全重构为Plasmo框架**的Chrome扩展项目。所有代码都是最新的、干净的、生产就绪的。

### 2️⃣ 这个项目是做什么的？

这是一个Chrome浏览器扩展，可以：
- ✅ 拦截网页的HTTP请求（XMLHttpRequest和Fetch）
- ✅ 返回自定义的Mock数据
- ✅ 支持多种URL匹配模式（精确、前缀、包含、正则）
- ✅ 完整的规则管理界面
- ✅ 实时请求监控

**用途**：前端开发Mock接口、测试错误场景、快速原型开发等。

### 3️⃣ 快速开始（3步走）

#### 第1步：准备图标 ⚠️ 必须完成

在 `assets/icons/` 目录下放置3个PNG图标：
- `icon16.png` (16x16 像素)
- `icon48.png` (48x48 像素)
- `icon128.png` (128x128 像素)

**没有图标？** 用任意PNG图片重命名即可，或访问：
- https://www.favicon-generator.org/
- https://realfavicongenerator.net/

#### 第2步：启动开发

```bash
pnpm dev
```

这会：
- 启动Plasmo开发服务器
- 在 `build/chrome-mv3-dev` 生成扩展文件
- 开启热重载（修改代码自动更新）

#### 第3步：加载到Chrome

1. 打开Chrome，访问 `chrome://extensions/`
2. 开启右上角的"开发者模式"开关
3. 点击"加载已解压的扩展程序"
4. 选择 `build/chrome-mv3-dev` 目录
5. 完成！🎊

## 📚 详细文档

| 文档 | 内容 | 推荐阅读 |
|------|------|----------|
| [README.md](./README.md) | 完整项目说明 | ⭐⭐⭐⭐⭐ |
| [QUICK_START.md](./QUICK_START.md) | 快速上手指南 | ⭐⭐⭐⭐⭐ |
| [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) | 项目结构说明 | ⭐⭐⭐⭐ |
| [FILES_CHECKLIST.md](./FILES_CHECKLIST.md) | 文件清单 | ⭐⭐⭐ |
| [MIGRATION.md](./MIGRATION.md) | Vite迁移说明 | ⭐⭐ |

## 🎯 常用命令

```bash
# 开发模式（带热重载）
pnpm dev

# 类型检查（已通过✅）
pnpm type-check

# 生产构建
pnpm build

# 打包.zip文件（用于发布）
pnpm package
```

## 📂 项目结构一览

```
api-mocker-extension/
├── 🔧 核心文件
│   ├── background.ts      # Service Worker后台
│   ├── popup.tsx         # 弹窗页面
│   └── options.tsx       # 规则管理页面
│
├── 📁 contents/          # Content Scripts
│   └── interceptor.ts    # 请求拦截器（核心）
│
├── 📁 components/        # React组件
│   ├── TopBar.tsx
│   ├── RuleList.tsx
│   └── RuleEditor.tsx
│
├── 📁 lib/              # 共享库
│   ├── types.ts         # 类型定义
│   ├── storage.ts       # 存储管理
│   ├── matcher.ts       # 规则匹配
│   └── utils.ts         # 工具函数
│
└── 📁 assets/icons/     # ⚠️ 需要图标
```

## ✅ 项目状态

- ✅ 代码迁移完成（100%）
- ✅ TypeScript类型检查通过
- ✅ 所有依赖已安装（752个包）
- ✅ 文档完整
- ⚠️ 需要图标文件（唯一缺失项）

**准备程度**: 95% 🚀

## 💡 下一步做什么？

### 新手路线
1. 阅读 [QUICK_START.md](./QUICK_START.md)
2. 准备图标文件
3. 运行 `pnpm dev`
4. 加载到Chrome测试

### 开发者路线
1. 阅读 [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)
2. 查看 `lib/` 目录了解核心逻辑
3. 查看 `contents/interceptor.ts` 了解拦截实现
4. 开始开发或自定义

## 🔥 Plasmo优势

相比传统开发方式：
- ⚡ 更快的构建速度
- 🔄 开箱即用的热重载
- 📦 自动生成manifest.json
- 🎯 文件命名即配置
- 🛠️ 更好的开发体验

## 🆘 遇到问题？

### 常见问题

**Q: 扩展加载失败？**
A: 确保已运行 `pnpm dev` 且图标文件存在。

**Q: 代码修改不生效？**
A: 在Chrome扩展页面点击刷新按钮，并刷新测试网页。

**Q: 类型错误？**
A: 运行 `pnpm type-check` 查看详细错误。

### 获取帮助

1. 查看文档（上面的表格）
2. 查看 [Plasmo文档](https://docs.plasmo.com/)
3. 查看 [Chrome扩展文档](https://developer.chrome.com/docs/extensions/)
4. 提交Issue

## 🎊 准备好了吗？

只差最后一步：**添加图标文件**！

完成后，运行 `pnpm dev`，开始使用吧！

---

**祝开发愉快！** 🚀

如果这个项目对你有帮助，记得给个⭐！
