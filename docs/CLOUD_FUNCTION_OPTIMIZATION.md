# 云函数调用优化方案

## 一、现状分析

### 1.1 当前云函数调用统计

| 云函数 | 调用位置 | 调用次数 |
|--------|----------|----------|
| `user` | login.js, register.js, approval.js, switchRole.js | 9 次 |
| `students` | register.js, attendance.js | 2 次 |
| `attendance` | attendance.js, history.js, detail.js, overview.js, dashboard.js, leader/detail.js | 8 次 |
| `submitFeedback` | feedback.js | 1 次 |

**总计**: 约 20+ 处直接调用 `wx.cloud.callFunction()`

### 1.2 已实现的优化措施

| 页面 | 缓存策略 | 缓存时效 |
|------|----------|----------|
| dashboard.js (学部仪表盘) | 按学部+日期缓存 | 5 分钟 |
| overview.js (班主任概览) | 按班级+日期缓存 | 5 分钟 |
| attendance.js (社团老师点名) | 学生列表缓存 | 10 分钟 |

### 1.3 未使用的工具模块

`utils/request.js` 封装了完整的云函数调用能力：
- 自动重试机制（最多 2 次）
- 超时控制（默认 15 秒）
- 统一错误处理
- 网络状态检测

**状态**: ✅ 已全部替换为使用此封装。

---

## 二、优化策略

### 2.1 本地缓存策略（已部分实现）

**原则**: 对于变化不频繁的数据，优先使用本地缓存。

| 数据类型 | 建议缓存时效 | 说明 |
|----------|--------------|------|
| 学生列表 | 10-30 分钟 | 学生信息变更频率低 |
| 当日考勤数据 | 5 分钟 | 需要较新数据但可接受短延迟 |
| 历史考勤记录 | 30 分钟 | 历史数据不会变化 |
| 用户角色信息 | 登录期间 | 仅登录时获取一次 |

**实现方式**: 使用 `utils/storage.js` 的 `getWithCache`/`setWithCache`

```javascript
// 示例：带缓存的数据加载
const cacheKey = `${storage.STORAGE_KEYS.ATTENDANCE_DATA}_${date}`
const cacheTimeKey = `${storage.STORAGE_KEYS.ATTENDANCE_DATA_TIME}_${date}`

// 先尝试读取缓存
const cached = storage.getWithCache(cacheKey, cacheTimeKey, storage.CACHE_DURATION.FIVE_MINUTES)
if (cached && !forceRefresh) {
  return cached // 使用缓存
}

// 缓存失效或强制刷新时调用云函数
const result = await wx.cloud.callFunction({ ... })
storage.setWithCache(cacheKey, cacheTimeKey, result.data) // 更新缓存
```

### 2.2 onShow 防抖策略（已实现）

**问题**: 每次进入页面都调用云函数会造成浪费。

**解决方案**: 在 `onShow` 中增加时间间隔判断。

```javascript
// 已在 attendance.js 中实现
onShow() {
  // 如果距离上次加载超过30秒才刷新
  const now = Date.now()
  if (!this.lastLoadTime || (now - this.lastLoadTime > 30000)) {
    this.loadData()
  }
  this.lastLoadTime = now
}
```

**建议扩展到**: dashboard.js, overview.js, approval.js

### 2.3 数据预加载

**场景**: 从列表页进入详情页时，可传递已有数据避免重复请求。

**示例**:
```javascript
// 列表页 - 传递已有数据
viewDetail(e) {
  const record = e.currentTarget.dataset.record
  // 将数据序列化后通过 URL 传递或存入临时缓存
  wx.setStorageSync('temp_detail_data', record)
  wx.navigateTo({ url: `/pages/detail/detail?id=${record._id}` })
}

// 详情页 - 优先使用传递的数据
onLoad(options) {
  const cached = wx.getStorageSync('temp_detail_data')
  if (cached && cached._id === options.id) {
    this.setData({ record: cached })
    wx.removeStorageSync('temp_detail_data')
    return // 无需再调用云函数
  }
  this.loadDetail(options.id)
}
```

