# 智慧社团管理系统 - 功能规划

> 从"社团点名系统"升级为"智慧社团管理系统"

---

## 各角色 TabBar 设计

> **设计原则**：每个角色 TabBar 只保留 **2 个入口**（核心功能 + 我的），其他功能收入"我的"页面，保持界面简洁。

### 社团老师 (teacher)

| Tab | 图标 | 页面路径 | 功能说明 |
|-----|------|----------|----------|
| 点名 | `records` | `/pages/teacher/attendance/attendance` | 日常点名（现有） |
| 我的 | `user-o` | `/pages/teacher/profile/profile` | 个人中心 |

---

### 班主任 (classTeacher)

| Tab | 图标 | 页面路径 | 功能说明 |
|-----|------|----------|----------|
| 总览 | `chart-trending-o` | `/pages/classTeacher/overview/overview` | 班级考勤总览（现有） |
| 我的 | `user-o` | `/pages/classTeacher/profile/profile` | 个人中心 |

---

### 学部领导 (leader)

| Tab | 图标 | 页面路径 | 功能说明 |
|-----|------|----------|----------|
| 看板 | `chart-trending-o` | `/pages/leader/dashboard/dashboard` | 数据看板（现有） |
| 我的 | `user-o` | `/pages/leader/profile/profile` | 个人中心 |

---

### 管理员 (admin)

| Tab | 图标 | 页面路径 | 功能说明 |
|-----|------|----------|----------|
| 工作台 | `wap-home-o` | `/pages/admin/home/home` | 管理首页（新） |
| 我的 | `user-o` | `/pages/admin/profile/profile` | 个人中心 |

---

## 一、管理员用户管理

### 目标
管理员可在小程序端直接增加、删除用户，无需等待用户自行注册。

### 功能设计

#### 1.1 用户列表页面
- 路径：`pages/admin/users/users`
- 展示所有用户，支持按角色筛选（teacher/classTeacher/leader/admin）
- 支持按状态筛选（pending/approved/rejected）
- 搜索功能：按姓名、学部、班级、社团搜索

#### 1.2 添加用户
- 表单字段：
  - 姓名（必填）
  - 角色（必填，下拉选择）
  - 学部（根据角色动态显示）
  - 班级（班主任角色必填）
  - 社团（社团老师角色必填）
  - 状态（默认 approved）

#### 1.3 删除用户
- 支持单个删除和批量删除
- 删除前二次确认
- 软删除方案（添加 `deleted: true` 字段）或硬删除

### 云函数扩展
在 `cloudfunctions/user/index.js` 新增 actions：
```javascript
const handlers = {
  // 现有
  login, register, approve, reject, getPending,
  // 新增
  getAll,       // 获取所有用户（支持筛选分页）
  add,          // 管理员添加用户
  delete,       // 删除用户
  update        // 更新用户信息
}
```

### 数据结构变更
```javascript
// users 集合新增字段
{
  // 现有字段...
  deleted: false,        // 软删除标记
  deletedAt: null,       // 删除时间
  deletedBy: null,       // 操作人
  createdBy: 'register' | 'admin'  // 创建方式
}
```

---

## 二、管理员考勤总览（新增）

### 目标
管理员可查看全校所有考勤记录，支持多维度筛选和统计。

### 功能设计

#### 2.1 考勤总览页面
- 路径：`pages/admin/attendance/attendance`
- 统计卡片：
  - 今日已点名社团数 / 总社团数
  - 今日出勤率
  - 本周缺勤人次
  - 待处理反馈数

#### 2.2 筛选维度
| 筛选项 | 选项 |
|--------|------|
| 日期范围 | 今日 / 本周 / 本月 / 自定义 |
| 学部 | 全部 / 具体学部 |
| 社团 | 全部 / 具体社团 |
| 考勤状态 | 全部 / 出勤 / 缺勤 |
| 班级 | 全部 / 具体班级 |

> **注**：考勤状态保持 `present`/`absent` 两种。请假情况由班主任通过反馈功能说明。

#### 2.3 列表展示
- 按日期分组显示
- 每条记录：社团名 + 老师 + 点名时间 + 出勤率
- 点击展开查看详细学生列表

### 云函数扩展
在 `cloudfunctions/attendance/index.js` 新增：
```javascript
// 新增 action
getAdminOverview   // 管理员总览数据
getStatistics      // 统计数据（饼图/趋势图用）
```

