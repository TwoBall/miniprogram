# cloudfunctions - 云函数模块

<!-- 一旦我所属的文件夹有所变化，请更新我 -->

## 架构说明

云函数层处理后端业务逻辑，运行在腾讯云环境中。每个云函数都是独立的服务单元，负责特定的业务功能。

## 文件索引

- `attendance/` - 考勤管理云函数，处理签到、签退、考勤记录查询等功能
- `students/` - 学生管理云函数，处理学生信息的增删改查
- `user/` - 用户管理云函数，处理用户认证、权限验证、用户信息管理
- `export/` - 数据导出云函数，生成并导出各类数据报表
- `notification/` - 通知推送云函数，发送系统通知和消息提醒
- `transfer/` - 转班处理云函数，处理学生转班申请和审批
- `submitFeedback/` - 反馈提交云函数，处理用户反馈信息的提交
- `migrateFields/` - 字段迁移云函数，处理数据库字段的迁移和更新
- `common/` - 公共模块模板（不需要上传，仅作为参考）

## attendance 云函数 Action 列表

| Action | 用途 | 调用页面 |
|--------|------|---------|
| `submit` | 提交点名记录 | 教师点名页 |
| `getHistory` | 获取历史点名记录（分页） | 教师历史页 |
| `getDetail` | 获取单条点名记录详情 | 教师详情页 |
| `getByClass` | 按班级获取考勤情况 | 班主任概览页 |
| `getByDepartment` | 按学部获取考勤统计 | 领导看板页 |
| `checkTodaySubmissions` | 检查今日是否已点名 | 教师点名页 |
| `updateRecords` | 更新点名记录 | 教师详情页 |
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

## 云函数结构

每个云函数目录包含：
- `index.js` - 云函数入口文件
- `package.json` - 依赖配置
- `utils.js` - 公共工具函数（复制自 common 模块）
- `config.json` (可选) - 云函数配置

## 公共工具模块

由于微信云开发不支持 `file:` 本地依赖，公共代码采用**复制方式**共享：

```
cloudfunctions/
  common/           # 公共模块模板（不上传）
    db-utils.js     # 数据库工具
    auth-utils.js   # 权限验证
    constants.js    # 常量定义
    sort-utils.js   # 排序工具（中文拼音排序）
  attendance/
    utils.js        # 复制自 common，合并版公共工具
  students/
    utils.js        # 复制自 common
  ...
```

**使用方式**：
```javascript
const { getAllData, sortStudentsByName, sortOptions } = require('./utils')
```

**维护说明**：修改公共代码时，需要同步更新所有云函数目录下的 `utils.js`。

### 排序工具函数

`utils.js` 中包含以下排序工具：

| 函数名 | 用途 | 说明 |
|--------|------|------|
| `zhCompare` | 中文拼音比较器 | 使用 `localeCompare('zh-CN')` |
| `zhNumericCompare` | 中文拼音+数字自然排序 | 支持 "1班" < "2班" < "10班" |
| `sortStudentsByName` | 按姓名排序学生列表 | 中文拼音排序 |
| `sortStudentsByClassAndName` | 按班级+姓名排序 | 先班级后姓名 |
| `sortOptions` | 排序选项列表 | 学部/班级/社团等 |

## 调用方式

小程序端通过 `wx.cloud.callFunction()` 调用云函数：

```javascript
wx.cloud.callFunction({
  name: '云函数名',
  data: {
    // 调用参数
  }
})
```

## 权限控制

云函数内部实现权限验证，确保只有授权用户才能执行敏感操作。
