# cloudfunctions - 云函数模块

<!-- 一旦我所属的文件夹有所变化，请更新我 -->

## 架构说明

云函数层处理后端业务逻辑，运行在腾讯云环境中。

**推荐使用统一 API 云函数 `api`**，将所有业务模块合并到一个云函数中，减少冷启动延迟。

## 文件索引

### 统一 API 云函数（推荐）

- `api/` - **统一 API 入口云函数**，整合所有业务模块，减少冷启动
  - `index.js` - 统一入口，模块路由分发
  - `modules/` - 业务模块目录
    - `user.js` - 用户管理模块
    - `students.js` - 学生管理模块
    - `attendance.js` - 考勤管理模块入口
    - `attendance/` - 考勤处理器和服务
    - `notification.js` - 通知管理模块
    - `transfer.js` - 转社团管理模块
    - `export.js` - 数据导出模块
    - `system.js` - 系统配置模块
    - `stats.js` - 统计聚合模块
    - `feedback.js` - 反馈提交模块
  - `common/` - 公共工具模块（由同步脚本自动生成）

### 定时触发器云函数

- `cleanupRateLimits/` - 定时清理云函数（每小时执行），清理过期的 rate_limits 记录

> **注意**：定时触发器云函数不能合并到统一 API 中，因为它们由云开发定时器自动触发，而非前端调用。

### 公共模块和脚本

- `common/` - 公共模块源码（单一真相源），由同步脚本分发到各云函数
- `scripts/` - 构建脚本目录
  - `sync-common.js` - 公共模块同步脚本

### 归档目录

- `_archived/` - 已废弃的独立云函数（2026-01 归档）
  - 包含：attendance、students、user、export、notification、transfer、submitFeedback、system
  - 这些功能已全部迁移至 `api/` 统一云函数
  - 详见 `_archived/README.md`

## 统一 API 调用方式

### 前端调用示例

```javascript
const request = require('../../../utils/request')

// 使用 callApi 调用统一 API（推荐）
const result = await request.callApi('user', 'login', { code: 'xxx' })

// 等同于：
// wx.cloud.callFunction({
//   name: 'api',
//   data: { module: 'user', action: 'login', code: 'xxx' }
// })
```

### 支持的模块和操作

| 模块 | 操作列表 |
|------|----------|
| `user` | login, register, approve, reject, getPending, getAllByStatus, getAll, getStats, add, delete, update |
| `students` | getFilterOptions, getByClub, getByClass, getByDepartment, getById, getAll, getStatistics |
| `attendance` | submit, getHistory, getDetail, getByClass, getByDepartment, checkTodaySubmissions, updateRecords, getClubRank, getClassRank, getDepartmentClassRanking, getByStudent, getAbsenceWarnings, getStatistics |
| `notification` | create, getList, markRead, getUnreadCount |
| `transfer` | create, getList, confirm, approve, reject |
| `export` | attendance, summary, students, getHistory, getDownloadUrl, deleteRecord |
| `system` | getConfig, setConfig |
| `stats` | getDataCenterStats, getHomeStats, getDashboardStats, getClassOverviewStats, getTeacherHomeStats |
| `feedback` | submit |

## attendance 云函数 Action 列表

| Action | 用途 | 调用页面 |
|--------|------|---------|
| `submit` | 提交点名记录 | 教师点名页 |
| `getHistory` | 获取历史点名记录（分页） | 教师历史页 |
| `getDetail` | 获取单条点名记录详情 | 教师详情页 |
| `getByClass` | 按班级获取考勤情况 | 班主任概览页 |
| `getByDepartment` | 按学部获取考勤统计 | 领导看板页 |
| `checkTodaySubmissions` | 检查今日是否已点名 | 教师点名页 |
| `updateRecords` | 更新点名记录（含变更通知） | 教师详情页 |
| `getClubRank` | 获取社团学生出勤率排行 | 教师社团页 |
| `getClassRank` | 获取班级学生出勤率排行 | 班主任学生页 |
| `getDepartmentClassRanking` | 获取学部班级出勤率排名（本月） | 领导看板页 |
| `getByStudent` | 按学生ID获取考勤记录 | 学生详情页 |
| `getAbsenceWarnings` | 获取缺勤预警列表（>=3次） | 各角色页面 |
| `getStatistics` | 获取考勤统计数据 | 数据中心页 |

## students 云函数 Action 列表

