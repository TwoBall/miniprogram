# 数据库索引配置指南

本文档定义了智慧社团管理系统的数据库索引配置，用于优化查询性能。

## 索引配置概览

| 集合名 | 索引数量 | 主要查询场景 |
|--------|----------|--------------|
| students | 5 | 按社团/班级/学部查询学生 |
| users | 7 | 用户登录、角色筛选、审批列表、通知发送 |
| attendance_records | 5 | 考勤记录查询、统计分析、学生历史 |
| feedbacks | 3 | 反馈记录查询 |
| transfer_requests | 4 | 转社团申请处理 |
| notifications | 2 | 用户通知列表 |
| export_records | 2 | 导出历史查询 |
| system_config | 1 | 配置读取（主键查询） |
| rate_limits | 2 | 限频检查、过期清理 |

## 详细索引配置

### students（学生表）

| 索引名 | 字段配置 | 用途说明 |
|--------|----------|----------|
| `clubName_1` | `clubName: 1` | 按社团查询学生列表 |
| `className_1` | `className: 1` | 按班级查询学生列表 |
| `department_1` | `department: 1` | 按学部查询学生列表 |
| `clubName_1_className_1` | `clubName: 1, className: 1` | 社团+班级组合查询 |
| `clubName_1_studentName_1` | `clubName: 1, studentName: 1` | 社团内按姓名搜索学生 |

**典型查询**：
```javascript
// 查询某社团的所有学生
db.collection('students').where({ clubName: '篮球社' }).get()

// 查询某社团某班级的学生
db.collection('students').where({ clubName: '篮球社', className: '24级护理1班' }).get()
```

---

### users（用户表）

| 索引名 | 字段配置 | 用途说明 |
|--------|----------|----------|
| `_openid_1` | `_openid: 1` | 按微信用户ID查询（登录验证） |
| `_openid_1_status_1` | `_openid: 1, status: 1` | 查询用户的有效账号 |
| `role_1_status_1` | `role: 1, status: 1` | 按角色筛选已审批用户 |
| `status_1_createTime_-1` | `status: 1, createTime: -1` | 待审批用户列表（按时间倒序） |
| `clubName_1_status_1` | `clubName: 1, status: 1` | 按社团查询教师账号 |
| `role_1_clubName_1_status_1` | `role: 1, clubName: 1, status: 1` | 按角色+社团查询教师（通知发送） |
| `role_1_className_1_status_1` | `role: 1, className: 1, status: 1` | 按角色+班级查询班主任（通知发送） |

**典型查询**：
```javascript
// 用户登录验证
db.collection('users').where({ _openid: 'xxx', status: 'approved' }).get()

// 获取待审批列表
db.collection('users').where({ status: 'pending' }).orderBy('createTime', 'desc').get()
```

---

### attendance_records（考勤记录表）

| 索引名 | 字段配置 | 用途说明 |
|--------|----------|----------|
| `clubName_1_date_-1` | `clubName: 1, date: -1` | 查询社团考勤记录（最常用） |
| `date_-1` | `date: -1` | 按日期查询所有考勤记录 |
| `departments_1_date_-1` | `departments: 1, date: -1` | 学部考勤统计（数组字段） |
| `teacherId_1_date_-1` | `teacherId: 1, date: -1` | 查询教师的点名记录 |
| `records.studentId_1` | `records.studentId: 1` | 按学生ID查询考勤历史（嵌套数组字段） |

**典型查询**：
```javascript
// 查询社团最近的考勤记录
db.collection('attendance_records')
  .where({ clubName: '篮球社' })
  .orderBy('date', 'desc')
  .limit(20)
  .get()

// 查询某天某社团的考勤
db.collection('attendance_records')
  .where({ clubName: '篮球社', date: '2025-12-26' })
  .get()
```

---

### feedbacks（反馈表）

| 索引名 | 字段配置 | 用途说明 |
|--------|----------|----------|
| `studentId_1_date_-1` | `studentId: 1, date: -1` | 查询学生的反馈记录 |
| `className_1_date_-1` | `className: 1, date: -1` | 查询班级的反馈列表 |
| `teacherName_1_createTime_-1` | `teacherName: 1, createTime: -1` | 查询班主任提交的反馈 |

**典型查询**：
```javascript
// 查询某学生的反馈记录
db.collection('feedbacks')
  .where({ studentId: 'xxx' })
  .orderBy('date', 'desc')
  .get()

// 查询某班级的反馈
db.collection('feedbacks')
  .where({ className: '24级护理1班' })
  .orderBy('date', 'desc')
  .get()
```

---

### transfer_requests（转社团申请表）

| 索引名 | 字段配置 | 用途说明 |
|--------|----------|----------|
| `status_1_createTime_-1` | `status: 1, createTime: -1` | 待处理申请列表 |
| `studentId_1` | `studentId: 1` | 查询学生的转社团历史 |
| `fromClub_1_status_1` | `fromClub: 1, status: 1` | 转出社团查看申请 |
| `toClub_1_status_1` | `toClub: 1, status: 1` | 转入社团查看申请 |

**典型查询**：
```javascript
// 查询待处理的转社团申请
db.collection('transfer_requests')
  .where({ status: 'pending_teacher' })
  .orderBy('createTime', 'desc')
  .get()

// 查询某社团收到的转入申请
db.collection('transfer_requests')
  .where({ toClub: '篮球社', status: 'pending_teacher' })
  .get()
```

---

### notifications（通知表）

