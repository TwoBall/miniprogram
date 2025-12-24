# 数据库设计文档

## 目录
- [概述](#概述)
- [数据库集合](#数据库集合)
- [数据导入](#数据导入)
- [索引设计](#索引设计)
- [数据关系](#数据关系)

---

## 概述

本系统使用微信云开发的云数据库（基于 MongoDB），共包含 4 个集合。

### 集合列表
| 集合名称 | 说明 | 记录数量（预估） |
|---------|------|-----------------|
| users | 用户表 | 100-500 |
| students | 学生表 | 1000-5000 |
| attendance_records | 点名记录表 | 10000+ |
| feedbacks | 反馈表 | 1000+ |

---

## 数据库集合

### 1. users（用户表）

**用途**：存储系统用户信息，包括社团老师、班主任、学部领导和管理员。

**字段说明**：

| 字段名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| _id | String | 是 | 自动生成的唯一标识 | "5f8d..." |
| openid | String | 是 | 微信用户唯一标识 | "oXXXX..." |
| name | String | 是 | 用户姓名 | "张三" |
| role | String | 是 | 用户角色 | "teacher" |
| department | String | 否 | 学部名称（leader角色必填） | "职教一部" |
| className | String | 否 | 班级名称（classTeacher角色必填） | "23计算机1班" |
| clubName | String | 否 | 社团名称（teacher角色必填） | "篮球社" |
| status | String | 是 | 审核状态 | "approved" |
| approvedBy | String | 否 | 审批人ID | "admin_id" |
| approvedByName | String | 否 | 审批人姓名 | "管理员" |
| approvedTime | Date | 否 | 审批时间 | ISODate("2025-12-21") |
| rejectReason | String | 否 | 拒绝原因 | "信息不完整" |
| preRegistered | Boolean | 否 | 是否预注册 | true |
| createTime | Date | 是 | 创建时间 | ISODate("2025-12-21") |
| updateTime | Date | 是 | 更新时间 | ISODate("2025-12-21") |

**role 枚举值**：
- `admin` - 系统管理员
- `teacher` - 社团老师
- `classTeacher` - 班主任
- `leader` - 学部领导

**status 枚举值**：
- `pending` - 待审核
- `approved` - 已通过
- `rejected` - 已拒绝

**示例数据**：
```json
{
  "_id": "user_001",
  "openid": "oXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  "name": "张老师",
  "role": "teacher",
  "clubName": "篮球社",
  "status": "approved",
  "approvedBy": "admin_001",
  "approvedByName": "系统管理员",
  "approvedTime": {"$date": "2025-12-21T08:00:00.000Z"},
  "createTime": {"$date": "2025-12-20T10:00:00.000Z"},
  "updateTime": {"$date": "2025-12-21T08:00:00.000Z"}
}
```

---

### 2. students（学生表）

**用途**：存储学生基本信息和社团归属。

**字段说明**：

| 字段名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| _id | String | 是 | 自动生成的唯一标识 | "5f8d..." |
| name | String | 是 | 学生姓名 | "李四" |
| department | String | 是 | 学部名称 | "职教一部" |
| className | String | 是 | 班级名称 | "23计算机1班" |
| gender | String | 是 | 性别 | "男" |
| clubName | String | 是 | 所在社团 | "篮球社" |
| classTeacher | String | 是 | 班主任姓名 | "王老师" |
| classTeacherPhone | String | 否 | 班主任电话 | "138****8888" |

**gender 枚举值**：
- `男`
- `女`

**示例数据**：
```json
{
  "_id": "student_001",
  "name": "李四",
  "department": "职教一部",
  "className": "23计算机1班",
  "gender": "男",
  "clubName": "篮球社",
  "classTeacher": "王老师",
  "classTeacherPhone": "13800138000"
}
```

---

### 3. attendance_records（点名记录表）

**用途**：存储每次点名的详细记录。

**字段说明**：

| 字段名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| _id | String | 是 | 自动生成的唯一标识 | "5f8d..." |
| clubName | String | 是 | 社团名称 | "篮球社" |
| teacherId | String | 是 | 教师ID | "teacher_001" |
| teacherName | String | 是 | 教师姓名 | "张老师" |
| date | String | 是 | 点名日期 | "2025-12-21" |
| time | String | 是 | 点名时间 | "14:30" |
| records | Array | 是 | 点名记录数组 | 见下方 |
| createTime | Date | 是 | 创建时间 | ISODate("2025-12-21") |

**records 数组元素结构**：

| 字段名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| studentId | String | 是 | 学生ID | "student_001" |
| studentName | String | 是 | 学生姓名 | "李四" |
| className | String | 是 | 班级名称 | "23计算机1班" |
| department | String | 是 | 学部名称 | "职教一部" |
| gender | String | 否 | 性别 | "男" |
| clubName | String | 是 | 社团名称 | "篮球社" |
| classTeacher | String | 否 | 班主任姓名 | "王老师" |
| classTeacherPhone | String | 否 | 班主任电话 | "138****" |
| status | String | 是 | 考勤状态 | "present" |

**status 枚举值**：
- `present` - 到课
- `absent` - 缺课

**示例数据**：
```json
{
  "_id": "record_001",
  "clubName": "篮球社",
  "teacherId": "teacher_001",
  "teacherName": "张老师",
  "date": "2025-12-21",
  "time": "14:30",
  "records": [
    {
      "studentId": "student_001",
      "studentName": "李四",
      "className": "23计算机1班",
      "department": "职教一部",
      "gender": "男",
      "clubName": "篮球社",
      "classTeacher": "王老师",
      "classTeacherPhone": "13800138000",
      "status": "present"
    },
    {
      "studentId": "student_002",
      "studentName": "王五",
      "className": "23计算机1班",
      "department": "职教一部",
      "gender": "男",
      "clubName": "篮球社",
      "classTeacher": "王老师",
      "classTeacherPhone": "13800138000",
      "status": "absent"
    }
  ],
  "createTime": {"$date": "2025-12-21T14:30:00.000Z"}
}
```

---

### 4. feedbacks（反馈表）

**用途**：存储班主任对学生缺课的反馈信息。

**字段说明**：

| 字段名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| _id | String | 是 | 自动生成的唯一标识 | "5f8d..." |
| studentId | String | 是 | 学生ID | "student_001" |
| studentName | String | 是 | 学生姓名 | "李四" |
| clubName | String | 是 | 社团名称 | "篮球社" |
| className | String | 是 | 班级名称 | "23计算机1班" |
| teacherName | String | 是 | 班主任姓名 | "王老师" |
| feedback | String | 是 | 反馈内容 | "请注意按时上课" |
| date | String | 是 | 反馈日期 | "2025-12-21" |
| createTime | Date | 是 | 创建时间 | ISODate("2025-12-21") |

**示例数据**：
```json
{
  "_id": "feedback_001",
  "studentId": "student_002",
  "studentName": "王五",
  "clubName": "篮球社",
  "className": "23计算机1班",
  "teacherName": "王老师",
  "feedback": "该生今日缺课，已联系家长，请社团老师关注",
  "date": "2025-12-21",
  "createTime": {"$date": "2025-12-21T15:00:00.000Z"}
}
```

---

## 数据导入

### 准备工作

1. **准备 Excel 文件**
   - 文件名：`学生社团明细表.xlsx`
   - 必需列：学生姓名、学部、班级、性别、所在社团、班主任、班主任联系方式

2. **安装依赖**
```bash
cd tools
npm install
```

### 转换数据

运行转换脚本：
```bash
node convert.js
```

脚本会生成两个文件：
- `students.json` - 学生数据
- `teachers_pre_reg.json` - 班主任预注册数据

### 导入步骤

#### 1. 导入学生数据

1. 打开微信开发者工具
2. 进入云开发控制台
3. 选择"数据库"
4. 选择 `students` 集合
5. 点击"导入"
6. 选择 `students.json` 文件
7. 冲突模式选择"插入"
8. 点击"确定"

#### 2. 导入班主任数据

1. 选择 `users` 集合
2. 点击"导入"
3. 选择 `teachers_pre_reg.json` 文件
4. 冲突模式选择"插入"
5. 点击"确定"

#### 3. 创建管理员账号

手动在 `users` 集合中添加管理员记录：
```json
{
  "openid": "your_admin_openid",
  "name": "系统管理员",
  "role": "admin",
  "status": "approved",
  "createTime": {"$date": "2025-12-21T00:00:00.000Z"},
  "updateTime": {"$date": "2025-12-21T00:00:00.000Z"}
}
```

**获取 openid 方法**：
1. 使用管理员微信登录小程序
2. 在登录页面查看控制台输出的 openid
3. 将 openid 填入上述 JSON 中

---

## 索引设计

### 推荐索引

为提升查询性能，建议创建以下索引：

#### users 集合
```javascript
// openid 唯一索引
db.collection('users').createIndex({
  openid: 1
}, {
  unique: true
})

// 角色和状态组合索引
db.collection('users').createIndex({
  role: 1,
  status: 1
})
```

#### students 集合
```javascript
// 社团名称索引
db.collection('students').createIndex({
  clubName: 1
})

// 班级名称索引
db.collection('students').createIndex({
  className: 1
})

// 学部名称索引
db.collection('students').createIndex({
  department: 1
})
```

#### attendance_records 集合
```javascript
// 教师ID和日期组合索引
db.collection('attendance_records').createIndex({
  teacherId: 1,
  date: -1
})

// 社团和日期组合索引
db.collection('attendance_records').createIndex({
  clubName: 1,
  date: -1
})

// 日期索引
db.collection('attendance_records').createIndex({
  date: -1
})
```

#### feedbacks 集合
```javascript
// 班级和日期组合索引
db.collection('feedbacks').createIndex({
  className: 1,
  date: -1
})

// 学生ID和日期组合索引
db.collection('feedbacks').createIndex({
  studentId: 1,
  date: -1
})
```

---

## 数据关系

### ER 图

```
┌─────────────┐
│    users    │
│  (用户表)    │
└──────┬──────┘
       │
       │ 1:N (teacherId)
       │
       ▼
┌─────────────────────┐
│ attendance_records  │
│   (点名记录表)       │
└──────┬──────────────┘
       │
       │ N:M (通过records数组)
       │
       ▼
┌─────────────┐        ┌─────────────┐
│  students   │◄───────│  feedbacks  │
│  (学生表)    │  N:1   │  (反馈表)    │
└─────────────┘        └─────────────┘
```

### 关系说明

1. **users → attendance_records**
   - 关系：一对多
   - 说明：一个教师可以创建多条点名记录
   - 关联字段：`users._id` = `attendance_records.teacherId`

2. **students ↔ attendance_records**
   - 关系：多对多
   - 说明：一个学生可以出现在多条点名记录中，一条点名记录包含多个学生
   - 关联方式：通过 `attendance_records.records` 数组

3. **students → feedbacks**
   - 关系：一对多
   - 说明：一个学生可以收到多条反馈
   - 关联字段：`students._id` = `feedbacks.studentId`

### 数据一致性

#### 级联更新规则

1. **学生信息变更**
   - 当学生的班级、学部等信息变更时，需要同步更新：
     - `attendance_records.records` 中的对应字段
     - `feedbacks` 中的对应字段

2. **用户信息变更**
   - 当教师姓名变更时，需要同步更新：
     - `attendance_records.teacherName`

3. **删除规则**
   - 删除学生时，建议保留历史记录，只标记为"已删除"
   - 删除用户时，保留其创建的点名记录

---

## 数据备份

### 备份策略

1. **自动备份**
   - 云开发平台提供自动备份功能
   - 建议开启每日自动备份

2. **手动备份**
   - 定期导出重要数据
   - 保存在本地或云存储

### 导出数据

在云开发控制台：
1. 选择对应集合
2. 点击"导出"
3. 选择导出格式（JSON/CSV）
4. 下载备份文件

---

## 数据统计

### 常用查询

#### 1. 统计各社团学生人数
```javascript
db.collection('students').aggregate()
  .group({
    _id: '$clubName',
    count: $.sum(1)
  })
  .end()
```

#### 2. 统计某日期的总体到课率
```javascript
// 需要在云函数中实现
// 1. 查询当日所有点名记录
// 2. 统计 present 和 absent 数量
// 3. 计算到课率
```

#### 3. 查询某学生的考勤历史
```javascript
db.collection('attendance_records')
  .where({
    'records.studentId': 'student_id'
  })
  .orderBy('date', 'desc')
  .get()
```

---

## 数据维护

### 定期清理

1. **清理过期数据**
   - 建议保留最近一年的点名记录
   - 超过一年的数据可以归档或删除

2. **清理测试数据**
   - 上线前清理所有测试数据
   - 保留必要的示例数据

### 数据迁移

如需迁移到新环境：
1. 导出所有集合数据
2. 在新环境创建集合
3. 导入数据
4. 创建索引
5. 验证数据完整性

---

## 附录

### 数据量估算

| 集合 | 单条记录大小 | 预估记录数 | 总大小估算 |
|------|-------------|-----------|-----------|
| users | ~500 bytes | 500 | ~250 KB |
| students | ~300 bytes | 5000 | ~1.5 MB |
| attendance_records | ~5 KB | 10000 | ~50 MB |
| feedbacks | ~500 bytes | 1000 | ~500 KB |

**总计**：约 52 MB（一年数据）

### 性能优化建议

1. **查询优化**
   - 使用索引加速查询
   - 避免全表扫描
   - 使用聚合查询代替多次查询

2. **数据分页**
   - 大数据量查询使用分页
   - 单次查询不超过 100 条

3. **数据缓存**
   - 常用数据使用本地缓存
   - 减少数据库查询次数

---

**文档版本**：v1.0.0  
**更新日期**：2025-12-22