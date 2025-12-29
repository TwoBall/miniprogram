
# 微信小程序优化实施工作计划

> **文档版本**：v1.2
> **创建日期**：2024年12月
> **最后更新**：2024年12月28日（阶段1、阶段2、阶段3已完成）
> **关联文档**：[miniprogram-audit-report.md](./miniprogram-audit-report.md)  
> **项目名称**：智慧社团管理系统（我来点名啦）

---

## 一、执行摘要

### 1.1 项目背景
基于小程序审查报告的发现，制定本分阶段实施计划，系统性地解决安全、性能、代码质量和用户体验等方面的问题。

### 1.2 问题统计

| 类别 | 高优先级 | 中优先级 | 低优先级 | 已解决 | 合计 |
|------|---------|---------|---------|--------|------|
| 安全类 (S) | 2 | 2 | 1 | 0 | 5 |
| 性能类 (P) | 2 | 1 | 3 | 0 | 6 |
| 代码规范类 (C) | 0 | 0 | 3 | 1 | 4 |
| 用户体验类 (U) | 0 | 1 | 2 | 0 | 3 |
| **合计** | **4** | **4** | **9** | **1** | **18** |

### 1.3 实施策略概览

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           实施阶段时间线                                      │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  第1周          第2周          第3周          第4周          持续改进        │
│  ├─────────────┼─────────────┼─────────────┼─────────────┼─────────────►    │
│  │             │             │             │             │                  │
│  │ ████████    │             │             │             │                  │
│  │ 阶段1:紧急  │             │             │             │                  │
│  │ 安全修复    │             │             │             │                  │
│  │             │             │             │             │                  │
│  │             │ ████████████│             │             │                  │
│  │             │ 阶段2:核心  │             │             │                  │
│  │             │ 性能优化    │             │             │                  │
│  │             │             │             │             │                  │
│  │             │             │ ████████████│             │                  │
│  │             │             │ 阶段3:增强  │             │                  │
│  │             │             │ 改进        │             │                  │
│  │             │             │             │             │                  │
│  │             │             │             │ ████████████│ ████████████►    │
│  │             │             │             │ 阶段4:长期  │ 持续监控        │
│  │             │             │             │ 演进        │ 迭代优化        │
│  │             │             │             │             │                  │
└──────────────────────────────────────────────────────────────────────────────┘

图例: ████ 执行期    ──► 持续进行
```

---

## 二、阶段详细计划

### 阶段1：紧急安全修复（第1周）

#### 2.1.1 阶段目标
- 消除高优先级安全风险
- 建立基础安全防护机制
- 确保核心业务接口安全

#### 2.1.2 任务清单

| 任务ID | 问题编号 | 任务描述 | 优先级 | 预估工时 | 依赖 | 状态 |
|--------|----------|----------|--------|----------|------|------|
| T1.1 | S1 | 云函数频率限制配置 | 🟠 中 | 4h | 无 | 📋 待评估 |
| T1.2 | S4 | 云函数安全规则配置 | 🔴 高 | 3h | 无 | ✅ 已完成 |
| T1.3 | S5 | 数据库安全规则审查与配置 | 🟢 低 | 4h | 无 | 📋 待优化 |
| T1.4 | P1 | app.js 同步 API 改异步 | 🔴 高 | 2h | 无 | ✅ 已完成 |

> **注意**：
> - T1.1 限频功能说明：
>   - **腾讯云 CloudBase**：在 [云开发平台](https://tcb.cloud.tencent.com/dev)【环境配置】→【安全管控】中配置
>   - **微信小程序云开发**：原生云开发暂无控制台限频配置，可通过代码层实现（见下方替代方案）
> - T1.2 已配置安全规则：`{"*": {"invoke": "auth != null"}}`，确保只有登录用户可调用云函数
> - T1.3 因所有数据库操作均通过云函数进行（已有权限验证），优先级调整为低，标记为待优化

#### T1.1 替代方案：代码层限频实现

如果控制台不支持限频配置，可在云函数代码层实现简单的频率限制：

```javascript
// cloudfunctions/common/rate-limit.js
const db = cloud.database()
const _ = db.command

