# Vant Weapp 最佳实践优化计划

## 当前问题诊断

### 1. 组件注册问题

| 问题 | 现状 | 官方推荐 |
|------|------|----------|
| 全局组件为空 | `app.json` 中 `usingComponents: {}` | 高频组件应全局注册 |
| Toast/Dialog 重复注册 | 每个页面单独注册 van-toast、van-dialog | 全局注册一次即可 |
| WXML 重复声明 | 35+ 处 `<van-toast id="van-toast" />` | 可在 app.json 全局注册后统一处理 |

### 2. 导入方式不一致

| 文件 | 当前方式 | 问题 |
|------|----------|------|
| `utils/error.js` | `import Toast from '@vant/weapp/toast/toast'` | ES6 模块语法 |
| 页面 JS 文件 | `require('../../../utils/error')` | CommonJS 语法 |
| 部分页面 | 直接 `import Dialog from '@vant/weapp/dialog/dialog'` | 混用风格 |

### 3. 缺少统一封装

- ✅ Toast 有 `SafeToast` 包装器（在 `utils/error.js`）
- ❌ Dialog 没有统一的安全调用方案
- ❌ 没有利用 `ConfigProvider` 进行主题管理

---

## 优化计划

### Phase 1: 全局组件注册（低风险）

**目标**：减少页面级重复配置

**修改文件**：`app.json`

```json
{
  "usingComponents": {
    "van-toast": "@vant/weapp/toast/index",
    "van-dialog": "@vant/weapp/dialog/index"
  }
}
```

**预期收益**：
- 减少 27 个页面 JSON 文件中的重复注册
- 简化新页面开发流程

---

### Phase 2: 统一 Dialog 封装（中等风险）

**目标**：创建 `SafeDialog` 工具，与 `SafeToast` 风格一致

**新增文件**：修改 `utils/error.js` 或新增 `utils/dialog.js`

```javascript
// utils/dialog.js
import Dialog from '@vant/weapp/dialog/dialog'

const SafeDialog = {
  /**
   * 确认对话框（Promise 风格）
   */
  confirm(options) {
    return Dialog.confirm({
      confirmButtonColor: '#1F6FAD',
      ...options
    })
  },

  /**
   * 确认对话框（async/await 风格）
   * @returns {Promise<boolean>} true=确认, false=取消
   */
  async confirmAsync(options) {
    try {
      await Dialog.confirm({
        confirmButtonColor: '#1F6FAD',
        ...options
      })
      return true
    } catch {
      return false
    }
  },

  /**
   * 提示对话框（仅确认按钮）
   */
  alert(options) {
    return Dialog.alert({
      confirmButtonColor: '#1F6FAD',
      ...options
    })
  },

  /**
   * 关闭对话框
   */
  close() {
    Dialog.close()
  }
}

module.exports = { SafeDialog }
```

**使用示例**：
```javascript
const { SafeDialog } = require('../../../utils/dialog')

// async/await 风格（推荐）
async onApprove(user) {
  const confirmed = await SafeDialog.confirmAsync({
    title: '确认通过',
    message: `确定通过 ${user.userName} 的注册申请吗？`
  })

  if (confirmed) {
    await this.doApprove(user)
  }
}
```

---

### Phase 3: 主题统一管理（低风险）

**目标**：使用 CSS Variables 统一 Vant 组件主题

**修改文件**：`app.wxss`

```css
/* Vant 组件主题变量 */
page {
  /* 品牌色 */
  --button-primary-background-color: #1F6FAD;
  --button-primary-border-color: #1F6FAD;

  /* Dialog 确认按钮 */
  --dialog-confirm-button-text-color: #1F6FAD;

  /* Toast 样式 */
  --toast-max-width: 70%;
  --toast-background-color: rgba(0, 0, 0, 0.7);

  /* Tag 样式 */
  --tag-primary-color: #1F6FAD;
}
```

---

### Phase 4: 清理页面冗余配置（中等风险）

**目标**：移除页面 JSON 中的重复 van-toast、van-dialog 注册

**影响范围**：约 20+ 个页面 JSON 文件

**操作步骤**：
1. 完成 Phase 1 全局注册
2. 逐页面移除 `van-toast` 和 `van-dialog` 的重复注册
3. 保留页面特有组件的注册

**示例**（pages/login/login.json）：
```json
// 修改前
{
  "usingComponents": {
    "van-button": "@vant/weapp/button/index",
    "van-icon": "@vant/weapp/icon/index",
    "van-toast": "@vant/weapp/toast/index"  // 移除
  }
}

// 修改后
{
  "usingComponents": {
    "van-button": "@vant/weapp/button/index",
    "van-icon": "@vant/weapp/icon/index"
  }
}
```

---

### Phase 5: 统一导入风格（低风险）

**目标**：统一使用 CommonJS 的 `require` 语法

**原因**：
- 微信小程序原生不完全支持 ES6 模块
- 项目其他文件均使用 `require`
- 避免构建工具兼容问题

**修改文件**：`utils/error.js`

```javascript
// 修改前
import Toast from '@vant/weapp/toast/toast'

// 修改后
const Toast = require('@vant/weapp/toast/toast')
```

---

## 实施优先级

| 阶段 | 内容 | 风险 | 耗时 | 优先级 |
|------|------|------|------|--------|
| Phase 1 | 全局组件注册 | 低 | 5分钟 | ⭐⭐⭐ 高 |
| Phase 2 | SafeDialog 封装 | 中 | 30分钟 | ⭐⭐ 中 |
| Phase 3 | 主题统一管理 | 低 | 10分钟 | ⭐⭐ 中 |
| Phase 4 | 清理冗余配置 | 中 | 1小时 | ⭐ 低 |
| Phase 5 | 统一导入风格 | 低 | 10分钟 | ⭐ 低 |

---

## 注意事项

1. **已移除 `"style": "v2"`**：避免微信新版样式与 Vant 冲突
2. **componentPlaceholder 保留**：用于懒加载优化，无需修改
3. **版本锁定**：当前使用 `@vant/weapp@1.11.7`，暂不升级

---

## 验证清单

- [x] Phase 1 完成后，新页面无需注册 van-toast/van-dialog
- [x] Phase 2 完成后，Dialog 调用支持 async/await
- [x] Phase 3 完成后，所有 Vant 组件颜色与品牌色一致
- [x] Phase 4 完成后，页面 JSON 文件更简洁
- [x] Phase 5 完成后，所有工具文件使用统一的 require 语法

## 执行记录

**执行时间**：2026-01-08

### Phase 1: 全局组件注册 ✅
- 修改 `app.json`，在 `usingComponents` 中添加 van-toast 和 van-dialog

### Phase 2: SafeDialog 封装 ✅
- 修改 `utils/error.js`，添加 SafeDialog 对象
- 支持 `confirm`、`confirmAsync`、`alert`、`close` 方法
- `confirmAsync` 支持 async/await，返回 boolean

### Phase 3: CSS Variables 统一主题 ✅
- 修改 `app.wxss`，添加 Vant 组件主题变量
- 统一品牌色 #1F6FAD

### Phase 4: 清理页面冗余配置 ✅
- 清理 27 个页面 JSON 文件中的 van-toast/van-dialog 注册
- 共移除 34 处冗余配置

### Phase 5: 统一 require 导入风格 ✅
- 修改 `utils/error.js`，将 `import` 改为 `require`
