# common - 公共分包模块

<!-- 一旦我所属的文件夹有所变化，请更新我 -->

## 架构说明

公共分包模块包含所有角色共享的页面和资源。为优化主包体积，仅被分包使用的工具和行为混入也存放在此目录。

## 目录结构

### 页面
- `switchRole/` - 角色切换页面，支持多角色用户在不同身份间切换（使用 `_openid` 字段获取用户标识）
- `notifications/` - 通知列表页面
- `transfer/` - 转社团申请页面
- `export/` - 数据导出页面

### 共享资源
- `behaviors/` - 分包共享行为混入
  - `profileBehavior.js` - 个人中心页面通用行为
- `utils/` - 分包共享工具函数
  - `auth.js` - 身份认证工具
  - `date.js` - 日期处理工具

## 使用方式

### 引用共享行为
```javascript
const profileBehavior = require('../../common/behaviors/profileBehavior')

Page({
  behaviors: [profileBehavior],
  // ...
})
```

### 引用共享工具
```javascript
const auth = require('../../common/utils/auth')
const dateUtil = require('../../common/utils/date')
```

## 设计说明

将 `behaviors` 和部分 `utils` 移至此目录的原因：
1. 这些文件仅被分包页面使用，不被主包（login/register）使用
2. 微信小程序会将根目录的文件打包到主包
3. 移至分包可减少主包体积，满足 2MB 限制要求
