# 云函数公共模块复用方案设计

## 1. 问题分析

### 1.1 当前代码重复情况

| 文件 | 行数 | 重复内容 |
|------|------|----------|
| `cloudfunctions/attendance/utils.js` | 223 行 | 数据库工具、权限验证、常量、排序 |
| `cloudfunctions/students/utils.js` | 252 行 | 数据库工具、权限验证、常量、排序 |
| `cloudfunctions/export/utils.js` | 205 行 | 数据库工具、权限验证、常量 |
| `cloudfunctions/notification/utils.js` | 205 行 | 数据库工具、权限验证、常量 |

**重复代码总计约 885 行**，其中核心逻辑约 150 行被复制 4 次。

### 1.2 问题影响

- **维护成本高**：修改一处逻辑需要同步修改 4 个文件
- **易出错**：各文件可能出现细微差异（如注释不同）
- **代码膨胀**：每个云函数都包含不必要的代码

## 2. 解决方案

### 2.1 架构设计

```
cloudfunctions/
├── common/                    # 公共模块源码（单一真相源）
│   ├── index.js              # 统一导出入口
│   ├── db-utils.js           # 数据库工具
│   ├── auth-utils.js         # 权限验证工具
│   ├── response-utils.js     # 统一响应格式（新增）
│   ├── sort-utils.js         # 排序工具
│   └── constants.js          # 常量定义
├── scripts/                   # 构建脚本（新增）
│   └── sync-common.js        # 同步公共模块到各云函数
├── attendance/
│   ├── index.js
│   ├── package.json
│   └── common/               # 自动复制的公共模块（由脚本生成）
│       └── index.js
├── students/
│   ├── index.js
│   ├── package.json
│   └── common/
│       └── index.js
├── user/
│   ├── index.js
│   ├── package.json
│   └── common/
│       └── index.js
└── ...
```

### 2.2 构建脚本设计

创建 `cloudfunctions/scripts/sync-common.js`：

```javascript
/**
 * 同步公共模块到所有云函数
 * 使用方式：node cloudfunctions/scripts/sync-common.js
 */
const fs = require('fs')
const path = require('path')

// 需要同步的云函数目录
const CLOUD_FUNCTIONS = [
  'attendance',
  'students', 
  'user',
  'export',
  'notification',
  'transfer',
  'submitFeedback'
]

// 公共模块源目录
const COMMON_SRC = path.join(__dirname, '..', 'common')

// 同步函数
function syncCommon() {
  const commonFiles = fs.readdirSync(COMMON_SRC)
    .filter(f => f.endsWith('.js'))

  CLOUD_FUNCTIONS.forEach(funcName => {
    const targetDir = path.join(__dirname, '..', funcName, 'common')
    
    // 创建目标目录
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true })
    }

    // 复制所有文件
    commonFiles.forEach(file => {
      const src = path.join(COMMON_SRC, file)
      const dest = path.join(targetDir, file)
      fs.copyFileSync(src, dest)
      console.log(`Copied: ${funcName}/common/${file}`)
    })
  })

  console.log('Sync completed!')
}

syncCommon()
```

### 2.3 公共模块增强

#### 2.3.1 新增统一响应格式工具

`cloudfunctions/common/response-utils.js`：

```javascript
/**
 * 统一响应格式工具
 * 标准化云函数返回数据结构
 */

/**
 * 成功响应
 * @param {*} data - 返回数据
 * @param {string} message - 成功消息
 */
function success(data = null, message = '操作成功') {
  return {
    success: true,
    code: 0,
    message,
    data
  }
}

/**
 * 成功响应（带分页）
 * @param {Array} data - 数据列表
 * @param {Object} pagination - 分页信息
 * @param {string} message - 成功消息
 */
function successWithPagination(data, pagination, message = '获取成功') {
  return {
    success: true,
    code: 0,
    message,
    data,
    pagination
  }
}

/**
 * 失败响应
 * @param {string} message - 错误消息
 * @param {number} code - 错误码
 * @param {*} data - 附加数据
 */
function fail(message = '操作失败', code = -1, data = null) {
  return {
    success: false,
    code,
    message,
    data
  }
}

/**
 * 权限不足响应
 */
function unauthorized(message = '无权限执行此操作') {
  return fail(message, 401)
}

/**
 * 参数错误响应
 */
function badRequest(message = '参数错误') {
  return fail(message, 400)
}

/**
 * 资源不存在响应
 */
function notFound(message = '资源不存在') {
  return fail(message, 404)
}

/**
 * 错误处理包装器
 * 统一处理异步函数的错误
 */
function wrapHandler(handler) {
  return async (event, context) => {
    try {
      return await handler(event, context)
    } catch (error) {
      console.error('Handler error:', error)
      return fail('服务器内部错误: ' + error.message, 500)
    }
  }
}

module.exports = {
  success,
  successWithPagination,
  fail,
  unauthorized,
  badRequest,
  notFound,
  wrapHandler
}
```

