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
- [@styles/README.md](./styles/README.md) - 全局样式模块文档

## 开发规范

请遵循以下规范进行开发：

- [@.claude/rules/doc-maintenance.md](./.claude/rules/doc-maintenance.md) - 文档维护规则
- [@.claude/rules/project-structure.md](./.claude/rules/project-structure.md) - 项目结构引用

## 快速开始

1. 安装依赖：`npm install`
2. 使用微信开发者工具打开项目
3. 配置云开发环境
4. 上传并部署云函数

## 其他文档

- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) - 数据库架构文档
- [CARD_STYLE_GUIDE.md](./CARD_STYLE_GUIDE.md) - 卡片样式指南
