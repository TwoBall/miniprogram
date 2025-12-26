# 项目结构引用

本文档定义了项目的核心目录结构，用于 Claude Code 快速理解项目架构。

## 核心业务目录

### 页面模块
@pages/README.md

页面层采用按角色分类的目录结构，包含：
- admin/ - 管理员功能模块
- teacher/ - 教师功能模块
- classTeacher/ - 班主任功能模块
- leader/ - 领导功能模块
- common/ - 公共功能模块
- login/ - 登录模块
- register/ - 注册模块

### 云函数模块
@cloudfunctions/README.md

云函数层处理后端业务逻辑，包含：
- attendance/ - 考勤管理
- students/ - 学生管理
- user/ - 用户管理
- export/ - 数据导出
- notification/ - 通知推送
- transfer/ - 转班处理
- submitFeedback/ - 反馈提交
- migrateFields/ - 字段迁移

### 组件模块
@components/README.md

自定义组件层，包含可复用的 UI 组件：
- custom-tabbar/ - 自定义底部标签栏
- skeleton/ - 骨架屏加载组件

### 工具模块
@utils/README.md

工具函数层，提供通用功能：

**主包工具**（供登录/注册页面使用）：
- error.js - 错误处理
- request.js - 网络请求
- storage.js - 本地存储

**分包工具**（位于 pages/common/utils/）：
- auth.js - 身份认证
- date.js - 日期处理

## 其他重要目录

### 全局样式模块
@styles/README.md

全局样式层提供统一的 UI 规范和可复用的公共样式类：
- `common.wxss` - 公共样式类库（设计规范 + 可复用组件样式）
- `profile-base.wxss` - Profile 页面公共样式基类

**样式复用模式**：采用组合类名（`class="card xxx-card"`），页面 WXSS 仅定义特有样式。

### 其他目录
- `images/` - 图片资源
- `miniprogram_npm/` - 小程序 npm 包编译产物
- `node_modules/` - Node.js 依赖包

### 行为混入模块
@behaviors/README.md

**主包 Behavior**（被多个分包使用，必须放在主包）：
- `behaviors/profileBehavior.js` - Profile 页面通用行为

**分包 Behavior**（仅 common 分包内部使用）：
- `pages/common/behaviors/datePickerBehavior.js` - 日期选择器行为
- `pages/common/behaviors/paginationBehavior.js` - 分页加载行为

**注意**：微信小程序分包之间不能互相引用，但所有分包都可以引用主包。因此被多个分包使用的 Behavior 必须放在主包 `behaviors/` 目录。

## 分包共享资源

为优化主包体积，仅被 common 分包内部使用的资源放置在 `pages/common/` 目录：
- `pages/common/behaviors/` - common 分包内部使用的行为混入
- `pages/common/utils/` - 分包共享工具函数（auth、date）

## 配置文件

- `app.js` - 小程序主入口
- `app.json` - 全局配置
- `app.wxss` - 全局样式
- `project.config.json` - 项目配置
- `sitemap.json` - 索引配置
- `package.json` - npm 依赖管理

## 架构说明

本项目采用微信小程序标准架构：

```
用户界面 (pages)
    ↓
组件层 (components)
    ↓
工具层 (utils)
    ↓
云函数层 (cloudfunctions)
    ↓
云数据库 (Cloud Database)
```

每一层都有明确的职责分工，确保代码的可维护性和可扩展性。