/**
 * 简单频率限制检查
 * @param {string} openid - 用户标识
 * @param {string} action - 操作类型
 * @param {number} maxCalls - 时间窗口内最大调用次数
 * @param {number} windowMs - 时间窗口（毫秒）
 */
async function checkRateLimit(openid, action, maxCalls = 10, windowMs = 60000) {
  const key = `${openid}_${action}`
  const now = Date.now()
  const windowStart = now - windowMs
  
  try {
    // 查询时间窗口内的调用记录
    const res = await db.collection('rate_limits')
      .where({
        key,
        timestamp: _.gte(windowStart)
      })
      .count()
    
    if (res.total >= maxCalls) {
      return { allowed: false, message: '操作过于频繁，请稍后再试' }
    }
    
    // 记录本次调用
    await db.collection('rate_limits').add({
      data: {
        key,
        timestamp: now,
        _createTime: db.serverDate()
      }
    })
    
    return { allowed: true }
  } catch (error) {
    console.error('限频检查失败:', error)
    return { allowed: true } // 失败时放行，避免阻塞正常业务
  }
}

module.exports = { checkRateLimit }
```

**优先级调整为中**：当前已有安全规则保护，限频可作为增强安全措施后续实现。

#### 2.1.3 任务详情

##### T1.1 云函数频率限制配置
**关联问题**：[S1 - 云函数未限制敏感操作频率](./miniprogram-audit-report.md#问题-s1云函数未限制敏感操作频率)

**实施步骤**：
1. 登录云开发控制台
2. 进入「云函数」→「user」→「限频配置」
3. 配置资源维度限频：150 QPS
4. 配置客户端维度限频：UserID，10 QPS
5. 对 `attendance`、`students`、`transfer` 重复配置

**配置参数**：
| 云函数 | 资源限频 | 客户端限频 | 标识方式 |
|--------|---------|-----------|---------|
| user | 150 QPS | 10 QPS | UserID |
| attendance | 200 QPS | 20 QPS | UserID |
| students | 100 QPS | 10 QPS | UserID |
| transfer | 50 QPS | 5 QPS | UserID |

**验收标准**：
- [ ] 所有云函数已配置限频规则
- [ ] 模拟高频调用测试，验证限频生效
- [ ] 监控告警已配置

---

##### T1.2 云函数安全规则配置
**关联问题**：[S4 - 云函数安全规则未配置](./miniprogram-audit-report.md#问题-s4新增云函数安全规则未配置)

**实施步骤**：
1. 进入云开发控制台 → 云函数 → 权限控制
2. 编写安全规则 JSON
3. 保存并等待 1-3 分钟生效

**安全规则配置**：
```json
{
  "*": {
    "invoke": "auth.uid != null"
  },
  "user": {
    "invoke": true
  },
  "submitFeedback": {
    "invoke": "auth.uid != null"
  }
}
```

**验收标准**：
- [ ] 未登录用户无法调用受保护云函数
- [ ] user 函数登录流程正常
- [ ] 所有业务功能正常可用

---

##### T1.3 数据库安全规则审查
**关联问题**：[S5 - 数据库安全规则审查](./miniprogram-audit-report.md#问题-s5新增数据库安全规则审查)

**实施步骤**：
1. 审查各集合当前权限配置
2. 根据业务需求调整权限

**配置方案**：
| 集合名 | 当前权限 | 目标权限 | 规则配置 |
|-------|---------|---------|---------|
| users | - | CUSTOM | `{"read": "auth.uid == doc._openid", "write": "auth.uid == doc._openid"}` |
| attendance_records | - | CUSTOM | `{"read": true, "write": false}` |
| clubs | - | READONLY | 默认配置 |
| students | - | CUSTOM | `{"read": true, "write": false}` |
| transfer_requests | - | CUSTOM | `{"read": "auth.uid == doc._openid", "write": "auth.uid == doc._openid"}` |

**验收标准**：
- [ ] 各集合权限已正确配置
- [ ] 用户只能访问自己的数据
- [ ] 云函数操作不受影响

---

##### T1.4 app.js 同步 API 优化
**关联问题**：[P1 - app.js 启动时同步调用 Storage API](./miniprogram-audit-report.md#问题-p1appjs-启动时同步调用-storage-api)

**代码修改**：
```javascript
// 修改前 (app.js:59-64)
checkUserAuth() {
  const userInfo = wx.getStorageSync('userInfo')
  if (userInfo) {
    this.globalData.userInfo = userInfo
  }
}

