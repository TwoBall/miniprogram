# common - 公共分包模块

<!-- 一旦我所属的文件夹有所变化，请更新我 -->

## 架构说明

公共分包模块包含所有角色共享的功能页面，如通知、转社团申请、数据导出等。

## 目录结构

### 页面
- `switchRole/` - 角色切换页面，支持多角色用户在不同身份间切换
- `notifications/` - 通知列表页面，展示系统通知和消息提醒
- `transfer/` - 转社团申请模块
  - `transfer.js` - 申请列表页面（查看和审批）
  - `create.js` - 发起申请页面（教师/班主任入口）
- `export/` - 数据导出页面，支持考勤明细、汇总、学生名单导出

## 功能说明

### 转社团申请 (transfer)
- 教师/班主任可发起学生转社团申请
- 原社团教师审批通过后自动更新学生社团信息
- 支持申请记录查看和状态跟踪

### 数据导出 (export)
- 支持按日期范围、学部、班级、社团筛选
- 导出格式：Excel (.xlsx)
- 导出类型：考勤明细、考勤汇总、学生名单

### 通知列表 (notifications)
- 分页加载通知列表
- 支持标记已读
- 点击通知可跳转相关页面

## 分包引用说明

本分包的页面需要引用主包中的工具和行为：

```javascript
// 引用主包 behaviors
const profileBehavior = require('../../../behaviors/profileBehavior')

// 引用主包 utils
const request = require('../../../utils/request')
```
