# 小程序优化指南

> 基于微信小程序 CloudBase 最佳实践，针对"智慧社团管理系统"的优化建议。

## 目录

- [性能优化](#性能优化)
- [代码质量](#代码质量)
- [用户体验](#用户体验)
- [安全性](#安全性)
- [实施计划](#实施计划)

---

## 性能优化

### 1. setData 局部更新 ⭐⭐⭐

**问题**：在列表操作时，直接替换整个数组会导致大量数据传输，影响渲染性能。

**涉及文件**：
- `pages/teacher/attendance/attendance.js` - `toggleMarkedStudentStatus` 方法
- `behaviors/studentListBehavior.js` - `filterStudents` 方法

**当前代码**：
```javascript
// ❌ 替换整个数组
this.setData({ markedStudents: newList })
```

**优化方案**：
```javascript
// ✅ 使用数据路径局部更新
this.setData({
  [`markedStudents[${index}].status`]: newStatus
})

// ✅ 批量更新多个字段
const updates = {}
updates[`markedStudents[${index}].status`] = newStatus
updates[`markedStudents[${index}].note`] = note
this.setData(updates)
```

**预期效果**：减少 setData 数据传输量 80%+，列表操作更流畅。

---

### 2. 虚拟列表应用 ⭐⭐

**问题**：`virtualListBehavior` 已实现但未使用，长列表（50+ 条）渲染性能差。

**涉及文件**：
- `behaviors/virtualListBehavior.js`

**优化方案**：

```javascript
// pages/classTeacher/students/students.js
const virtualListBehavior = require('../../../behaviors/virtualListBehavior')

Page({
  behaviors: [virtualListBehavior],

  onReady() {
    this.initVirtualList({
      itemHeight: 120,  // 每项高度（rpx 转 px）
      containerHeight: wx.getSystemInfoSync().windowHeight - 200,
      bufferSize: 5
    })
  },

  async loadStudents() {
    const result = await request.callCloud('students', { ... })
    if (result.success) {
      this.updateFullList(result.data)  // 使用虚拟列表方法
    }
  }
})
```

```xml
<!-- students.wxml -->
<scroll-view
  scroll-y
  style="height: {{containerHeight}}px"
  bindscroll="onVirtualScroll"
>
  <view style="height: {{totalHeight}}px; position: relative;">
    <view
      wx:for="{{visibleItems}}"
      wx:key="_id"
      style="position: absolute; top: {{item._top}}px; width: 100%;"
    >
      <!-- 学生卡片内容 -->
    </view>
  </view>
</scroll-view>
```

**适用场景**：列表超过 50 条数据时启用。

---

### 3. 分包预下载扩展 ⭐⭐ ✅ 已完成

**问题**：当前仅预下载 `common` 分包，用户进入角色页面时仍需等待下载。

**优化方案**：
```json
"preloadRule": {
  "pages/login/login": {
    "network": "all",
    "packages": ["common", "admin", "teacher", "classTeacher", "leader"]
  }
}
```

**说明**：由于各分包体积较小，可以全部预下载。如果包体积增大，可根据用户角色动态预下载。

---

### 4. 初始渲染缓存 ⭐⭐ ✅ 已完成

**问题**：未启用初始渲染缓存，非首次启动时仍需等待逻辑层初始化。

**优化方案**：

在高频访问页面的 json 配置中添加：

```json
{
  "initialRenderingCache": "dynamic"
}
```

**适用页面**：
- `pages/login/login.json`
- `pages/teacher/attendance/attendance.json`
- `pages/classTeacher/overview/overview.json`
- `pages/admin/home/home.json`
- `pages/leader/dashboard/dashboard.json`

**注意**：使用静态缓存时，确保首屏不依赖动态数据渲染关键内容。

---

### 6. 减少同步 API 调用

**检查点**：启动过程中避免使用同步 API。

**当前状态**：✅ `app.js` 已使用异步 `wx.getStorage` 而非 `wx.getStorageSync`。

**持续关注**：
- 避免在 `onLaunch`、`onLoad` 中使用 `Sync` 结尾的 API
- 使用 `wx.getSystemInfoAsync` 替代 `wx.getSystemInfoSync`

---

## 代码质量

### 1. 清理未使用的 Behavior

**问题**：部分 Behavior 已实现但未被引用，占用包体积。

**检查清单**：

| Behavior | 状态 | 建议 |
|----------|------|------|
| `virtualListBehavior.js` | 未使用 | 在长列表页落地使用 |
| `formFeedbackBehavior.js` | 未使用 | 在表单页落地使用 |

**操作**：要么落地使用，要么移至 `tools/unused/` 目录避免打包。

---

### 2. 云函数代码拆分

**问题**：`attendance/index.js` 超过 800 行，包含多个 Action 处理器。

**当前结构**：
```
cloudfunctions/attendance/
├── index.js          # 800+ 行，所有逻辑
├── package.json
└── common/
```

**优化方案**：
```
cloudfunctions/attendance/
├── index.js          # 入口，仅负责分发
├── handlers/
│   ├── submit.js
│   ├── getHistory.js
│   ├── getDetail.js
│   ├── getByClass.js
│   ├── getByStudent.js
│   └── statistics.js
├── package.json
└── common/
```

**重构示例**：

```javascript
// index.js - 精简入口
const handlers = {
  submit: require('./handlers/submit'),
  getHistory: require('./handlers/getHistory'),
  getDetail: require('./handlers/getDetail'),
  // ...
}

exports.main = async (event, context) => {
  const { action } = event
  const handler = handlers[action]

  if (!handler) {
    return { success: false, message: '无效的操作类型' }
  }

  return handler(event, context)
}
```

---

### 3. 移除未使用的组件声明

**检查方法**：

```bash
# 查找页面 json 中声明但未在 wxml 中使用的组件
```

**操作**：定期审查各页面的 `usingComponents`，移除未使用的声明。

---

## 用户体验

### 1. 表单防重复提交

**问题**：部分表单页面可能允许快速多次点击提交。

**涉及页面**：
- `pages/common/transfer/create.js`
- `pages/register/register.js`
- `pages/classTeacher/feedback/feedback.js`

**优化方案**：

```javascript
const throttleBehavior = require('../../../behaviors/throttleBehavior')

Page({
  behaviors: [throttleBehavior],

  async onSubmit() {
    // 使用 safeAsyncAction 自动管理加载状态
    await this.safeAsyncAction('submit', async () => {
      const result = await request.callCloud('xxx', data)
      // 处理结果
    })
  }
})
```

```xml
<!-- 按钮显示加载状态 -->
<van-button
  loading="{{btnLoadingMap.submit}}"
  disabled="{{btnLoadingMap.submit}}"
  bind:click="onSubmit"
>
  提交
</van-button>
```

---

### 2. 骨架屏覆盖检查

**已实现页面**：
- ✅ `pages/teacher/attendance/attendance`
- ✅ `pages/teacher/history/history`
- ✅ `pages/classTeacher/students/students`

**待检查页面**：
- `pages/admin/users/users`
- `pages/common/notifications/notifications`
- `pages/common/transfer/transfer`

**标准实现**：
```xml
<skeleton wx:if="{{loading}}" type="list" count="{{5}}" />
<view wx:else>
  <!-- 实际内容 -->
</view>
```

---

### 3. 空状态统一处理

**已有组件**：`components/empty-state/empty-state`

**检查清单**：确保所有列表页在数据为空时显示空状态组件。

```xml
<empty-state
  wx:if="{{!loading && list.length === 0}}"
  type="students"
/>
```

---

## 安全性

### 1. 敏感字段脱敏

**问题**：云函数返回的学生数据包含班主任电话等敏感信息。

**涉及云函数**：`students/index.js`

**当前代码**：
```javascript
const students = await getAllData(
  db.collection('students'),
  { className },
  {
    _id: true,
    studentName: true,
    classTeacher: true,
    classTeacherPhone: true  // ⚠️ 敏感字段
  }
)
```

**优化方案**：

根据调用场景返回不同字段：

```javascript
async function handleGetByClass(event) {
  const { className, includeContact = false } = event

  const fields = {
    _id: true,
    studentName: true,
    department: true,
    className: true,
    gender: true,
    clubName: true
  }

  // 仅管理员可获取联系方式
  if (includeContact && event.isAdmin) {
    fields.classTeacher = true
    fields.classTeacherPhone = true
  }

  const students = await getAllData(
    db.collection('students'),
    { className },
    fields
  )

  return { success: true, data: students }
}
```

---

### 2. 数据库权限审查

**当前状态**：

| 集合 | 权限设置 | 状态 |
|------|----------|------|
| `students` | ADMINONLY | ✅ 安全 |
| `users` | ADMINONLY | ✅ 安全 |
| `attendance` | ADMINONLY | ✅ 安全 |

**持续关注**：
- 所有敏感集合保持 `ADMINONLY` 权限
- 通过云函数代理访问，在云函数中做权限校验

---

## 实施计划

### 第一阶段：高优先级 ✅ 已完成

| 任务 | 文件 | 状态 |
|------|------|------|
| setData 局部更新 | attendance.js | ✅ 已完成 |
| 启用初始渲染缓存 | 5 个页面 json | ✅ 已完成 |
| 分包预下载扩展 | app.json | ✅ 已完成 |

### 第二阶段：中优先级 ✅ 已完成

| 任务 | 文件 | 状态 |
|------|------|------|
| 表单防重复提交 | register.wxml | ✅ 已完成 |
| 骨架屏补充 | notifications, transfer 页面 | ✅ 已完成 |

### 第三阶段：低优先级（按需）

| 任务 | 文件 | 状态 |
|------|------|------|
| 虚拟列表应用 | students, club 页面 | ✅ 已完成 |
| 云函数代码拆分 | attendance 云函数 | 待实施 |
| 敏感字段脱敏 | students 云函数 | 待实施 |

### 已移除的优化项

| 任务 | 原因 |
|------|------|
| lazy-image 图片懒加载 | 项目无图片列表场景，已删除相关代码 |

---

## 参考资料

- [微信小程序性能优化指南](https://developers.weixin.qq.com/miniprogram/dev/framework/performance/tips.html)
- [启动性能优化](https://developers.weixin.qq.com/miniprogram/dev/framework/performance/tips/start.html)
- [运行时性能优化](https://developers.weixin.qq.com/miniprogram/dev/framework/performance/tips/runtime.html)
- [分包加载](https://developers.weixin.qq.com/miniprogram/dev/framework/subpackages.html)

---

*文档生成时间：2026-01-01*
*项目：智慧社团管理系统*