// 修改后
async checkUserAuth() {
  try {
    const res = await wx.getStorage({ key: 'userInfo' })
    this.globalData.userInfo = res.data
  } catch (e) {
    // 无缓存，忽略
  }
}
```

**验收标准**：
- [ ] 代码已修改为异步 API
- [ ] 登录流程正常
- [ ] 启动耗时无明显阻塞

---

#### 2.1.4 阶段里程碑

| 里程碑 | 完成标准 | 目标日期 |
|--------|---------|---------|
| M1.1 | 所有云函数限频配置完成 | Day 2 |
| M1.2 | 云函数安全规则生效 | Day 3 |
| M1.3 | 数据库安全规则配置完成 | Day 4 |
| M1.4 | P1 问题修复并验证 | Day 5 |
| **M1** | **阶段1完成** | **Week 1 End** |

---

### 阶段2：核心性能优化（第2周）

#### 2.2.1 阶段目标
- 解决关键性能瓶颈
- 优化启动速度和交互流畅度
- 建立性能监控基线

#### 2.2.2 任务清单

| 任务ID | 问题编号 | 任务描述 | 优先级 | 预估工时 | 依赖 | 状态 |
|--------|----------|----------|--------|----------|------|------|
| T2.1 | P3 | setData 优化（WXS方案） | 🔴 高 | 8h | 无 | ✅ 已完成 |
| T2.2 | P2 | 初始渲染缓存配置 | 🟠 中 | 2h | 无 | ✅ 已完成 |
| T2.3 | U1 | 分包预下载策略优化 | 🟠 中 | 1h | 无 | ✅ 已完成 |
| T2.4 | S2 | 状态机验证实现 | 🟢 低 | 3h | 无 | ✅ 已完成 |

> **阶段2实施完成说明**（2024-12-28）：
> - T2.1：创建 `pages/teacher/attendance/swipe.wxs`，在视图层直接处理触摸事件
> - T2.2：为 login、register、attendance、dashboard 页面配置初始渲染缓存
> - T2.3：在注册页配置 WiFi 环境下预下载所有角色分包
> - T2.4：为 transfer 云函数添加状态机验证，定义 `TRANSFER_STATUS` 和 `STATE_TRANSITIONS`

#### 2.2.3 任务详情

##### T2.1 setData 优化（WXS方案）
**关联问题**：[P3 - attendance.js 触摸事件 setData 频率过高](./miniprogram-audit-report.md#问题-p3attendancejs-触摸事件-setdata-频率过高)

**实施方案**：采用 WXS 响应事件

**新增文件**：`pages/teacher/attendance/attendance.wxs`
```javascript
var startX = 0
var startY = 0

function handleTouchStart(event, ownerInstance) {
  var touch = event.touches[0]
  startX = touch.clientX
  startY = touch.clientY
  ownerInstance.callMethod('onWxsTouchStart', { startX: startX, startY: startY })
}

function handleTouchMove(event, ownerInstance) {
  var touch = event.touches[0]
  var moveX = touch.clientX - startX
  var moveY = touch.clientY - startY
  
  // 判断是否为水平滑动
  if (Math.abs(moveX) < Math.abs(moveY)) return
  
  var instance = ownerInstance.selectComponent('.swipe-card')
  if (instance) {
    var rotation = moveX * 0.05
    instance.setStyle({
      'transform': 'translateX(' + moveX + 'px) rotate(' + rotation + 'deg)',
      'transition': 'none'
    })
    
    // 更新透明度
    var presentOpacity = Math.max(0, Math.min(moveX / 100, 1))
    var absentOpacity = Math.max(0, Math.min(-moveX / 100, 1))
    
    var presentHint = ownerInstance.selectComponent('.present-hint')
    var absentHint = ownerInstance.selectComponent('.absent-hint')
    
    if (presentHint) presentHint.setStyle({ 'opacity': presentOpacity })
    if (absentHint) absentHint.setStyle({ 'opacity': absentOpacity })
  }
}

