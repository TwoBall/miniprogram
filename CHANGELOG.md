# 更新日志

本文档记录项目的所有重要更改。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
并遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [1.8.0] - 2025-01-04

### 修复
- **登录页 Toast 未引入**：修复 `pages/login/login.js` 中使用未引入的 `Toast` 导致运行时错误
- **注册接口安全漏洞**：修复 `cloudfunctions/user` 注册函数使用前端传入的 `openid`，改为使用 `wxContext.OPENID`
- **软删除用户未过滤**：修复登录查询未排除已删除用户，添加 `deleted: _.neq(true)` 条件
- **考勤提交安全漏洞**：修复 `cloudfunctions/attendance` 提交接口信任前端 `teacherId/teacherName`，改为从云端获取

### 优化
- **N+1 查询优化**：优化 `checkAbsenceAndNotify` 函数，使用 `_.in()` 一次查询所有班主任，替代逐班级查询
- **setData 性能优化**：优化 `pages/teacher/attendance/attendance.js` 使用局部路径更新，减少数据传输量
- **Storage 使用统一**：`pages/login/login.js` 改用 `storage` 模块统一管理缓存 key

### 代码质量
- **移除未使用变量**：删除 `cloudfunctions/attendance` 中未使用的 `teacherActions` 变量
- **JSDoc 注释统一**：统一所有文件的注释风格为标准 JSDoc 格式
  - `utils/` - 7 个工具文件添加 `@file`、`@module`、`@enum` 标注
  - `cloudfunctions/` - 6 个云函数完善入口函数和处理函数注释
  - `pages/` - 7 个页面文件统一生命周期和方法注释
  - `components/` - 3 个组件文件添加模块标注

---

## [1.7.2] - 2025-01-03

### 重构
- **点名页面交互优化**：移除滑动点名功能，保留按钮操作方式
  - 删除触摸滑动相关代码和样式
  - 移除下拉刷新功能，简化页面交互
- **UI 第四、五阶段优化**：完成整体 UI 风格统一
  - 统一主要操作按钮为 `type=primary` 样式
  - 统一选择器风格为 `van-popup` + `van-picker` 组合
  - 统一空状态组件，替换 `van-empty` 为自定义 `empty-state`
  - 统一性别标签颜色（男=蓝色，女=红色）

### 样式
- **动画样式库应用**：全面应用 `styles/animations.wxss` 提升交互体验
  - 卡片入场动画
  - 按钮点击反馈
  - 列表项交错动画

### 修复
- **leader/detail 组件引用**：修复页面缺少 `van-tag` 组件引用的问题

---

## [1.7.1] - 2025-12-30

### 修复
- **滑动卡死问题修复**：回退 `pages/teacher/attendance/attendance` 页面的 WXS 滑动优化
  - 问题根因：WXS 中 `selectComponent()` 无法选择普通 View 元素，导致触摸事件处理失败
  - 解决方案：移除 WXS 事件绑定，恢复使用原生 JS 触摸事件处理
  - 删除 `pages/teacher/attendance/swipe.wxs` 文件
  - 清理 JS 中不再使用的 WXS 回调方法
- **Dialog 按钮点击区域优化**：增大 `van-dialog` 弹窗按钮的点击区域
  - 将按钮高度从 96rpx 增加到 100rpx
  - 添加 `min-height` 确保最小点击区域
  - 优化按钮内部元素的布局，确保整个区域可点击

---

## [1.7.0] - 2025-12-28

### 第四阶段：用户体验优化组件库

#### 新增 Behaviors
- **throttleBehavior.js** - 节流防抖通用行为
  - `throttle(fn, delay, key)` - 节流函数，在指定时间内只执行一次
  - `debounce(fn, delay, key)` - 防抖函数，延迟执行
  - `setBtnLoading(btnKey, loading)` - 按钮加载状态管理
  - `safeAsyncAction(btnKey, asyncFn)` - 安全的异步操作包装器
- **formFeedbackBehavior.js** - 表单反馈通用行为
  - `validateRequired(data, requiredFields)` - 必填字段验证
  - `submitForm(submitFn, options)` - 表单提交包装器
  - `vibrateOnSuccess()` / `vibrateOnError()` - 震动反馈
  - `checkBeforeLeave()` - 离开前确认

#### 新增组件
- **lazy-image** - 懒加载图片组件
  - 使用 IntersectionObserver 实现视口内懒加载
  - 支持占位图、加载动画、错误处理
  - 支持圆形和方形样式
- **empty-state** - 空状态组件
  - 10 种预设场景：default, students, attendance, approval, notification, search, network, history, transfer, warning
  - 支持自定义图片、标题、描述和操作按钮

