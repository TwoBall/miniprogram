# 智慧社团管理系统 - 分步实施指南

> 基于 NEW_FEATURES_PLAN.md 的详细开发步骤

---

## 第一阶段：核心功能完善

### 1.1 各角色 TabBar 架构

#### 目标
为每个角色创建独立的自定义 TabBar，每个角色只有 2 个 Tab（核心功能 + 我的）。

#### 前置条件
- 无

#### 实施步骤

**步骤 1：创建 TabBar 组件**

```
miniprogram/components/custom-tabbar/
├── custom-tabbar.js
├── custom-tabbar.json
├── custom-tabbar.wxml
└── custom-tabbar.wxss
```

```javascript
// custom-tabbar.js
Component({
  properties: {
    role: String,      // teacher | classTeacher | leader | admin
    active: Number     // 当前激活的 tab 索引
  },
  data: {
    tabs: {
      teacher: [
        { icon: 'records', text: '点名', url: '/pages/teacher/attendance/attendance' },
        { icon: 'user-o', text: '我的', url: '/pages/teacher/profile/profile' }
      ],
      classTeacher: [
        { icon: 'chart-trending-o', text: '总览', url: '/pages/classTeacher/overview/overview' },
        { icon: 'user-o', text: '我的', url: '/pages/classTeacher/profile/profile' }
      ],
      leader: [
        { icon: 'chart-trending-o', text: '看板', url: '/pages/leader/dashboard/dashboard' },
        { icon: 'user-o', text: '我的', url: '/pages/leader/profile/profile' }
      ],
      admin: [
        { icon: 'wap-home-o', text: '工作台', url: '/pages/admin/home/home' },
        { icon: 'user-o', text: '我的', url: '/pages/admin/profile/profile' }
      ]
    }
  },
  methods: {
    onChange(e) {
      const index = e.detail
      const tabs = this.data.tabs[this.properties.role]
      wx.redirectTo({ url: tabs[index].url })
    }
  }
})
```

**步骤 2：创建各角色页面目录**

```
miniprogram/pages/
├── teacher/
│   ├── attendance/     # 现有 - 点名页（TabBar）
│   ├── profile/        # 新建 - 我的（TabBar）
│   ├── history/        # 现有 - 历史记录（从profile进入）
│   └── club/           # 新建 - 社团管理（从profile进入）
├── classTeacher/
│   ├── overview/       # 现有 - 总览（TabBar）
│   ├── profile/        # 新建 - 我的（TabBar）
│   ├── students/       # 新建 - 学生管理（从profile进入）
│   ├── messages/       # 新建 - 消息中心（从profile进入）
│   └── feedback/       # 现有 - 反馈（从overview进入）
├── leader/
│   ├── dashboard/      # 现有 - 看板（TabBar）
│   └── profile/        # 新建 - 我的（TabBar）
└── admin/
    ├── home/           # 新建 - 工作台（TabBar）
    ├── profile/        # 新建 - 我的（TabBar）
    ├── users/          # 新建 - 用户管理（从profile进入）
    └── data/           # 新建 - 数据中心（从profile进入）
```

**步骤 3：更新 app.json**

```json
{
  "pages": [
    "pages/login/login",
    "pages/register/register",
    "pages/teacher/attendance/attendance",
    "pages/teacher/profile/profile",
    "pages/teacher/history/history",
    "pages/teacher/club/club",
    "pages/classTeacher/overview/overview",
    "pages/classTeacher/profile/profile",
    "pages/classTeacher/students/students",
    "pages/classTeacher/messages/messages",
    "pages/classTeacher/feedback/feedback",
    "pages/leader/dashboard/dashboard",
    "pages/leader/profile/profile",
    "pages/admin/home/home",
    "pages/admin/profile/profile",
    "pages/admin/users/users",
    "pages/admin/data/data",
    "pages/common/switchRole/switchRole",
    "pages/common/transfer/transfer",
    "pages/common/notifications/notifications",
    "pages/common/export/export"
  ]
}
```

**步骤 4：修改现有页面引入 TabBar**