function handleTouchEnd(event, ownerInstance) {
  ownerInstance.callMethod('onWxsTouchEnd', {
    endX: event.changedTouches[0].clientX,
    startX: startX
  })
}

module.exports = {
  handleTouchStart: handleTouchStart,
  handleTouchMove: handleTouchMove,
  handleTouchEnd: handleTouchEnd
}
```

**修改文件**：`pages/teacher/attendance/attendance.wxml`
```xml
<wxs module="swipeHandler" src="./attendance.wxs"></wxs>

<view class="swipe-card"
      bindtouchstart="{{swipeHandler.handleTouchStart}}"
      bindtouchmove="{{swipeHandler.handleTouchMove}}"
      bindtouchend="{{swipeHandler.handleTouchEnd}}">
  <!-- 卡片内容 -->
</view>
```

**验收标准**：
- [ ] 滑动交互流畅，无卡顿
- [ ] 控制台无高频 setData 警告
- [ ] 60fps 帧率稳定

---

##### T2.2 初始渲染缓存配置
**关联问题**：[P2 - 未启用初始渲染缓存](./miniprogram-audit-report.md#问题-p2未启用初始渲染缓存)

**配置文件修改**：

`pages/login/login.json`：
```json
{
  "usingComponents": {},
  "initialRenderingCache": "static"
}
```

`pages/teacher/attendance/attendance.json`：
```json
{
  "usingComponents": {},
  "initialRenderingCache": "dynamic"
}
```

**配置清单**：
| 页面 | 缓存类型 | 理由 |
|------|---------|------|
| login | static | 静态登录界面 |
| register | static | 静态注册界面 |
| attendance | dynamic | 动态数据页面 |
| dashboard | dynamic | 动态统计页面 |
| students | dynamic | 动态列表页面 |

**验收标准**：
- [ ] 非首次启动时页面秒开
- [ ] 渲染缓存正确应用
- [ ] 动态数据正确更新

---

##### T2.3 分包预下载优化
**关联问题**：[U1 - 分包预下载策略可优化](./miniprogram-audit-report.md#问题-u1分包预下载策略可优化)

**修改文件**：`app.json`
```json
{
  "preloadRule": {
    "pages/login/login": {
      "network": "all",
      "packages": ["common"]
    },
    "pages/register/register": {
      "network": "wifi",
      "packages": ["teacher", "classTeacher", "leader", "admin"]
    }
  }
}
```

**验收标准**：
- [ ] 登录后页面跳转无明显等待
- [ ] 预下载大小未超过 2MB
- [ ] WiFi 下预下载更多分包

---

##### T2.4 状态机验证实现
**关联问题**：[S2 - transfer_requests 缺少状态机验证](./miniprogram-audit-report.md#问题-s2transfer_requests-缺少状态机验证)

**修改文件**：`cloudfunctions/transfer/index.js`

```javascript
// 新增状态机验证
const STATE_MACHINE = {
  'pending': ['approved_by_teacher', 'rejected'],
  'approved_by_teacher': ['approved', 'rejected'],
  'rejected': [], // 终态
  'approved': []  // 终态
}

function canTransition(currentStatus, newStatus) {
  const validNextStates = STATE_MACHINE[currentStatus]
  if (!validNextStates) {
    console.error(`未知状态: ${currentStatus}`)
    return false
  }
  return validNextStates.includes(newStatus)
}

