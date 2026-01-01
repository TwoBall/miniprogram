# UI 设计统一规范

本文档定义了智慧社团管理系统的 UI 设计规范，用于确保所有页面的视觉风格和交互体验保持一致。

---

## 一、设计原则

1. **一致性**：相同功能使用相同的组件和交互方式
2. **简洁性**：减少视觉噪音，突出核心信息
3. **可访问性**：确保文字可读、点击区域足够大
4. **反馈性**：操作后给予明确的视觉反馈

---

## 二、颜色规范

### 品牌色
| 名称 | 色值 | 用途 |
|------|------|------|
| 主色 | `#1890ff` | 主要按钮、链接、选中状态 |
| 成功 | `#52c41a` | 成功提示、通过状态 |
| 警告 | `#faad14` | 警告提示、待处理状态 |
| 错误 | `#ff4d4f` | 错误提示、拒绝状态、危险操作 |
| 信息 | `#1890ff` | 信息提示 |

### 角色主题色
| 角色 | 渐变色 | 用途 |
|------|--------|------|
| 管理员 | `#667eea → #764ba2` | 管理员页面头部 |
| 教师 | `#667eea → #764ba2` | 教师页面头部 |
| 班主任 | `#11998e → #38ef7d` | 班主任页面头部 |
| 领导 | `#ee0979 → #ff6a00` | 领导页面头部 |

### 文本色
| 名称 | 色值 | 用途 |
|------|------|------|
| 标题 | `#333333` | 主标题、重要文字 |
| 正文 | `#666666` | 正文内容 |
| 辅助 | `#999999` | 辅助说明、时间戳 |
| 禁用 | `#cccccc` | 禁用状态文字 |

### 背景色
| 名称 | 色值 | 用途 |
|------|------|------|
| 页面背景 | `#f5f5f5` | 页面整体背景 |
| 卡片背景 | `#ffffff` | 卡片、弹窗背景 |
| 分割线 | `#e8e8e8` | 列表分割线、边框 |

---

## 三、组件规范

### 3.1 选择器组件

根据选项数量选择合适的组件：

| 选项数量 | 推荐组件 | 说明 |
|---------|---------|------|
| ≤ 6 个 | `van-action-sheet` | 底部弹出动作面板，一目了然 |
| > 6 个 | `van-popup` + `van-picker` | 滚动选择器，适合大量选项 |
| 日期/时间 | `van-datetime-picker` | 日期时间选择 |

**代码示例**：

```xml
<!-- van-popup + van-picker 组合 -->
<van-popup show="{{ showPicker }}" position="bottom" bind:close="onPickerClose">
  <van-picker
    show-toolbar
    title="选择学部"
    columns="{{ options }}"
    bind:confirm="onPickerConfirm"
    bind:cancel="onPickerClose"
  />
</van-popup>
```

**触发器样式**：使用 `van-cell` 或自定义筛选框

```xml
<!-- 方式1：使用 van-cell -->
<van-cell title="学部" value="{{ selectedDept }}" is-link bindtap="onShowPicker" />

<!-- 方式2：自定义筛选框（参考 club 页面） -->
<view class="filter-picker" bindtap="onShowPicker">
  <view class="filter-picker-content">
    <text class="filter-label">学部</text>
    <view class="filter-value">
      <text>{{ selectedDept }}</text>
      <van-icon name="arrow-down" size="12px" color="#999" />
    </view>
  </view>
</view>
```

---

### 3.2 按钮组件

使用 `van-button` 组件，根据场景选择合适的属性：

| 场景 | type | size | 其他属性 |
|------|------|------|---------|
| 主要操作（提交/确认/登录） | `primary` | 默认或 `large` | `round`, `block` |
| 次要操作（取消/返回） | `default` | 默认 | - |
| 危险操作（删除/拒绝） | `danger` | 默认 | - |
| 列表内操作 | `primary` / `danger` | `small` | - |
| 加载中 | - | - | `loading`, `disabled` |

