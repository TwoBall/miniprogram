# utils - 工具模块

<!-- 一旦我所属的文件夹有所变化，请更新我 -->

## 架构说明

工具函数层提供通用的功能模块，供页面和组件调用。所有工具函数都是纯函数或无状态的工具类。

**注意**：所有工具文件都放在主包 `utils/` 目录，这样所有分包都可以引用。

## 文件索引

- `auth.js` - 身份认证工具，处理用户登录状态、权限验证
- `constants.js` - 状态常量工具，提供考勤/用户/转社团等状态映射和文本转换
- `date.js` - 日期处理工具，提供日期格式化、计算等功能
- `error.js` - 错误处理工具，统一处理异常和错误提示，提供安全的 Toast 和 Dialog 包装器
- `loader.js` - 通用加载工具，封装带缓存的数据加载逻辑
- `request.js` - 网络请求工具，封装云函数调用和 HTTP 请求
- `storage.js` - 本地存储工具，封装 wx.getStorageSync 和 wx.setStorageSync
- `performance.js` - 性能监控工具，提供 setData 性能追踪和云函数调用监控
- `offlineStorage.js` - 离线存储工具，提供离线队列和数据缓存管理
- `config.js` - 系统配置工具，从云数据库读取系统配置，支持本地缓存
- `validator.js` - 输入校验工具，提供通用的输入校验函数（前端版）

## 使用方式

所有页面（包括分包）引入方式：
```javascript
const auth = require('../../../utils/auth')
const dateUtil = require('../../../utils/date')
const request = require('../../../utils/request')
const storage = require('../../../utils/storage')
```

## request.js 接口说明

| 函数名 | 用途 | 说明 |
|--------|------|------|
| `callCloud(name, data, options)` | 调用云函数 | 支持 loading、错误提示、超时、重试 |
| `callCloudSilent(name, data)` | 静默调用云函数 | 不显示 loading 和错误提示 |
| `callApi(module, action, data, options)` | 调用统一 API 云函数 | **推荐使用**，减少冷启动 |
| `callApiSilent(module, action, data)` | 静默调用统一 API | 不显示 loading 和错误提示 |
| `getFilterOptions(forceRefresh)` | 获取筛选选项 | 带 10 分钟缓存，返回学部/班级/社团列表 |

### callApi 使用示例（推荐）

```javascript
const request = require('../../../utils/request')

// 调用统一 API 云函数
// 格式：callApi(模块名, 操作名, 数据, 选项)
const result = await request.callApi('user', 'login', { code: 'xxx' })

// 支持的模块：user, students, attendance, notification, transfer, export, system, feedback

// 示例：获取学生列表
const students = await request.callApi('students', 'getByClub', { clubName: '篮球社' })

// 示例：提交考勤
const attendance = await request.callApi('attendance', 'submit', {
  clubName: '篮球社',
  date: '2025-01-07',
  records: [...]
})

// 静默调用（不显示 loading 和错误提示）
const config = await request.callApiSilent('system', 'getConfig')
```

### getFilterOptions 使用示例

```javascript
const request = require('../../../utils/request')

// 使用缓存（默认）
const options = await request.getFilterOptions()
console.log(options.departments) // ['小学部', '初中部', '高中部']
console.log(options.classes)     // ['一年级1班', ...]
console.log(options.clubs)       // ['篮球社', '足球社', ...]
console.log(options.classDeptMap) // { '一年级1班': '小学部', ... }

// 强制刷新缓存
const freshOptions = await request.getFilterOptions(true)
```

## storage.js 缓存工具

| 常量/函数 | 用途 |
|----------|------|
| `STORAGE_KEYS.FILTER_OPTIONS` | 筛选选项缓存键 |
| `CACHE_DURATION.TWO_MINUTES` | 2 分钟缓存时长 |
| `CACHE_DURATION.FIVE_MINUTES` | 5 分钟缓存时长 |
| `CACHE_DURATION.TEN_MINUTES` | 10 分钟缓存时长 |
| `CACHE_DURATION.THIRTY_MINUTES` | 30 分钟缓存时长 |
| `CACHE_DURATION.ONE_HOUR` | 1 小时缓存时长 |
| `CACHE_DURATION.ONE_DAY` | 1 天缓存时长 |
| `getWithCache(key, timeKey, duration)` | 获取带过期检查的缓存 |
| `setWithCache(key, timeKey, data)` | 设置缓存及时间戳 |

## 工具函数规范

- 所有工具函数应导出为 `module.exports`
- 函数命名使用驼峰命名法
- 添加必要的参数校验和错误处理
- 避免在工具函数中使用全局状态
- 保持函数的纯粹性和可测试性

## error.js 错误处理与安全 Toast

### SafeToast 安全 Toast 工具

解决 `van-toast` 组件在页面 `onReady` 时可能未完全初始化导致的 "未找到 van-toast 节点" 错误。

**工作原理**：
1. 使用 `selectComponent('#van-toast')` 检测组件是否存在
2. 通过轮询等待组件就绪（最多 1 秒）
3. 组件未就绪时降级使用 `wx.showLoading`
4. 使用 `try-catch` 捕获错误，避免控制台报错