// 在审批处理函数中使用
async function handleApproveTransfer(event, db, wxContext) {
  const { requestId, newStatus } = event
  
  // 获取当前状态
  const request = await db.collection('transfer_requests').doc(requestId).get()
  const currentStatus = request.data.status
  
  // 验证状态流转
  if (!canTransition(currentStatus, newStatus)) {
    return fail(`无效的状态流转: ${currentStatus} -> ${newStatus}`)
  }
  
  // 执行状态更新
  // ...
}
```

**验收标准**：
- [ ] 状态只能按规定流程流转
- [ ] 非法状态流转被拒绝
- [ ] 日志记录状态变更

---

#### 2.2.4 阶段里程碑

| 里程碑 | 完成标准 | 目标日期 |
|--------|---------|---------|
| M2.1 | WXS 滑动优化完成 | Day 3 |
| M2.2 | 渲染缓存配置完成 | Day 4 |
| M2.3 | 分包预下载优化完成 | Day 4 |
| M2.4 | 状态机验证上线 | Day 5 |
| **M2** | **阶段2完成** | **Week 2 End** |

---

### 阶段3：增强改进（第3周）

#### 2.3.1 阶段目标
- 提升代码质量和可维护性
- 优化用户体验细节
- 完善错误处理和监控

#### 2.3.2 任务清单

| 任务ID | 问题编号 | 任务描述 | 优先级 | 预估工时 | 依赖 |
|--------|----------|----------|--------|----------|------|
| T3.1 | C1 | 优化登录延迟跳转 | 🟢 低 | 1h | 无 |
| T3.2 | C2 | 添加骨架屏组件 | 🟢 低 | 4h | 无 |
| T3.3 | U2 | 网络错误重试机制 | 🟢 低 | 3h | 无 |
| T3.4 | P5 | 用时注入配置 | 🟢 低 | 1h | 无 |
| T3.5 | S3 | 代码加固配置 | 🟢 低 | 2h | 无 |

#### 2.3.3 任务详情

##### T3.1 登录延迟跳转优化
**关联问题**：[C1 - login.js 中 setTimeout 延迟跳转](./miniprogram-audit-report.md#问题-c1loginjs-中-settimeout-延迟跳转)

**修改文件**：`pages/login/login.js`
```javascript
// 修改前
setTimeout(() => {
  wx.redirectTo({ url: `/pages/register/register?openid=${result.openid}` })
}, 2000)

// 修改后
import Toast from '@vant/weapp/toast/toast'

Toast({
  message: '未找到账号，即将跳转注册页面',
  duration: 1500,
  onClose: () => {
    wx.redirectTo({ url: `/pages/register/register?openid=${result.openid}` })
  }
})
```

---

##### T3.2 骨架屏组件添加
**关联问题**：[C2 - 部分页面缺少骨架屏](./miniprogram-audit-report.md#问题-c2部分页面缺少骨架屏)

**需要添加骨架屏的页面**：
- `pages/leader/dashboard/dashboard`
- `pages/classTeacher/overview/overview`
- `pages/admin/data/data`

**实现方式**：使用开发者工具自动生成骨架屏

**步骤**：
1. 在开发者工具中打开目标页面
2. 点击「生成骨架屏」
3. 调整生成的骨架屏样式
4. 在页面中集成骨架屏组件

---

##### T3.3 网络错误重试机制
**关联问题**：[U2 - 网络错误提示不够友好](./miniprogram-audit-report.md#问题-u2网络错误提示不够友好)

**修改文件**：`utils/request.js`
```javascript
const MAX_RETRIES = 3
const RETRY_DELAY = 1000

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function requestWithRetry(options, retries = 0) {
  try {
    return await request(options)
  } catch (error) {
    if (retries < MAX_RETRIES && isRetryableError(error)) {
      console.log(`请求失败，${RETRY_DELAY * (retries + 1)}ms 后重试...`)
      await sleep(RETRY_DELAY * (retries + 1))
      return requestWithRetry(options, retries + 1)
    }
    
    // 显示友好的错误提示
    wx.showModal({
      title: '网络异常',
      content: '请检查网络连接后重试',
      confirmText: '重试',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          return requestWithRetry(options, 0)
        }
      }
    })
    
    throw error
  }
}

function isRetryableError(error) {
  return error.message.includes('网络') || 
         error.message.includes('timeout') ||
         error.errMsg?.includes('request:fail')
}

