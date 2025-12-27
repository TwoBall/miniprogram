# utils - 工具模块

<!-- 一旦我所属的文件夹有所变化，请更新我 -->

## 架构说明

工具函数层提供通用的功能模块，供页面和组件调用。所有工具函数都是纯函数或无状态的工具类。

**注意**：所有工具文件都放在主包 `utils/` 目录，这样所有分包都可以引用。

## 文件索引

- `auth.js` - 身份认证工具，处理用户登录状态、权限验证
- `date.js` - 日期处理工具，提供日期格式化、计算等功能
- `error.js` - 错误处理工具，统一处理异常和错误提示
- `request.js` - 网络请求工具，封装云函数调用和 HTTP 请求
- `storage.js` - 本地存储工具，封装 wx.getStorageSync 和 wx.setStorageSync

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