**代码示例**：

```xml
<!-- 主要按钮（全宽） -->
<van-button type="primary" block round loading="{{ loading }}" disabled="{{ loading }}">
  提交
</van-button>

<!-- 列表内操作按钮 -->
<van-button type="primary" size="small" bindtap="onApprove">通过</van-button>
<van-button type="danger" size="small" bindtap="onReject">拒绝</van-button>
```

---

### 3.3 卡片组件

所有卡片必须使用组合类名：`class="card xxx-card"`

**基础样式**（已在 `common.wxss` 中定义）：

```css
.card {
  background-color: #fff;
  border-radius: 12rpx;
  border: 2rpx solid #e8e8e8;
  margin-bottom: 20rpx;
}
```

**使用方式**：

```xml
<!-- 正确 -->
<view class="card notification-card">...</view>
<view class="card student-card">...</view>

<!-- 错误 - 不要单独定义卡片样式 -->
<view class="stat-card">...</view>
```

**页面特有样式**：仅定义差异部分

```css
/* 页面 WXSS */
.notification-card {
  padding: 32rpx 24rpx;
  display: flex;
  gap: 20rpx;
}
/* 不需要重复定义 background、border-radius、border */
```

---

### 3.4 空状态组件

统一使用自定义 `empty-state` 组件，**禁止使用原生 `van-empty`**。

**预设类型**：

| type | 描述 | 图标 |
|------|------|------|
| `default` | 默认空状态 | 通用空图标 |
| `students` | 暂无学生 | 学生图标 |
| `attendance` | 暂无点名记录 | 考勤图标 |
| `approval` | 暂无待审批 | 审批图标 |
| `notification` | 暂无通知 | 通知图标 |
| `search` | 搜索无结果 | 搜索图标 |
| `network` | 网络异常 | 网络图标 |
| `history` | 暂无历史记录 | 历史图标 |
| `transfer` | 暂无转社团申请 | 转移图标 |
| `warning` | 暂无预警学生 | 预警图标 |

**代码示例**：

```xml
<!-- 使用预设类型 -->
<empty-state type="students" />

<!-- 自定义内容 -->
<empty-state
  title="暂无数据"
  description="请稍后再试"
  buttonText="刷新"
  bind:action="onRefresh"
/>
```

---

### 3.5 加载状态

| 场景 | 组件/方法 | 说明 |
|------|----------|------|
| 首屏加载 | `skeleton` | 骨架屏占位 |
| 操作中（提交/删除） | `SafeToast.loading()` | Toast 加载提示 |
| 列表加载更多 | `van-loading` | 底部加载指示器 |
| 下拉刷新 | 系统自带 | `enablePullDownRefresh` |

**骨架屏使用**：

```xml
<!-- 首屏骨架屏 -->
<block wx:if="{{ pageLoading }}">
  <skeleton type="list" count="{{5}}" />
</block>
<block wx:else>
  <!-- 实际内容 -->
</block>
```

**SafeToast 使用**：

```javascript
const { SafeToast } = require('../../../utils/error')

// 加载中
await SafeToast.loading({ message: '加载中...' })

// 成功
SafeToast.success('操作成功')

// 失败
SafeToast.fail('操作失败')

// 清除
SafeToast.clear()
```

---

### 3.6 弹窗提示

| 场景 | 方法 | 说明 |
|------|------|------|
| 成功提示 | `SafeToast.success()` | 绿色勾图标 |
| 失败提示 | `SafeToast.fail()` | 红色叉图标 |
| 加载提示 | `SafeToast.loading()` | 加载动画 |
| 确认对话框 | `van-dialog` | 需用户确认的操作 |

**禁止使用**：
- `wx.showToast()`
- `wx.showModal()`
- `wx.showLoading()`

**Dialog 使用示例**：

```xml
<!-- WXML -->
<van-dialog id="van-dialog" />
```