module.exports = { request, requestWithRetry }
```

---

##### T3.4 用时注入配置
**关联问题**：[P5 - 未使用用时注入优化](./miniprogram-audit-report.md#问题-p5新增未使用用时注入优化)

**修改文件**：`app.json`
```json
{
  "lazyCodeLoading": "requiredComponents",
  "componentPlaceholder": {
    "skeleton": "view",
    "van-toast": "view",
    "van-dialog": "view"
  }
}
```

---

##### T3.5 代码加固配置
**关联问题**：[S3 - 建议启用代码加固](./miniprogram-audit-report.md#问题-s3新增建议启用代码加固)

**实施步骤**：
1. 微信开发者工具 → 工具 → 插件 → 编辑器扩展
2. 搜索「代码加固」并安装
3. 创建加固配置文件 `.codeobfuscation.json`
4. 配置需要加固的文件路径

**配置文件**：`.codeobfuscation.json`
```json
{
  "include": [
    "utils/crypto.js",
    "utils/auth.js"
  ],
  "exclude": [
    "node_modules/**"
  ],
  "options": {
    "stringEncryption": true,
    "propertyEncryption": true,
    "callTransform": true
  }
}
```

---

#### 2.3.4 阶段里程碑

| 里程碑 | 完成标准 | 目标日期 |
|--------|---------|---------|
| M3.1 | 登录体验优化完成 | Day 1 |
| M3.2 | 骨架屏集成完成 | Day 3 |
| M3.3 | 网络重试机制上线 | Day 4 |
| M3.4 | 用时注入和代码加固配置完成 | Day 5 |
| **M3** | **阶段3完成** | **Week 3 End** |

---

### 阶段4：长期演进（第4周及持续）

#### 2.4.1 阶段目标
- 建立持续监控和优化机制
- 完善文档和知识沉淀
- 规划未来架构演进

#### 2.4.2 任务清单

| 任务ID | 问题编号 | 任务描述 | 优先级 | 预估工时 | 依赖 |
|--------|----------|----------|--------|----------|------|
| T4.1 | P4 | 云函数拆分评估 | 🟢 低 | 8h | M2 |
| T4.2 | P6 | 数据预拉取配置 | 🟢 低 | 4h | 无 |
| T4.3 | C3 | WXML 节点数量优化 | 🟢 低 | 4h | 无 |
| T4.4 | U3 | IntersectionObserver 优化 | 🟢 低 | 4h | 无 |
| T4.5 | - | 性能监控体系建立 | 🟠 中 | 8h | M2 |
| T4.6 | - | 离线支持能力评估 | 🟢 低 | 8h | 无 |

#### 2.4.3 持续改进措施

##### 性能监控体系
```javascript
// utils/performance.js
const performanceMonitor = {
  // 启动性能上报
  reportStartup() {
    const performance = wx.getPerformance()
    const observer = performance.createObserver((entryList) => {
      const entries = entryList.getEntries()
      entries.forEach(entry => {
        wx.reportPerformance(1001, entry.duration, [entry.name])
      })
    })
    observer.observe({ entryTypes: ['navigation', 'render'] })
  },
  
  // setData 性能监控
  wrapSetData(component) {
    const originalSetData = component.setData
    component.setData = function(data, callback) {
      const start = Date.now()
      originalSetData.call(this, data, () => {
        const duration = Date.now() - start
        if (duration > 50) {
          console.warn(`setData 耗时过长: ${duration}ms`, data)
          wx.reportPerformance(1002, duration)
        }
        callback && callback()
      })
    }
  }
}
```

##### 定期审计计划
| 审计项 | 频率 | 负责人 | 工具 |
|-------|------|--------|------|
| 启动性能 | 每周 | 开发者 | 性能诊断工具 |
| 代码包大小 | 每次发版 | 开发者 | 代码依赖分析 |
| 安全规则 | 每月 | 安全负责人 | 控制台审查 |
| 云函数日志 | 每日 | 运维 | 日志监控 |

---

#### 2.4.4 阶段里程碑

| 里程碑 | 完成标准 | 目标日期 |
|--------|---------|---------|
| M4.1 | 云函数拆分方案确定 | Day 3 |
| M4.2 | 性能监控体系上线 | Day 5 |
| M4.3 | 优化效果评估报告 | Week 4 End |
| **M4** | **阶段4完成** | **Week 4 End** |

---

## 三、时间线甘特图

```
任务编号  │ Week 1      │ Week 2      │ Week 3      │ Week 4      │ 持续
──────────┼─────────────┼─────────────┼─────────────┼─────────────┼──────
          │ D1 D2 D3 D4 D5 D1 D2 D3 D4 D5 D1 D2 D3 D4 D5 D1 D2 D3 D4 D5

