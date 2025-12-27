# 数据库字段命名规范

本文档定义了智慧社团管理系统的数据库字段命名规范和数据模型。

## 命名原则

### 字段命名
1. **字段名应具有自描述性**：字段名应清晰地表明其所属实体和含义
2. **避免通用名称**：避免使用 `name`、`id` 等过于通用的字段名
3. **使用驼峰命名法**：所有字段使用小驼峰命名（camelCase）
4. **一致性原则**：相同含义的字段在不同集合中使用相同的命名
5. **系统字段使用下划线前缀**：微信云开发自动生成的字段使用下划线前缀（如 `_id`、`_openid`）

### 集合命名
1. **使用 snake_case**：多词集合名使用下划线分隔（如 `attendance_records`、`transfer_requests`）
2. **使用复数形式**：集合名使用复数形式表示集合（如 `users`、`students`）
3. **清晰表达含义**：集合名应清晰表达其存储的数据类型

## 数据模型

### students（学生表）

学生基本信息表

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `_id` | String | 是 | 学生唯一标识（系统生成） |
| `studentName` | String | 是 | 学生姓名 |
| `studentId` | String | 否 | 学号 |
| `department` | String | 否 | 所属学部（如：医药护理部） |
| `className` | String | 是 | 班级名称（如：24级护理1班） |
| `gender` | String | 否 | 性别（男/女） |
| `clubName` | String | 是 | 所属社团 |
| `classTeacher` | String | 否 | 班主任姓名 |
| `classTeacherPhone` | Number | 否 | 班主任电话 |
| `createTime` | Date | 是 | 创建时间 |
| `updateTime` | Date | 是 | 更新时间 |

**注意事项**：
- `studentName` 字段用于存储学生姓名（不再使用 `name`）
- `studentId` 与 `_id` 不同，`_id` 是数据库主键，`studentId` 是学号

### users（用户表）

系统用户账号表，支持多角色

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `_id` | String | 是 | 用户唯一标识（系统生成） |
| `_openid` | String | 是 | 微信用户标识 |
| `userName` | String | 是 | 用户姓名 |
| `role` | String | 是 | 角色（admin/teacher/classTeacher/leader） |
| `department` | String | 否 | 所属学部 |
| `className` | String | 否 | 负责班级（班主任专用） |
| `clubName` | String | 否 | 负责社团（社团老师专用） |
| `status` | String | 是 | 账号状态（pending/approved/rejected） |
| `approvedBy` | String | 否 | 审批人ID |
| `approvedByName` | String | 否 | 审批人姓名 |
| `approvedTime` | Date | 否 | 审批时间 |
| `rejectReason` | String | 否 | 拒绝原因 |
| `createTime` | Date | 是 | 创建时间 |
| `updateTime` | Date | 是 | 更新时间 |

**角色说明**：
- `admin`：系统管理员，可审批用户、查看全局数据
- `teacher`：社团老师，负责点名和查看本社团考勤
- `classTeacher`：班主任，查看本班学生考勤并发送反馈
- `leader`：学部领导，查看本学部考勤统计

**注意事项**：
- `userName` 字段用于存储用户姓名（不再使用 `name`）
- 同一个微信用户（openid）可以拥有多个角色账号

### attendance_records（考勤记录表）

社团点名记录表

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `_id` | String | 是 | 记录唯一标识（系统生成） |
| `clubName` | String | 是 | 社团名称 |
| `teacherId` | String | 是 | 点名老师ID |
| `teacherName` | String | 是 | 点名老师姓名 |
| `department` | String | 否 | 学部 |
| `date` | String | 是 | 点名日期（格式：YYYY-MM-DD） |
| `time` | String | 是 | 点名时间（格式：HH:mm） |
| `records` | Array | 是 | 学生考勤记录数组 |
| `records[].studentId` | String | 是 | 学生ID |
| `records[].studentName` | String | 是 | 学生姓名 |
| `records[].className` | String | 是 | 学生班级 |
| `records[].status` | String | 是 | 考勤状态（present/absent） |
| `createTime` | Date | 是 | 创建时间 |
| `updateTime` | Date | 否 | 更新时间 |

**注意事项**：
- `records` 数组中嵌套存储所有学生的考勤状态
- `records[].studentName` 字段用于存储学生姓名
- `status` 的值：`present` 表示出勤，`absent` 表示缺勤

