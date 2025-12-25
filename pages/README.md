# pages - 页面模块

<!-- 一旦我所属的文件夹有所变化，请更新我 -->

## 架构说明

页面层是小程序的视图层，按照用户角色划分为不同的功能模块。每个角色拥有独立的页面目录，实现权限隔离和业务逻辑分离。

## 目录结构

### 管理员模块
- `admin/approval/` - 审批管理页面
- `admin/home/` - 管理员首页
- `admin/profile/` - 管理员个人中心
- `admin/users/` - 用户管理页面（支持预注册账号识别，通过 `_openid` 字段判断）
- `admin/data/` - 数据中心页面（用户/学生/考勤统计）

### 教师模块
- `teacher/attendance/` - 考勤管理页面
- `teacher/history/` - 历史记录页面
- `teacher/detail/` - 详情页面
- `teacher/club/` - 社团管理页面
- `teacher/profile/` - 教师个人中心

### 班主任模块
- `classTeacher/overview/` - 班级概览页面
- `classTeacher/feedback/` - 反馈管理页面
- `classTeacher/profile/` - 班主任个人中心
- `classTeacher/students/` - 学生列表页面
- `classTeacher/studentDetail/` - 学生详情页面

### 领导模块
- `leader/dashboard/` - 领导看板页面
- `leader/detail/` - 详情页面
- `leader/profile/` - 领导个人中心

### 公共模块
- `common/switchRole/` - 角色切换页面
- `common/notifications/` - 通知列表页面
- `common/transfer/` - 转班申请页面
- `common/export/` - 数据导出页面
- `common/behaviors/` - 分包共享行为混入
- `common/utils/` - 分包共享工具函数

### 认证模块
- `login/` - 登录页面
- `register/` - 注册页面

## 页面命名规范

每个页面目录包含四个文件：
- `{name}.js` - 页面逻辑
- `{name}.wxml` - 页面结构
- `{name}.wxss` - 页面样式
- `{name}.json` - 页面配置

## 角色权限

不同角色访问不同的页面模块，通过路由守卫和权限验证实现访问控制。
