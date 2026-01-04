# 代码质量优化方案

> 基于 2026-01-04 全面代码审查报告生成
>
> 审查评分：⭐⭐⭐⭐ (4/5)

## 目录

- [一、优化概述](#一优化概述)
- [二、高优先级任务](#二高优先级任务)
- [三、中优先级任务](#三中优先级任务)
- [四、低优先级任务](#四低优先级任务)
- [五、实施计划](#五实施计划)
- [六、验收标准](#六验收标准)

---

## 一、优化概述

### 1.1 当前状态

| 维度 | 当前评分 | 目标评分 |
|------|----------|----------|
| 架构设计 | ⭐⭐⭐⭐⭐ | 保持 |
| 代码质量 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 安全性 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 性能 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 可维护性 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

### 1.2 优化目标

1. **代码可维护性**：拆分过长文件，提高代码可读性
2. **系统安全性**：完善限频清理、输入校验
3. **运行性能**：优化查询、减少 setData 调用
4. **开发效率**：统一代码规范，减少样板代码

### 1.3 任务统计

| 优先级 | 任务数 | 预估工作量 |
|--------|--------|------------|
| 高优先级 | 4 | 8-12 小时 |
| 中优先级 | 5 | 6-8 小时 |
| 低优先级 | 4 | 4-6 小时 |

---

## 二、高优先级任务

### 2.1 拆分 attendance 云函数

**问题描述**：
- `cloudfunctions/attendance/index.js` 超过 950 行
- 包含 13 个 Action，职责过多
- 难以维护和测试

**优化方案**：

```
cloudfunctions/attendance/
├── index.js              # 入口文件（仅包含派发逻辑）
├── handlers/
│   ├── submit.js         # 提交相关：submit, checkTodaySubmissions
│   ├── query.js          # 查询相关：getHistory, getDetail, getByStudent
│   ├── statistics.js     # 统计相关：getByClass, getByDepartment, getStatistics
│   ├── ranking.js        # 排行相关：getClubRank, getClassRank, getDepartmentClassRanking
│   └── warning.js        # 预警相关：getAbsenceWarnings
├── services/
│   └── notification.js   # 缺勤通知服务
├── common/               # 公共模块（自动同步）
└── package.json
```

**实施步骤**：

1. 创建 `handlers/` 目录结构
2. 按功能拆分各 handler 文件
3. 修改 `index.js` 为纯派发逻辑
4. 抽取 `checkAbsenceAndNotify` 到 `services/notification.js`
5. 测试所有 Action 功能正常
6. 部署并验证

**入口文件示例**：

```javascript
// cloudfunctions/attendance/index.js
const cloud = require('wx-server-sdk')
const { createDispatcher, unauthorized } = require('./common')
const { verifyUserRoles, ROLES } = require('./common')

// 导入各模块 handlers
const submitHandlers = require('./handlers/submit')
const queryHandlers = require('./handlers/query')
const statisticsHandlers = require('./handlers/statistics')
const rankingHandlers = require('./handlers/ranking')
const warningHandlers = require('./handlers/warning')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 合并所有 handlers
const handlers = {
  ...submitHandlers,
  ...queryHandlers,
  ...statisticsHandlers,
  ...rankingHandlers,
  ...warningHandlers
}

// 需要验证身份的操作
const authRequiredActions = ['submit', 'updateRecords']

exports.main = createDispatcher(handlers, async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  if (!openid) {
    throw new Error('未授权访问')
  }

  // 敏感操作验证
  if (authRequiredActions.includes(event.action)) {
    const user = await verifyUserRoles(db, openid, [ROLES.TEACHER, ROLES.ADMIN])
    if (!user) {
      throw new Error('无权执行此操作')
    }
  }

  return { db, openid, wxContext }
})
```

---

### 2.2 配置限频记录定时清理

**问题描述**：
- `rate_limits` 集合会持续增长
- 无自动清理机制
- 可能影响数据库性能和存储成本

**优化方案**：

1. **创建定时触发器云函数**

```javascript
// cloudfunctions/cleanupRateLimits/index.js
const cloud = require('wx-server-sdk')
const { cleanupExpiredRecords } = require('./common')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  // 清理 1 小时前的记录
  const beforeTimestamp = Date.now() - 60 * 60 * 1000
  const removed = await cleanupExpiredRecords(db, beforeTimestamp)

  console.log(`[定时清理] 已清理 ${removed} 条过期限频记录`)

  return { success: true, removed }
}
```

2. **配置定时触发器**

在微信开发者工具中配置云函数触发器：

```json
{
  "triggers": [
    {
      "name": "cleanupTimer",
      "type": "timer",
      "config": "0 0 * * * * *"
    }
  ]
}
```

说明：每小时整点执行一次清理

3. **添加数据库索引**

在云开发控制台为 `rate_limits` 集合添加索引：
- 索引字段：`timestamp`（升序）
- 用途：加速清理查询

---

### 2.3 抽取排课规则为配置

**问题描述**：
- 排课规则硬编码在 `attendance.js` 中
- 修改排课需要改代码并重新发布
- 不灵活，难以适应变化

**当前代码**：

```javascript
// pages/teacher/attendance/attendance.js:109-121
if (day === 2) {
  defaultDepts = depts.filter(d => d === '职教一部' || d === '职教二部')
} else if (day === 4) {
  defaultDepts = depts.filter(d => d === '医药护理部')
} else {
  isClassDay = false
  noClassMessage = `今天是${dateUtil.getDayOfWeekName()}，无上课任务`
}
```

**优化方案**：

1. **创建配置集合**

在云数据库中创建 `system_config` 集合：

```json
{
  "_id": "schedule_config",
  "type": "schedule",
  "data": {
    "rules": [
      { "dayOfWeek": 2, "departments": ["职教一部", "职教二部"], "name": "周二" },
      { "dayOfWeek": 4, "departments": ["医药护理部"], "name": "周四" }
    ],
    "noClassMessage": "今天是{dayName}，无上课任务"
  },
  "updateTime": "2026-01-04T00:00:00Z"
}
```

2. **创建配置读取工具**

```javascript
// utils/config.js
const storage = require('./storage')
const request = require('./request')

const CONFIG_CACHE_KEY = 'system_config'
const CONFIG_CACHE_DURATION = 30 * 60 * 1000 // 30分钟

async function getScheduleConfig() {
  // 尝试从缓存读取
  const cached = storage.getWithCache(
    CONFIG_CACHE_KEY,
    CONFIG_CACHE_KEY + '_time',
    CONFIG_CACHE_DURATION
  )
  if (cached) return cached

  // 从云端获取
  const result = await request.callCloudSilent('config', {
    action: 'get',
    key: 'schedule_config'
  })

  if (result.success) {
    storage.setWithCache(CONFIG_CACHE_KEY, CONFIG_CACHE_KEY + '_time', result.data)
    return result.data
  }

  // 返回默认配置
  return {
    rules: [
      { dayOfWeek: 2, departments: ['职教一部', '职教二部'] },
      { dayOfWeek: 4, departments: ['医药护理部'] }
    ],
    noClassMessage: '今天是{dayName}，无上课任务'
  }
}

module.exports = { getScheduleConfig }
```

3. **修改 attendance.js 使用配置**

```javascript
// pages/teacher/attendance/attendance.js
const config = require('../../../utils/config')

async loadStudents() {
  // ...
  const scheduleConfig = await config.getScheduleConfig()
  const day = dateUtil.getDayOfWeek()

  const rule = scheduleConfig.rules.find(r => r.dayOfWeek === day)

  if (rule) {
    defaultDepts = depts.filter(d => rule.departments.includes(d))
    isClassDay = defaultDepts.length > 0
  } else {
    isClassDay = false
    noClassMessage = scheduleConfig.noClassMessage.replace(
      '{dayName}',
      dateUtil.getDayOfWeekName()
    )
  }
  // ...
}
```

---

### 2.4 用户输入校验增强

**问题描述**：
- 部分用户输入未做严格校验
- 可能存在 NoSQL 注入风险
- 需要统一输入验证机制

**优化方案**：

1. **创建输入校验工具**

```javascript
// cloudfunctions/common/validator.js

/**
 * 校验字符串长度
 */
function validateStringLength(value, min, max, fieldName) {
  if (typeof value !== 'string') {
    return { valid: false, message: `${fieldName}必须是字符串` }
  }
  if (value.length < min || value.length > max) {
    return { valid: false, message: `${fieldName}长度应为${min}-${max}个字符` }
  }
  return { valid: true }
}

/**
 * 校验是否为有效 ObjectId
 */
function validateObjectId(value, fieldName) {
  if (typeof value !== 'string' || !/^[a-f0-9]{24}$/i.test(value)) {
    return { valid: false, message: `${fieldName}格式无效` }
  }
  return { valid: true }
}

/**
 * 校验日期格式 YYYY-MM-DD
 */
function validateDate(value, fieldName) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return { valid: false, message: `${fieldName}格式应为YYYY-MM-DD` }
  }
  return { valid: true }
}

/**
 * 校验枚举值
 */
function validateEnum(value, allowedValues, fieldName) {
  if (!allowedValues.includes(value)) {
    return { valid: false, message: `${fieldName}值无效` }
  }
  return { valid: true }
}

/**
 * 批量校验
 */
function validate(rules) {
  for (const rule of rules) {
    const result = rule()
    if (!result.valid) {
      return result
    }
  }
  return { valid: true }
}

module.exports = {
  validateStringLength,
  validateObjectId,
  validateDate,
  validateEnum,
  validate
}
```

2. **在云函数中使用**

```javascript
// cloudfunctions/user/index.js
const { validate, validateStringLength, validateEnum } = require('./common/validator')
const { ROLES } = require('./common')

async function handleRegister(event, wxContext) {
  const { name, role, department, className, clubName } = event

  // 输入校验
  const validation = validate([
    () => validateStringLength(name, 2, 20, '姓名'),
    () => validateEnum(role, Object.values(ROLES), '角色')
  ])

  if (!validation.valid) {
    return badRequest(validation.message)
  }

  // 继续业务逻辑...
}
```

---

## 三、中优先级任务

### 3.1 统一使用 createDispatcher 包装器

**问题描述**：
- `response-utils.js` 提供了 `createDispatcher` 和 `wrapHandler`
- 但各云函数仍使用手动 try-catch
- 存在样板代码重复

**优化方案**：

逐步将各云函数改造为使用 `createDispatcher`：

```javascript
// 改造前
exports.main = async (event, context) => {
  const { action } = event
  const handlers = { ... }
  const handler = handlers[action]
  if (!handler) {
    return { success: false, message: '无效的操作类型' }
  }
  return handler(event, wxContext)
}

// 改造后
const { createDispatcher } = require('./common')

const handlers = {
  login: handleLogin,
  register: handleRegister,
  // ...
}

exports.main = createDispatcher(handlers, async (event, context) => {
  const wxContext = cloud.getWXContext()
  return { wxContext, db }
})
```

**需要改造的云函数**：
- [ ] `user/index.js`
- [ ] `attendance/index.js`
- [ ] `students/index.js`
- [ ] `export/index.js`
- [ ] `notification/index.js`
- [ ] `transfer/index.js`

---

### 3.2 合并 setData 调用优化

**问题描述**：
- `attendance.js` 的 `markStudent` 方法多次调用 setData
- 使用 setTimeout 分散调用
- 可能导致渲染性能问题

**当前代码**：

```javascript
// 第一次 setData
this.setData({
  [`students[${currentIndex}].status`]: status,
  presentOpacity: ...,
  absentOpacity: ...,
  cardBorderClass: ...
})

// 150ms 后第二次 setData
setTimeout(() => {
  this.setData({ cardStyle: ... })
}, 150)

// 450ms 后第三次 setData
setTimeout(() => {
  this.setData({ ... })  // 多个字段
}, 450)
```

**优化方案**：

使用 CSS 动画替代 JS 控制的动画状态：

```javascript
markStudent(status) {
  const { students, currentIndex, ... } = this.data
  if (currentIndex >= students.length) return

  const student = students[currentIndex]

  // 一次性设置所有状态
  this.setData({
    [`students[${currentIndex}].status`]: status,
    cardAnimationClass: status === 'present' ? 'swipe-right' : 'swipe-left'
  })

  // 动画结束后更新下一个
  setTimeout(() => {
    const nextIndex = currentIndex + 1
    this.setData({
      currentIndex: nextIndex,
      currentStudent: students[nextIndex] || null,
      remainingCount: students.length - nextIndex,
      presentCount: status === 'present' ? this.data.presentCount + 1 : this.data.presentCount,
      absentCount: status === 'absent' ? this.data.absentCount + 1 : this.data.absentCount,
      cardAnimationClass: ''  // 重置动画类
    })
  }, 400)
}
```

---

### 3.3 抽取动画逻辑为 Behavior

**问题描述**：
- `attendance.js` 中的卡片滑动动画逻辑复杂
- 与业务逻辑耦合
- 难以复用

**优化方案**：

创建 `cardSwipeBehavior.js`：

```javascript
// behaviors/cardSwipeBehavior.js
module.exports = Behavior({
  data: {
    cardStyle: '',
    cardAnimationClass: '',
    swipeDirection: ''
  },

  methods: {
    /**
     * 触发卡片滑动动画
     * @param {string} direction - 'left' | 'right'
     * @param {Function} onComplete - 动画完成回调
     */
    triggerCardSwipe(direction, onComplete) {
      const translateX = direction === 'right' ? 500 : -500
      const rotate = direction === 'right' ? 30 : -30

      this.setData({
        swipeDirection: direction,
        cardAnimationClass: `swipe-${direction}`
      })

      setTimeout(() => {
        this.setData({
          cardStyle: '',
          cardAnimationClass: '',
          swipeDirection: ''
        })
        if (onComplete) onComplete()
      }, 400)
    },

    /**
     * 重置卡片状态
     */
    resetCardState() {
      this.setData({
        cardStyle: '',
        cardAnimationClass: '',
        swipeDirection: ''
      })
    }
  }
})
```

---

### 3.4 常量抽取

**问题描述**：
- 代码中存在魔法数字
- 如动画时长 150、450，偏移量 500 等

**优化方案**：

创建前端常量文件：

```javascript
// utils/constants.js

// 动画相关
const ANIMATION = {
  CARD_SWIPE_DELAY: 150,      // 卡片滑动延迟
  CARD_SWIPE_DURATION: 400,   // 卡片滑动动画时长
  CARD_TRANSLATE_X: 500,      // 卡片滑动偏移量
  CARD_ROTATE_DEG: 30,        // 卡片旋转角度
  SKELETON_DELAY: 300         // 骨架屏延迟关闭时间
}

// 分页相关
const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100
}

// 缓存相关
const CACHE = {
  FILTER_OPTIONS_DURATION: 10 * 60 * 1000,  // 10分钟
  CONFIG_DURATION: 30 * 60 * 1000           // 30分钟
}

// 限频相关
const RATE_LIMIT = {
  TOAST_DURATION: 2000
}

module.exports = {
  ANIMATION,
  PAGINATION,
  CACHE,
  RATE_LIMIT
}
```

---

### 3.5 优化 getAbsenceWarnings 查询

**问题描述**：
- 当前先查询所有记录再内存过滤
- 数据量大时性能问题明显

**优化方案**：

1. **添加数据库索引**

在 `attendance_records` 集合添加复合索引：
- `date`（升序）+ `clubName`（升序）

2. **优化查询逻辑**

```javascript
async function handleGetAbsenceWarnings(event) {
  const { month, department, className, clubName } = event
  const _ = db.command

  const startDate = `${month}-01`
  const endDate = `${month}-31`

  // 构建更精确的查询条件
  let condition = {
    date: _.gte(startDate).and(_.lte(endDate))
  }

  if (clubName) {
    condition.clubName = clubName
  }

  // 如果指定学部，使用 departments 字段查询
  // 注意：需要确保 departments 字段数据格式统一
  if (department) {
    condition.departments = _.or(
      _.eq(department),           // 字符串格式
      _.elemMatch(_.eq(department)) // 数组格式
    )
  }

  // 使用聚合管道进行统计
  const result = await db.collection('attendance_records')
    .aggregate()
    .match(condition)
    .unwind('$records')
    .match({ 'records.status': 'absent' })
    .group({
      _id: '$records.studentId',
      studentName: $.first('$records.studentName'),
      className: $.first('$records.className'),
      clubName: $.first('$clubName'),
      count: $.sum(1),
      dates: $.push('$date')
    })
    .match({ count: _.gte(3) })
    .sort({ count: -1 })
    .end()

  return { success: true, data: result.list }
}
```

---

## 四、低优先级任务

### 4.1 统一 CommonJS/ES Module

**问题描述**：
- 部分文件使用 `require()`
- 部分文件使用 `import`
- 风格不统一

**优化方案**：

建议统一使用 CommonJS（`require`），因为：
1. 云函数只支持 CommonJS
2. 保持前后端一致性
3. 减少构建复杂度

对于 Vant 组件，继续使用 `import` 语法（小程序构建工具支持）。

---

### 4.2 补充文件头部注释

**问题描述**：
- 部分文件缺少标准三行注释

**优化方案**：

批量检查并补充：

```javascript
// input: {输入描述}
// output: {输出描述}
// pos: {架构位置描述}
```

需要补充的文件清单：
- [ ] `utils/storage.js`
- [ ] `utils/date.js`
- [ ] `utils/performance.js`
- [ ] `utils/offlineStorage.js`
- [ ] `components/empty-state/empty-state.js`
- [ ] `components/custom-tabbar/custom-tabbar.js`

---

### 4.3 添加 ESLint 规则

**问题描述**：
- 缺少统一的代码风格检查
- 可能存在潜在问题

**优化方案**：

更新 `.eslintrc.js`：

```javascript
module.exports = {
  root: true,
  env: {
    es6: true,
    node: true
  },
  globals: {
    wx: 'readonly',
    App: 'readonly',
    Page: 'readonly',
    Component: 'readonly',
    Behavior: 'readonly',
    getApp: 'readonly',
    getCurrentPages: 'readonly'
  },
  extends: ['eslint:recommended'],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module'
  },
  rules: {
    'no-console': 'off',
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'no-magic-numbers': ['warn', { ignore: [0, 1, -1, 100] }],
    'max-lines': ['warn', { max: 500, skipBlankLines: true, skipComments: true }],
    'max-lines-per-function': ['warn', { max: 100 }]
  }
}
```

---

### 4.4 完善错误上报

**问题描述**：
- `app.js` 中预留了错误上报位置
- 但未实际实现

**优化方案**：

```javascript
// app.js
onError(msg) {
  console.error('[全局错误]', msg)

  // 上报错误到云端
  this.reportError({
    type: 'script_error',
    message: msg,
    page: getCurrentPages().pop()?.route || 'unknown'
  })
},

onUnhandledRejection(res) {
  console.error('[未处理的Promise拒绝]', res.reason)

  this.reportError({
    type: 'unhandled_rejection',
    message: res.reason?.message || String(res.reason),
    page: getCurrentPages().pop()?.route || 'unknown'
  })
},

async reportError(errorInfo) {
  try {
    await wx.cloud.callFunction({
      name: 'notification',
      data: {
        action: 'reportError',
        error: {
          ...errorInfo,
          timestamp: Date.now(),
          systemInfo: wx.getSystemInfoSync()
        }
      }
    })
  } catch (e) {
    // 静默失败，避免循环上报
  }
}
```

---

## 五、实施计划

### 第一阶段：高优先级任务

| 序号 | 任务 | 预估工时 | 负责人 |
|------|------|----------|--------|
| 1 | 拆分 attendance 云函数 | 4h | - |
| 2 | 配置限频记录定时清理 | 1h | - |
| 3 | 抽取排课规则为配置 | 2h | - |
| 4 | 用户输入校验增强 | 2h | - |

### 第二阶段：中优先级任务

| 序号 | 任务 | 预估工时 | 负责人 |
|------|------|----------|--------|
| 1 | 统一使用 createDispatcher | 2h | - |
| 2 | 合并 setData 调用优化 | 1h | - |
| 3 | 抽取动画逻辑为 Behavior | 1h | - |
| 4 | 常量抽取 | 1h | - |
| 5 | 优化 getAbsenceWarnings 查询 | 2h | - |

### 第三阶段：低优先级任务

| 序号 | 任务 | 预估工时 | 负责人 |
|------|------|----------|--------|
| 1 | 统一 CommonJS/ES Module | 1h | - |
| 2 | 补充文件头部注释 | 1h | - |
| 3 | 添加 ESLint 规则 | 1h | - |
| 4 | 完善错误上报 | 1h | - |

---

## 六、验收标准

### 6.1 代码质量

- [ ] 所有云函数文件不超过 300 行
- [ ] 所有页面 JS 文件不超过 500 行
- [ ] ESLint 检查无错误
- [ ] 所有文件有标准头部注释

### 6.2 功能验证

- [ ] 所有 API 接口正常工作
- [ ] 限频记录定时清理正常执行
- [ ] 排课配置可通过数据库修改
- [ ] 输入校验拦截非法请求

### 6.3 性能指标

- [ ] 页面首屏加载时间 < 2s
- [ ] setData 单次数据量 < 100KB
- [ ] 云函数平均响应时间 < 500ms

### 6.4 安全检查

- [ ] 所有敏感操作有权限验证
- [ ] 所有用户输入有校验
- [ ] 无明文密钥或敏感信息

---

## 附录

### A. 相关文档

- [DATABASE_SCHEMA.md](../DATABASE_SCHEMA.md) - 数据库架构
- [DATABASE_INDEX.md](../DATABASE_INDEX.md) - 数据库索引
- [CARD_STYLE_GUIDE.md](../CARD_STYLE_GUIDE.md) - 卡片样式指南

### B. 审查报告原文

本优化方案基于 2026-01-04 的全面代码审查报告生成，审查覆盖：
- 项目架构设计
- 云函数代码质量
- 前端页面代码质量
- 工具函数与公共模块
- 安全性与性能

### C. 更新记录

| 日期 | 版本 | 更新内容 |
|------|------|----------|
| 2026-01-04 | v1.0 | 初始版本 |
