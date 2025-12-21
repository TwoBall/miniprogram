# 社团点名系统 - 数据库设计文档

## 数据库集合（Collections）

### 1. users（用户表）

存储所有用户信息，包括社团老师、班主任、学部领导和管理员。

**⚠️ 重要更新：已改为微信登录，使用 openid 作为唯一标识**

```javascript
{
  _id: String,              // 自动生成的唯一ID
  openid: String,           // 微信 openid（唯一标识）
  name: String,             // 姓名
  role: String,             // 角色：'admin'（管理员）、'teacher'（社团老师）、'classTeacher'（班主任）、'leader'（学部领导）
  status: String,           // 审批状态：'pending'（待审批）、'approved'（已通过）、'rejected'（已拒绝）
  department: String,       // 学部（仅学部领导需要）
  className: String,        // 班级（仅班主任需要）
  clubName: String,         // 社团名称（仅社团老师需要）
  rejectReason: String,     // 拒绝原因（审批被拒时）
  approvedBy: String,       // 审批人ID
  approvedByName: String,   // 审批人姓名
  approvedTime: Date,       // 审批时间
  createTime: Date,         // 创建时间
  updateTime: Date          // 更新时间
}
```

**权限设置：**
- 读权限：仅创建者可读
- 写权限：仅创建者可写

**索引建议：**
- openid（唯一索引）⭐ 必须
- status
- role
- className
- clubName
- department

---

### 2. students（学生表）

���储所有学生信息及其社团归属。

```javascript
{
  _id: String,              // 自动生成的唯一ID
  name: String,             // 学生姓名
  studentId: String,        // 学号（可选）
  className: String,        // 班级（如：高一1班）
  department: String,       // 学部（如：高中部）
  gender: String,           // 性别（如：男、女）
  clubName: String,         // 所属社团名称
  classTeacher: String,     // 班主任姓名
  classTeacherPhone: String,// 班主任联系方式
  phone: String,            // 学生联系电话（可选）
  createTime: Date          // 创建时间
}
```

**索引建议：**
- studentId（唯一索引，如果使用）
- className
- clubName
- department

---

### 3. attendance_records（点名记录表）

存储每次点名的详细记录。

```javascript
{
  _id: String,              // 自动生成的唯一ID
  clubName: String,         // 社团名称
  teacherId: String,        // 点名老师ID
  teacherName: String,      // 点名老师姓名
  date: String,             // 日期（格式：YYYY-MM-DD）
  time: String,             // 时间（格式：HH:MM）
  records: Array,           // 点名记录数组
  [
    {
      studentId: String,    // 学生ID
      studentName: String,  // 学生姓名
      className: String,    // 班级
      department: String,   // 学部
      gender: String,       // 性别
      clubName: String,     // 所在社团
      classTeacher: String, // 班主任
      classTeacherPhone: String, // 班主任联系方式
      status: String        // 状态：'present'（到课）、'absent'（缺课）
    }
  ],
  createTime: Date          // 创建时间
}
```

**索引建议：**
- date
- clubName
- teacherId
- date + clubName（复合索引）

---

### 4. feedbacks（反馈表）

存储班主任对学生缺课的反馈信息。

```javascript
{
  _id: String,              // 自动生成的唯一ID
  studentId: String,        // 学生ID
  studentName: String,      // 学生姓名
  className: String,        // 班级
  clubName: String,         // 社团名称
  teacherName: String,      // 班主任姓名
  feedback: String,         // 反馈内容
  date: String,             // 日期（格式：YYYY-MM-DD）
  createTime: Date          // 创建时间
}
```

**索引建议：**
- studentId
- className
- date

---

## 数据导入说明

### 从Excel导入学生数据

Excel文件应包含以下列（按照您的表头）：

| 列名 | 说明 | 示例 |
|------|------|------|
| 学部 | 所在学部 | 高中部 |
| 班级 | 所在班级 | 高一1班 |
| 学生姓名 | 学生姓名 | 张三 |
| 性别 | 学生性别 | 男 |
| 所在社团 | 参加的社团 | 篮球社 |
| 班主任 | 班主任姓名 | 李老师 |
| 班主任联系方式 | 班主任电话 | 13800138000 |

### 导入步骤

1. 准备Excel文件，确保列名与上表一致
2. 在微信开发者工具中打开云开发控制台
3. 进入数据库管理
4. 选择 `students` 集合
5. 点击"导入"按钮
6. 选择Excel文件并导入

或者使用云函数批量导入：

```javascript
// 创建云函数 importStudents
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { students } = event // students 是从Excel解析的数据数组

  try {
    const promises = students.map(student => {
      return db.collection('students').add({
        data: {
          name: student.学生姓名,
          department: student.学部,
          className: student.班级,
          gender: student.性别,
          clubName: student.所在社团,
          classTeacher: student.班主任,
          classTeacherPhone: student.班主任联系方式,
          studentId: student.学号 || '',
          phone: student.电话 || '',
          createTime: db.serverDate()
        }
      })
    })

    await Promise.all(promises)

    return {
      success: true,
      message: `成功导入 ${students.length} 条数据`
    }
  } catch (error) {
    return {
      success: false,
      message: '导入失败：' + error.message
    }
  }
}
```

---

## 数据库权限设置

由于所有数据库操作都通过云函数进行，建议将所有集合设置为**仅云函数可访问**，以确保数据安全。

### 设置步骤

1. 打开微信开发者工具 → 云开发控制台
2. 进入**数据库** → 选择集合
3. 点击右上角**权限设置**
4. 选择**自定义安全规则**
5. 粘贴以下规则：

```json
{
  "read": false,
  "write": false
}
```

### 各集合权限说明

| 集合 | 权限 | 说明 |
|------|------|------|
| `users` | 仅云函数 | 用户敏感信息，必须通过云函数验证 |
| `students` | 仅云函数 | 学生数据只能通过云函数查询 |
| `attendance_records` | 仅云函数 | 考勤记录只能通过云函数操作 |
| `feedbacks` | 仅云函数 | 反馈通过云函数提交 |

> **说明：** 设置 `"read": false, "write": false` 后，小程序客户端无法直接访问数据库，但云函数仍拥有管理员权限，可以正常读写。

### 索引配置（提升查询性能）

在云开发控制台为以下字段创建索引：

| 集合 | 索引字段 | 类型 |
|------|----------|------|
| `users` | `openid` | 唯一 ⭐必须 |
| `users` | `status` | 普通 |
| `students` | `clubName` | 普通 |
| `students` | `className` | 普通 |
| `students` | `department` | 普通 |
| `attendance_records` | `date` | 普通 |
| `attendance_records` | `teacherId` | 普通 |

---

## 数据查询示例

### 查询某个社团的所有学生
```javascript
db.collection('students').where({
  clubName: '篮球社'
}).get()
```

### 查询某个班级某天的考勤情况
```javascript
db.collection('attendance_records').where({
  date: '2024-01-15'
}).get().then(res => {
  // 筛选出该班级的学生记录
  const classRecords = res.data.flatMap(record =>
    record.records.filter(r => r.className === '高一1班')
  )
})
```

### 查询某个学部的所有班级
```javascript
db.collection('students').where({
  department: '高中部'
}).field({
  className: true
}).get().then(res => {
  const classes = [...new Set(res.data.map(s => s.className))]
})
```