```javascript
// JS
import Dialog from '@vant/weapp/dialog/dialog'

// 确认对话框
Dialog.confirm({
  title: '确认删除',
  message: '删除后不可恢复，是否继续？'
}).then(() => {
  // 确认
}).catch(() => {
  // 取消
})
```

---

### 3.7 表单输入

使用 `van-field` 和 `van-cell-group` 组合：

**规范**：
- 统一 `label-width="180rpx"`（可根据实际调整）
- 必填字段添加 `required` 属性
- 使用 `placeholder` 提示用户

**代码示例**：

```xml
<van-cell-group>
  <van-field
    label="姓名"
    value="{{ name }}"
    placeholder="请输入姓名"
    required
    label-width="180rpx"
    bind:change="onNameChange"
  />
  <van-field
    label="手机号"
    value="{{ phone }}"
    placeholder="请输入手机号"
    type="number"
    maxlength="11"
    label-width="180rpx"
    bind:change="onPhoneChange"
  />
</van-cell-group>
```

---

### 3.8 Tab 切换

使用统一的 Tab 样式（已在 `common.wxss` 中定义）：

```xml
<view class="tabs">
  <view
    class="tab-item {{ activeTab === 'all' ? 'active' : '' }}"
    data-tab="all"
    bindtap="onTabChange"
  >
    全部
  </view>
  <view
    class="tab-item {{ activeTab === 'pending' ? 'active' : '' }}"
    data-tab="pending"
    bindtap="onTabChange"
  >
    待处理
  </view>
</view>
```

或使用 Vant 的 `van-tabs`：

```xml
<van-tabs active="{{ activeTab }}" bind:change="onTabChange">
  <van-tab title="全部" name="all" />
  <van-tab title="待处理" name="pending" />
</van-tabs>
```

---

## 四、间距规范

| 名称 | 值 | 用途 |
|------|-----|------|
| 页面边距 | `30rpx` | 页面左右边距 |
| 卡片间距 | `20rpx` | 卡片之间的间距 |
| 内容间距 | `24rpx` | 卡片内部上下间距 |
| 元素间距 | `16rpx` | 同一区块内元素间距 |
| 文字行距 | `1.5` | 正文行高 |

---

## 五、字体规范

| 类型 | 大小 | 字重 | 用途 |
|------|------|------|------|
| 大标题 | `40rpx` | 700 | 页面标题 |
| 标题 | `32rpx` | 600 | 卡片标题、列表项名称 |
| 正文 | `28rpx` | 400 | 正文内容 |
| 辅助文字 | `24rpx` | 400 | 时间、说明文字 |
| 小字 | `22rpx` | 400 | 标签、徽章 |

---

## 六、实施检查清单

### 第一阶段：统一空状态组件
- [ ] 替换所有 `van-empty` 为 `empty-state`
- [ ] 涉及页面：学生列表、考勤详情、搜索结果等

### 第二阶段：统一选择器风格
- [ ] export 页面筛选改为 van-popup + van-picker
- [ ] 确保触发器样式统一

### 第三阶段：统一按钮样式
- [ ] login 页面按钮改为 `type="primary"`
- [ ] register 页面按钮改为 `type="primary"`
- [ ] 检查所有列表操作按钮使用 `size="small"`

### 第四阶段：统一卡片类名
- [ ] home 页面卡片添加 `.card` 基类
- [ ] data 页面卡片添加 `.card` 基类

### 第五阶段：清理旧 API 调用
- [ ] 搜索并替换 `wx.showToast` → `SafeToast`
- [ ] 搜索并替换 `wx.showModal` → `van-dialog`

---

## 七、相关文档

- [CARD_STYLE_GUIDE.md](./CARD_STYLE_GUIDE.md) - 卡片样式详细规范
- [styles/common.wxss](./styles/common.wxss) - 公共样式定义
- [styles/README.md](./styles/README.md) - 样式模块文档
- [components/README.md](./components/README.md) - 组件模块文档

---

*文档版本：1.0*
*更新时间：2026-01-01*
*项目：智慧社团管理系统*
