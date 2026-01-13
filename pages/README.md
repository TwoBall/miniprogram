# pages - 页面模块

<!-- 一旦我所属的文件夹有所变化，请更新我 -->

## 架构说明

页面层是小程序的视图层，按照用户角色划分为不同的功能模块。每个角色拥有独立的页面目录，实现权限隔离和业务逻辑分离。

## 目录结构

### 管理员模块
- `admin/approval/` - 审批管理页面
- `admin/home/` - 管理员首页（使用 `stats.getHomeStats` 批量API）
- `admin/profile/` - 管理员个人中心
- `admin/users/` - 用户管理页面（使用 `constants.js` 统一状态映射）
- `admin/data/` - 数据中心页面（使用 `stats.getDataCenterStats` 批量API）

### 教师模块
- `teacher/attendance/` - 考勤管理页面
- `teacher/history/` - 历史记录页面
- `teacher/detail/` - 详情页面
- `teacher/club/` - 社团管理页面（支持学部+班级级联筛选、虚拟列表优化）
- `teacher/profile/` - 教师个人中心

### 班主任模块
- `classTeacher/overview/` - 班级概览页面（使用 `loader.js` + `stats.getClassOverviewStats` 批量API）
- `classTeacher/feedback/` - 反馈管理页面
- `classTeacher/profile/` - 班主任个人中心
- `classTeacher/students/` - 学生列表页面（支持虚拟列表优化）
- `classTeacher/studentDetail/` - 学生详情页面

### 领导模块
- `leader/dashboard/` - 领导看板页面（使用 `loader.js` + `stats.getDashboardStats` 批量API）
- `leader/detail/` - 详情页面
- `leader/profile/` - 领导个人中心

### 公共模块
- `common/switchRole/` - 角色切换页面
- `common/notifications/` - 通知列表页面（使用 `constants.js` 统一状态映射）
- `common/transfer/` - 转社团申请模块（使用 `constants.js` 统一状态映射）
  - `transfer.js` - 申请列表页面（查看和审批）
  - `create.js` - 发起申请页面（教师/班主任入口）
- `common/export/` - 数据导出页面
  - `export.js` - 导出配置和执行页面
  - `history.js` - 导出历史记录页面（支持重新下载）

### 认证模块
- `login/` - 登录页面
- `register/` - 注册页面

## 页面命名规范

每个页面目录包含四个文件：
- `{name}.js` - 页面逻辑
- `{name}.wxml` - 页面结构
- `{name}.wxss` - 页面样式
- `{name}.json` - 页面配置

## 工具使用规范

### 状态常量 (constants.js)

使用 `utils/constants.js` 统一管理状态映射，避免页面间重复定义：

```javascript
const { TRANSFER_STATUS, getTransferStatusText } = require('../../../utils/constants')

// 在 data 中使用
data: {
  statusMap: TRANSFER_STATUS
}
```

### 缓存加载 (loader.js)

使用 `utils/loader.js` 简化带缓存的数据加载：

```javascript
const { loadWithCache } = require('../../../utils/loader')

const result = await loadWithCache({
  cacheKey: `overview_${className}_${date}`,
  cacheDuration: storage.CACHE_DURATION.FIVE_MINUTES,
  forceRefresh,
  apiModule: 'stats',
  apiAction: 'getClassOverviewStats',
  apiData: { className, date }
})
```

### 批量API (stats模块)

使用批量统计API减少请求次数：

| API | 用途 | 使用页面 |
|-----|------|----------|
| `stats.getHomeStats` | 首页统计 | admin/home |
| `stats.getDataCenterStats` | 数据中心统计 | admin/data |
| `stats.getClassOverviewStats` | 班级概览统计 | classTeacher/overview |
| `stats.getDashboardStats` | 领导看板统计 | leader/dashboard |
| `stats.getTeacherHomeStats` | 教师首页统计 | (预留) |

## 角色权限

不同角色访问不同的页面模块，通过路由守卫和权限验证实现访问控制。
