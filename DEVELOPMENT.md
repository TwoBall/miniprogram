# 社团点名系统 - 开发文档

## 目录
- [项目概述](#项目概述)
- [技术架构](#技术架构)
- [开发环境](#开发环境)
- [项目结构](#项目结构)
- [核心功能](#核心功能)
- [数据库设计](#数据库设计)
- [API文档](#api文档)
- [开发规范](#开发规范)
- [常见问题](#常见问题)

---

## 项目概述

### 项目简介
社团点名系统是一个基于微信小程序和云开发的校内社团考勤管理系统，支持社团老师快捷点名、班主任实时查看学生到课情况、学部领导查看全学部考勤统计。

### 核心特性
- 🎯 **多角色权限管理**：支持社团老师、班主任、学部领导、系统管理员四种角色
- 📱 **快速点名**：支持滑动点名、一键全到、撤销操作
- 📊 **实时统计**：自动统计到课率、缺课人数等数据
- 💬 **反馈机制**：班主任可对缺课学生发送反馈
- 🔄 **角色切换**：支持一个用户拥有多个角色并自由切换

### 版本信息
- 当前版本：v1.1.0
- 更新日期：2025-12-21
- 基础库版本要求：2.2.3 或以上

---

## 技术架构

### 技术栈
- **前端框架**：微信小程序原生框架
- **UI组件库**：Vant Weapp 1.11.7
- **后端服务**：微信云开发
- **数据库**：云数据库（MongoDB）
- **云函数**：Node.js

### 架构设计
```
┌─────────────────────────────────────────┐
│           微信小程序前端                  │
├─────────────────────────────────────────┤
│  登录/注册  │  点名  │  查看  │  管理    │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│              云开发平台                   │
├─────────────────────────────────────────┤
│  云函数    │  云数据库  │  云存储        │
└─────────────────────────────────────────┘
```

---

## 开发环境

### 环境要求
- Node.js >= 14.0.0
- 微信开发者工具 >= 1.06.0
- 微信小程序账号（已开通云开发）

### 安装步骤

1. **克隆项目**
```bash
git clone <repository-url>
cd 我来点名啦
```

2. **安装依赖**
```bash
npm install
```

3. **配置云开发环境**
- 在微信开发者工具中打开项目
- 开通云开发并创建环境
- 修改 `app.js` 中的环境ID：
```javascript
wx.cloud.init({
  env: 'your-env-id', // 替换为您的云开发环境ID
  traceUser: true,
})
```

4. **创建数据库集合**
在云开发控制台创建以下集合：
- `users` - 用户表
- `students` - 学生表
- `attendance_records` - 点名记录表
- `feedbacks` - 反馈表

5. **部署云函数**
右键点击每个云函数文件夹，选择"上传并部署：云端安装依赖"：
- user
- students
- attendance
- submitFeedback

6. **导入学生数据**
```bash
cd tools
npm install
node convert.js
```
然后在云开发控制台导入生成的 JSON 文件。

---

## 项目结构

```
我来点名啦/
├── pages/                          # 页面目录
│   ├── login/                      # 登录页
│   ├── register/                   # 注册页
│   ├── common/                     # 公共页面
│   │   └── switchRole/             # 角色切换
│   ├── admin/                      # 管理员页面
│   │   └── approval/               # 审批管理
│   ├── teacher/                    # 社团老师页面
│   │   ├── attendance/             # 点名页面
│   │   ├── history/                # 历史记录
│   │   └── detail/                 # 记录详情
│   ├── classTeacher/               # 班主任页面
│   │   ├── overview/               # 班级概览
│   │   └── feedback/               # 发送反馈
│   └── leader/                     # 学部领导页面
│       ├── dashboard/              # 学部仪表盘
│       └── detail/                 # 班级详情
├── cloudfunctions/                 # 云函数目录
│   ├── user/                       # 用户管理
│   ├── students/                   # 学生管理
│   ├── attendance/                 # 考勤管理
│   └── submitFeedback/             # 提交反馈
├── styles/                         # 样式目录
│   └── common.wxss                 # 公共样式
├── images/                         # 图片资源
├── tools/                          # 工具脚本
│   └── convert.js                  # 数据转换工具
├── app.js                          # 小程序入口
├── app.json                        # 小程序配置
├── app.wxss                        # 全局样式
└── package.json                    # 项目配置
```

---

## 核心功能

### 1. 用户认证与权限管理

#### 登录流程
```javascript
// pages/login/login.js
async handleWxLogin() {
  // 1. 获取微信登录凭证
  const loginRes = await wx.login()
  
  // 2. 调用云函数验证用户
  const cloudRes = await wx.cloud.callFunction({
    name: 'user',
    data: { action: 'login' }
  })
  
  // 3. 根据返回结果跳转
  if (result.needRegister) {
    // 跳转注册页
  } else if (result.status === 'approved') {
    // 登录成功，跳转对应角色页面
  }
}
```

#### 角色权限
| 角色 | 权限 |
|------|------|
| 社团老师 | 点名、查看历史记录 |
| 班主任 | 查看本班学生考勤、发送反馈 |
| 学部领导 | 查看本学部所有班级考勤统计 |
| 系统管理员 | 审批用户注册申请 |

### 2. 点名功能

#### 滑动点名
```javascript
// pages/teacher/attendance/attendance.js
onTouchMove(e) {
  const moveX = e.touches[0].clientX - this.data.startX
  
  // 右滑标记到课
  if (moveX > threshold) {
    this.markPresent()
  }
  // 左滑标记缺课
  else if (moveX < -threshold) {
    this.markAbsent()
  }
}
```

#### 一键全到
```javascript
markAllPresent() {
  // 将剩余所有学生标记为到课
  for (let i = currentIndex; i < students.length; i++) {
    students[i].status = 'present'
  }
}
```

#### 撤销操作
```javascript
undoLast() {
  // 撤销上一次标记
  const lastAction = actionHistory.pop()
  student.status = null
}
```

### 3. 数据查询与统计

#### 按班级查询
```javascript
// cloudfunctions/attendance/index.js
async function handleGetByClass(event) {
  const { className, date } = event
  
  // 并行查询学生、考勤记录、反馈信息
  const [students, attendanceRecords, feedbacks] = await Promise.all([
    getAllData(db.collection('students'), { className }),
    getAllData(db.collection('attendance_records'), { date }),
    getAllData(db.collection('feedbacks'), { className, date })
  ])
  
  // 合并数据并返回统计结果
}
```

#### 按学部统计
```javascript
async function handleGetByDepartment(event) {
  const { department, date } = event
  
  // 按班级统计考勤情况
  const classMap = {}
  students.forEach(s => {
    if (!classMap[s.className]) {
      classMap[s.className] = { 
        totalStudents: 0, 
        present: 0, 
        absent: 0 
      }
    }
    classMap[s.className].totalStudents++
  })
  
  return { classes, totalStudents, presentToday, absentToday }
}
```

---

## 数据库设计

### users 集合（用户表）
```javascript
{
  _id: "auto_generated",
  openid: "wx_openid",           // 微信openid
  name: "张三",                   // 姓名
  role: "teacher",               // 角色: admin/teacher/classTeacher/leader
  department: "职教一部",         // 学部（leader角色）
  className: "23计算机1班",       // 班级（classTeacher角色）
  clubName: "篮球社",            // 社团（teacher角色）
  status: "approved",            // 状态: pending/approved/rejected
  createTime: Date,              // 创建时间
  updateTime: Date               // 更新时间
}
```

### students 集合（学生表）
```javascript
{
  _id: "auto_generated",
  name: "李四",                   // 姓名
  department: "职教一部",         // 学部
  className: "23计算机1班",       // 班级
  gender: "男",                   // 性别
  clubName: "篮球社",            // 所在社团
  classTeacher: "王老师",         // 班主任
  classTeacherPhone: "138****"   // 班主任电话
}
```

### attendance_records 集合（点名记录表）
```javascript
{
  _id: "auto_generated",
  clubName: "篮球社",            // 社团名称
  teacherId: "teacher_id",       // 教师ID
  teacherName: "张老师",          // 教师姓名
  date: "2025-12-21",            // 日期
  time: "14:30",                 // 时间
  records: [                     // 点名记录数组
    {
      studentId: "student_id",
      studentName: "李四",
      className: "23计算机1班",
      department: "职教一部",
      status: "present"          // present/absent
    }
  ],
  createTime: Date               // 创建时间
}
```

### feedbacks 集合（反馈表）
```javascript
{
  _id: "auto_generated",
  studentId: "student_id",       // 学生ID
  studentName: "李四",            // 学生姓名
  clubName: "篮球社",            // 社团名称
  className: "23计算机1班",       // 班级
  teacherName: "王老师",          // 班主任姓名
  feedback: "请注意按时上课",     // 反馈内容
  date: "2025-12-21",            // 日期
  createTime: Date               // 创建时间
}
```

---

## API文档

### 云函数：user

#### login - 用户登录
**请求参数：**
```javascript
{
  action: 'login'
}
```

**返回结果：**
```javascript
{
  success: true,
  needRegister: false,
  status: 'approved',
  userList: [
    {
      _id: "user_id",
      name: "张三",
      role: "teacher",
      clubName: "篮球社"
    }
  ]
}
```

#### register - 用户注册
**请求参数：**
```javascript
{
  action: 'register',
  openid: "wx_openid",
  name: "张三",
  role: "teacher",
  clubName: "篮球社"
}
```

**返回结果：**
```javascript
{
  success: true,
  message: "注册申请已提交，请等待审核"
}
```

#### approve - 审批通过
**请求参数：**
```javascript
{
  action: 'approve',
  userId: "user_id"
}
```

#### reject - 审批拒绝
**请求参数：**
```javascript
{
  action: 'reject',
  userId: "user_id",
  rejectReason: "信息不完整"
}
```

### 云函数：students

#### getByClub - 按社团获取学生
**请求参数：**
```javascript
{
  action: 'getByClub',
  clubName: "篮球社"
}
```

**返回结果：**
```javascript
{
  success: true,
  data: [
    {
      _id: "student_id",
      name: "李四",
      className: "23计算机1班",
      department: "职教一部"
    }
  ]
}
```

#### getFilterOptions - 获取筛选选项
**请求参数：**
```javascript
{
  action: 'getFilterOptions'
}
```

**返回结果：**
```javascript
{
  success: true,
  data: {
    departments: ["职教一部", "职教二部", "医药护理部"],
    classes: ["23计算机1班", "23计算机2班"],
    clubs: ["篮球社", "足球社"],
    classDeptMap: {
      "23计算机1班": "职教一部"
    }
  }
}
```

### 云函数：attendance

#### submit - 提交点名记录
**请求参数：**
```javascript
{
  action: 'submit',
  clubName: "篮球社",
  teacherId: "teacher_id",
  teacherName: "张老师",
  date: "2025-12-21",
  time: "14:30",
  mode: "add",  // add/cover
  records: [
    {
      studentId: "student_id",
      studentName: "李四",
      status: "present"
    }
  ]
}
```

#### getHistory - 获取历史记录
**请求参数：**
```javascript
{
  action: 'getHistory',
  teacherId: "teacher_id"
}
```

#### getByClass - 按班级获取考勤
**请求参数：**
```javascript
{
  action: 'getByClass',
  className: "23计算机1班",
  date: "2025-12-21"
}
```

#### getByDepartment - 按学部获取考勤
**请求参数：**
```javascript
{
  action: 'getByDepartment',
  department: "职教一部",
  date: "2025-12-21"
}
```

### 云函数：submitFeedback

#### 提交反馈
**请求参数：**
```javascript
{
  studentId: "student_id",
  studentName: "李四",
  clubName: "篮球社",
  className: "23计算机1班",
  teacherName: "王老师",
  feedback: "请注意按时上课",
  date: "2025-12-21"
}
```

---

## 开发规范

### 代码规范

#### 命名规范
- **变量名**：驼峰命名法 `userName`, `studentList`
- **常量名**：大写下划线 `MAX_LIMIT`, `DEFAULT_PAGE_SIZE`
- **函数名**：驼峰命名法，动词开头 `getUserInfo()`, `handleSubmit()`
- **文件名**：小写，多个单词用连字符 `user-info.js`

#### 注释规范
```javascript
/**
 * 函数功能说明
 * @param {string} userId - 用户ID
 * @param {Object} options - 配置选项
 * @returns {Promise<Object>} 返回用户信息
 */
async function getUserInfo(userId, options) {
  // 实现代码
}
```

#### 代码风格
- 使用 ES6+ 语法
- 使用 `const` 和 `let`，避免使用 `var`
- 使用箭头函数
- 使用模板字符串
- 使用解构赋值

### Git 提交规范
```
feat: 新功能
fix: 修复bug
docs: 文档更新
style: 代码格式调整
refactor: 重构代码
test: 测试相关
chore: 构建/工具链相关
```

### 错误处理
```javascript
try {
  const result = await someAsyncOperation()
  if (!result.success) {
    Toast.fail(result.message || '操作失败')
    return
  }
  // 处理成功逻辑
} catch (error) {
  console.error('操作失败:', error)
  Toast.fail('操作失败，请重试')
}
```

---

## 常见问题

### Q1: 云函数调用失败
**问题**：调用云函数时返回错误
**解决方案**：
1. 检查云函数是否已部署
2. 检查云开发环境ID是否正确
3. 查看云函数日志排查错误

### Q2: 数据库查询超过100条限制
**问题**：单次查询最多返回100条数据
**解决方案**：
使用 `getAllData` 辅助函数进行批量查询：
```javascript
async function getAllData(collection, condition) {
  const countResult = await collection.where(condition).count()
  const total = countResult.total
  
  if (total <= 100) {
    return await collection.where(condition).get()
  }
  
  // 分批查询
  const batchTimes = Math.ceil(total / 100)
  const tasks = []
  for (let i = 0; i < batchTimes; i++) {
    tasks.push(
      collection.where(condition)
        .skip(i * 100)
        .limit(100)
        .get()
    )
  }
  
  const results = await Promise.all(tasks)
  return results.flatMap(res => res.data)
}
```

### Q3: 用户登录后找不到账号
**问题**：用户微信登录后提示未找到账号
**解决方案**：
1. 确认学生数据已正确导入
2. 检查用户是否已注册并审核通过
3. 确认 openid 是否正确关联

### Q4: 点名记录提交失败
**问题**：提交点名记录时失败
**解决方案**：
1. 检查是否所有学生都已标记状态
2. 确认网络连接正常
3. 查看云函数日志排查错误

### Q5: 角色切换不生效
**问题**：切换角色后页面未更新
**解决方案**：
使用 `wx.reLaunch` 而不是 `wx.navigateTo`：
```javascript
wx.reLaunch({
  url: '/pages/teacher/attendance/attendance'
})
```

---

## 性能优化建议

### 1. 数据缓存
```javascript
// 缓存用户信息
wx.setStorageSync('userInfo', userInfo)

// 读取缓存
const userInfo = wx.getStorageSync('userInfo')
```

### 2. 并行请求
```javascript
// 使用 Promise.all 并行请求
const [students, records, feedbacks] = await Promise.all([
  getStudents(),
  getRecords(),
  getFeedbacks()
])
```

### 3. 按需加载
```javascript
// app.json 中启用按需加载
{
  "lazyCodeLoading": "requiredComponents"
}
```

### 4. 图片优化
- 使用 WebP 格式
- 压缩图片大小
- 使用云存储CDN

---

## 部署上线

### 1. 代码审查
- 检查所有功能是否正常
- 确认无调试代码
- 验证错误处理完善

### 2. 性能测试
- 测试大数据量场景
- 检查页面加载速度
- 验证云函数响应时间

### 3. 提交审核
- 填写小程序信息
- 上传代码
- 提交微信审核

### 4. 发布上线
- 审核通过后发布
- 监控线上运行状态
- 收集用户反馈

---

## 联系方式

如有问题或建议，请联系开发团队。

**文档版本**：v1.0.0  
**更新日期**：2025-12-22