| Action | 用途 | 调用页面 |
|--------|------|---------|
| `getByClub` | 按社团获取学生列表 | 教师社团页 |
| `getByClass` | 按班级获取学生列表 | 班主任学生页 |
| `getByDepartment` | 按学部获取学生列表 | 领导看板页 |
| `getFilterOptions` | 获取筛选选项（学部/班级/社团）| 多个页面 |
| `getStatistics` | 获取学生统计数据（聚合查询）| 数据中心页 |
| `getAll` | 获取所有学生列表 | 管理员页面 |
| `getStudentWithAttendance` | 批量获取学生详情+考勤历史 | 学生详情页 |

## user 云函数 Action 列表

| Action | 用途 | 调用页面 |
|--------|------|---------|
| `login` | 用户登录 | 登录页 |
| `register` | 用户注册 | 注册页 |
| `approve` | 审批用户 | 审批页 |
| `reject` | 拒绝用户 | 审批页 |
| `getPending` | 获取待审批用户 | 审批页 |
| `getAllByStatus` | 按状态获取用户 | 用户管理页 |
| `getAll` | 获取所有用户（分页+搜索）| 用户管理页 |
| `getStats` | 获取用户统计数据（count 查询）| 管理员首页 |
| `add` | 添加用户（预注册）| 用户管理页 |
| `delete` | 删除用户 | 用户管理页 |
| `update` | 更新用户信息 | 用户管理页 |

## export 云函数 Action 列表

| Action | 用途 | 调用页面 |
|--------|------|---------|
| `attendance` | 导出考勤明细 | 数据导出页 |
| `summary` | 导出考勤汇总 | 数据导出页 |
| `students` | 导出学生名单 | 数据导出页 |
| `getHistory` | 获取导出历史记录（分页）| 导出历史页 |
| `getDownloadUrl` | 重新获取文件下载链接 | 导出历史页 |
| `deleteRecord` | 删除导出记录和云文件 | 导出历史页 |

## system 云函数 Action 列表

| Action | 用途 | 调用页面 |
|--------|------|---------|
| `getConfig` | 获取系统配置 | 各页面（通过 utils/config.js）|
| `setConfig` | 设置系统配置（仅管理员）| 管理后台 |

## stats 云函数 Action 列表

| Action | 用途 | 调用页面 |
|--------|------|---------|
| `getDataCenterStats` | 批量获取数据中心统计（用户/学生/社团/考勤）| 管理员数据中心页 |
| `getHomeStats` | 批量获取首页统计（用户/社团/今日考勤）| 管理员首页 |
| `getDashboardStats` | 批量获取领导看板统计（学部考勤/缺勤预警）| 领导看板页 |
| `getClassOverviewStats` | 批量获取班主任概览统计（班级学生+当日考勤）| 班主任概览页 |
| `getTeacherHomeStats` | 批量获取教师首页统计（社团学生+今日点名状态）| 教师首页 |

## cleanupRateLimits 云函数

定时触发器云函数，无需前端调用。

| 触发方式 | 执行周期 | 用途 |
|----------|----------|------|
| 定时触发器 | 每小时执行 | 清理过期的 rate_limits 记录，防止集合无限增长 |

## 云函数结构

每个云函数目录包含：
- `index.js` - 云函数入口文件
- `package.json` - 依赖配置
- `common/` - 公共模块目录（由同步脚本自动生成）
- `config.json` (可选) - 云函数配置

## 公共模块机制

### 架构设计

采用**构建脚本自动同步**方式实现公共模块复用：

```
cloudfunctions/
├── api/                       # 统一 API 云函数（推荐）
│   ├── index.js              # 统一入口，模块路由分发
│   ├── package.json          # 依赖配置
│   ├── modules/              # 业务模块目录
│   │   ├── user.js
│   │   ├── students.js
│   │   ├── attendance.js
│   │   ├── notification.js
│   │   ├── transfer.js
│   │   ├── export.js
│   │   ├── system.js
│   │   ├── stats.js
│   │   └── feedback.js
│   └── common/               # 自动同步的公共模块
├── cleanupRateLimits/         # 定时触发器云函数
├── common/                    # 公共模块源码（单一真相源）
│   ├── index.js              # 统一导出入口
│   ├── db-utils.js           # 数据库工具
│   ├── auth-utils.js         # 权限验证工具
│   ├── response-utils.js     # 统一响应格式
│   ├── sort-utils.js         # 排序工具
│   ├── date-utils.js         # 日期工具
│   └── constants.js          # 常量定义
├── scripts/
│   └── sync-common.js        # 同步脚本
└── _archived/                 # 已归档的废弃云函数
```