| 函数名 | 用途 | 说明 |
|--------|------|------|
| `SafeToast.loading(options)` | 显示加载提示 | 自动等待组件就绪，未就绪时降级为 wx.showLoading |
| `SafeToast.success(options)` | 显示成功提示 | 自动等待组件就绪 |
| `SafeToast.fail(options)` | 显示失败提示 | 自动等待组件就绪 |
| `SafeToast.clear()` | 清除提示 | 同时清除 Toast 和 wx.hideLoading |

### 使用示例

```javascript
const { SafeToast } = require('../../../utils/error')
const request = require('../../../utils/request')

Page({
  async loadData() {
    try {
      // 安全的 loading，自动等待 van-toast 组件就绪
      await SafeToast.loading({ message: '加载中...' })

      const result = await request.callApi('module', 'action', data)

      if (result.success) {
        SafeToast.success('加载成功')
      }
    } catch (error) {
      SafeToast.fail('加载失败')
    } finally {
      SafeToast.clear()
    }
  }
})
```

### 错误处理函数

| 函数名 | 用途 |
|--------|------|
| `handleError(error, options)` | 统一错误处理，自动显示友好提示 |
| `checkNetwork()` | 检查网络状态 |
| `showNetworkError()` | 显示网络异常提示 |

### SafeDialog 安全 Dialog 工具

提供统一的对话框调用接口，支持 async/await 语法。

| 函数名 | 用途 | 说明 |
|--------|------|------|
| `SafeDialog.confirm(options)` | 确认对话框 | Promise 风格，确认 resolve，取消 reject |
| `SafeDialog.confirmAsync(options)` | 确认对话框 | async/await 风格，返回 boolean |
| `SafeDialog.alert(options)` | 提示对话框 | 仅确认按钮 |
| `SafeDialog.close()` | 关闭对话框 | 关闭当前对话框 |

### SafeDialog 使用示例

```javascript
const { SafeDialog } = require('../../../utils/error')

// 方式1：async/await 风格（推荐）
async onApprove(user) {
  const confirmed = await SafeDialog.confirmAsync({
    title: '确认通过',
    message: `确定通过 ${user.userName} 的注册申请吗？`
  })

  if (confirmed) {
    await this.doApprove(user)
  }
}

// 方式2：Promise 风格
onDelete(item) {
  SafeDialog.confirm({
    title: '确认删除',
    message: '删除后无法恢复，是否继续？'
  }).then(() => {
    this.doDelete(item)
  }).catch(() => {
    // 用户取消
  })
}
```

## performance.js 性能监控工具

| 函数名 | 用途 | 说明 |
|--------|------|------|
| `initPerformanceMonitor()` | 初始化性能监控 | 返回监控实例 |
| `wrapSetData(page)` | 包装 setData | 追踪 setData 耗时 |
| `monitorCloudCall(name, callFn)` | 监控云函数调用 | 记录调用耗时和成功率 |
| `performanceMixin` | 性能监控 Mixin | 自动追踪页面性能 |

### 使用示例

```javascript
const { performanceMixin } = require('../../../utils/performance')

Page({
  ...performanceMixin,
  // 页面逻辑
})
```

## offlineStorage.js 离线存储工具

### 离线队列

| 函数名 | 用途 |
|--------|------|
| `offlineStorage.addOfflineRecord(action, data)` | 添加离线记录 |
| `offlineStorage.syncOfflineData(syncFn)` | 同步离线数据 |
| `offlineStorage.getOfflineCount()` | 获取待同步数量 |
| `offlineStorage.clearOfflineData()` | 清空离线数据 |

### 数据缓存

| 函数名 | 用途 |
|--------|------|
| `dataCache.set(key, data, ttl)` | 设置缓存 |
| `dataCache.get(key)` | 获取缓存 |
| `dataCache.remove(key)` | 删除缓存 |
| `dataCache.clear()` | 清空所有缓存 |

### 使用示例

```javascript
const { offlineStorage, dataCache } = require('../../../utils/offlineStorage')

// 离线保存考勤记录
offlineStorage.addOfflineRecord('attendance', { studentId, status })

// 网络恢复后同步
await offlineStorage.syncOfflineData(async (record) => {
  await request.callApi('attendance', record.action, record.data)
})

// 缓存数据（10分钟过期）
dataCache.set('students', studentList, 10 * 60 * 1000)
const cached = dataCache.get('students')
```

## config.js 系统配置工具

从云数据库读取系统配置（如排课规则），支持本地缓存（30分钟）。

| 函数名 | 用途 |
|--------|------|
| `getScheduleConfig(forceRefresh)` | 获取排课配置 |
| `getTodaySchedule(dayOfWeek, availableDepts)` | 获取当天应点名的学部 |
| `clearConfigCache()` | 清除配置缓存 |
| `DEFAULT_SCHEDULE_CONFIG` | 默认排课规则（数据库无配置时使用）|

### 使用示例