每个 TabBar 页面需要：
1. 在 `.json` 中引入组件
2. 在 `.wxml` 底部添加 `<custom-tabbar>`
3. 在 `.js` 中设置当前 active 索引（0=核心功能, 1=我的）

#### 验收标准
- [ ] 各角色登录后显示对应 TabBar（2 个标签）
- [ ] Tab 切换正常跳转
- [ ] 页面刷新后 TabBar 状态正确

---

### 1.2 个人中心页面

#### 目标
创建统一的个人中心页面模板，根据角色动态显示菜单。

#### 前置条件
- 1.1 TabBar 架构完成

#### 实施步骤

**步骤 1：创建通用 Profile 页面**

```
miniprogram/pages/common/profile/
├── profile.js
├── profile.json
├── profile.wxml
└── profile.wxss
```

**步骤 2：定义菜单配置**

```javascript
// pages/common/profile/profile.js
const menuConfig = {
  // 社团老师菜单
  teacher: [
    { id: 'club', icon: 'friends', text: '社团管理', url: '/pages/teacher/club/club' },
    { id: 'history', icon: 'records', text: '历史记录', url: '/pages/teacher/history/history' },
    { id: 'transfer', icon: 'orders-o', text: '转社团申请', url: '/pages/common/transfer/transfer' },
    { id: 'notifications', icon: 'bell', text: '通知中心', url: '/pages/common/notifications/notifications' }
  ],
  // 班主任菜单
  classTeacher: [
    { id: 'students', icon: 'friends-o', text: '学生管理', url: '/pages/classTeacher/students/students' },
    { id: 'messages', icon: 'chat-o', text: '消息中心', url: '/pages/classTeacher/messages/messages' },
    { id: 'export', icon: 'down', text: '数据导出', url: '/pages/common/export/export' },
    { id: 'transfer', icon: 'orders-o', text: '转社团审批', url: '/pages/common/transfer/transfer' }
  ],
  // 学部领导菜单
  leader: [
    { id: 'export', icon: 'down', text: '数据导出', url: '/pages/common/export/export' },
    { id: 'notifications', icon: 'bell', text: '通知中心', url: '/pages/common/notifications/notifications' }
  ],
  // 管理员菜单
  admin: [
    { id: 'userManage', icon: 'manager-o', text: '用户管理', url: '/pages/admin/users/users' },
    { id: 'data', icon: 'bar-chart-o', text: '数据中心', url: '/pages/admin/data/data' },
    { id: 'notifications', icon: 'bell', text: '通知中心', url: '/pages/common/notifications/notifications' }
  ],
  // 通用菜单（所有角色共享）
  common: [
    { id: 'switchRole', icon: 'exchange', text: '切换身份', url: '/pages/common/switchRole/switchRole' },
    { id: 'addRole', icon: 'add-o', text: '添加新身份', url: '/pages/register/register' },
    { id: 'help', icon: 'question-o', text: '使用帮助', url: '/pages/common/help/help' },
    { id: 'logout', icon: 'revoke', text: '退出登录', action: 'logout' }
  ]
}
```

**步骤 3：实现页面逻辑**

```javascript
Page({
  data: {
    userInfo: null,
    menuList: []
  },
  onLoad() {
    const userInfo = wx.getStorageSync('userInfo')
    const role = userInfo?.role || 'teacher'

    // 合并通用菜单和角色菜单
    const menuList = [
      ...(menuConfig[role] || []),
      ...menuConfig.common
    ]

    this.setData({ userInfo, menuList })
  },
  onMenuTap(e) {
    const { url, action } = e.currentTarget.dataset
    if (action === 'logout') {
      this.handleLogout()
    } else if (url) {
      wx.navigateTo({ url })
    }
  },
  handleLogout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          wx.clearStorageSync()
          wx.reLaunch({ url: '/pages/login/login' })
        }
      }
    })
  }
})
```

**步骤 4：为各角色创建 profile 页面**

由于小程序限制，每个角色需要独立的 profile 页面，但可以复用逻辑：

```javascript
// pages/teacher/profile/profile.js
const profileBehavior = require('../../../behaviors/profileBehavior')
Page({
  behaviors: [profileBehavior],
  data: { role: 'teacher', tabIndex: 1 }  // tabIndex=1 表示"我的"是第二个 Tab
})
```

