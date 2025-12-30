# utils - 工具模块

<!-- 一旦我所属的文件夹有所变化，请更新我 -->

## 架构说明

工具函数层提供通用的功能模块，供页面和组件调用。所有工具函数都是纯函数或无状态的工具类。

**注意**：所有工具文件都放在主包 `utils/` 目录，这样所有分包都可以引用。

## 文件索引

- `auth.js` - 身份认证工具，处理用户登录状态、权限验证
- `date.js` - 日期处理工具，提供日期格式化、计算等功能
- `error.js` - 错误处理工具，统一处理异常和错误提示，提供安全的 Toast 包装器
- `request.js` - 网络请求工具，封装云函数调用和 HTTP 请求
- `storage.js` - 本地存储工具，封装 wx.getStorageSync 和 wx.setStorageSync
- `performance.js` - 性能监控工具，提供 setData 性能追踪和云函数调用监控
- `offlineStorage.js` - 离线存储工具，提供离线队列和数据缓存管理

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
| `getFilterOptions(forceRefresh)` | 获取筛选选项 | 带 10 分钟缓存，返回学部/班级/社团列表 |

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
| `CACHE_DURATION.TEN_MINUTES` | 10 分钟缓存时长 |
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

Page({
  async loadData() {
    try {
      // 安全的 loading，自动等待 van-toast 组件就绪
      await SafeToast.loading({ message: '加载中...' })

      const result = await request.callCloud('xxx', data)

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
  await wx.cloud.callFunction({ name: 'attendance', data: record.data })
})

// 缓存数据（10分钟过期）
dataCache.set('students', studentList, 10 * 60 * 1000)
const cached = dataCache.get('students')
```