### feedbacks（反馈表）

班主任对缺勤学生的反馈记录

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `_id` | String | 是 | 反馈唯一标识（系统生成） |
| `studentId` | String | 是 | 学生ID |
| `studentName` | String | 是 | 学生姓名 |
| `className` | String | 是 | 班级 |
| `clubName` | String | 是 | 社团 |
| `date` | String | 是 | 缺勤日期 |
| `feedback` | String | 是 | 反馈内容 |
| `teacherId` | String | 是 | 班主任ID |
| `teacherName` | String | 是 | 班主任姓名 |
| `createTime` | Date | 是 | 创建时间 |

### transfer_requests（转社团申请表）

学生转社团的申请和审批流程

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `_id` | String | 是 | 申请唯一标识（系统生成） |
| `studentId` | String | 是 | 学生ID |
| `studentName` | String | 是 | 学生姓名 |
| `className` | String | 是 | 班级 |
| `fromClub` | String | 是 | 转出社团 |
| `toClub` | String | 是 | 转入社团 |
| `initiatorType` | String | 是 | 发起人类型（fromTeacher/toTeacher/classTeacher） |
| `initiatorId` | String | 是 | 发起人ID |
| `initiatorName` | String | 是 | 发起人姓名 |
| `reason` | String | 否 | 转社团原因 |
| `status` | String | 是 | 申请状态（pending_teacher/pending_classTeacher/approved/rejected） |
| `fromTeacherConfirmed` | Boolean | 是 | 转出老师是否确认 |
| `toTeacherConfirmed` | Boolean | 是 | 转入老师是否确认 |
| `classTeacherConfirmed` | Boolean | 是 | 班主任是否确认 |
| `approvedBy` | String | 否 | 审批人ID |
| `approvedByName` | String | 否 | 审批人姓名 |
| `approvedTime` | Date | 否 | 审批时间 |
| `rejectedBy` | String | 否 | 拒绝人ID |
| `rejectedByName` | String | 否 | 拒绝人姓名 |
| `rejectReason` | String | 否 | 拒绝原因 |
| `rejectedTime` | Date | 否 | 拒绝时间 |
| `createTime` | Date | 是 | 创建时间 |
| `updateTime` | Date | 是 | 更新时间 |

**状态流转**：
1. `pending_teacher`：等待双方老师确认
2. `pending_classTeacher`：双方老师已确认，等待班主任审批
3. `approved`：班主任已批准
4. `rejected`：被拒绝

### notifications（通知表）

系统通知消息表

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `_id` | String | 是 | 通知唯一标识（系统生成） |
| `type` | String | 是 | 通知类型 |
| `recipientId` | String | 是 | 接收人openid |
| `title` | String | 是 | 通知标题 |
| `content` | String | 是 | 通知内容 |
| `data` | Object | 否 | 附加数据 |
| `read` | Boolean | 是 | 是否已读 |
| `createTime` | Date | 是 | 创建时间 |

**通知类型**：
- `absence_warning`：缺勤提醒
- `transfer_request`：转社团申请
- `transfer_result`：转社团结果
- `register_result`：注册审批结果

### export_records（导出记录表）

导出历史记录表，用于追踪和重新下载导出文件

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `_id` | String | 是 | 记录唯一标识（系统生成） |
| `_openid` | String | 是 | 导出用户的openid |
| `exportType` | String | 是 | 导出类型（attendance/summary/students） |
| `fileName` | String | 是 | 导出文件名 |
| `fileID` | String | 是 | 云存储文件ID |
| `recordCount` | Number | 是 | 导出记录条数 |
| `filters` | Object | 否 | 筛选条件 |
| `filters.startDate` | String | 否 | 开始日期 |
| `filters.endDate` | String | 否 | 结束日期 |
| `filters.department` | String | 否 | 学部筛选 |
| `filters.clubName` | String | 否 | 社团筛选 |
| `filters.className` | String | 否 | 班级筛选 |
| `createTime` | Date | 是 | 创建时间 |

**导出类型**：
- `attendance`：考勤明细
- `summary`：考勤汇总
- `students`：学生名单

## 字段迁移说明

### 从旧版本迁移

如果您的数据库使用了旧的字段名（`name`），需要执行以下迁移步骤：