#### 验收标准
- [ ] 各角色显示正确的菜单项
- [ ] 菜单点击跳转正常
- [ ] 退出登录功能正常

---

### 1.3 管理员用户管理

#### 目标
管理员可查看所有用户、添加新用户、删除用户。

#### 前置条件
- 1.1 TabBar 架构完成
- 1.2 个人中心页面完成

#### 实施步骤

**步骤 1：扩展 user 云函数**

```javascript
// cloudfunctions/user/index.js

// 新增：获取所有用户（支持筛选分页）
async function getAll(event) {
  const { role, status, keyword, page = 1, pageSize = 20 } = event
  const db = cloud.database()
  const _ = db.command

  let condition = { deleted: _.neq(true) }

  if (role) condition.role = role
  if (status) condition.status = status
  if (keyword) {
    condition = _.and([
      condition,
      _.or([
        { name: db.RegExp({ regexp: keyword, options: 'i' }) },
        { department: db.RegExp({ regexp: keyword, options: 'i' }) },
        { clubName: db.RegExp({ regexp: keyword, options: 'i' }) }
      ])
    ])
  }

  const total = await db.collection('users').where(condition).count()
  const list = await db.collection('users')
    .where(condition)
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .orderBy('createTime', 'desc')
    .get()

  return {
    success: true,
    data: {
      list: list.data,
      total: total.total,
      page,
      pageSize
    }
  }
}

// 新增：管理员添加用户
async function add(event) {
  const { name, role, department, className, clubName } = event
  const db = cloud.database()

  // 验证必填字段
  if (!name || !role) {
    return { success: false, message: '姓名和角色为必填项' }
  }

  const userData = {
    name,
    role,
    department: department || '',
    className: className || '',
    clubName: clubName || '',
    status: 'approved',
    openid: '',  // 管理员创建的用户无 openid，等待用户首次登录绑定
    createdBy: 'admin',
    createTime: db.serverDate(),
    deleted: false
  }

  const result = await db.collection('users').add({ data: userData })

  return {
    success: true,
    data: { _id: result._id }
  }
}

// 新增：删除用户（软删除）
async function deleteUser(event) {
  const { userId, operatorId } = event
  const db = cloud.database()

  await db.collection('users').doc(userId).update({
    data: {
      deleted: true,
      deletedAt: db.serverDate(),
      deletedBy: operatorId
    }
  })

  return { success: true }
}

// 新增：更新用户信息
async function update(event) {
  const { userId, ...updateData } = event
  const db = cloud.database()

  // 移除不允许更新的字段
  delete updateData.openid
  delete updateData._id

  await db.collection('users').doc(userId).update({
    data: {
      ...updateData,
      updateTime: db.serverDate()
    }
  })

  return { success: true }
}
```

**步骤 2：创建用户列表页面**

```
miniprogram/pages/admin/users/
├── users.js
├── users.json
├── users.wxml
└── users.wxss
```

```javascript
// pages/admin/users/users.js
Page({
  data: {
    users: [],
    loading: false,
    page: 1,
    hasMore: true,
    // 筛选条件
    roleFilter: '',
    statusFilter: '',
    keyword: ''
  },

  onLoad() {
    this.loadUsers()
  },

  async loadUsers(refresh = false) {
    if (this.data.loading) return
    if (!refresh && !this.data.hasMore) return

    const page = refresh ? 1 : this.data.page
    this.setData({ loading: true })

    try {
      const res = await wx.cloud.callFunction({
        name: 'user',
        data: {
          action: 'getAll',
          role: this.data.roleFilter,
          status: this.data.statusFilter,
          keyword: this.data.keyword,
          page,
          pageSize: 20
        }
      })

      const { list, total } = res.result.data
      this.setData({
        users: refresh ? list : [...this.data.users, ...list],
        page: page + 1,
        hasMore: this.data.users.length + list.length < total,
        loading: false
      })
    } catch (err) {
      console.error(err)
      this.setData({ loading: false })
    }
  },

  onAddUser() {
    wx.navigateTo({ url: '/pages/admin/users/add' })
  },

  async onDeleteUser(e) {
    const { id, name } = e.currentTarget.dataset

    const res = await wx.showModal({
      title: '确认删除',
      content: `确定要删除用户「${name}」吗？`
    })

    if (res.confirm) {
      await wx.cloud.callFunction({
        name: 'user',
        data: { action: 'delete', userId: id }
      })
      this.loadUsers(true)
    }
  }
})
```

