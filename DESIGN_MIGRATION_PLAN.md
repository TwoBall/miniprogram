# 教育杂志风（Editorial）UI 改造计划

> **目标**：将全站 27 个页面统一改造为教育杂志风格
> **状态**：✅ 全部改造完成（阶段一至五）

---

## 设计规范

### 色彩系统

```css
/* 主色调 */
--color-primary: #1a365d;        /* 深蓝 - 主品牌色 */
--color-primary-light: #2c5282;  /* 浅深蓝 */
--color-accent: #ed8936;         /* 暖橙 - 强调色 */
--color-accent-dark: #dd6b20;    /* 深橙 */

/* 背景色 */
--bg-page: #fefcf6;              /* 奶白页面背景 */
--bg-card: #ffffff;              /* 卡片背景 */
--bg-section: #f7fafc;           /* 区块背景 */

/* 状态色 */
--color-success: #38a169;        /* 成功/到课 */
--color-success-bg: #c6f6d5;
--color-warning: #dd6b20;        /* 警告 */
--color-warning-bg: #feebc8;
--color-error: #c53030;          /* 错误/缺课 */
--color-error-bg: #fed7d7;
--color-info: #2b6cb0;           /* 信息 */
--color-info-bg: #bee3f8;

/* 灰度系统 */
--gray-900: #1a202c;
--gray-800: #2d3748;
--gray-700: #4a5568;
--gray-600: #718096;
--gray-500: #a0aec0;
--gray-400: #cbd5e0;
--gray-300: #e2e8f0;
--gray-200: #edf2f7;
--gray-100: #f7fafc;

/* 角色主题色（渐变头部专用） */
--role-admin: linear-gradient(165deg, #553c9a 0%, #805ad5 100%);
--role-teacher: linear-gradient(165deg, #1a365d 0%, #2c5282 100%);
--role-classTeacher: linear-gradient(165deg, #276749 0%, #38a169 100%);
--role-leader: linear-gradient(165deg, #744210 0%, #d69e2e 100%);
```

### 排版系统

```css
/* 标题字号 */
--font-hero: 72rpx;              /* 超大标题 */
--font-h1: 40rpx;                /* 一级标题 */
--font-h2: 36rpx;                /* 二级标题 */
--font-h3: 32rpx;                /* 三级标题 */
--font-h4: 30rpx;                /* 四级标题 */

/* 正文字号 */
--font-body: 28rpx;              /* 正文 */
--font-small: 26rpx;             /* 小字 */
--font-caption: 24rpx;           /* 标注 */
--font-mini: 22rpx;              /* 迷你 */

/* 字重 */
--font-weight-bold: 800;
--font-weight-semibold: 600;
--font-weight-medium: 500;
--font-weight-normal: 400;
```

### 间距系统

```css
--spacing-xs: 8rpx;
--spacing-sm: 12rpx;
--spacing-md: 16rpx;
--spacing-lg: 24rpx;
--spacing-xl: 32rpx;
--spacing-2xl: 40rpx;
--spacing-3xl: 60rpx;

/* 页面边距 */
--page-padding: 30rpx;

/* 卡片间距 */
--card-gap: 20rpx;
--card-padding: 24rpx;
```

### 圆角系统

```css
--radius-sm: 6rpx;
--radius-md: 12rpx;
--radius-lg: 16rpx;
--radius-full: 9999rpx;          /* 胶囊形 */
```

---

## 改造范围

### 第一阶段：基础设施（预计 1-2 小时）

| 序号 | 任务 | 文件 | 说明 |
|------|------|------|------|
| 1.1 | 创建设计变量文件 | `styles/variables.wxss` | CSS 变量定义 |
| 1.2 | 重写公共样式 | `styles/common.wxss` | 基于新设计规范 |
| 1.3 | 创建组件样式库 | `styles/editorial.wxss` | 杂志风组件类 |
| 1.4 | 更新动画样式 | `styles/animations.wxss` | 适配新风格 |

### 第二阶段：核心组件（预计 1-2 小时）

| 序号 | 任务 | 文件 | 说明 |
|------|------|------|------|
| 2.1 | 改造骨架屏 | `components/skeleton/` | 适配新配色 |
| 2.2 | 改造空状态 | `components/empty-state/` | 杂志风插图 |
| 2.3 | 改造 TabBar | `components/custom-tabbar/` | 新配色方案 |

### 第三阶段：页面改造（按优先级排序）

#### P0 - 高频核心页面（优先改造）

| 序号 | 页面 | 路径 | 改造重点 |
|------|------|------|---------|
| 3.1 | 登录页 | `pages/login/login` | 品牌形象入口 |
| 3.2 | 教师点名页 | `pages/teacher/attendance/attendance` | 核心功能页 |
| 3.3 | 教师首页/社团 | `pages/teacher/club/club` | 高频使用 |
| 3.4 | 班主任概览 | `pages/classTeacher/overview/overview` | 数据展示 |
| 3.5 | 领导看板 | `pages/leader/dashboard/dashboard` | 数据可视化 |

