# Vant Weapp → TDesign 小程序 迁移方案

## 概述

本文档描述将项目 UI 组件库从 Vant Weapp v1.11.7 迁移到 TDesign 小程序组件库的完整方案。

**迁移原因**：
- TDesign 是腾讯官方设计系统，与微信小程序生态更契合
- 提供更现代的设计风格和更好的维护支持
- 组件 API 设计更规范，文档更完善

---

## 组件使用统计

项目中使用了以下 Vant 组件（共 **25 种**），涉及 **30 个文件**：

| Vant 组件 | TDesign 对应组件 | 使用频次 | 优先级 |
|-----------|-----------------|---------|--------|
| `van-icon` | `t-icon` | 29 处 | P0 |
| `van-button` | `t-button` | 15 处 | P0 |
| `van-cell` / `van-cell-group` | `t-cell` / `t-cell-group` | 14 处 | P0 |
| `van-tag` | `t-tag` | 18 处 | P0 |
| `van-toast` | `t-toast` | 26 处 | P0 |
| `van-loading` | `t-loading` | 10 处 | P1 |
| `van-popup` | `t-popup` | 8 处 | P1 |
| `van-dialog` | `t-dialog` | 6 处 | P1 |
| `van-picker` | `t-picker` | 6 处 | P1 |
| `van-tabs` / `van-tab` | `t-tabs` / `t-tab-panel` | 4 处 | P1 |
| `van-grid` / `van-grid-item` | `t-grid` / `t-grid-item` | 4 处 | P2 |
| `van-search` | `t-search` | 3 处 | P2 |
| `van-field` | `t-input` / `t-textarea` | 3 处 | P2 |
| `van-tabbar` / `van-tabbar-item` | `t-tab-bar` / `t-tab-bar-item` | 1 处 | P2 |
| `van-swipe-cell` | `t-swipe-cell` | 1 处 | P3 |
| `van-action-sheet` | `t-action-sheet` | 1 处 | P3 |

---

## 涉及文件清单

### 页面文件（按分包分类）

#### 主包
- `pages/login/login.*`
- `pages/register/register.*`

#### admin 分包
- `pages/admin/approval/approval.*`
- `pages/admin/home/home.*`
- `pages/admin/profile/profile.*`
- `pages/admin/users/users.*`
- `pages/admin/users/add.*`
- `pages/admin/data/data.*`

#### teacher 分包
- `pages/teacher/attendance/attendance.*`
- `pages/teacher/history/history.*`
- `pages/teacher/detail/detail.*`
- `pages/teacher/club/club.*`
- `pages/teacher/profile/profile.*`

#### classTeacher 分包
- `pages/classTeacher/overview/overview.*`
- `pages/classTeacher/feedback/feedback.*`
- `pages/classTeacher/profile/profile.*`
- `pages/classTeacher/students/students.*`
- `pages/classTeacher/studentDetail/studentDetail.*`

#### leader 分包
- `pages/leader/dashboard/dashboard.*`
- `pages/leader/detail/detail.*`
- `pages/leader/profile/profile.*`

#### common 分包
- `pages/common/switchRole/switchRole.*`
- `pages/common/notifications/notifications.*`
- `pages/common/transfer/transfer.*`
- `pages/common/transfer/create.*`
- `pages/common/export/export.*`
- `pages/common/export/history.*`

### 组件文件
- `components/custom-tabbar/custom-tabbar.*`
- `components/empty-state/empty-state.*`

### 配置文件
- `app.json` - 全局组件占位符配置
- `package.json` - 依赖配置

---

## 迁移步骤

### 第一阶段：环境准备

#### 1.1 安装 TDesign 小程序组件库

```bash
npm install tdesign-miniprogram
```

#### 1.2 更新 package.json

```json
{
  "dependencies": {
    "tdesign-miniprogram": "^1.5.0"
  }
}
```

> 移除 `@vant/weapp` 依赖（迁移完成后）

#### 1.3 微信开发者工具构建 npm

1. 打开微信开发者工具
2. 工具 → 构建 npm
3. 确认 `miniprogram_npm/tdesign-miniprogram` 目录生成

#### 1.4 更新 app.json 组件占位符

```json
{
  "componentPlaceholder": {
    "t-button": "button",
    "t-toast": "view",
    "t-dialog": "view",
    "t-icon": "view",
    "t-cell": "view",
    "t-cell-group": "view",
    "t-input": "view",
    "t-picker": "view",
    "t-popup": "view",
    "t-tag": "view",
    "t-loading": "view",
    "t-tabs": "view",
    "t-tab-panel": "view",
    "t-search": "view",
    "t-grid": "view",
    "t-grid-item": "view",
    "t-tab-bar": "view",
    "t-tab-bar-item": "view",
    "t-swipe-cell": "view",
    "t-action-sheet": "view"
  }
}
```

---

### 第二阶段：基础组件迁移（P0 - 影响范围广）

#### 2.1 Icon 图标

```xml
<!-- Vant -->
<van-icon name="user-o" size="32rpx" color="#1890ff" />

<!-- TDesign -->
<t-icon name="user" size="32rpx" color="#1890ff" />
```