**步骤 3：创建添加用户页面**

```
miniprogram/pages/admin/users/
├── add.js
├── add.json
├── add.wxml
└── add.wxss
```

#### 验收标准
- [ ] 用户列表正确显示
- [ ] 筛选和搜索功能正常
- [ ] 添加用户成功
- [ ] 删除用户成功（软删除）
- [ ] 分页加载正常

---

### 1.4 管理员数据中心

#### 目标
管理员可查看全校考勤统计，支持数据导出。

#### 前置条件
- 1.3 用户管理完成

#### 实施步骤

**步骤 1：扩展 attendance 云函数**

```javascript
// cloudfunctions/attendance/index.js

// 新增：管理员总览数据
async function getAdminOverview(event) {
  const { startDate, endDate, department } = event
  const db = cloud.database()
  const _ = db.command

  let condition = {
    date: _.gte(startDate).and(_.lte(endDate))
  }
  if (department) {
    condition.department = department
  }

  // 获取所有记录
  const records = await getAllData('attendance_records', condition)

  // 统计
  let totalStudents = 0
  let presentCount = 0
  let absentCount = 0
  const clubStats = {}

  records.forEach(record => {
    record.students.forEach(student => {
      totalStudents++
      if (student.status === 'present') {
        presentCount++
      } else {
        absentCount++
      }
    })

    // 按社团统计
    if (!clubStats[record.clubName]) {
      clubStats[record.clubName] = { total: 0, present: 0 }
    }
    record.students.forEach(s => {
      clubStats[record.clubName].total++
      if (s.status === 'present') clubStats[record.clubName].present++
    })
  })

  return {
    success: true,
    data: {
      totalRecords: records.length,
      totalStudents,
      presentCount,
      absentCount,
      attendanceRate: totalStudents ? (presentCount / totalStudents * 100).toFixed(1) : 0,
      clubStats
    }
  }
}

// 新增：统计数据（用于图表）
async function getStatistics(event) {
  const { type, startDate, endDate, department } = event
  const db = cloud.database()
  const _ = db.command

  // 按日期分组统计
  // ... 实现略
}
```

**步骤 2：创建数据中心页面**

```
miniprogram/pages/admin/data/
├── data.js
├── data.json
├── data.wxml
└── data.wxss
```

**步骤 3：创建导出云函数**

```javascript
// cloudfunctions/export/index.js
const cloud = require('wx-server-sdk')
const xlsx = require('xlsx')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event) => {
  const handlers = { attendance, summary, students }
  return handlers[event.action](event)
}

async function attendance(event) {
  const { startDate, endDate, department, clubName } = event
  const db = cloud.database()

  // 查询数据
  // ...

  // 生成 Excel
  const workbook = xlsx.utils.book_new()
  const worksheet = xlsx.utils.json_to_sheet(data)
  xlsx.utils.book_append_sheet(workbook, worksheet, '考勤明细')

  const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' })

  // 上传到云存储
  const result = await cloud.uploadFile({
    cloudPath: `exports/attendance_${Date.now()}.xlsx`,
    fileContent: buffer
  })

  // 获取临时链接
  const { fileList } = await cloud.getTempFileURL({
    fileList: [result.fileID]
  })

  return {
    success: true,
    data: { url: fileList[0].tempFileURL }
  }
}
```

**步骤 4：安装 xlsx 依赖**

```bash
cd cloudfunctions/export
npm init -y
npm install xlsx
```

#### 验收标准
- [ ] 统计数据正确显示
- [ ] 筛选功能正常
- [ ] 数据导出成功
- [ ] Excel 文件内容正确

---

## 第二阶段：社团管理

### 2.1 社团老师 - 社团管理页

#### 目标
社团老师可查看学生名单、出勤率排行。

