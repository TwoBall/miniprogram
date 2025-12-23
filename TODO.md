# 社团点名系统 - 优化待办清单

> 根据项目分析创建的详细优化清单，按优先级排序

---

## 一、高优先级（建议优先完成）

### 1. 创建公共工具模块
✅ **已完成** - 2025-12-23

- [x] 创建 `utils/request.js` - 云函数调用封装
  - 统一处理loading、错误提示、超时等
- [x] 创建 `utils/auth.js` - 权限检查工具
  - 抽取各页面重复的 `checkAuth()` 方法
- [x] 创建 `utils/date.js` - 日期格式化工具
  - 抽取各页面重复的日期处理逻辑
- [x] 创建 `utils/storage.js` - 本地存储封装
  - 统一管理 Storage key，避免硬编码

**涉及文件：**
- 新建 `utils/request.js`
- 新建 `utils/auth.js`
- 新建 `utils/date.js`
- 新建 `utils/storage.js`
- ~~修改所有页面 JS 文件引用~~（✅ 已完成 - 9个页面已迁移）

---

### 2. 云函数代码复用
**预计时间：1小时**

- [ ] 抽取 `getAllData` 函数到公共模块
  - 当前在 `attendance/index.js` 和 `students/index.js` 中重复定义
- [ ] 创建 `cloudfunctions/common/utils.js`
  - 所有云函数共享的工具函数

**涉及文件：**
- 新建 `cloudfunctions/common/utils.js`
- 修改 `cloudfunctions/attendance/index.js`
- 修改 `cloudfunctions/students/index.js`

---

### 3. 数据库索引优化
✅ **已完成** - 索引已在云开发控制台添加

- [ ] 在微信云开发控制台添加以下索引：

| 集合 | 索引字段 | 优先级 |
|------|----------|--------|
| users | `openid` | 高 |
| users | `openid, role` | 高 |
| users | `role, status` | 高 |
| students | `clubName` | 高 |
| students | `className` | 高 |
| students | `department` | 中 |
| attendance_records | `clubName, date` | 高 |
| attendance_records | `teacherId` | 高 |
| attendance_records | `date` | 中 |
| feedbacks | `date, studentId` | 中 |
| feedbacks | `className, date` | 中 |

---

### 4. 添加下拉刷新功能
✅ **已完成** - 2025-12-23

- [x] `pages/teacher/history/history` - 历史记录列表
- [x] `pages/classTeacher/overview/overview` - 班级考勤
- [x] `pages/leader/dashboard/dashboard` - 学部仪表盘
- [x] `pages/admin/approval/approval` - 审批列表

**实现方式：**
- 在页面 JSON 中添加 `"enablePullDownRefresh": true`
- 实现 `onPullDownRefresh()` 方法

---

## 二、中优先级（体验提升）

### 5. 添加骨架屏加载效果
**预计时间：2小时**

- [ ] 创建骨架屏组件 `components/skeleton/skeleton`
- [ ] 应用到以下页面：
  - 点名页面（学生卡片骨架）
  - 班级考勤（学生列表骨架）
  - 历史记录（记录卡片骨架）
  - 审批列表（用户卡片骨架）

---

### 6. 空状态优化
**预计时间：1小时**

- [ ] 统一使用 `van-empty` 组件
- [ ] 检查并优化以下页面的空状态：
  - 历史记录无数据 ✅ 已完成
  - 班级无学生
  - 审批列表无待审批
  - 切换身份无其他角色

---

### 7. 云函数调用优化
**预计时间：3小时**

> 优化云函数调用量，降低基础套餐成本

#### 7.1 本地缓存策略
- [ ] 筛选选项缓存（学部/班级/社团）- 24小时有效
  - `register.js:fetchOptions()` 使用 `storage.getWithCache()`
- [ ] 学生列表缓存 - 当日有效
  - `attendance.js:loadStudents()`
- [ ] 考勤数据缓存 - 5分钟有效
  - `overview.js:loadData()`, `dashboard.js:loadData()`
- [ ] 历史记录缓存 - 5分钟有效
  - `history.js:loadHistory()`

#### 7.2 减少重复调用
- [ ] `onShow` 添加防抖（5秒内不重复请求）
  - `approval.js`, `history.js`, `switchRole.js`
- [ ] 合并提交检查：`checkTodaySubmissions` + `submit` 合并为 1 次调用

#### 7.3 数据库直接查询（进阶）
- [ ] 简单查询改用前端直接查数据库
- [ ] 配置数据库权限规则

---

### 8. 错误边界处理
**预计时间：1小时**

- [ ] 创建全局错误处理函数
- [ ] 云函数调用失败时的重试机制
- [ ] 网络异常时的友好提示
- [ ] 在 `app.js` 中添加 `onError` 处理

---

## 三、低优先级（锦上添花）

### 9. 添加操作日志
**预计时间：2小时**

- [ ] 创建 `logs` 集合记录关键操作
- [ ] 记录审批操作（通过/拒绝）
- [ ] 记录点名提交操作
- [ ] 记录角色切换操作

---

### 10. ESLint 代码规范
**预计时间：30分钟**

- [ ] 安装 ESLint 依赖
- [ ] 创建 `.eslintrc.js` 配置文件
- [ ] 添加 npm scripts
- [ ] 修复现有 lint 错误

---

### 11. 分页加载优化
**预计时间：2小时**

- [ ] 历史记录页面分页加载
- [ ] 审批列表分页加载
- [ ] 实现上拉加载更多

**当前问题：**
- 历史记录限制 50 条
- 审批列表限制 100 条

---

### 12. 键盘体验优化
**预计时间：1小时**

- [ ] 注册页面姓名输入完成后自动跳转下一项
- [ ] 反馈页面输入框自动获取焦点
- [ ] 拒绝原因输入框自动获取焦点

---

### 13. 全局组件按需引入优化
**预计时间：1小时**

> 优化 app.json 中的 14 个全局自定义组件，改为页面级按需引入

- [ ] 分析各页面实际使用的 Vant 组件
- [ ] 将不常用组件从 `app.json` 移到各页面 `.json`
- [ ] 只保留真正全局使用的组件（如 toast、dialog）
- [ ] 验证按需注入效果

---

## 四、文档完善

### 14. 开发文档补充
**预计时间：1小时**

- [ ] 补充 API 接口文档
- [ ] 补充组件使用说明
- [ ] 补充部署指南
- [ ] 补充常见问题 FAQ

---

### 15. 代码注释完善
✅ **已完成** - 已添加 JSDoc 注释

---

## 五、已完成项目

- [x] 样式统一（颜色主题 #1F6FAD）
- [x] 删除页面单独导航栏颜色定义
- [x] 创建公共样式 common.wxss
- [x] 删除未使用的样式类
- [x] 删除未使用的 Vant 组件
- [x] 添加 JSDoc 代码注释
- [x] 修复班主任注册学部过滤问题
- [x] 统一切换身份按钮样式

---

## 进度跟踪

| 类别 | 总数 | 已完成 | 进度 |
|------|------|--------|------|
| 高优先级 | 4 | 2 | 50% |
| 中优先级 | 4 | 0 | 0% |
| 低优先级 | 4 | 0 | 0% |
| 文档完善 | 2 | 1 | 50% |

---

*最后更新：2025-12-23*