**图标名称映射**：
| Vant | TDesign |
|------|---------|
| `user-o` | `user` |
| `user-circle-o` | `user-circle` |
| `friends-o` | `usergroup` |
| `location-o` | `location` |
| `clock-o` | `time` |
| `manager-o` | `user-1` |
| `cluster-o` | `app` |
| `notes-o` | `file` |
| `arrow` | `chevron-right` |
| `arrow-down` | `chevron-down` |
| `warning-o` | `error-circle` |
| `info-o` | `info-circle` |
| `success` | `check-circle` |
| `plus` | `add` |

#### 2.2 Button 按钮

```xml
<!-- Vant -->
<van-button type="primary" size="small" loading="{{loading}}" bind:click="onClick">
  按钮文字
</van-button>

<!-- TDesign -->
<t-button theme="primary" size="small" loading="{{loading}}" bind:tap="onClick">
  按钮文字
</t-button>
```

**属性映射**：
| Vant | TDesign | 说明 |
|------|---------|------|
| `type="primary"` | `theme="primary"` | 类型 → 主题 |
| `type="danger"` | `theme="danger"` | - |
| `plain` | `variant="outline"` | 朴素按钮 |
| `block` | `block` | 块级按钮 |
| `bind:click` | `bind:tap` | 点击事件 |

#### 2.3 Tag 标签

```xml
<!-- Vant -->
<van-tag type="primary" plain size="medium">标签</van-tag>

<!-- TDesign -->
<t-tag theme="primary" variant="light" size="medium">标签</t-tag>
```

**属性映射**：
| Vant | TDesign |
|------|---------|
| `type="primary"` | `theme="primary"` |
| `type="success"` | `theme="success"` |
| `type="warning"` | `theme="warning"` |
| `type="danger"` | `theme="danger"` |
| `plain` | `variant="light"` 或 `variant="outline"` |
| `size="mini"` | `size="small"` |
| `size="medium"` | `size="medium"` |
| `size="large"` | `size="large"` |

#### 2.4 Toast 轻提示

```javascript
// Vant
import Toast from '@vant/weapp/toast/toast'
Toast.loading({ message: '加载中...' })
Toast.success('成功')
Toast.fail('失败')
Toast.clear()

// TDesign
import Toast from 'tdesign-miniprogram/toast/index'
Toast({
  context: this,
  selector: '#t-toast',
  message: '加载中...',
  theme: 'loading'
})
Toast({
  context: this,
  selector: '#t-toast',
  message: '成功',
  theme: 'success'
})
```

```xml
<!-- Vant -->
<van-toast id="van-toast" />

<!-- TDesign -->
<t-toast id="t-toast" />
```

---

### 第三阶段：表单和列表组件（P1）

#### 3.1 Cell 单元格

```xml
<!-- Vant -->
<van-cell-group title="分组标题">
  <van-cell title="标题" value="内容" is-link bind:click="onClick" />
</van-cell-group>

<!-- TDesign -->
<t-cell-group title="分组标题">
  <t-cell title="标题" note="内容" arrow hover bind:tap="onClick" />
</t-cell-group>
```

**属性映射**：
| Vant | TDesign |
|------|---------|
| `value` | `note` |
| `is-link` | `arrow` |
| `border` | `bordered` |
| `bind:click` | `bind:tap` |

#### 3.2 Loading 加载

```xml
<!-- Vant -->
<van-loading type="spinner" size="24px">加载中...</van-loading>

<!-- TDesign -->
<t-loading theme="spinner" size="48rpx" text="加载中..." />
```

#### 3.3 Popup 弹出层

```xml
<!-- Vant -->
<van-popup show="{{show}}" position="bottom" bind:close="onClose">
  内容
</van-popup>

<!-- TDesign -->
<t-popup visible="{{show}}" placement="bottom" bind:visible-change="onVisibleChange">
  内容
</t-popup>
```

#### 3.4 Picker 选择器

```xml
<!-- Vant -->
<van-picker
  columns="{{columns}}"
  show-toolbar
  bind:confirm="onConfirm"
  bind:cancel="onCancel"
/>

<!-- TDesign -->
<t-picker
  visible="{{visible}}"
  value="{{value}}"
  columns="{{columns}}"
  bind:confirm="onConfirm"
  bind:cancel="onCancel"
/>
```

#### 3.5 Dialog 对话框

```javascript
// Vant
import Dialog from '@vant/weapp/dialog/dialog'
Dialog.confirm({
  title: '提示',
  message: '确认操作？'
}).then(() => {
  // 确认
}).catch(() => {
  // 取消
})

// TDesign
import Dialog from 'tdesign-miniprogram/dialog/index'
const dialog = this.selectComponent('#t-dialog')
dialog.setData({
  visible: true,
  title: '提示',
  content: '确认操作？'
})
```

#### 3.6 Tabs 标签页

