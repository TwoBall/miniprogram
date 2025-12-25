# 卡片样式规范 - 扁平描边风格

> 智慧社团管理系统 UI 规范文档

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
--card-padding: 28rpx;               /* 内边距 */
--card-gap: 16rpx;                   /* 卡片间距 */
```

---

## 基础卡片类

```css
/* styles/common.wxss */

/* 扁平描边卡片 - 基础类 */
.card {
  background: #ffffff;
  border: 1rpx solid #e8e8e8;
  border-radius: 12rpx;
  padding: 28rpx;
  margin-bottom: 16rpx;
  /* 无阴影 - 扁平风格核心 */
}

/* 卡片按压态 */
.card:active {
  background: #fafafa;
  border-color: #d0d0d0;
}

/* 选中/激活态 */
.card.active {
  border-color: #1F6FAD;
  border-width: 2rpx;
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

## 使用示例

### WXML

```html
<!-- 基础卡片 -->
<view class="card">
  <text>基础卡片内容</text>
</view>

<!-- 成功状态（如：出勤） -->
<view class="card card--success">
  <text>出勤记录</text>
</view>

<!-- 错误状态（如：缺勤） -->
<view class="card card--error">
  <text>缺勤记录</text>
</view>

<!-- 选中状态 -->
<view class="card active">
  <text>当前选中项</text>
</view>
```

---

## 需要修改的文件

| 文件路径 | 原类名 | 修改内容 |
|---------|--------|---------|
| `styles/common.wxss` | - | 新增 `.card` 基础类和变体 |
| `pages/admin/approval/approval.wxss` | `.user-card` | 移除阴影，添加边框 |
| `pages/teacher/history/history.wxss` | `.record-card` | 移除阴影，添加边框 |
| `pages/common/switchRole/switchRole.wxss` | `.role-card` | 移除阴影，添加边框 |
| `pages/classTeacher/overview/overview.wxss` | `.student-card` | 移除阴影，添加边框 |
| `pages/classTeacher/feedback/feedback.wxss` | `.info-card` | 移除阴影，添加边框 |
| `pages/leader/dashboard/dashboard.wxss` | `.class-card` | 移除阴影，添加边框 |

**例外**: `pages/teacher/attendance/attendance.wxss` 的滑动卡片保留阴影（交互反馈需要）

---

## 样式对比

| 属性 | 旧样式 | 新样式（扁平描边） |
|-----|-------|------------------|
| 边框 | 无 | `1rpx solid #e8e8e8` |
| 阴影 | `0 2rpx 12rpx rgba(0,0,0,0.08)` | 无 |
| 圆角 | `16rpx` | `12rpx` |
| 内边距 | `30rpx` | `28rpx` |
| 状态左边框 | `6rpx` | `4rpx` |

---

## 实施步骤

1. 在 `styles/common.wxss` 添加 `.card` 基础类和状态变体
2. 逐页面修改：移除 `box-shadow`，添加 `border`
3. 将页面特定类名（如 `.user-card`）改为使用 `.card` 基础类 + 变体
4. 验证各状态显示效果（正常、选中、禁用）
5. 真机测试边框渲染

---

## 版本

- v1.0 - 2024-01-XX - 初版，扁平描边风格规范