### 2.4 合并请求

**场景**: 审批页面加载三个列表（待审批、已通过、已拒绝）

**当前实现** (approval.js):
```javascript
// 已使用 Promise.all 并行请求，这是正确的做法
const [pendingRes, approvedRes, rejectedRes] = await Promise.all([
  wx.cloud.callFunction({ name: 'user', data: { action: 'getPending', status: 'pending' } }),
  wx.cloud.callFunction({ name: 'user', data: { action: 'getPending', status: 'approved' } }),
  wx.cloud.callFunction({ name: 'user', data: { action: 'getPending', status: 'rejected' } })
])
```

**进一步优化**: 可在云函数端合并为一次调用，返回三种状态的数据。

---

## 三、具体优化任务

### 优先级 1：高收益低成本 ✅ 已完成

| 任务 | 文件 | 状态 |
|------|------|------|
| 为 approval.js 添加缓存 | pages/admin/approval/approval.js | ✅ 已完成 |
| 为 history.js 添加缓存 | pages/teacher/history/history.js | ✅ 已完成 |
| 增加 onShow 防抖 | 多个页面 | ✅ 已完成 |

### 优先级 2：中等收益 ✅ 已完成

| 任务 | 文件 | 状态 |
|------|------|------|
| 统一使用 request.js | 所有页面 | ✅ 已完成（11个文件） |
| 详情页数据预传递 | history→detail, dashboard→detail | ✅ 已完成 |

### 优先级 3：云函数端优化 ✅ 已完成

| 任务 | 文件 | 状态 |
|------|------|------|
| 合并 getPending 三状态查询 | cloudfunctions/user/index.js | ✅ 已完成（getAllByStatus） |
| 提取公共 getAllData | cloudfunctions/ | 暂不需要（当前规模较小） |

---

## 四、排序逻辑说明

### 4.1 已移至前端的排序

| 页面 | 排序逻辑 | 位置 |
|------|----------|------|
| dashboard.js | 班级自然排序 | loadData() |
| attendance.js | 班级+姓名排序 | loadStudents() |
| register.js | 班级自然排序 | applyFilterOptions(), onClassTeacherDeptPickerConfirm() |
| overview.js | 状态优先排序 | applyData() |

### 4.2 必须保留在云函数的排序

| 云函数 | 位置 | 原因 |
|--------|------|------|
| user/getPending | orderBy('createTime', 'desc') | 分页查询需要稳定排序 |
| attendance/getHistory | orderBy('createTime', 'desc') | 分页查询需要稳定排序 |

**说明**: 分页查询使用 skip/limit，必须有稳定的排序才能保证跨页数据不重复、不遗漏。

---

## 五、实施建议

### 第一阶段：快速见效 ✅ 已完成

1. ✅ 为 `approval.js` 添加待审批列表缓存（2分钟有效期）
2. ✅ 为 `history.js` 添加历史记录缓存（5分钟有效期）
3. ✅ 统一添加 onShow 防抖（5-10秒间隔）

### 第二阶段：代码规范 ✅ 已完成

1. ✅ 将所有 `wx.cloud.callFunction` 替换为 `request.callCloud`（11个文件，20+处）

### 第三阶段：云函数优化 ✅ 已完成

1. ✅ 合并 user 云函数的多状态查询（新增 `getAllByStatus` action）
2. 提取云函数公共工具库（可选，当前规模暂不需要）

---

## 六、预期效果

| 优化项 | 预计减少调用量 |
|--------|----------------|
| 本地缓存 | 50-70% |
| onShow 防抖 | 20-30% |
| 数据预传递 | 10-20% |
| 请求合并 | 10-15% |

**综合优化后预计可减少 60-80% 的云函数调用量**

---

*文档创建时间: 2025-12-24*
*最后更新时间: 2025-12-24（全部优化已完成）*