【阶段1：紧急安全修复】
T1.1 S1   │ ████████    │             │             │             │
T1.2 S4   │    ████     │             │             │             │
T1.3 S5   │       █████ │             │             │             │
T1.4 P1   │          ██ │             │             │             │
          │     ◆ M1.1  │             │             │             │
          │        ◆ M1.2             │             │             │
          │           ◆ M1.3          │             │             │
          │              ◆ M1         │             │             │
          │             │             │             │             │
【阶段2：核心性能优化】
T2.1 P3   │             │ ████████████│             │             │
T2.2 P2   │             │       ████  │             │             │
T2.3 U1   │             │       ██    │             │             │
T2.4 S2   │             │         ████│             │             │
          │             │    ◆ M2.1   │             │             │
          │             │        ◆ M2.2             │             │
          │             │          ◆ M2.3           │             │
          │             │             ◆ M2          │             │
          │             │             │             │             │
【阶段3：增强改进】
T3.1 C1   │             │             │ ██          │             │
T3.2 C2   │             │             │ ████████    │             │
T3.3 U2   │             │             │     ██████  │             │
T3.4 P5   │             │             │         ██  │             │
T3.5 S3   │             │             │         ████│             │
          │             │             │   ◆ M3.1    │             │
          │             │             │       ◆ M3.2│             │
          │             │             │          ◆ M3.3           │
          │             │             │             ◆ M3          │
          │             │             │             │             │
【阶段4：长期演进】
T4.1 P4   │             │             │             │ ████████    │
T4.2 P6   │             │             │             │ ████        │
T4.3 C3   │             │             │             │     ████    │
T4.4 U3   │             │             │             │     ████    │
T4.5 监控  │             │             │             │ ████████████│ ██████████
T4.6 离线  │             │             │             │         ████│
          │             │             │             │    ◆ M4.1   │
          │             │             │             │          ◆ M4.2
          │             │             │             │             ◆ M4

图例:
████ = 任务执行期
◆    = 里程碑节点
```

---

## 四、风险评估与回滚预案

### 4.1 风险矩阵

| 风险ID | 风险描述 | 可能性 | 影响 | 风险等级 | 缓解措施 |
|--------|---------|--------|------|---------|---------|
| R1 | 云函数安全规则配置错误导致业务中断 | 中 | 高 | 🔴 高 | 先在测试环境验证，保留回滚配置 |
| R2 | setData 优化引入新 bug | 中 | 中 | 🟠 中 | 充分测试，保留原代码备份 |
| R3 | 分包预下载超过 2MB 限制 | 低 | 低 | 🟢 低 | 预先计算分包大小 |
| R4 | 数据库安全规则影响现有功能 | 中 | 高 | 🔴 高 | 分集合逐步配置，充分测试 |
| R5 | 性能优化效果不明显 | 中 | 中 | 🟠 中 | 建立基线，量化对比 |
| R6 | 代码加固影响调试 | 低 | 低 | 🟢 低 | 仅在发布版本启用 |

### 4.2 回滚预案

#### 4.2.1 云函数安全规则回滚
```json
// 回滚配置：允许所有调用
{
  "*": {
    "invoke": true
  }
}
```

**回滚步骤**：
1. 登录云开发控制台
2. 进入「云函数」→「权限控制」
3. 粘贴回滚配置
4. 等待 1-3 分钟生效
5. 验证业务功能恢复

#### 4.2.2 数据库安全规则回滚
```json
// 回滚配置：恢复默认权限
{
  "read": true,
  "write": true
}
```

#### 4.2.3 代码变更回滚

**Git 分支策略**：
```
main (生产)
  │
  ├── release/v1.x (发布分支)
  │
  └── feature/optimization (优化分支)
        │
        ├── feature/security-fix (阶段1)
        ├── feature/performance-opt (阶段2)
        ├── feature/ux-enhancement (阶段3)
        └── feature/long-term (阶段4)
```

**回滚命令**：
```bash
# 回滚到上一个稳定版本
git revert HEAD