#### 前置条件
- 第一阶段全部完成

#### 实施步骤

**步骤 1：创建社团管理页面**

```
miniprogram/pages/teacher/club/
├── club.js
├── club.json
├── club.wxml
└── club.wxss
```

**步骤 2：页面功能实现**

```javascript
// pages/teacher/club/club.js
Page({
  data: {
    clubInfo: null,
    students: [],
    attendanceRank: [],
    activeTab: 'students'  // students | rank
  },

  onLoad() {
    const userInfo = wx.getStorageSync('userInfo')
    this.setData({ clubInfo: { name: userInfo.clubName } })
    this.loadStudents()
  },

  async loadStudents() {
    const userInfo = wx.getStorageSync('userInfo')
    const res = await wx.cloud.callFunction({
      name: 'students',
      data: {
        action: 'getByClub',
        clubName: userInfo.clubName
      }
    })
    this.setData({ students: res.result.data })
  },

  async loadAttendanceRank() {
    // 调用云函数获取出勤率排行
    const userInfo = wx.getStorageSync('userInfo')
    const res = await wx.cloud.callFunction({
      name: 'attendance',
      data: {
        action: 'getClubRank',
        clubName: userInfo.clubName
      }
    })
    this.setData({ attendanceRank: res.result.data })
  },

  onTabChange(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({ activeTab: tab })
    if (tab === 'rank' && this.data.attendanceRank.length === 0) {
      this.loadAttendanceRank()
    }
  }
})
```

**步骤 3：扩展 attendance 云函数**

```javascript
// 新增：获取社团出勤率排行
async function getClubRank(event) {
  const { clubName } = event
  const db = cloud.database()

  // 获取该社团所有考勤记录
  const records = await getAllData('attendance_records', { clubName })

  // 统计每个学生的出勤情况
  const studentStats = {}
  records.forEach(record => {
    record.students.forEach(s => {
      if (!studentStats[s.studentId]) {
        studentStats[s.studentId] = {
          name: s.name,
          className: s.className,
          total: 0,
          present: 0
        }
      }
      studentStats[s.studentId].total++
      if (s.status === 'present') {
        studentStats[s.studentId].present++
      }
    })
  })

  // 计算出勤率并排序
  const rank = Object.values(studentStats)
    .map(s => ({
      ...s,
      rate: s.total ? (s.present / s.total * 100).toFixed(1) : 0
    }))
    .sort((a, b) => b.rate - a.rate)

  return { success: true, data: rank }
}
```

#### 验收标准
- [ ] 学生名单正确显示
- [ ] 出勤率排行正确
- [ ] Tab 切换正常

---

### 2.2 学部领导 - 看板增强

#### 目标
在现有看板页面增加社团排名和统计数据。

#### 前置条件
- 2.1 社团管理页完成

#### 实施步骤

**步骤 1：扩展现有 dashboard 页面**

在 `pages/leader/dashboard/dashboard.js` 中增加社团统计功能：

```javascript
// pages/leader/dashboard/dashboard.js
Page({
  data: {
    // 现有数据...
    clubRanking: [],      // 社团出勤率排名
    showRanking: false    // 是否显示排名
  },

  async loadClubRanking() {
    const userInfo = wx.getStorageSync('userInfo')
    const res = await wx.cloud.callFunction({
      name: 'attendance',
      data: {
        action: 'getClubRanking',
        department: userInfo.department
      }
    })
    this.setData({ clubRanking: res.result.data })
  },

  onToggleRanking() {
    if (!this.data.showRanking && this.data.clubRanking.length === 0) {
      this.loadClubRanking()
    }
    this.setData({ showRanking: !this.data.showRanking })
  }
})
```

**步骤 2：扩展 attendance 云函数**

