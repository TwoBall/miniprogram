# styles - 全局样式模块

<!-- 一旦我所属的文件夹有所变化，请更新我 -->

## 架构说明

全局样式层提供统一的 UI 规范和可复用的公共样式类。通过 `app.wxss` 引入，所有页面（包括分包）自动继承。

## 文件索引

- `variables.wxss` - **教育杂志风设计变量**（色彩、排版、间距、圆角规范）
- `editorial.wxss` - **教育杂志风组件样式库**（20+ 可复用组件类）
- `common.wxss` - 公共样式类库（设计规范 + 可复用组件样式）
- `animations.wxss` - 动画样式库（入场动画、交互反馈、加载状态）
- `profile-base.wxss` - Profile 页面公共样式基类

## 教育杂志风设计系统（Editorial Design System）

### 设计理念

采用教育杂志风格（Editorial Style），特点包括：
- **不对称排版**：打破传统对称布局，增加视觉层次
- **大字标题**：超大号粗体标题，强调信息层级
- **编号区块**：区块标题带数字编号（01、02...）
- **左侧色条**：卡片左侧状态色条指示器
- **方形排名徽章**：排行榜使用方形数字徽章

### 色彩规范

| 用途 | 颜色值 | 说明 |
|-----|--------|------|
| 主色 | `#1a365d` | 深蓝 - 主品牌色 |
| 强调色 | `#ed8936` | 暖橙 - 行动按钮、标题强调 |
| 页面背景 | `#fefcf6` | 奶白色 - 纸张质感 |
| 成功色 | `#38a169` | 绿色 - 到课/通过状态 |
| 警告色 | `#dd6b20` | 橙色 - 待处理/需关注 |
| 错误色 | `#c53030` | 红色 - 缺课/拒绝状态 |

### editorial.wxss 组件类

| 类名 | 用途 | 说明 |
|-----|------|------|
| `.ed-page` | 页面容器 | 奶白背景 + 安全区适配 |
| `.ed-hero` | 头部区域 | 渐变背景 + 不对称排版 |
| `.ed-stats-grid` | 统计网格 | 2 列网格布局 |
| `.ed-stat-card` | 统计卡片 | 数值展示卡片 |
| `.ed-section` | 区块容器 | 带编号标题的区块 |
| `.ed-card` | 通用卡片 | 左侧色条 + 内容区 |
| `.ed-badge` | 徽章组件 | 状态标签（pending/success/warning/error） |
| `.ed-progress` | 进度条 | 渐变填充进度条 |
| `.ed-ranking-list` | 排行榜 | 方形排名徽章 |
| `.ed-tabs` | Tab 切换 | 圆角背景切换 |
| `.ed-list-item` | 列表项 | 头像 + 信息 + 状态 |
| `.ed-empty` | 空状态 | 圆形图标背景 |
| `.ed-actions` | 操作按钮组 | flex 布局按钮组 |
| `.ed-action-grid` | 快捷操作 | 4 列图标网格 |
| `.ed-filter` | 筛选器 | 筛选选项容器 |
| `.ed-search` | 搜索框 | 搜索输入框容器 |
| `.ed-footer` | 底部区域 | 页脚信息 |

### 使用方式

样式已在 `app.wxss` 中全局引入，页面可直接使用：

```html
<!-- WXML -->
<view class="ed-page">
  <view class="ed-hero ed-hero-teacher">
    <view class="ed-hero-content">
      <view class="ed-hero-eyebrow">智慧社团</view>
      <view class="ed-hero-title">
        <text class="ed-hero-title-line">考勤</text>
        <text class="ed-hero-title-line ed-hero-title-accent">管理</text>
      </view>
      <view class="ed-hero-divider"></view>
    </view>
  </view>

  <view class="ed-stats-grid">
    <view class="ed-stat-card ed-stat-card-large">
      <view class="ed-stat-label">今日出勤率</view>
      <view class="ed-stat-number">94.7<text class="ed-stat-unit">%</text></view>
    </view>
  </view>

  <view class="ed-section">
    <view class="ed-section-header">
      <view class="ed-section-title">
        <text class="ed-section-num">01</text>
        <text class="ed-section-text">待处理事项</text>
      </view>
    </view>
    <!-- 内容 -->
  </view>
</view>
```

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
| `.action-buttons` | 操作按钮组 | 带变体：`.center`, `.space-between` |
| `.search-bar` | 搜索栏 | 配合 `van-search` 使用 |
| `.fab-btn` | 浮动操作按钮 | 带变体：`.admin`, `.teacher` |
| `.dialog-content` | 对话框内容 | 配合 `.dialog-title`, `.dialog-actions` |
| `.filter-section` | 筛选器区域 | 配合 `.filter-row`, `.filter-picker` 等 |
| `.user-header` | 用户信息头部 | 配合 `.user-name`, `.user-meta` |
| `.swipe-actions` | 滑动操作 | 配合 `.swipe-action-btn` |
| `.badge` | 徽章 | 带变体：`.success`, `.warning`, `.info` |

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