# 回滚特定提交
git revert <commit-hash>

# 紧急回滚到指定标签
git checkout tags/v1.0-stable
```

### 4.3 应急联系人

| 角色 | 职责 | 联系方式 |
|------|------|---------|
| 项目负责人 | 决策审批 | - |
| 开发负责人 | 技术实施 | - |
| 运维负责人 | 环境管理 | - |

---

## 五、验收检查清单

### 5.1 阶段1验收

| 检查项 | 验收标准 | 通过 |
|--------|---------|------|
| 云函数限频 | 所有核心云函数已配置限频 | ☐ |
| 安全规则 | 云函数安全规则生效，未登录用户受限 | ☐ |
| 数据库权限 | 各集合权限正确配置 | ☐ |
| 同步 API | app.js 已改用异步 API | ☐ |
| 功能测试 | 所有核心功能正常 | ☐ |

### 5.2 阶段2验收

| 检查项 | 验收标准 | 通过 |
|--------|---------|------|
| WXS 优化 | 滑动交互 60fps 无卡顿 | ☐ |
| 渲染缓存 | 非首次启动页面秒开 | ☐ |
| 分包预下载 | 登录后跳转无等待 | ☐ |
| 状态机 | 非法状态流转被拒绝 | ☐ |

### 5.3 阶段3验收

| 检查项 | 验收标准 | 通过 |
|--------|---------|------|
| 登录体验 | 跳转延迟 ≤1.5s | ☐ |
| 骨架屏 | 数据加载时显示骨架屏 | ☐ |
| 网络重试 | 网络异常自动重试 | ☐ |
| 用时注入 | 配置生效，无报错 | ☐ |
| 代码加固 | 发布包已加固 | ☐ |

### 5.4 阶段4验收

| 检查项 | 验收标准 | 通过 |
|--------|---------|------|
| 性能监控 | 监控数据正常上报 | ☐ |
| 云函数拆分 | 方案已评估确定 | ☐ |
| 优化报告 | 前后性能对比数据 | ☐ |

---

## 六、效果评估指标

### 6.1 性能指标

| 指标 | 当前值 | 目标值 | 测量方法 |
|------|--------|--------|---------|
| 冷启动时间 (安卓) | TBD | ≤3.0s | 性能诊断工具 |
| 冷启动时间 (iOS) | TBD | ≤1.2s | 性能诊断工具 |
| setData 频率 | TBD | ≤20次/s | 控制台监控 |
| 首屏渲染时间 | TBD | ≤2.0s | Performance API |

### 6.2 安全指标

| 指标 | 当前值 | 目标值 | 测量方法 |
|------|--------|--------|---------|
| 云函数限频覆盖率 | 0% | 100% | 控制台检查 |
| 安全规则覆盖率 | 0% | 100% | 控制台检查 |
| 非法调用拦截率 | N/A | 100% | 日志分析 |

### 6.3 用户体验指标

| 指标 | 当前值 | 目标值 | 测量方法 |
|------|--------|--------|---------|
| 页面跳转等待时间 | TBD | ≤0.5s | 用户测试 |
| 滑动卡顿率 | TBD | 0% | 用户反馈 |
| 骨架屏覆盖率 | 部分 | 100% | 代码检查 |

---

## 七、附录

### 7.1 相关文档

- [微信小程序项目审查报告](./miniprogram-audit-report.md)
- [云函数公共模块设计](./cloudfunctions-common-module-design.md)
- [数据库索引文档](../DATABASE_INDEX.md)
- [数据库 Schema 文档](../DATABASE_SCHEMA.md)

### 7.2 参考资料

- [微信小程序性能优化指南](https://developers.weixin.qq.com/miniprogram/dev/framework/performance/tips/start.html)
- [云开发最佳实践](https://docs.cloudbase.net/)
- [限频设置指南][def]

### 7.3 版本历史

| 版本 | 日期 | 修改内容 | 作者 |
|------|------|---------|------|
| v1.0 | 2024-12 | 初始版本 | AI Assistant |

---

**文档结束**

[def]: https://docs.cloudbase.net/envconfig/ratelimit/intro