| 索引名 | 字段配置 | 用途说明 |
|--------|----------|----------|
| `recipientId_1_read_1_createTime_-1` | `recipientId: 1, read: 1, createTime: -1` | 用户未读通知（最常用） |
| `recipientId_1_createTime_-1` | `recipientId: 1, createTime: -1` | 用户所有通知列表 |

**典型查询**：
```javascript
// 查询用户未读通知
db.collection('notifications')
  .where({ recipientId: 'xxx', read: false })
  .orderBy('createTime', 'desc')
  .get()

// 查询用户所有通知
db.collection('notifications')
  .where({ recipientId: 'xxx' })
  .orderBy('createTime', 'desc')
  .limit(50)
  .get()
```

---

### export_records（导出记录表）

| 索引名 | 字段配置 | 用途说明 |
|--------|----------|----------|
| `_openid_1_createTime_-1` | `_openid: 1, createTime: -1` | 用户导出历史列表（最常用） |
| `_openid_1_fileID_1` | `_openid: 1, fileID: 1` | 验证文件归属权限 |

**典型查询**：
```javascript
// 查询用户导出历史
db.collection('export_records')
  .where({ _openid: 'xxx' })
  .orderBy('createTime', 'desc')
  .limit(20)
  .get()

// 验证文件归属
db.collection('export_records')
  .where({ _openid: 'xxx', fileID: 'cloud://xxx' })
  .count()
```

---

### system_config（系统配置表）

| 索引名 | 字段配置 | 用途说明 |
|--------|----------|----------|
| `_id` | 主键索引（自动） | 按配置ID读取配置 |

**典型查询**：
```javascript
// 读取排课配置
db.collection('system_config')
  .doc('schedule_config')
  .get()
```

---

### rate_limits（限频记录表）

| 索引名 | 字段配置 | 用途说明 |
|--------|----------|----------|
| `key_1_timestamp_-1` | `key: 1, timestamp: -1` | 限频检查（最常用） |
| `timestamp_1` | `timestamp: 1` | 清理过期记录 |

**典型查询**：
```javascript
// 检查用户操作限频
db.collection('rate_limits')
  .where({
    key: 'oXXXX_attendance',
    timestamp: _.gte(Date.now() - 60000)
  })
  .count()

// 清理 1 小时前的记录
db.collection('rate_limits')
  .where({ timestamp: _.lt(Date.now() - 3600000) })
  .remove()
```

---

## 配置步骤

### 方式一：云开发控制台配置

1. 登录 [微信云开发控制台](https://cloud.weixin.qq.com/)
2. 选择对应的云开发环境
3. 进入 **数据库** → 选择目标集合
4. 点击 **索引管理** → **添加索引**
5. 按照上表配置索引字段和排序方式

### 方式二：使用云函数批量创建

```javascript
// 在云函数中使用 createIndex API
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  // 为 students 集合创建索引
  await db.collection('students').createIndex({
    indexName: 'clubName_1',
    keys: [{ name: 'clubName', direction: 1 }]
  })

  // 创建复合索引
  await db.collection('students').createIndex({
    indexName: 'clubName_1_className_1',
    keys: [
      { name: 'clubName', direction: 1 },
      { name: 'className', direction: 1 }
    ]
  })

  return { success: true }
}
```

---

## 索引优化原则

### 1. 复合索引字段顺序

遵循 **ESR 原则**（Equality, Sort, Range）：
- **等值查询字段**放在最前面
- **排序字段**放在中间
- **范围查询字段**放在最后

```javascript
// 示例：查询某社团某日期范围的考勤
// 索引应为：clubName_1_date_-1
db.collection('attendance_records')
  .where({
    clubName: '篮球社',  // 等值查询
    date: _.gte('2025-12-01').and(_.lte('2025-12-31'))  // 范围查询
  })
  .orderBy('date', 'desc')  // 排序
  .get()
```

### 2. 避免过多索引

- 每个集合建议不超过 **10 个索引**
- 过多索引会影响写入性能（每次写入都需要更新索引）
- 定期检查索引使用情况，删除未使用的索引

### 3. 索引覆盖

尽量让查询只使用索引就能返回结果，避免回表查询：

```javascript
// 使用 field 投影，只返回需要的字段
db.collection('students')
  .where({ clubName: '篮球社' })
  .field({ _id: true, studentName: true, className: true })
  .get()
```

### 4. 索引限制

- 单个索引字段值不能超过 **1024 字节**
- 复合索引最多包含 **10 个字段**
- 数组字段的索引会为每个数组元素创建索引条目

---

## 性能监控

### 查看慢查询

在云开发控制台的 **数据库** → **慢查询日志** 中查看：
- 执行时间超过 100ms 的查询
- 未使用索引的查询（全表扫描）

### 优化建议

1. **全表扫描**：添加对应的索引
2. **返回数据量大**：使用 `limit()` 限制返回条数
3. **频繁排序**：确保排序字段在索引中

---

## 版本历史

- **v1.3** (2026-01-06)
  - 新增 `system_config` 集合索引配置
  - 新增 `rate_limits` 集合索引配置
  - 总索引数量更新为 31 个

- **v1.2** (2025-12-27)
  - `attendance_records` 新增 `records.studentId_1` 索引（嵌套数组字段，优化学生考勤历史查询）
  - `users` 新增 `role_1_clubName_1_status_1` 和 `role_1_className_1_status_1` 索引（优化通知发送查询）
  - 总索引数量更新为 28 个

- **v1.1** (2025-12-27)
  - 新增 `export_records` 集合索引配置
  - 总索引数量更新为 25 个

- **v1.0** (2025-12-26)
  - 初始版本
  - 定义 6 个集合共 23 个索引配置
  - 添加索引优化原则说明