1. **部署迁移云函数**
   - 上传 `cloudfunctions/migrateFields` 云函数
   - 在微信开发者工具中右键点击该云函数文件夹
   - 选择"上传并部署：云端安装依赖"

2. **执行字段迁移**
   ```javascript
   // 先检查当前状态
   wx.cloud.callFunction({
     name: 'migrateFields',
     data: {
       action: 'check',
       confirmToken: 'CONFIRM_MIGRATE_2025'
     }
   })

   // 执行迁移
   wx.cloud.callFunction({
     name: 'migrateFields',
     data: {
       action: 'migrate',
       confirmToken: 'CONFIRM_MIGRATE_2025'
     }
   })
   ```

3. **更新代码**
   - 确保所有云函数和前端代码都已更新为新字段名
   - 测试所有功能正常运行

4. **回滚（如果需要）**
   ```javascript
   wx.cloud.callFunction({
     name: 'migrateFields',
     data: {
       action: 'rollback',
       confirmToken: 'CONFIRM_MIGRATE_2025'
     }
   })
   ```

## 查询示例

### 查询某个社团的学生
```javascript
db.collection('students')
  .where({ clubName: '篮球' })
  .field({ _id: true, studentName: true, className: true })
  .get()
```

### 查询某个用户的信息
```javascript
db.collection('users')
  .where({ _openid: openid, status: 'approved' })
  .field({ _id: true, userName: true, role: true, clubName: true })
  .get()
```

### 查询某天的考勤记录
```javascript
db.collection('attendance_records')
  .where({ date: '2025-12-25', clubName: '英语沙龙' })
  .field({ records: true, teacherName: true, time: true })
  .get()
```

## 最佳实践

1. **始终使用字段投影**：在查询时明确指定需要的字段，避免返回不必要的数据
2. **统一字段命名**：新增字段时遵循本规范的命名原则
3. **文档化修改**：任何数据模型变更都应更新本文档
4. **版本控制**：数据库结构变更应创建迁移脚本并记录版本

## 版本历史

- **v2.2** (2025-12-27)
  - 新增 `export_records` 集合，用于保存导出历史记录
  - `attendance_records` 表新增 `department` 字段（从学生记录中提取）
  - 新增 export 云函数接口：`getHistory`、`getDownloadUrl`、`deleteRecord`

- **v2.1** (2025-12-26)
  - 统一 `openid` 字段为 `_openid`（带下划线前缀），符合微信云开发规范
  - 创建 `migrateFields` 云函数，支持字段迁移操作：
    - `check` - 检查当前数据库字段状态
    - `migrateOpenid` - 迁移 openid → _openid
    - `migrateName` - 迁移 name → studentName/userName
    - `rollbackOpenid` - 回滚 _openid → openid
  - 更新的云函数：
    - `cloudfunctions/user/index.js` - 所有 openid 查询和数据写入
  - 添加集合命名规范说明（使用 snake_case）
  - 添加系统字段命名说明（下划线前缀）
  - 数据库迁移已完成

- **v2.0** (2025-12-25)
  - 将 `students.name` 改为 `students.studentName`
  - 将 `users.name` 改为 `users.userName`
  - 统一所有代码中的字段引用
  - 创建迁移云函数
  - 更新的云函数：
    - `cloudfunctions/students/index.js` - 字段投影和排序
    - `cloudfunctions/user/index.js` - 所有用户名引用
    - `cloudfunctions/transfer/index.js` - 审批人字段
    - `cloudfunctions/attendance/index.js` - 学生字段投影
    - `cloudfunctions/export/index.js` - 导出字段映射
  - 更新的前端页面：
    - `pages/admin/users/users.js` - 用户搜索和删除
    - `pages/admin/users/add.js` + `.wxml` - 用户表单
    - `pages/admin/approval/approval.js` - 审批确认
    - `pages/classTeacher/students/students.js` - 学生搜索
    - `pages/classTeacher/overview/overview.js` - 反馈导航
    - `pages/classTeacher/feedback/feedback.js` - 反馈提交
    - `pages/teacher/attendance/attendance.js` - 点名记录
    - `pages/teacher/club/club.js` - 社团信息显示

- **v1.0** (初始版本)
  - 使用通用字段名 `name`