```javascript
const { getTodaySchedule, getScheduleConfig } = require('../../../utils/config')

// 获取今天的排课信息
const today = new Date().getDay()
const schedule = await getTodaySchedule(today, ['职教一部', '职教二部'])

if (schedule.isClassDay) {
  console.log('今天需要点名的学部:', schedule.departments)
} else {
  console.log(schedule.noClassMessage)
}
```

## validator.js 输入校验工具

提供通用的输入校验函数，用于前端表单验证。云函数端有对应的 `common/validator.js`。

### 校验规则

| 规则名 | 长度限制 | 说明 |
|--------|----------|------|
| `userName` | 2-20 | 仅支持中文、英文 |
| `className` | 2-50 | 班级名称 |
| `clubName` | 2-50 | 社团名称 |
| `department` | 2-50 | 学部名称 |
| `feedback` | 最大500 | 反馈内容 |
| `date` | - | YYYY-MM-DD 格式 |
| `time` | - | HH:MM 格式 |

### 函数列表

| 函数名 | 用途 |
|--------|------|
| `validateField(value, fieldName)` | 校验单个字段 |
| `validateRequired(value, fieldLabel)` | 校验必填字段 |
| `validate(data, rules)` | 批量校验 |
| `sanitize(value)` | 清理用户输入（去除危险字符）|
| `sanitizeObject(data, fields)` | 批量清理对象中的字符串字段 |

### 使用示例

```javascript
const { validate, sanitizeObject } = require('../../../utils/validator')

// 批量校验
const result = validate(formData, [
  { field: 'userName', label: '姓名', required: true },
  { field: 'className', label: '班级', required: true }
])

if (!result.valid) {
  console.log('校验失败:', result.errors)
  return
}

// 清理输入
const cleanData = sanitizeObject(formData, ['userName', 'feedback'])
```

## constants.js 状态常量工具

提供统一的状态常量定义和文本转换函数，消除页面间重复的状态映射代码。

### 状态常量

| 常量 | 说明 |
|------|------|
| `ATTENDANCE_STATUS` | 考勤状态（present/late/absent/leave） |
| `USER_STATUS` | 用户状态（pending/approved/rejected） |
| `TRANSFER_STATUS` | 转社团状态（pending/confirmed/approved/rejected） |
| `NOTIFICATION_TYPE` | 通知类型（system/attendance/transfer/approval） |
| `EXPORT_TYPE` | 导出类型（attendance/summary/students） |
| `ROLES` | 用户角色（admin/teacher/classTeacher/leader） |

### 转换函数

| 函数名 | 用途 |
|--------|------|
| `getAttendanceStatusText(status)` | 获取考勤状态文本 |
| `getAttendanceStatusType(status)` | 获取考勤状态类型（用于样式） |
| `getUserStatusText(status)` | 获取用户状态文本 |
| `getTransferStatusText(status)` | 获取转社团状态文本 |
| `getRoleText(role)` | 获取角色文本 |

### 使用示例

```javascript
const {
  ATTENDANCE_STATUS,
  getAttendanceStatusText,
  getAttendanceStatusType
} = require('../../../utils/constants')

// 使用常量
if (record.status === ATTENDANCE_STATUS.ABSENT) {
  // 处理缺勤
}

// 获取状态文本
const statusText = getAttendanceStatusText('present') // '到课'
const statusType = getAttendanceStatusType('absent')  // 'error'
```

## loader.js 通用加载工具

封装带缓存的数据加载逻辑，减少页面样板代码。

### 函数列表

| 函数名 | 用途 | 说明 |
|--------|------|------|
| `loadWithCache(options)` | 带缓存的数据加载 | 支持缓存、强制刷新、数据转换 |
| `loadMultiple(loaders, options)` | 批量并行加载 | 并行加载多个数据源 |
| `createLoader(page, config)` | 创建页面加载器 | 返回绑定页面上下文的加载函数 |

### loadWithCache 参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `cacheKey` | string | 缓存键名 |
| `cacheDuration` | number | 缓存时长（毫秒），默认5分钟 |
| `forceRefresh` | boolean | 是否强制刷新 |
| `apiModule` | string | API 模块名 |
| `apiAction` | string | API 操作名 |
| `apiData` | object | API 参数 |
| `transform` | function | 数据转换函数 |

### 使用示例

```javascript
const { loadWithCache, createLoader } = require('../../../utils/loader')

// 方式1：直接使用 loadWithCache
const result = await loadWithCache({
  cacheKey: 'dashboard_stats',
  cacheDuration: storage.CACHE_DURATION.FIVE_MINUTES,
  apiModule: 'stats',
  apiAction: 'getDashboardStats',
  apiData: { department: '职教一部', date: '2025-01-13' }
})

if (result.success) {
  console.log('数据:', result.data)
  console.log('来自缓存:', result.fromCache)
}

// 方式2：使用 createLoader 创建页面专用加载器
Page({
  onLoad() {
    this.loadStats = createLoader(this, {
      dataKey: 'stats',
      cacheKey: 'home_stats',
      apiModule: 'stats',
      apiAction: 'getHomeStats'
    })
  },

  async onShow() {
    await this.loadStats()
  },

  async onPullDownRefresh() {
    await this.loadStats(true) // 强制刷新
    wx.stopPullDownRefresh()
  }
})
```
