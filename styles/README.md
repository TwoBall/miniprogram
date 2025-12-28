# styles - 全局样式模块

<!-- 一旦我所属的文件夹有所变化，请更新我 -->

## 架构说明

全局样式层提供统一的 UI 规范和可复用的公共样式类。通过 `app.wxss` 引入，所有页面（包括分包）自动继承。

## 文件索引

- `common.wxss` - 公共样式类库（设计规范 + 可复用组件样式）
- `animations.wxss` - 动画样式库（入场动画、交互反馈、加载状态）
- `profile-base.wxss` - Profile 页面公共样式基类
- `student-list-base.wxss` - 学生列表页面公共样式基类

## common.wxss 公共样式类

### 设计规范

文件顶部包含完整的设计规范文档，定义了：
- 品牌色系、角色主题色
- 状态色（成功/错误/警告/信息）
- 文本色、背景色
- 边框与圆角规范
- 卡片风格（扁平描边）

### 可复用样式类

| 类名 | 用途 | 使用方式 |
|-----|------|---------|
| `.page-container` | 页面容器 | 直接使用 |
| `.card` | 通用卡片 | 组合类名：`class="card xxx-card"` |
| `.status-badge` | 状态标签 | 带变体：`.success`, `.error`, `.warning`, `.info` |
| `.tabs` + `.tab-item` | Tab 切换 | 直接使用 |
| `.ranking-item` | 排名项 | 直接使用 |
| `.rank-badge` | 排名徽章 | 带变体：`.first`, `.second`, `.third` |
| `.rate-badge` | 出勤率徽章 | 带变体：`.excellent`, `.good`, `.normal`, `.poor` |
| `.info-row` | 信息行 | 配合 `.label` 和 `.value` |
| `.stat-item` | 统计项 | 配合 `.stat-value` 和 `.stat-label` |
| `.loading-wrapper` | 加载容器 | 直接使用 |
| `.no-more` | 无更多数据 | 直接使用 |
| `.empty-state` | 空状态 | 直接使用 |

### 组合类名模式

推荐使用组合类名实现样式复用：

```html
<!-- WXML -->
<view class="card notification-item">...</view>
```

```css
/* WXSS - 仅定义特有样式 */
.notification-item {
  display: flex;
  padding: 32rpx 24rpx;
}
/* 无需重复定义 background-color, border-radius, border 等 */
```

## 使用规范

1. **全局引入**：`app.wxss` 已通过 `@import './styles/common.wxss'` 引入
2. **分包页面**：自动继承公共样式，无需额外引入
3. **样式覆盖**：页面特有样式通过组合类名覆盖公共样式
4. **命名约定**：页面特有类名使用语义化命名（如 `.notification-item`）

## 相关文档

- [CARD_STYLE_GUIDE.md](../CARD_STYLE_GUIDE.md) - 卡片样式详细规范

## animations.wxss 动画样式库

动画样式库提供统一的动画效果，提升用户交互体验。已在 `app.wxss` 中全局引入。

### 入场动画

| 类名 | 效果 | 时长 |
|-----|------|------|
| `.fade-in` | 淡入 | 0.3s |
| `.fade-in-up` | 向上淡入 | 0.4s |
| `.slide-in-left` | 从左滑入 | 0.3s |
| `.pop-in` | 弹入缩放 | 0.3s |
| `.card-pop-in` | 卡片弹入 | 0.35s |

### 列表动画

| 类名 | 效果 | 说明 |
|-----|------|------|
| `.list-item-enter` | 列表项入场 | 从左淡入，0.3s |
| `.card-list-enter` | 卡片列表入场 | 向上弹入，支持延迟 |
| `.delay-1` ~ `.delay-5` | 延迟修饰符 | 用于交错动画效果 |

### 交互反馈

| 类名 | 效果 | 用途 |
|-----|------|------|
| `.btn-active` | 按钮点击缩放 | 配合 `:active` 使用 |
| `.card-tap` | 卡片点击缩放 | 配合 `:active` 使用 |
| `.list-item-tap` | 列表项点击 | 背景色变化 + 缩放 |

### 加载动画

| 类名 | 效果 | 用途 |
|-----|------|------|
| `.pulse` | 脉冲闪烁 | 加载占位 |
| `.spin` | 旋转 | 加载图标 |
| `.shimmer` | 微光扫过 | 骨架屏效果 |
| `.bounce-loading` | 弹跳加载 | 加载指示器 |

### 状态动画

| 类名 | 效果 | 用途 |
|-----|------|------|
| `.shake` | 左右抖动 | 错误提示 |
| `.heartbeat` | 心跳 | 强调元素 |
| `.success-bounce` | 成功弹跳 | 成功状态 |
| `.error-shake` | 错误抖动 | 错误状态 |

### 使用示例

```html
<!-- 列表项入场动画，带延迟 -->
<view class="card card-list-enter delay-{{index}}" wx:for="{{list}}" wx:key="id">
  {{item.name}}
</view>

<!-- 按钮点击反馈 -->
<button class="btn-active">提交</button>

<!-- 骨架屏微光效果 -->
<view class="skeleton-item shimmer"></view>

<!-- 错误状态抖动 -->
<view class="input-wrapper {{hasError ? 'error-shake' : ''}}">
  <input />
</view>
```

## student-list-base.wxss 学生列表样式

### 使用方式

在页面 WXSS 中引入：

```css
@import '../../../styles/student-list-base.wxss';

/* 页面特有样式 */
.teacher-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
```

### 可复用样式类

| 类名 | 用途 |
|-----|------|
| `.student-list-container` | 页面容器 |
| `.list-header` | 头部信息卡片 |
| `.distribution-section` | 分布统计区域 |
| `.distribution-tag` | 分布标签 |
| `.student-list-tabs` | Tab 切换容器 |
| `.student-list-tab-item` | Tab 项 |
| `.student-list-search` | 搜索框容器 |
| `.student-card` | 学生卡片 |
| `.student-rank-list` | 排行榜容器 |
| `.student-rank-item` | 排行项 |
| `.student-rank-rate` | 出勤率徽章（支持 .excellent/.good/.normal/.poor）|

### 使用该样式的页面

- `pages/teacher/club/club.wxss`
- `pages/classTeacher/students/students.wxss`
