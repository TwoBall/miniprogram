# 更新日志

本文档记录项目的所有重要更改。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
并遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [1.3.0] - 2025-12-28

### 新增
- 创建云函数公共模块目录 `cloudfunctions/common/`
  - `auth-utils.js` - 权限验证工具（verifyAdmin, verifyUser, verifyUserRoles）
  - `db-utils.js` - 数据库工具（getAllData, getAllDataSorted, paginate）
  - `response-utils.js` - 统一响应格式（success, fail, unauthorized 等）
  - `sort-utils.js` - 中文排序工具（sortStudentsByName, sortOptions）
  - `constants.js` - 常量定义（ROLES, USER_STATUS, ATTENDANCE_STATUS, MAX_LIMIT）
  - `index.js` - 模块统一导出入口
- 创建 `cloudfunctions/scripts/sync-common.js` 自动同步脚本
  - 支持增量更新和强制覆盖模式
  - 自动同步到 7 个云函数目录
- 创建 `cloudfunctions/scripts/test-common.js` 本地测试脚本
  - 包含 19 个测试用例
  - 验证公共模块功能和各云函数的 common 目录可导入性
- 添加 npm 脚本命令
  - `sync-common` - 同步公共模块
  - `sync-common:force` - 强制覆盖同步
  - `test:common` - 运行公共模块测试

### 重构
- 重构 7 个云函数使用公共模块机制
  - attendance
  - students
  - user
  - export
  - notification
  - transfer
  - submitFeedback

### 删除
- 删除各云函数目录下独立的 `utils.js` 文件（消除约 885 行重复代码）
  - `cloudfunctions/attendance/utils.js`
  - `cloudfunctions/students/utils.js`
  - `cloudfunctions/export/utils.js`
  - `cloudfunctions/notification/utils.js`

### 文档
- 更新 `cloudfunctions/README.md` 公共模块使用说明
- 更新 `plans/miniprogram-audit-report.md` 将问题 C3 标记为已解决
- 创建 `plans/cloudfunctions-common-module-design.md` 设计方案文档
- 更新 `README.md` 开发指南部分

---

## [1.2.0] - 2025-12-24

### 新增
- 添加管理员用户审批功能
- 添加骨架屏加载效果
- 添加分页加载（历史记录/审批列表）
- 添加下拉刷新功能
- 添加全局错误处理机制
- 创建公共工具模块
  - `utils/request.js` - 云函数调用封装
  - `utils/auth.js` - 权限检查工具
  - `utils/date.js` - 日期格式化工具
  - `utils/storage.js` - 本地存储封装
  - `utils/error.js` - 错误处理工具

### 优化
- 云函数调用优化（本地缓存+防抖）
- 数据库索引优化

### 工具
- 添加 ESLint 代码规范检查

### 界面
- 优化空状态展示

---

## [1.1.0] - 2025-12-22

### 重构
- 完成代码规范化和清理

### 文档
- 添加完整的开发文档
- 添加数据库设计文档
- 添加 60+ 处函数注释

### 修复
- 修复注册页面变量错误

### 删除
- 删除未使用的代码和导入

---

## [1.0.0] - 2025-12-21

### 新增
- 🎉 项目初始版本
- 实现多角色权限管理（社团老师、班主任、学部领导、管理员）
- 实现快速点名功能（滑动点名、一键全到）
- 实现考勤统计功能
- 实现反馈机制

---

## 版本说明

- **主版本号**：不兼容的 API 更改
- **次版本号**：向后兼容的功能性新增
- **修订号**：向后兼容的问题修复