### 使用方式

```javascript
// 在云函数中引用公共模块
const {
  getAllData,
  paginate,
  verifyAdmin,
  ROLES,
  USER_STATUS,
  success,
  fail,
  unauthorized,
  sortStudentsByName
} = require('./common')
```

### 同步公共模块

修改 `cloudfunctions/common/` 下的文件后，运行同步脚本：

```bash
# 在项目根目录执行
node cloudfunctions/scripts/sync-common.js

# 强制覆盖所有文件
node cloudfunctions/scripts/sync-common.js --force
```

### 公共模块清单

| 模块 | 文件 | 导出函数 |
|------|------|----------|
| 数据库工具 | `db-utils.js` | `getAllData`, `getAllDataSorted`, `paginate`, `MAX_LIMIT` |
| 权限验证 | `auth-utils.js` | `verifyAdmin`, `verifyUser`, `verifyUserRoles` |
| 响应格式 | `response-utils.js` | `success`, `successWithPagination`, `fail`, `badRequest`, `unauthorized`, `forbidden`, `notFound`, `wrapHandler`, `createDispatcher` |
| 排序工具 | `sort-utils.js` | `zhCompare`, `zhNumericCompare`, `sortStudentsByName`, `sortStudentsByClassAndName`, `sortOptions` |
| 常量定义 | `constants.js` | `MAX_LIMIT`, `ROLES`, `USER_STATUS`, `ATTENDANCE_STATUS` |
| 日期工具 | `date-utils.js` | `formatDate`, `formatDateTime`, `getToday`, `getCurrentMonth`, `getCurrentMonthRange`, `getDateRange`, `getMonthsAgoRange`, `DATE_RANGES` |
| 限频工具 | `rate-limit.js` | `checkRateLimit`, `cleanupExpiredRecords`, `RATE_LIMIT_CONFIGS` |
| 输入校验 | `validator.js` | `RULES`, `validateField`, `validateRequired`, `validate`, `sanitize`, `sanitizeObject` |

### 响应格式工具

`response-utils.js` 提供统一的响应格式：

```javascript
// 成功响应
success(data, message)
// 返回: { success: true, code: 0, message, data }

// 带分页的成功响应
successWithPagination(data, pagination, message)
// 返回: { success: true, code: 0, message, data, pagination }

// 失败响应
fail(message, code)
// 返回: { success: false, code, message, data: null }

// 快捷错误响应
unauthorized(message)  // 401 未授权
forbidden(message)     // 403 无权限
badRequest(message)    // 400 参数错误
notFound(message)      // 404 资源不存在
```

### 排序工具函数

| 函数名 | 用途 | 说明 |
|--------|------|------|
| `zhCompare` | 中文拼音比较器 | 使用 `localeCompare('zh-CN')` |
| `zhNumericCompare` | 中文拼音+数字自然排序 | 支持 "1班" < "2班" < "10班" |
| `sortStudentsByName` | 按姓名排序学生列表 | 中文拼音排序 |
| `sortStudentsByClassAndName` | 按班级+姓名排序 | 先班级后姓名 |
| `sortOptions` | 排序选项列表 | 学部/班级/社团等 |

### 维护说明

1. **修改公共模块**：只修改 `cloudfunctions/common/` 下的源文件
2. **运行同步脚本**：`node cloudfunctions/scripts/sync-common.js`
3. **测试云函数**：在微信开发者工具中测试各云函数
4. **部署云函数**：上传并部署修改过的云函数

## 调用方式

小程序端推荐通过 `request.callApi()` 调用统一 API 云函数：

```javascript
const request = require('../../../utils/request')

// 推荐：使用 callApi 调用统一 API（减少冷启动）
const result = await request.callApi('module', 'action', { ...params })

// 静默调用（不显示 loading 和错误提示）
const result = await request.callApiSilent('module', 'action', { ...params })
```

> **注意**：`callCloud` 和 `wx.cloud.callFunction` 已废弃，请使用 `callApi` 系列方法。

## 权限控制

云函数内部实现权限验证，确保只有授权用户才能执行敏感操作。
