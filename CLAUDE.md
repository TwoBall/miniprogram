# 智慧社团管理系统 - 项目文档

## 项目简介

这是一个基于微信小程序的智慧社团管理系统，支持多角色管理（管理员、教师、班主任、领导），提供考勤管理、学生管理、数据统计等功能。

## 技术栈

- **框架**: 微信小程序（WeChat MiniProgram）
- **语言**: JavaScript (ES6)
- **UI 组件库**: Vant Weapp v1.11.7
- **云服务**: 微信云开发（Cloud Functions + Cloud Database）
- **代码规范**: ESLint
- **小程序基础库**: 3.11.3

## 项目架构

本项目采用微信小程序标准架构，结合云开发能力：

- **pages/**: 页面层，按角色分类（admin/teacher/classTeacher/leader/common）
- **cloudfunctions/**: 云函数层，处理后端业务逻辑
- **components/**: 自定义组件层
- **utils/**: 工具函数层
- **behaviors/**: 行为混入

### 分包结构

项目采用分包加载优化主包大小：

| 分包名 | 路径 | 说明 |
|--------|------|------|
| 主包 | pages/login, pages/register | 登录注册页面 |
| admin | pages/admin/ | 管理员功能模块 |
| teacher | pages/teacher/ | 教师功能模块 |
| classTeacher | pages/classTeacher/ | 班主任功能模块 |
| leader | pages/leader/ | 领导功能模块 |
| common | pages/common/ | 公共功能模块 |

### 组件引入规范

- 全局组件（app.json）：仅 `van-toast`、`van-dialog`
- 页面组件：在各页面 `.json` 文件中按需引入
- 自定义组件：`custom-tabbar`、`skeleton` 在需要的页面单独引入

## 核心文档索引

项目采用 Fractal Docs 自维护文档系统，详细文档请参考：

- [@pages/README.md](./pages/README.md) - 页面模块文档
- [@cloudfunctions/README.md](./cloudfunctions/README.md) - 云函数模块文档
- [@components/README.md](./components/README.md) - 组件模块文档
- [@utils/README.md](./utils/README.md) - 工具函数模块文档
- [@behaviors/README.md](./behaviors/README.md) - 行为混入模块文档
- [@styles/README.md](./styles/README.md) - 全局样式模块文档
- [@tools/README.md](./tools/README.md) - 开发工具文档

## 开发规范

请遵循以下规范进行开发：

- [@.claude/rules/doc-maintenance.md](./.claude/rules/doc-maintenance.md) - 文档维护规则
- [@.claude/rules/project-structure.md](./.claude/rules/project-structure.md) - 项目结构引用

## 快速开始

1. 安装依赖：`npm install`
2. 使用微信开发者工具打开项目
3. 配置云开发环境
4. 上传并部署云函数

## 数据库文档

- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) - 数据库架构文档
- [DATABASE_INDEX.md](./DATABASE_INDEX.md) - 数据库索引配置指南

## 样式规范

- [CARD_STYLE_GUIDE.md](./CARD_STYLE_GUIDE.md) - 卡片样式指南

## MCP 工具使用规范

### Context7 文档查询

当需要以下内容时，**必须**使用 Context7 MCP 查询最新文档：

- 库/框架的 API 文档和用法
- 代码生成和示例
- 安装、配置步骤
- 第三方库的最佳实践

**使用方式**：
1. 先调用 `mcp__context7__resolve-library-id` 获取库 ID
2. 再调用 `mcp__context7__query-docs` 查询具体文档

### TDesign 组件查询

当需要 TDesign 组件信息时，使用以下工具：

#### TDesign 小程序文档（Context7）- 推荐

本项目使用微信小程序，**优先使用 Context7 查询 TDesign 小程序文档**：

```javascript
// 库 ID: /tencent/tdesign-miniprogram
mcp__context7__query-docs({
  libraryId: '/tencent/tdesign-miniprogram',
  query: 'Button component usage and API'
})
```

**适用场景**：
- 查询组件用法和 API
- 获取代码示例
- 了解事件处理方式
- 组件注册配置

#### TDesign MCP 工具（仅 Web 版）

> **注意**：TDesign MCP 不支持小程序（`miniprogram`），仅支持 Web 框架。可用 `vue-next` 获取组件列表作为参考，但查询小程序具体用法请使用 Context7。

| 工具 | 用途 | 适用场景 |
|------|------|----------|
| `mcp__tdesign__get-component-list` | 获取所有可用组件列表 | 选择合适组件进行组合实现不存在的功能 |
| `mcp__tdesign__get-component-docs` | 获取组件文档 | 代码生成和代码转换 |
| `mcp__tdesign__get-component-dom` | 获取组件 DOM 结构 | 转换自定义的 CSS 样式 |
| `mcp__tdesign__get-component-changelog` | 获取组件变更日志 | 组件库版本升级 |

**framework 参数**（仅支持以下三种）：
- `react` - React 版本
- `vue` - Vue 2 版本
- `vue-next` - Vue 3 版本

**使用方式**：

```javascript
// 1. 获取组件列表（用 vue-next 作为参考）
mcp__tdesign__get-component-list({ framework: 'vue-next' })

// 2. 获取组件文档（支持批量查询）
mcp__tdesign__get-component-docs({ framework: 'vue-next', names: ['Button', 'Dialog'] })

// 3. 获取组件 DOM 结构（可指定版本）
mcp__tdesign__get-component-dom({ framework: 'vue-next', names: ['Button'], version: '1.0.0' })

// 4. 获取组件变更日志
mcp__tdesign__get-component-changelog({ framework: 'vue-next', names: ['Button'] })
```

### CloudBase 云开发

当需要云开发相关操作时，使用 CloudBase MCP 工具。