```xml
<!-- Vant -->
<van-tabs active="{{activeTab}}" bind:change="onTabChange" sticky>
  <van-tab title="标签1">内容1</van-tab>
  <van-tab title="标签2">内容2</van-tab>
</van-tabs>

<!-- TDesign -->
<t-tabs value="{{activeTab}}" bind:change="onTabChange" sticky>
  <t-tab-panel label="标签1" value="0">内容1</t-tab-panel>
  <t-tab-panel label="标签2" value="1">内容2</t-tab-panel>
</t-tabs>
```

---

### 第四阶段：导航和布局组件（P2）

#### 4.1 Search 搜索

```xml
<!-- Vant -->
<van-search
  value="{{searchValue}}"
  placeholder="搜索"
  bind:change="onSearchChange"
  bind:clear="onSearchClear"
/>

<!-- TDesign -->
<t-search
  value="{{searchValue}}"
  placeholder="搜索"
  bind:change="onSearchChange"
  bind:clear="onSearchClear"
/>
```

#### 4.2 Grid 宫格

```xml
<!-- Vant -->
<van-grid column-num="4" border="{{false}}">
  <van-grid-item icon="home-o" text="首页" />
</van-grid>

<!-- TDesign -->
<t-grid column="4" border="{{false}}">
  <t-grid-item icon="home" text="首页" />
</t-grid>
```

#### 4.3 TabBar 底部导航

```xml
<!-- Vant -->
<van-tabbar active="{{active}}" bind:change="onChange">
  <van-tabbar-item icon="home-o">首页</van-tabbar-item>
</van-tabbar>

<!-- TDesign -->
<t-tab-bar value="{{active}}" bind:change="onChange">
  <t-tab-bar-item icon="home">首页</t-tab-bar-item>
</t-tab-bar>
```

#### 4.4 Field 输入框

```xml
<!-- Vant -->
<van-field
  value="{{value}}"
  label="姓名"
  placeholder="请输入"
  bind:change="onChange"
/>

<!-- TDesign -->
<t-input
  value="{{value}}"
  label="姓名"
  placeholder="请输入"
  bind:change="onChange"
/>
```

---

### 第五阶段：其他组件（P3）

#### 5.1 SwipeCell 滑动单元格

```xml
<!-- Vant -->
<van-swipe-cell right-width="{{65}}">
  <van-cell title="内容" />
  <view slot="right" class="delete-btn">删除</view>
</van-swipe-cell>

<!-- TDesign -->
<t-swipe-cell right="{{rightActions}}">
  <t-cell title="内容" />
</t-swipe-cell>
```

#### 5.2 ActionSheet 动作面板

```xml
<!-- Vant -->
<van-action-sheet
  show="{{show}}"
  actions="{{actions}}"
  bind:select="onSelect"
  bind:close="onClose"
/>

<!-- TDesign -->
<t-action-sheet
  visible="{{show}}"
  items="{{actions}}"
  bind:selected="onSelect"
  bind:close="onClose"
/>
```

---

## 工具函数更新

### utils/error.js - SafeToast 更新

需要更新 `SafeToast` 工具类以适配 TDesign Toast API：

```javascript
// 更新前 (Vant)
const Toast = require('@vant/weapp/toast/toast')

// 更新后 (TDesign)
const Toast = require('tdesign-miniprogram/toast/index')

const SafeToast = {
  loading(options) {
    return Toast({
      context: getCurrentPages()[getCurrentPages().length - 1],
      selector: '#t-toast',
      message: options.message || '加载中...',
      theme: 'loading',
      duration: options.duration || 0
    })
  },
  // ... 其他方法类似更新
}
```

---

## 样式适配

### 主题色变量

TDesign 使用 CSS 变量定义主题，可在 `app.wxss` 中覆盖：

```css
page {
  --td-primary-color: #1890ff;
  --td-success-color: #52c41a;
  --td-warning-color: #faad14;
  --td-error-color: #ff4d4f;
}
```

### 组件样式穿透

TDesign 组件支持通过 `externalClasses` 自定义样式：

```xml
<t-button t-class="custom-btn">按钮</t-button>
```

---

## 迁移检查清单

- [ ] 安装 tdesign-miniprogram 依赖
- [ ] 构建 npm
- [ ] 更新 app.json 组件占位符
- [ ] 迁移 P0 组件（icon, button, tag, toast）
- [ ] 迁移 P1 组件（cell, loading, popup, picker, dialog, tabs）
- [ ] 迁移 P2 组件（search, grid, tabbar, field）
- [ ] 迁移 P3 组件（swipe-cell, action-sheet）
- [ ] 更新 SafeToast 工具类
- [ ] 更新主题色变量
- [ ] 移除 @vant/weapp 依赖
- [ ] 全量测试所有页面
- [ ] 更新项目文档

---

## 风险与注意事项

1. **API 差异**：部分组件属性名和事件名有变化，需仔细对照
2. **图标名称**：TDesign 图标命名风格不同，需逐一映射
3. **Toast 用法**：TDesign Toast 需要传入 context 和 selector
4. **样式兼容**：部分自定义样式可能需要调整

---

## 参考文档

- [TDesign 小程序组件库](https://tdesign.tencent.com/miniprogram/overview)
- [Vant Weapp 文档](https://vant-contrib.gitee.io/vant-weapp/)
