# 批量数据接口优化计划

> 创建时间：2026-01-13
> 完成时间：2026-01-13
> 状态：✅ 已完成

## 一、优化目标

通过新增批量数据接口，减少前端页面初始化时的云函数调用次数，提升页面加载性能。

**实际效果**：
- 总调用次数：15次 → 5次
- 优化比例：67%
- 涉及页面：5个
- 新增接口：4个（stats 模块 3 个 + students 模块 1 个）
- 修改接口：1个（notification/getList）

## 二、优化页面清单

| 优先级 | 页面 | 优化前 | 优化后 | 节省 | 接口 | 状态 |
|--------|------|--------|--------|------|------|------|
| P0 | admin/data | 6次 | 1次 | 83% | `stats/getDataCenterStats` | ✅ |
| P0 | admin/home | 3次 | 1次 | 67% | `stats/getHomeStats` | ✅ |
| P1 | leader/dashboard | 2次 | 1次 | 50% | `stats/getDashboardStats` | ✅ |
| P1 | common/notifications | 2次 | 1次 | 50% | 修改 `notification/getList` | ✅ |
| P2 | classTeacher/studentDetail | 2次 | 1次 | 50% | `students/getStudentWithAttendance` | ✅ |

## 三、实施阶段

### 阶段 1：stats 模块批量接口（P0）✅

> **实际实现**：创建了独立的 `stats.js` 模块（而非修改 system.js），保持 system 模块专注于系统配置功能。

#### 1.1 新增 `stats/getDataCenterStats`

**用途**：数据中心页面一次性获取所有统计数据

**请求参数**：无

**返回数据**：
```javascript
{
  success: true,
  data: {
    userStats: {
      total: number,
      byRole: { teacher, classTeacher, leader, admin },
      byStatus: { approved, pending, rejected },
      bound: number,
      unbound: number
    },
    studentStats: {
      total: number,
      byDepartment: [{ name, count }],
      byGender: { 男: count, 女: count }
    },
    clubStats: {
      total: number,
      list: [{ name, count }]
    },
    attendanceStats: {
      todayTotal: number,
      todayRate: number,
      weekTotal: number,
      weekRate: number,
      monthTotal: number,
      monthRate: number
    }
  }
}
```

**涉及文件**：
- `cloudfunctions/api/modules/stats.js` - 新增模块
- `cloudfunctions/api/index.js` - 注册 stats 模块
- `pages/admin/data/data.js` - 修改调用方式

#### 1.2 新增 `stats/getHomeStats`

**用途**：管理员首页一次性获取统计数据

**请求参数**：无

**返回数据**：
```javascript
{
  success: true,
  data: {
    totalUsers: number,
    pendingUsers: number,
    totalClubs: number,
    todayAttendance: number
  }
}
```

**涉及文件**：
- `cloudfunctions/api/modules/stats.js` - 新增 handler
- `pages/admin/home/home.js` - 修改调用方式

**提交记录**：`ae27174` - feat(api): 新增 stats 模块，优化管理员页面 API 调用

---

### 阶段 2：stats 模块领导看板接口（P1）✅

> **实际实现**：接口放在 `stats` 模块（而非 attendance 模块），命名为 `getDashboardStats`。

#### 2.1 新增 `stats/getDashboardStats`

**用途**：领导看板一次性获取考勤数据和预警数据

**请求参数**：
```javascript
{
  department: string,  // 学部名称
  date: string         // 日期 YYYY-MM-DD
}
```

**返回数据**：
```javascript
{
  success: true,
  data: {
    classes: [...],           // 班级考勤列表
    totalClasses: number,
    totalStudents: number,
    presentToday: number,
    absentToday: number,
    absenceWarnings: [...],   // 缺勤预警列表
    warningCount: number
  }
}
```

**涉及文件**：
- `cloudfunctions/api/modules/stats.js` - 新增 handler
- `pages/leader/dashboard/dashboard.js` - 修改调用方式，移除 loadAbsenceWarnings

**提交记录**：`0a80eb1` - feat(stats): 新增 getDashboardStats 接口，优化领导看板页面

---

### 阶段 3：notification 模块优化（P1）✅

#### 3.1 修改 `notification/getList`

**用途**：获取通知列表时自动返回未读数

**请求参数**：（保持不变）
```javascript
{
  page: number,
  pageSize: number,
  read?: boolean
}
```

**返回数据**：（新增 unreadCount 在 pagination 中）
```javascript
{
  success: true,
  data: [...],
  pagination: {
    page,
    pageSize,
    total,
    hasMore,
    unreadCount: number  // 新增字段，放在 pagination 对象中
  }
}
```