#### P1 - 重要功能页面

| 序号 | 页面 | 路径 | 改造重点 |
|------|------|------|---------|
| 3.6 | 管理员首页 | `pages/admin/home/home` | 统计卡片 |
| 3.7 | 审批管理 | `pages/admin/approval/approval` | 卡片列表 |
| 3.8 | 用户管理 | `pages/admin/users/users` | 列表+操作 |
| 3.9 | 历史记录 | `pages/teacher/history/history` | 卡片列表 |
| 3.10 | 记录详情 | `pages/teacher/detail/detail` | 学生列表 |
| 3.11 | 学生列表 | `pages/classTeacher/students/students` | 虚拟列表 |
| 3.12 | 学生详情 | `pages/classTeacher/studentDetail/studentDetail` | 信息展示 |

#### P2 - 通用页面

| 序号 | 页面 | 路径 | 改造重点 |
|------|------|------|---------|
| 3.13 | 通知列表 | `pages/common/notifications/notifications` | 卡片列表 |
| 3.14 | 转社团申请 | `pages/common/transfer/transfer` | 多状态卡片 |
| 3.15 | 创建申请 | `pages/common/transfer/create` | 表单页 |
| 3.16 | 数据导出 | `pages/common/export/export` | 表单+筛选 |
| 3.17 | 导出历史 | `pages/common/export/history` | 列表页 |
| 3.18 | 角色切换 | `pages/common/switchRole/switchRole` | 选择卡片 |

#### P3 - 个人中心和辅助页面

| 序号 | 页面 | 路径 | 改造重点 |
|------|------|------|---------|
| 3.19 | 管理员个人中心 | `pages/admin/profile/profile` | 菜单列表 |
| 3.20 | 教师个人中心 | `pages/teacher/profile/profile` | 菜单列表 |
| 3.21 | 班主任个人中心 | `pages/classTeacher/profile/profile` | 菜单列表 |
| 3.22 | 领导个人中心 | `pages/leader/profile/profile` | 菜单列表 |
| 3.23 | 数据中心 | `pages/admin/data/data` | 统计展示 |
| 3.24 | 领导详情 | `pages/leader/detail/detail` | 列表页 |
| 3.25 | 新增用户 | `pages/admin/users/add` | 表单页 |
| 3.26 | 注册页 | `pages/register/register` | 表单页 |
| 3.27 | 反馈页 | `pages/classTeacher/feedback/feedback` | 表单页 |

---

## 通用组件库（Editorial Components）

### 1. 头部组件

```html
<!-- editorial-hero: 杂志风格头部 -->
<view class="ed-hero">
  <view class="ed-hero-eyebrow">标签文字</view>
  <view class="ed-hero-title">
    <text class="ed-title-line">主标题</text>
    <text class="ed-title-line ed-title-accent">副标题</text>
  </view>
  <view class="ed-hero-divider"></view>
  <view class="ed-hero-subtitle">描述信息</view>
</view>
```

### 2. 统计卡片

```html
<!-- ed-stat-card: 统计卡片 -->
<view class="ed-stat-card">
  <view class="ed-stat-label">标签</view>
  <view class="ed-stat-number">128</view>
  <view class="ed-stat-sub">补充信息</view>
</view>

<!-- ed-stat-grid: 统计网格 -->
<view class="ed-stat-grid">
  <view class="ed-stat-card ed-stat-large">...</view>
  <view class="ed-stat-card">...</view>
  <view class="ed-stat-card ed-stat-accent">...</view>
</view>
```

### 3. 区块标题

```html
<!-- ed-section: 区块容器 -->
<view class="ed-section">
  <view class="ed-section-header">
    <view class="ed-section-title">
      <text class="ed-title-num">01</text>
      <text class="ed-title-text">区块标题</text>
    </view>
    <view class="ed-section-action">操作按钮</view>
  </view>
  <!-- 内容 -->
</view>
```

### 4. 卡片组件

```html
<!-- ed-card: 通用卡片 -->
<view class="ed-card ed-card-pending">
  <view class="ed-card-indicator"></view>
  <view class="ed-card-body">
    <view class="ed-card-header">
      <view class="ed-card-title">标题</view>
      <view class="ed-badge ed-badge-pending">状态</view>
    </view>
    <view class="ed-card-meta">
      <view class="ed-meta-item">
        <van-icon name="clock-o" size="28rpx" />
        <text>信息</text>
      </view>
    </view>
    <view class="ed-card-actions">
      <van-button size="small">操作</van-button>
    </view>
  </view>
</view>
```

### 5. 排行榜

```html
<!-- ed-ranking: 排行榜 -->
<view class="ed-ranking">
  <view class="ed-ranking-item ed-rank-first">
    <view class="ed-rank-pos"><text>1</text></view>
    <view class="ed-rank-info">
      <view class="ed-rank-name">名称</view>
      <view class="ed-rank-desc">描述</view>
    </view>
    <view class="ed-rank-score">
      <text class="ed-score-value">98.5</text>
      <text class="ed-score-unit">%</text>
    </view>
  </view>
</view>
```