#### 骨架屏增强
- 新增 3 种骨架屏类型：
  - `overview` - 概览页骨架（统计卡片 + 图表 + 列表）
  - `approval` - 审批卡片骨架
  - `form` - 表单骨架

#### 动画样式库
- 创建 `styles/animations.wxss` 全局动画库
  - 淡入动画：fadeIn, fadeInUp, fadeInDown
  - 滑入动画：slideInLeft, slideInRight, slideInBottom
  - 弹出动画：popIn, cardPopIn
  - 列表动画：listItemEnter, cardListEnter（支持交错动画）
  - 交互反馈：btnActive, cardTap, listItemTap, iconTap
  - 加载动画：pulse, spin, shimmer, bounceLoading
  - 状态动画：shake, heartbeat, successBounce, errorShake

#### 页面集成
- `pages/admin/approval` - 集成 throttleBehavior、empty-state、动画类名
  - 审批按钮添加加载状态和节流保护
  - 使用 empty-state 替换 van-empty
  - 卡片列表添加入场动画

### 文档更新
- 更新 `behaviors/README.md` 添加新 Behavior 文档
- 更新 `components/README.md` 添加新组件文档
- 在 `app.wxss` 中引入动画样式库

---

## [1.6.0] - 2025-12-28

### 用户体验优化（第三阶段）
- **登录延迟优化**：`pages/login/login.js` 使用 Toast 的 onClose 回调替代 setTimeout
  - 跳转延迟从 2 秒缩短至 1.5 秒
  - 提供更好的用户反馈体验
- **骨架屏增强**：`pages/leader/dashboard/dashboard.wxml` 添加骨架屏支持
  - 页面加载时显示骨架屏，避免空白
- **网络错误重试**：`utils/request.js` 添加用户友好的重试对话框
  - 网络错误时显示重试按钮
  - 用户可主动选择重试或取消

### 性能优化
- **用时注入配置**：`app.json` 添加 `componentPlaceholder` 配置
  - 为 vant 组件和自定义组件配置占位组件
  - 提升页面首次渲染速度
- **渲染缓存扩展**：`pages/classTeacher/overview/overview.json` 添加 dynamic 渲染缓存

### 安全增强
- **代码加固配置**：创建 `.codeobfuscation.json`
  - 对敏感文件（auth.js、request.js、storage.js）启用混淆
  - 配置字符串加密和调用转换

### 新增文件
- `.codeobfuscation.json` - 代码加固配置文件

---

## [1.5.0] - 2025-12-28

### 性能优化（第二阶段）
- **WXS 滑动优化**：创建 `pages/teacher/attendance/swipe.wxs`，在视图层直接处理触摸事件
  - 减少逻辑层与视图层通信，提升滑动流畅度
  - 添加 WXS 回调方法 `onWxsTouchStart`、`onWxsTouchEnd`
  - 保留原生触摸事件作为降级方案
- **初始渲染缓存**：为高频访问页面配置 `initialRenderingCache`
  - `pages/login/login.json` - static 缓存
  - `pages/register/register.json` - static 缓存
  - `pages/teacher/attendance/attendance.json` - dynamic 缓存
  - `pages/leader/dashboard/dashboard.json` - dynamic 缓存
- **分包预下载优化**：在注册页配置 WiFi 环境下预下载所有角色分包
  - `app.json` 新增 `pages/register/register` 预下载规则

### 安全增强
- **状态机验证**：为转社团申请流程添加状态机验证
  - 定义 `TRANSFER_STATUS` 状态常量
  - 定义 `STATE_TRANSITIONS` 状态流转规则
  - 添加 `canTransition()` 验证函数
  - 添加 `isTerminalState()` 终态检查函数
  - 在 `handleApprove` 和 `handleReject` 中应用状态验证

### 新增文件
- `pages/teacher/attendance/swipe.wxs` - WXS 滑动手势处理模块

---

## [1.4.0] - 2025-12-28

### 安全增强（第一阶段）
- 配置云函数安全规则 `{"*": {"invoke": "auth != null"}}`，确保只有登录用户可调用云函数

### 性能优化
- 优化 `app.js` 中的 `checkUserAuth()` 方法，将同步 `wx.getStorageSync` 改为异步 `wx.getStorage`，避免阻塞小程序启动流程

### 文档
- 创建 `plans/miniprogram-audit-report.md` v2.0 审查报告，集成知识库最佳实践
- 创建 `plans/implementation-plan.md` 分阶段实施工作计划
- 创建 `plans/phase1-console-operations-guide.md` 控制台操作指南

### 技术评估
- 云函数频率限制：确认微信小程序云开发暂不支持控制台限频配置（腾讯云 CloudBase 支持），提供代码层替代方案
- 数据库安全规则：评估后标记为待优化，当前所有操作通过云函数进行，安全性由代码层保证

---

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