```javascript
// 新增：获取学部社团排名
async function getClubRanking(event) {
  const { department } = event
  const db = cloud.database()
  const _ = db.command

  // 获取本月考勤记录
  const now = new Date()
  const startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const endDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-31`

  const records = await getAllData('attendance_records', {
    department,
    date: _.gte(startDate).and(_.lte(endDate))
  })

  // 按社团统计出勤率
  const clubStats = {}
  records.forEach(record => {
    if (!clubStats[record.clubName]) {
      clubStats[record.clubName] = { total: 0, present: 0 }
    }
    record.students.forEach(s => {
      clubStats[record.clubName].total++
      if (s.status === 'present') clubStats[record.clubName].present++
    })
  })

  // 计算出勤率并排序
  const ranking = Object.entries(clubStats)
    .map(([name, stats]) => ({
      clubName: name,
      total: stats.total,
      present: stats.present,
      rate: stats.total ? (stats.present / stats.total * 100).toFixed(1) : 0
    }))
    .sort((a, b) => b.rate - a.rate)

  return { success: true, data: ranking }
}
```

**步骤 3：更新 dashboard 页面 UI**

在现有看板页面添加社团排名展示区域。

#### 验收标准
- [ ] 社团排名正确显示
- [ ] 出勤率计算准确
- [ ] 与现有看板功能兼容

---

## 第三阶段：协作功能

### 3.1 通知消息系统

#### 目标
实现站内通知功能，各角色可接收相关通知。

#### 前置条件
- 第二阶段全部完成

#### 实施步骤

**步骤 1：创建 notifications 集合**

```javascript
// 数据结构
{
  type: 'absence_warning' | 'transfer_request' | 'transfer_result' | 'register_result',
  recipientId: String,      // 接收人 openid 或 userId
  title: String,
  content: String,
  data: Object,             // 附加数据
  read: Boolean,
  createTime: Date
}
```

**步骤 2：创建 notification 云函数**

```
cloudfunctions/notification/
├── index.js
└── package.json
```

```javascript
// cloudfunctions/notification/index.js
exports.main = async (event) => {
  const handlers = {
    create,     // 创建通知
    getList,    // 获取通知列表
    markRead,   // 标记已读
    getUnreadCount  // 获取未读数
  }
  return handlers[event.action](event)
}
```

**步骤 3：创建通知中心页面**

```
miniprogram/pages/common/notifications/
├── notifications.js
├── notifications.json
├── notifications.wxml
└── notifications.wxss
```

**步骤 4：在关键操作中触发通知**

- 点名完成后，检查缺勤次数，触发 `absence_warning`
- 转社团申请提交后，触发 `transfer_request`
- 用户注册审批后，触发 `register_result`

#### 验收标准
- [ ] 通知列表正确显示
- [ ] 未读数正确
- [ ] 标记已读功能正常
- [ ] 通知触发正确

---

### 3.2 转社团功能

#### 目标
实现学生转社团的申请和审批流程。

#### 前置条件
- 3.1 通知系统完成

#### 实施步骤

**步骤 1：创建 transfer_requests 集合**

```javascript
{
  studentId: String,
  studentName: String,
  className: String,
  fromClub: String,
  toClub: String,
  initiatorType: 'fromTeacher' | 'toTeacher' | 'classTeacher',
  initiatorId: String,
  status: 'pending_teacher' | 'pending_classTeacher' | 'approved' | 'rejected',
  createTime: Date,
  updateTime: Date
}
```

**步骤 2：创建 transfer 云函数**

```javascript
// cloudfunctions/transfer/index.js
exports.main = async (event) => {
  const handlers = {
    create,       // 创建申请
    getList,      // 获取申请列表
    approve,      // 审批通过
    reject,       // 审批拒绝
    confirm       // 确认（老师间确认）
  }
  return handlers[event.action](event)
}
```

**步骤 3：创建转社团申请列表页面**

```
miniprogram/pages/common/transfer/
├── transfer.js
├── transfer.json
├── transfer.wxml
└── transfer.wxss
```

**步骤 4：创建新老师搜索学生页面**

```
miniprogram/pages/teacher/search/
├── search.js
├── search.json
├── search.wxml
└── search.wxss
```

#### 验收标准
- [ ] 转出申请流程正常
- [ ] 招入申请流程正常
- [ ] 班主任审批流程正常
- [ ] 状态流转正确
- [ ] 通知发送正确

---

### 3.3 班主任 - 学生管理

#### 目标
班主任可查看班级学生的社团归属和考勤详情。

#### 前置条件
- 3.2 转社团功能完成

#### 实施步骤

**步骤 1：创建学生管理页面**

```
miniprogram/pages/classTeacher/students/
├── students.js
├── students.json
├── students.wxml
└── students.wxss
```

**步骤 2：创建学生详情页面**

```
miniprogram/pages/classTeacher/studentDetail/
├── studentDetail.js
├── studentDetail.json
├── studentDetail.wxml
└── studentDetail.wxss
```

**步骤 3：扩展 students 云函数**

```javascript
// 新增：获取班级学生（含社团信息）
async function getByClass(event) {
  const { className } = event
  const db = cloud.database()

  const students = await db.collection('students')
    .where({ className })
    .get()

  return { success: true, data: students.data }
}
```

#### 验收标准
- [ ] 学生列表正确显示社团归属
- [ ] 学生考勤详情正确
- [ ] 问题学生标记显示

---

## 第四阶段：增强功能

### 4.1 多次未到标记

#### 目标
自动统计并标记当月缺勤>=3次的学生。

#### 前置条件
- 第三阶段全部完成

#### 实施步骤

**步骤 1：扩展 attendance 云函数**

```javascript
// 新增：获取问题学生列表
async function getAbsenceWarnings(event) {
  const { month, department, className, clubName } = event
  const db = cloud.database()
  const _ = db.command

  // 计算月份范围
  const startDate = `${month}-01`
  const endDate = `${month}-31`

  // 查询该月所有考勤记录
  let condition = {
    date: _.gte(startDate).and(_.lte(endDate))
  }
  if (department) condition.department = department
  if (clubName) condition.clubName = clubName

  const records = await getAllData('attendance_records', condition)

  // 统计每个学生的缺勤次数
  const absenceCount = {}
  records.forEach(record => {
    record.students.forEach(s => {
      if (s.status === 'absent') {
        const key = s.studentId
        if (!absenceCount[key]) {
          absenceCount[key] = {
            studentId: s.studentId,
            name: s.name,
            className: s.className,
            clubName: record.clubName,
            count: 0
          }
        }
        absenceCount[key].count++
      }
    })
  })

  // 筛选>=3次的学生
  const warnings = Object.values(absenceCount)
    .filter(s => s.count >= 3)
    .sort((a, b) => b.count - a.count)

  // 如果指定班级，再过滤
  if (className) {
    return {
      success: true,
      data: warnings.filter(s => s.className === className)
    }
  }

  return { success: true, data: warnings }
}
```

**步骤 2：在相关页面显示警告标记**

- 社团老师社团管理页
- 班主任学生管理页
- 学部领导看板页

#### 验收标准
- [ ] 缺勤>=3次学生正确标记
- [ ] 各角色页面显示警告
- [ ] 统计数据准确

---

## 部署检查清单

### 云函数部署顺序

1. `user` - 扩展现有
2. `students` - 扩展现有
3. `attendance` - 扩展现有
4. `notification` - 新建
5. `transfer` - 新建
6. `export` - 新建

### 数据库索引

```javascript
// users 集合
{ role: 1, status: 1 }
{ deleted: 1 }

// attendance_records 集合
{ date: 1, clubName: 1 }
{ date: 1, department: 1 }

// notifications 集合
{ recipientId: 1, read: 1 }
{ createTime: -1 }

// transfer_requests 集合
{ status: 1 }
{ fromClub: 1 }
{ toClub: 1 }
```

### 权限配置

```json
// 云数据库权限规则
{
  "notifications": {
    "read": "auth.openid == doc.recipientId",
    "write": "false"  // 仅云函数可写
  },
  "transfer_requests": {
    "read": "true",   // 相关人员可读
    "write": "false"  // 仅云函数可写
  }
}
```

---

## 版本记录

| 版本 | 日期 | 内容 |
|------|------|------|
| 1.0 | - | 初始版本 |
| 1.1 | - | 简化学部领导角色：移除审批中心和独立社团列表页，改为在现有看板增强社团统计功能，共 10 项功能 |
| 1.2 | - | TabBar 简化：每个角色只保留 2 个 Tab（核心功能 + 我的），其他功能收入"我的"页面菜单 |