---

## 三、数据导出功能（新增）

### 目标
支持将考勤数据导出，可按分类筛选。

### 功能设计

#### 3.1 导出入口
- 位置：管理员考勤总览页面的「导出」按钮
- 支持角色：admin（全量）、leader（本学部）、classTeacher（本班）

#### 3.2 导出选项
| 选项 | 说明 |
|------|------|
| 时间范围 | 今日 / 本周 / 本月 / 自定义 |
| 数据范围 | 全部 / 指定学部 / 指定社团 / 指定班级 |
| 导出格式 | Excel (.xlsx) |
| 导出内容 | 明细 / 汇总统计 |

#### 3.3 导出字段
**明细导出：**
| 字段 | 说明 |
|------|------|
| 日期 | 点名日期 |
| 社团 | 社团名称 |
| 学生姓名 | - |
| 班级 | - |
| 学部 | - |
| 状态 | 出勤/缺勤 |
| 点名老师 | - |
| 点名时间 | - |

**汇总导出：**
| 字段 | 说明 |
|------|------|
| 学生姓名 | - |
| 班级 | - |
| 应到次数 | - |
| 出勤次数 | - |
| 缺勤次数 | - |
| 出勤率 | - |
| 班主任反馈 | 如有 |

#### 3.4 技术方案
**方案 A：云函数生成 + 云存储**
1. 云函数查询数据，使用 `xlsx` 包生成 Excel
2. 上传到云存储，返回临时下载链接
3. 小程序调用 `wx.downloadFile` + `wx.openDocument`

**方案 B：小程序端生成**
1. 云函数返回 JSON 数据
2. 小程序端使用 `xlsx` 包生成（需考虑包体积）
3. 保存到本地

**推荐方案 A**，云端处理更可靠。

### 云函数新增
```javascript
// 新建 cloudfunctions/export/index.js
const handlers = {
  attendance,     // 导出考勤明细
  summary,        // 导出汇总统计
  students        // 导出学生名单
}
```

---

## 四、转社团功能

### 业务流程
| 发起方 | 场景 | 审批流程 |
|--------|------|----------|
| 旧老师 | 转出学生 | 旧发起 → 新确认 → 班主任审批 |
| 新老师 | 搜索招入 | 新发起 → 旧确认 → 班主任审批 |
| 班主任 | 未入社学生入社 | 班主任发起 → 新老师确认 → 生效 |

### 新增数据库集合
```javascript
// transfer_requests
{
  studentId, studentName, className,
  fromClub, toClub,
  initiatorType: "fromTeacher" | "toTeacher" | "classTeacher",
  status: "pending_teacher" | "pending_classTeacher" | "approved" | "rejected",
  createTime, updateTime
}
```

### 需要创建的页面
- `pages/teacher/search/search` - 新老师搜索学生
- `pages/common/transfer/transfer` - 转社团申请列表
- `pages/classTeacher/addStudent/addStudent` - 班主任添加学生

---

## 五、多次未到标记

### 规则
- 统计周期：自然月
- 预警阈值：>=3次缺课
- 可见范围：所有角色

### 实现方式
实时计算，查询时统计当月缺课次数。

---

## 六、通知系统

### 通知类型
| type | 接收人 | 触发时机 |
|------|--------|----------|
| `absence_warning` | 班主任 | 学生月缺课>=3次 |
| `transfer_request` | 老师 | 收到转社团申请 |
| `transfer_result` | 发起人 | 申请结果 |
| `register_result` | 用户 | 注册审批结果 |
| `user_added` | 新用户 | 管理员添加用户（新增） |

### 数据结构
```javascript
// notifications
{ type, recipientId, title, content, data, read, createTime }
```

---

## 七、个人中心页面

> 各角色非核心功能全部收入"我的"页面，通过菜单项入口访问。

### 社团老师 (teacher) - 我的页面菜单

| 菜单项 | 图标 | 跳转页面 | 说明 |
|--------|------|----------|------|
| 社团管理 | `friends` | `/pages/teacher/club/club` | 学生名单、出勤排行 |
| 历史记录 | `records` | `/pages/teacher/history/history` | 点名历史 |
| 转社团申请 | `orders-o` | `/pages/common/transfer/transfer` | 转入/转出申请 |
| 通知中心 | `bell` | `/pages/common/notifications/notifications` | 消息列表 |
| 切换身份 | `exchange` | `/pages/common/switchRole/switchRole` | - |
| 添加新身份 | `add-o` | `/pages/register/register` | - |
| 使用帮助 | `question-o` | - | - |
| 退出登录 | `revoke` | - | - |