> **实际实现**：`unreadCount` 放在 `pagination` 对象内（而非响应根级别），与分页元数据统一管理。

**涉及文件**：
- `cloudfunctions/api/modules/notification.js` - 修改 getList handler
- `pages/common/notifications/notifications.js` - 从 pagination 提取 unreadCount

**提交记录**：`8717ac0` - perf(notification): getList 接口返回 unreadCount，减少调用次数

---

### 阶段 4：students 模块批量接口（P2）✅

#### 4.1 新增 `students/getStudentWithAttendance`

**用途**：学生详情页一次性获取学生信息和考勤历史

**请求参数**：
```javascript
{
  studentId: string
}
```

**返回数据**：
```javascript
{
  success: true,
  data: {
    student: { _id, studentName, className, department, clubName, ... },
    attendanceHistory: [
      {
        _id,
        date,
        clubName,
        teacherName,
        studentStatus,  // 云端预处理：直接返回该学生的状态
        studentNote
      }
    ],
    stats: {           // 云端计算的统计数据
      totalRecords: number,
      presentCount: number,
      absentCount: number,
      lateCount: number,
      attendanceRate: number
    }
  }
}
```

> **实际实现**：增加了 `stats` 对象，在云端完成统计计算，前端无需再次遍历计算。考勤历史也在云端预处理，直接返回该学生的状态。

**涉及文件**：
- `cloudfunctions/api/modules/students.js` - 新增 handler
- `pages/classTeacher/studentDetail/studentDetail.js` - 修改调用方式

**提交记录**：`4634a59` - feat(students): 新增 getStudentWithAttendance 接口，优化学生详情页

---

## 四、实施检查清单

### 阶段 1 检查项 ✅
- [x] 创建 stats.js 模块
- [x] stats.js 新增 getDataCenterStats handler
- [x] stats.js 新增 getHomeStats handler
- [x] index.js 注册 stats 模块到 SUPPORTED_MODULES
- [x] data.js 修改 loadAllStats 使用新接口
- [x] home.js 修改 loadStats 使用新接口
- [x] 本地测试通过
- [x] 提交代码

### 阶段 2 检查项 ✅
- [x] stats.js 新增 getDashboardStats handler
- [x] dashboard.js 修改为单次调用
- [x] dashboard.js 移除 loadAbsenceWarnings 方法
- [x] 本地测试通过
- [x] 提交代码

### 阶段 3 检查项 ✅
- [x] notification.js 修改 getList 返回 unreadCount（在 pagination 中）
- [x] notifications.js 移除 loadUnreadCount 方法
- [x] notifications.js 从 pagination 提取 unreadCount
- [x] 本地更新 unreadCount（标记已读后）
- [x] 本地测试通过
- [x] 提交代码

### 阶段 4 检查项 ✅
- [x] students.js 新增 getStudentWithAttendance handler
- [x] 云端计算统计数据（totalRecords, presentCount, absentCount, lateCount, attendanceRate）
- [x] studentDetail.js 合并两个加载方法为 loadStudentData
- [x] 本地测试通过
- [x] 提交代码

---

## 五、回滚方案

如果新接口出现问题，可以快速回滚：

1. **前端回滚**：恢复原有的多次调用方式
2. **云函数回滚**：新增的 handler 不影响原有接口，无需删除

---

## 六、文档更新 ✅

实施完成后已更新以下文档：

- [x] `cloudfunctions/README.md` - 新增 stats 模块和接口说明
- [x] `cloudfunctions/README.md` - 新增 getStudentWithAttendance 接口说明

---

## 七、实施总结

| 阶段 | 工作内容 | 提交 | 状态 |
|------|----------|------|------|
| 阶段 1 | stats 模块 2 个接口 + 2 个页面 | ae27174 | ✅ |
| 阶段 2 | stats 模块 1 个接口 + 1 个页面 | 0a80eb1 | ✅ |
| 阶段 3 | notification 模块修改 + 1 个页面 | 8717ac0 | ✅ |
| 阶段 4 | students 模块 1 个接口 + 1 个页面 | 4634a59 | ✅ |

### 与原计划的主要差异

1. **模块选择**：统计接口放在独立的 `stats` 模块（而非 system 模块），保持架构清晰
2. **接口命名**：领导看板使用 `stats/getDashboardStats`（而非 attendance/getDashboardData）
3. **数据位置**：notification 的 unreadCount 放在 `pagination` 对象中（而非响应根级别）
4. **云端计算**：studentDetail 接口在云端完成统计计算和数据预处理，减少前端计算量