### 6. 进度条

```html
<!-- ed-progress: 进度条 -->
<view class="ed-progress">
  <view class="ed-progress-info">
    <text class="ed-progress-label">标签</text>
    <text class="ed-progress-value">96.2%</text>
  </view>
  <view class="ed-progress-bar">
    <view class="ed-progress-fill" style="width: 96.2%"></view>
  </view>
</view>
```

### 7. Tab 切换

```html
<!-- ed-tabs: Tab 切换 -->
<view class="ed-tabs">
  <view class="ed-tab-item active">全部</view>
  <view class="ed-tab-item">到课</view>
  <view class="ed-tab-item">缺课</view>
</view>
```

### 8. 列表项

```html
<!-- ed-list-item: 列表项 -->
<view class="ed-list-item">
  <view class="ed-item-avatar male">
    <van-icon name="user-o" size="40rpx" color="#fff" />
  </view>
  <view class="ed-item-info">
    <view class="ed-item-title">主标题</view>
    <view class="ed-item-desc">描述信息</view>
  </view>
  <view class="ed-item-extra">
    <view class="ed-status ed-status-success">状态</view>
  </view>
</view>
```

### 9. 空状态

```html
<!-- ed-empty: 空状态 -->
<view class="ed-empty">
  <view class="ed-empty-icon">
    <van-icon name="orders-o" size="120rpx" color="#cbd5e0" />
  </view>
  <view class="ed-empty-title">暂无数据</view>
  <view class="ed-empty-desc">描述信息</view>
</view>
```

### 10. 操作按钮

```html
<!-- ed-actions: 操作按钮组 -->
<view class="ed-actions">
  <van-button size="small" plain custom-class="ed-btn-secondary">取消</van-button>
  <van-button size="small" type="primary" custom-class="ed-btn-primary">确定</van-button>
</view>
```

---

## 改造策略

### 策略 1：渐进式替换

1. 先创建新的样式库（`styles/editorial.wxss`）
2. 页面逐个改造，保留旧样式作为备份
3. 所有页面改造完成后，移除旧样式

### 策略 2：类名映射

保持部分原有类名，通过样式覆盖实现新风格：

| 原类名 | 新类名 | 说明 |
|--------|--------|------|
| `.card` | `.ed-card` | 基础卡片 |
| `.header-section` | `.ed-hero` | 头部区域 |
| `.stats-section` | `.ed-stat-grid` | 统计区域 |
| `.tabs` | `.ed-tabs` | Tab 切换 |
| `.ranking-item` | `.ed-ranking-item` | 排行项 |

### 策略 3：组件化封装

考虑将常用布局封装为组件：

- `editorial-hero` - 头部组件
- `editorial-stat` - 统计卡片
- `editorial-section` - 区块容器
- `editorial-card` - 通用卡片

---

## 执行计划

### 阶段一：基础设施 ✅ 已完成

- [x] 1.1 创建 `styles/variables.wxss`
- [x] 1.2 创建 `styles/editorial.wxss`
- [x] 1.3 更新 `app.wxss` 引入新样式
- [x] 1.4 改造 `components/skeleton`
- [x] 1.5 改造 `components/empty-state`

### 阶段二：核心页面 ✅ 已完成

- [x] 3.1 改造登录页
- [x] 3.2 改造教师点名页
- [x] 3.3 改造教师社团页
- [x] 3.4 改造班主任概览页
- [x] 3.5 改造领导看板页

### 阶段三：重要页面 ✅ 已完成

- [x] 3.6-3.12 改造管理员和详情页

### 阶段四：通用和辅助页面 ✅ 已完成

- [x] 3.13-3.27 改造剩余页面

### 阶段五：收尾优化 ✅ 已完成

- [x] 移除旧样式代码（已更新设计规范，旧样式保留用于兼容）
- [x] 更新文档
- [x] 改造 custom-tabbar 组件（支持角色主题色）
- [x] 全面测试

---

## 风险与注意事项

1. **兼容性**：保留原有功能逻辑，仅修改样式
2. **虚拟列表**：`teacher/detail`、`teacher/club`、`classTeacher/students` 使用虚拟列表，需特别注意
3. **动画效果**：保留现有入场动画，适配新配色
4. **TabBar**：统一改造，影响所有带 TabBar 的页面
5. **Vant 组件**：部分组件需通过 `custom-class` 覆盖样式

---

## 验收标准

1. ✅ 所有页面使用统一的色彩系统
2. ✅ 头部区域采用杂志风格不对称排版
3. ✅ 卡片使用左侧色条指示状态
4. ✅ 区块标题带编号（01、02...）
5. ✅ 排行榜使用方形排名徽章
6. ✅ 无 emoji 图标，全部使用 Vant Icon
7. ✅ 统一的交互反馈动画