### 班主任 (classTeacher) - 我的页面菜单

| 菜单项 | 图标 | 跳转页面 | 说明 |
|--------|------|----------|------|
| 学生管理 | `friends-o` | `/pages/classTeacher/students/students` | 学生社团归属、考勤详情 |
| 消息中心 | `chat-o` | `/pages/classTeacher/messages/messages` | 缺勤通知、审批 |
| 数据导出 | `down` | `/pages/common/export/export` | 导出本班考勤 |
| 转社团审批 | `orders-o` | `/pages/common/transfer/transfer` | 待审批列表 |
| 切换身份 | `exchange` | `/pages/common/switchRole/switchRole` | - |
| 添加新身份 | `add-o` | `/pages/register/register` | - |
| 使用帮助 | `question-o` | - | - |
| 退出登录 | `revoke` | - | - |

### 学部领导 (leader) - 我的页面菜单

| 菜单项 | 图标 | 跳转页面 | 说明 |
|--------|------|----------|------|
| 数据导出 | `down` | `/pages/common/export/export` | 导出学部考勤 |
| 通知中心 | `bell` | `/pages/common/notifications/notifications` | 消息列表 |
| 切换身份 | `exchange` | `/pages/common/switchRole/switchRole` | - |
| 添加新身份 | `add-o` | `/pages/register/register` | - |
| 使用帮助 | `question-o` | - | - |
| 退出登录 | `revoke` | - | - |

### 管理员 (admin) - 我的页面菜单

| 菜单项 | 图标 | 跳转页面 | 说明 |
|--------|------|----------|------|
| 用户管理 | `manager-o` | `/pages/admin/users/users` | 用户列表/审批 |
| 数据中心 | `bar-chart-o` | `/pages/admin/data/data` | 考勤总览/导出 |
| 通知中心 | `bell` | `/pages/common/notifications/notifications` | 消息列表 |
| 切换身份 | `exchange` | `/pages/common/switchRole/switchRole` | - |
| 添加新身份 | `add-o` | `/pages/register/register` | - |
| 使用帮助 | `question-o` | - | - |
| 退出登录 | `revoke` | - | - |

---

## 开发优先级

### 第一阶段：核心功能完善
| 顺序 | 功能 | 复杂度 | 说明 |
|------|------|--------|------|
| 1 | 各角色 TabBar 架构 | 中 | 基础框架，后续功能的入口 |
| 2 | 个人中心页面 | 低 | 所有角色通用 |
| 3 | 管理员用户管理 | 中 | 后台管理核心 |
| 4 | 管理员数据中心 | 中 | 考勤总览 + 导出 |

### 第二阶段：社团管理
| 顺序 | 功能 | 复杂度 | 说明 |
|------|------|--------|------|
| 5 | 社团老师 - 社团管理页 | 中 | 学生名单、出勤统计 |
| 6 | 学部领导 - 看板增强 | 低 | 在现有看板增加社团排名统计 |

### 第三阶段：协作功能
| 顺序 | 功能 | 复杂度 | 说明 |
|------|------|--------|------|
| 7 | 通知消息系统 | 中 | 各角色消息中心 |
| 8 | 转社团功能 | 高 | 多角色审批流程 |
| 9 | 班主任 - 学生管理 | 中 | 学生社团归属、考勤详情 |

### 第四阶段：增强功能
| 顺序 | 功能 | 复杂度 | 说明 |
|------|------|--------|------|
| 10 | 多次未到标记 | 低 | 缺勤预警 |

---

## 新增页面汇总

| 页面路径 | 功能 | 角色 |
|----------|------|------|
| `pages/admin/users/users` | 用户管理列表 | admin |
| `pages/admin/users/add` | 添加用户 | admin |
| `pages/admin/attendance/attendance` | 考勤总览 | admin |
| `pages/common/export/export` | 数据导出 | admin/leader/classTeacher |

---

## 新增/修改云函数汇总

| 云函数 | 新增 Actions |
|--------|--------------|
| user | `getAll`, `add`, `delete`, `update` |
| attendance | `getAdminOverview`, `getStatistics` |
| export（新建） | `attendance`, `summary`, `students` |
