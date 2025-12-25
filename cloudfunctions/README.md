# cloudfunctions - 云函数模块

<!-- 一旦我所属的文件夹有所变化，请更新我 -->

## 架构说明

云函数层处理后端业务逻辑，运行在腾讯云环境中。每个云函数都是独立的服务单元，负责特定的业务功能。

## 文件索引

- `attendance/` - 考勤管理云函数，处理签到、签退、考勤记录查询等功能
- `students/` - 学生管理云函数，处理学生信息的增删改查
- `user/` - 用户管理云函数，处理用户认证、权限验证、用户信息管理
- `export/` - 数据导出云函数，生成并导出各类数据报表
- `notification/` - 通知推送云函数，发送系统通知和消息提醒
- `transfer/` - 转班处理云函数，处理学生转班申请和审批
- `submitFeedback/` - 反馈提交云函数，处理用户反馈信息的提交
- `migrateFields/` - 字段迁移云函数，处理数据库字段的迁移和更新
- `common/` - 公共模块模板（不需要上传，仅作为参考）

## 云函数结构

每个云函数目录包含：
- `index.js` - 云函数入口文件
- `package.json` - 依赖配置
- `utils.js` - 公共工具函数（复制自 common 模块）
- `config.json` (可选) - 云函数配置

## 公共工具模块

由于微信云开发不支持 `file:` 本地依赖，公共代码采用**复制方式**共享：

```
cloudfunctions/
  common/           # 公共模块模板（不上传）
    db-utils.js     # 数据库工具
    auth-utils.js   # 权限验证
    constants.js    # 常量定义
  attendance/
    utils.js        # 复制自 common，合并版公共工具
  students/
    utils.js        # 复制自 common
  ...
```

**使用方式**：
```javascript
const { getAllData, getAllDataSorted } = require('./utils')
```

**维护说明**：修改公共代码时，需要同步更新所有云函数目录下的 `utils.js`。

## 调用方式

小程序端通过 `wx.cloud.callFunction()` 调用云函数：

```javascript
wx.cloud.callFunction({
  name: '云函数名',
  data: {
    // 调用参数
  }
})
```

## 权限控制

云函数内部实现权限验证，确保只有授权用户才能执行敏感操作。
