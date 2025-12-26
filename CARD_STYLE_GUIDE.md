# 卡片样式规范 - 扁平描边风格

> 智慧社团管理系统 UI 规范文档
>
> **版本**: v1.1 | **状态**: ✅ 已实施

---

## 设计理念

采用**扁平描边**风格，移除阴影，使用细边框勾勒卡片轮廓。视觉更轻盈、现代，适合信息密集型界面。

---

## 核心样式变量

```css
/* 边框颜色 */
--card-border-color: #e8e8e8;        /* 默认边框 */
--card-border-hover: #d0d0d0;        /* 悬停边框 */
--card-border-active: #1F6FAD;       /* 激活/选中边框 */

/* 背景 */
--card-bg: #ffffff;
--card-bg-hover: #fafafa;

/* 圆角 */
--card-radius: 12rpx;                /* 统一圆角 */
--card-radius-sm: 8rpx;              /* 小圆角（内部元素） */

/* 间距 */
--card-padding: 24rpx;               /* 内边距 */
--card-gap: 20rpx;                   /* 卡片间距 */
```

---

## 基础卡片类

公共样式定义在 `styles/common.wxss`，通过 `app.wxss` 全局引入：

```css
/* styles/common.wxss */

/* 扁平描边卡片 - 基础类 */
.card {
  background-color: #fff;
  border: 2rpx solid #e8e8e8;
  border-radius: 12rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
  /* 无阴影 - 扁平风格核心 */
}

/* 卡片按压态 */
.card:active {
  background-color: #fafafa;
  border-color: #d0d0d0;
}
```

---

## 状态变体

通过左侧色条区分不同状态：

```css
/* 成功状态 - 绿色左边框 */
.card.card--success {
  border-left: 4rpx solid #52c41a;
}

/* 错误/警告状态 - 红色左边框 */
.card.card--error {
  border-left: 4rpx solid #ff4d4f;
}

/* 信息状态 - 蓝色左边框 */
.card.card--info {
  border-left: 4rpx solid #1F6FAD;
}

/* 禁用状态 */
.card.card--disabled {
  background: #f5f5f5;
  border-color: #d9d9d9;
  opacity: 0.6;
}
```

---

## 使用方式：组合类名模式

采用**组合类名**模式实现样式复用：WXML 中使用 `class="card xxx-card"`，页面 WXSS 仅定义特有样式。

### WXML 示例

```html
<!-- 组合类名：card（公共基础） + notification-item（页面特有） -->
<view class="card notification-item {{ !item.read ? 'unread' : '' }}">
  <text>通知内容</text>
</view>

<!-- 带状态变体 -->
<view class="card user-card approved">
  <text>已审批用户</text>
</view>

<!-- 带选中状态 -->
<view class="card role-card {{ item.isCurrent ? 'current' : '' }}">
  <text>当前角色</text>
</view>
```

### WXSS 示例

```css
/* 页面 WXSS - 仅定义特有样式，继承 .card 的基础样式 */

/* 通知项 - 继承公共 .card，仅覆盖特有样式 */
.notification-item {
  display: flex;
  align-items: flex-start;
  gap: 24rpx;
  padding: 32rpx 24rpx;  /* 覆盖默认 padding */
  position: relative;
}

/* 无需重复定义：background-color, border-radius, border, margin-bottom, :active */
```

---

## 已完成的文件修改

| 文件路径 | 类名 | 状态 |
|---------|------|------|
| `styles/common.wxss` | `.card` 基础类 | ✅ 已完成 |
| `pages/common/notifications/notifications` | `.notification-item` | ✅ 已完成 |
| `pages/common/transfer/transfer` | `.transfer-item` | ✅ 已完成 |
| `pages/common/switchRole/switchRole` | `.role-card` | ✅ 已完成 |
| `pages/admin/approval/approval` | `.user-card` | ✅ 已完成 |
| `pages/teacher/history/history` | `.record-card` | ✅ 已完成 |
| `pages/classTeacher/students/students` | `.student-item` | ✅ 已完成 |
| `pages/leader/detail/detail` | `.student-card` | ✅ 已完成 |

**例外**: `pages/teacher/attendance/attendance.wxss` 的滑动卡片保留阴影（交互反馈需要）

---

## 样式对比

| 属性 | 旧样式 | 新样式（扁平描边） |
|-----|-------|------------------|
| 边框 | 无 | `2rpx solid #e8e8e8` |
| 阴影 | `0 2rpx 12rpx rgba(0,0,0,0.08)` | 无 |
| 圆角 | `16rpx` | `12rpx` |
| 内边距 | `30rpx` | `24rpx` |
| 按压态 | 无 | `background-color: #fafafa; border-color: #d0d0d0` |

---

## 代码复用收益

通过组合类名模式，减少了约 **70 行**重复样式代码：

| 移除的重复属性 | 行数 |
|--------------|-----|
| `background-color: #fff` | 7 |
| `border-radius: 12rpx` | 7 |
| `border: 2rpx solid #e8e8e8` | 7 |
| `margin-bottom: 20rpx` | 7 |
| `:active` 样式块 | ~35 |
| `transition` | 7 |
| **总计** | **~70** |

---

## 版本历史

- v1.1 - 2024-12 - 完成样式复用实施，采用组合类名模式
- v1.0 - 2024-01 - 初版，扁平描边风格规范
