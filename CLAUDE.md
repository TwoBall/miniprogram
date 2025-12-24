# CLAUDE.md

此文件为 Claude Code (claude.ai/code) 在本仓库中工作时提供指导。

## 项目概述

社团点名系统 - 基于微信小程序和云开发的校内社团考勤管理系统。

**技术栈：**
- 前端：微信小程序原生框架（基础库 2.2.3+）
- UI组件：Vant Weapp 1.11.7
- 后端：微信云函数（Node.js）
- 数据库：云数据库（MongoDB）

## 常用命令

```bash
# 安装前端依赖
npm install

# 从Excel导入学生数据（需要xlsx包）
cd tools && npm install && node convert.js
```

**云函数部署：**
通过微信开发者工具，右键点击每个云函数文件夹，选择"上传并部署：云端安装依赖"：
- `cloudfunctions/user`
- `cloudfunctions/students`
- `cloudfunctions/attendance`
- `cloudfunctions/submitFeedback`

## 架构说明

### 按角色划分的页面结构
- `pages/teacher/` - 社团老师：点名、查看历史记录
- `pages/classTeacher/` - 班主任：查看学生考勤、发送反馈
- `pages/leader/` - 学部领导：查看学部考勤统计
- `pages/admin/` - 系统管理员：用户审批
- `pages/common/` - 公共页面（角色切换）

### 云函数模式
所有云函数使用基于 action 的分发模式：
```javascript
exports.main = async (event) => {
    const handlers = {
        action1: handleAction1,
        action2: handleAction2,
    }
    return handlers[event.action](event)
}
```

云函数列表：
- `user` - 用户管理（actions: login, register, approve, reject, getPending）
- `students` - 学生查询（actions: getByClub, getFilterOptions）
- `attendance` - 考勤管理（actions: submit, getHistory, getDetail, getByClass, getByDepartment, checkTodaySubmissions, updateRecords）
- `submitFeedback` - 提交反馈

### 数据库集合
- `users` - 用户表，含角色（admin/teacher/classTeacher/leader）和状态（pending/approved/rejected）
- `students` - 学生表，含社团归属
- `attendance_records` - 点名记录表，内嵌学生状态数组
- `feedbacks` - 反馈表，班主任对缺课的反馈

### 关键模式

**突破100条查询限制：**
`cloudfunctions/attendance/index.js` 中的 `getAllData` 辅助函数处理批量查询：
```javascript
async function getAllData(collection, condition, fields = null) {
    // 先统计总数，然后使用 Promise.all 配合 skip/limit 并行分批获取
}
```

**用户会话缓存：**
用户信息通过 `wx.setStorageSync('userInfo', ...)` 缓存，在 `app.js` 启动时恢复。

**全局组件：**
Vant Weapp 组件在 `app.json` 的 `usingComponents` 中全局注册。

## 提交规范

```
feat: 新功能
fix: 修复bug
docs: 文档更新
style: 代码格式调整
refactor: 重构代码
chore: 构建/工具链相关
```