#### 2.3.2 增强 db-utils.js

添加更多实用函数：

```javascript
/**
 * 批量更新数据
 * @param {Object} collection - 数据库集合
 * @param {Array} updates - 更新列表 [{id, data}]
 */
async function batchUpdate(collection, updates) {
  const tasks = updates.map(({ id, data }) => 
    collection.doc(id).update({ data })
  )
  return Promise.all(tasks)
}

/**
 * 批量删除数据
 * @param {Object} collection - 数据库集合
 * @param {Array} ids - ID 列表
 */
async function batchDelete(collection, ids) {
  const _ = collection.database().command
  return collection.where({
    _id: _.in(ids)
  }).remove()
}

/**
 * 安全获取单条记录
 * @param {Object} collection - 数据库集合
 * @param {string} id - 记录 ID
 * @returns {Object|null} 记录或 null
 */
async function getById(collection, id) {
  try {
    const res = await collection.doc(id).get()
    return res.data || null
  } catch (e) {
    return null
  }
}
```

### 2.4 云函数引用方式

修改后的云函数引用公共模块：

```javascript
// cloudfunctions/attendance/index.js
const cloud = require('wx-server-sdk')
const { getAllData, getAllDataSorted, paginate } = require('./common/db-utils')
const { verifyAdmin, verifyUser } = require('./common/auth-utils')
const { success, fail, unauthorized, wrapHandler } = require('./common/response-utils')
const { ROLES, USER_STATUS, ATTENDANCE_STATUS } = require('./common/constants')
const { sortStudentsByName } = require('./common/sort-utils')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = wrapHandler(async (event, context) => {
  const { action } = event
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  if (!openid) {
    return unauthorized('未授权访问')
  }

  // ... 业务逻辑
})
```

## 3. 实施计划

### 阶段 1：准备工作
- [x] 分析当前代码重复情况
- [ ] 创建构建脚本 `sync-common.js`
- [ ] 增强 common 模块，添加 response-utils.js

### 阶段 2：重构云函数
- [ ] 修改 attendance 云函数
- [ ] 修改 students 云函数
- [ ] 修改 user 云函数
- [ ] 修改 export 云函数
- [ ] 修改 notification 云函数
- [ ] 修改 transfer 云函数
- [ ] 修改 submitFeedback 云函数

### 阶段 3：删除旧代码
- [ ] 删除各云函数目录下的独立 utils.js
- [ ] 更新 package.json（如有需要）
- [ ] 更新 README.md 文档

### 阶段 4：验证测试
- [ ] 本地测试各云函数
- [ ] 部署到云端测试
- [ ] 验证所有功能正常

## 4. 使用流程

### 4.1 开发流程

```mermaid
flowchart LR
    A[修改 common 模块] --> B[运行 sync-common.js]
    B --> C[测试各云函数]
    C --> D[提交代码]
    D --> E[部署云函数]
```

### 4.2 命令行操作

```bash
# 同步公共模块
node cloudfunctions/scripts/sync-common.js

# 或者添加到 package.json scripts
npm run sync-common
```

## 5. 注意事项

1. **不要直接修改云函数目录下的 common/**：应该修改 `cloudfunctions/common/` 源码，然后运行同步脚本

2. **Git 忽略生成文件**：考虑是否将 `*/common/` 加入 .gitignore（推荐不忽略，便于代码审查）

3. **部署前先同步**：每次部署云函数前，确保运行同步脚本

4. **保持向后兼容**：修改公共模块时注意不要破坏现有 API

## 6. 预期收益

| 指标 | 改进前 | 改进后 | 提升 |
|------|--------|--------|------|
| 重复代码行数 | ~885 行 | ~150 行 | 减少 83% |
| 修改同步点 | 4-7 个文件 | 1 个文件 | 减少 85% |
| 维护复杂度 | 高 | 低 | 显著降低 |
| 新增云函数成本 | 复制粘贴 | 一键同步 | 效率提升 |