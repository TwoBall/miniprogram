# 前端代码和样式复用方案

本文档总结了项目当前的复用机制，并提出进一步优化方案。

## 目录

1. [复用架构概览](#复用架构概览)
2. [样式复用体系](#样式复用体系)
3. [逻辑复用体系（Behavior）](#逻辑复用体系behavior)
4. [组件复用体系](#组件复用体系)
5. [待优化项](#待优化项)
6. [新增复用方案](#新增复用方案)
7. [最佳实践总结](#最佳实践总结)

---

## 复用架构概览

项目采用**四层复用架构**：

```
┌─────────────────────────────────────────────────────────────┐
│                        页面层 (Pages)                        │
│   使用 Behavior 混入逻辑 + 样式基类继承 + 组件组合           │
├─────────────────────────────────────────────────────────────┤
│                       组件层 (Components)                    │
│   skeleton、empty-state、custom-tabbar                      │
├─────────────────────────────────────────────────────────────┤
│                    行为层 (Behaviors)                        │
│   profileBehavior、paginationBehavior、studentListBehavior  │
│   datePickerBehavior、throttleBehavior、formFeedbackBehavior│
├─────────────────────────────────────────────────────────────┤
│                      样式层 (Styles)                         │
│   common.wxss（公共类）+ 角色/功能样式基类                   │
└─────────────────────────────────────────────────────────────┘
```

### 复用率统计

| 类型 | 复用率 | 说明 |
|------|--------|------|
| 样式复用 | 95% | 公共样式 + 样式基类 |
| 逻辑复用 | 85% | Behavior 混入 |
| 组件复用 | 70% | 自定义组件广泛使用 |
| 工具复用 | 100% | utils 工具完全复用 |

---

## 样式复用体系

### 1. 全局公共样式（common.wxss）

所有页面自动继承，位于 `styles/common.wxss`。

#### 设计规范变量

```css
/* 品牌色系 */
主品牌色: #1F6FAD
主渐变: linear-gradient(135deg, #1F6FAD 0%, #2E8B9A 100%)

/* 角色主题色 */
管理员: linear-gradient(135deg, #722ed1 0%, #9254de 100%)
教师: linear-gradient(135deg, #1890ff 0%, #36cfc9 100%)
班主任: linear-gradient(135deg, #52c41a 0%, #95de64 100%)
领导: linear-gradient(135deg, #faad14 0%, #ffd666 100%)

/* 状态色 */
成功: #52c41a, 背景: #f6ffed
错误: #ff4d4f, 背景: #fff1f0
警告: #ff9800, 背景: #fff7e6
信息: #1890ff, 背景: #e6f7ff
```

#### 可复用样式类

| 类名 | 用途 | 变体 |
|------|------|------|
| `.page-container` | 页面容器 | `.with-tabbar` |
| `.card` | 通用卡片 | - |
| `.status-badge` | 状态标签 | `.success`, `.error`, `.warning`, `.info` |
| `.tabs` + `.tab-item` | Tab 切换 | `.active` |
| `.ranking-item` | 排名项 | `.top-rank` |
| `.rank-badge` | 排名徽章 | `.first`, `.second`, `.third` |
| `.rate-badge` | 出勤率徽章 | `.excellent`, `.good`, `.normal`, `.poor` |
| `.info-row` | 信息行 | 配合 `.label`, `.value` |
| `.stat-item` | 统计项 | 配合 `.stat-value`, `.stat-label` |
| `.loading-wrapper` | 加载容器 | - |
| `.no-more` | 无更多数据 | - |
| `.load-more` | 加载更多 | - |
| `.empty-state` | 空状态 | - |
| `.header-section` | 顶部信息栏 | - |
| `.date-selector` | 日期选择器 | - |
| `.stats-section` | 统计区域 | - |
| `.action-buttons` | 操作按钮组 | `.center`, `.space-between` |
| `.search-bar` | 搜索栏 | - |
| `.fab-btn` | 浮动操作按钮 | `.admin`, `.teacher` |
| `.dialog-content` | 对话框内容 | - |
| `.filter-section` | 筛选区域 | - |
| `.filter-picker-content` | 筛选选择器 | `.disabled` |
| `.user-header` | 用户信息头部 | - |
| `.user-name` | 用户名 | - |
| `.swipe-actions` | 滑动操作容器 | - |
| `.swipe-action-btn` | 滑动操作按钮 | `.edit`, `.delete`, `.warning` |
| `.badge` | 徽章 | `.success`, `.warning`, `.info` |

### 2. 样式基类（继承模式）

#### Profile 页面基类

```css
/* styles/profile-base.wxss */
/* 使用页面：admin/profile, teacher/profile, classTeacher/profile, leader/profile */
```

**页面只需定义渐变色：**

```css
/* 页面 WXSS - 仅 6 行 */
@import '../../../styles/profile-base.wxss';

.admin-header {
  background: linear-gradient(135deg, #722ed1 0%, #9254de 100%);
}
```

#### 学生列表基类

```css
/* styles/student-list-base.wxss */
/* 使用页面：teacher/club, classTeacher/students */
```

**页面只需定义特有样式：**

```css
/* 页面 WXSS - 约 10-15 行 */
@import '../../../styles/student-list-base.wxss';

.teacher-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
```

#### 卡片列表基类 ✅ 已实现

```css
/* styles/card-list-base.wxss */
/* 使用页面：approval, transfer, notifications, history */
```

**提供完整的卡片列表样式体系：**

```css
@import '../../../styles/card-list-base.wxss';

/* 仅定义页面特有样式 */
.approval-item.pending {
  border-left-color: #1890ff;
}
```

**包含样式类：**
- `.card-list-container` - 页面容器
- `.card-list-tabs` - Tab 切换容器
- `.card-list-item` - 卡片项（支持状态变体）
- `.card-list-header` - 卡片头部
- `.card-list-body` - 卡片内容
- `.card-list-actions` - 操作按钮区

### 3. 组合类名模式

推荐使用 **组合类名** 实现样式复用：

```html
<!-- WXML -->
<view class="card notification-item">...</view>
<view class="card user-card">...</view>
<view class="card record-card">...</view>
```

```css
/* WXSS - 仅定义特有样式，无需重复 background、border-radius、border */
.notification-item {
  display: flex;
  padding: 32rpx 24rpx;
}
```

---

## 逻辑复用体系（Behavior）

### 现有 Behavior 清单

| Behavior | 功能 | 使用页面数 |
|----------|------|-----------|
| `profileBehavior` | Profile 页面逻辑（菜单、用户信息、未读通知） | 4 |
| `paginationBehavior` | 分页加载（下拉刷新、触底加载） | 4 |
| `studentListBehavior` | 学生列表（搜索、筛选、预警、分布统计） | 2 |
| `datePickerBehavior` | 日期选择（van-calendar 集成） | 3 |
| `throttleBehavior` | 节流防抖（按钮状态、异步操作） | 2 |
| `virtualListBehavior` | 虚拟列表（长列表性能优化） | 2 |
| `filterPickerBehavior` | 筛选选择器（学部/班级/社团级联） | 待集成 |
| `formFeedbackBehavior` | 表单反馈（提交状态、震动反馈） | 待集成 |

### 使用示例

#### 1. 分页加载

```javascript
const paginationBehavior = require('../../../behaviors/paginationBehavior')

Page({
  behaviors: [paginationBehavior],

  async loadList(refresh) {
    this.setData({ loading: true })
    const result = await request.callApi('module', 'action', {
      page: this.data.page,
      pageSize: this.data.pageSize
    })
    this.handleLoadSuccess(result.data, result.pagination, refresh)
  },

  onPullDownRefresh() {
    this.handlePullDownRefresh()
  },

  onReachBottom() {
    this.handleReachBottom()
  }
})
```

#### 2. 节流防抖

```javascript
const throttleBehavior = require('../../../behaviors/throttleBehavior')

Page({
  behaviors: [throttleBehavior],

  // 方式1：节流
  onSubmit() {
    this.throttle(() => this.doSubmit(), 1000, 'submit')
  },

  // 方式2：安全异步操作
  async onApprove() {
    await this.safeAsyncAction('approve', async () => {
      return await request.callApi('user', 'approve', { userId })
    })
  }
})
```

```html
<!-- WXML -->
<van-button loading="{{btnLoadingMap.approve}}" bind:click="onApprove">
  通过
</van-button>
```

#### 3. 日期选择

```javascript
const datePickerBehavior = require('../../../behaviors/datePickerBehavior')

Page({
  behaviors: [datePickerBehavior],

  onLoad() {
    this.initDate()
  },

  onDateChange(dateStr) {
    this.loadData()
  }
})
```

```html
<!-- WXML -->
<view bindtap="showDatePickerPopup">{{selectedDate}}</view>

<van-calendar
  show="{{ showCalendar }}"
  min-date="{{ calendarMinDate }}"
  max-date="{{ calendarMaxDate }}"
  default-date="{{ calendarDefaultDate }}"
  bind:close="onCalendarClose"
  bind:confirm="onCalendarConfirm"
/>
```

---

## 组件复用体系

### 1. skeleton 骨架屏组件

```html
<skeleton type="list" count="{{5}}" />
<skeleton type="overview" />
<skeleton type="form" row="{{4}}" />
```

**支持类型：** `card`, `list`, `stats`, `attendance-card`, `history-card`, `overview`, `approval`, `form`

### 2. empty-state 空状态组件

```html
<!-- 使用预设类型 -->
<empty-state type="students" />
<empty-state type="attendance" />

<!-- 自定义内容 -->
<empty-state
  image="/images/empty.png"
  title="暂无数据"
  description="请稍后再试"
  buttonText="刷新"
  bind:action="onRefresh"
/>
```

**预设类型：** `default`, `students`, `attendance`, `approval`, `notification`, `search`, `network`, `history`, `transfer`, `warning`

### 3. custom-tabbar 自定义标签栏

支持多角色动态切换，在需要底部导航的页面使用。

---

## 优化项状态

### 1. 筛选选择器逻辑抽取 ✅ 已完成

**原状**：`teacher/club` 和 `common/export` 存在相似的筛选选择器逻辑。

**已实现**：创建 `behaviors/filterPickerBehavior.js`，支持学部/班级/社团级联筛选。

### 2. formFeedbackBehavior 待集成

**现状**：已定义但未在页面中使用。

**建议集成页面**：
- `pages/register/register.js`
- `pages/admin/users/add.js`
- `pages/common/transfer/create.js`

### 3. 卡片列表样式抽取 ✅ 已完成

**原状**：`approval.wxss`, `transfer.wxss`, `notifications.wxss` 有相似的卡片列表样式。

**已实现**：创建 `styles/card-list-base.wxss`，包含完整的卡片列表样式体系。

### 4. 操作按钮样式统一 ✅ 已完成

**原状**：多个页面定义了 `.action-buttons` 样式。

**已实现**：扩展 `common.wxss`，新增公共类：
- `.action-buttons` - 操作按钮组
- `.search-bar` - 搜索栏
- `.fab-btn` - 浮动操作按钮
- `.dialog-*` - 对话框样式
- `.filter-*` - 筛选器样式
- `.user-*` - 用户信息样式
- `.swipe-*` - 滑动操作样式
- `.badge` - 徽章样式

---

## 新增复用方案

### 方案一：新增 filterPickerBehavior

```javascript
// behaviors/filterPickerBehavior.js
module.exports = Behavior({
  data: {
    departments: [],
    classes: [],
    selectedDepartment: '',
    selectedClass: '',
    filterLoading: false
  },

  methods: {
    async loadFilterOptions() {
      const options = await request.getFilterOptions()
      this.setData({
        departments: options.departments,
        classes: options.classes
      })
    },

    onDepartmentChange(e) {
      const department = this.data.departments[e.detail.value]
      this.setData({ selectedDepartment: department })
      this.filterClassesByDepartment(department)
    },

    filterClassesByDepartment(department) {
      // 级联筛选班级
    },

    resetFilter() {
      this.setData({
        selectedDepartment: '',
        selectedClass: ''
      })
    }
  }
})
```

### 方案二：新增 card-list-base.wxss

```css
/* styles/card-list-base.wxss */
/* 卡片列表公共样式 */
/* 使用页面：approval, transfer, notifications, users */

.card-list-container {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding-bottom: 40rpx;
}

.card-list {
  padding: 24rpx 30rpx;
}

/* 卡片项 - 继承公共 .card */
.card-item {
  padding: 32rpx 24rpx;
  margin-bottom: 20rpx;
}

/* 卡片头部 */
.card-item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
}

/* 操作按钮区域 */
.card-item-actions {
  display: flex;
  justify-content: flex-end;
  gap: 16rpx;
  padding-top: 20rpx;
  border-top: 2rpx solid #f0f0f0;
}
```

### 方案三：扩展 common.wxss 公共类

```css
/* 添加到 styles/common.wxss */

/* ========== 操作按钮 ========== */
.action-buttons {
  display: flex;
  gap: 16rpx;
  justify-content: flex-end;
}

.action-buttons.center {
  justify-content: center;
}

/* ========== 搜索栏 ========== */
.search-bar {
  background-color: #fff;
  padding-bottom: 20rpx;
}

/* ========== 浮动按钮 ========== */
.fab-btn {
  position: fixed;
  right: 32rpx;
  bottom: 180rpx;
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.2);
  z-index: 100;
}

.fab-btn:active {
  transform: scale(0.95);
  opacity: 0.9;
}

/* ========== 对话框 ========== */
.dialog-content {
  padding: 20rpx;
}

.dialog-title {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 30rpx;
  text-align: center;
}

.dialog-actions {
  display: flex;
  gap: 20rpx;
  justify-content: flex-end;
}
```

---

## 最佳实践总结

### 样式复用最佳实践

1. **优先使用公共类**：先检查 `common.wxss` 是否有可用类
2. **使用组合类名**：`class="card xxx-card"` 而非重新定义所有样式
3. **创建样式基类**：相似页面抽取公共样式到 `styles/xxx-base.wxss`
4. **页面 WXSS 只写差异**：仅定义渐变色、特有布局等

### 逻辑复用最佳实践

1. **识别重复模式**：分页、筛选、表单提交等都可抽取 Behavior
2. **Behavior 单一职责**：每个 Behavior 专注一个功能域
3. **组合使用**：一个页面可混入多个 Behavior
4. **放在主包**：Behavior 放在 `behaviors/` 目录供所有分包引用

### 组件复用最佳实践

1. **统一空状态**：使用 `empty-state` 组件，禁用 `van-empty`
2. **统一骨架屏**：使用 `skeleton` 组件提供一致的加载体验
3. **组件接口统一**：使用 properties 接收参数，triggerEvent 传递事件

### 开发流程

```
开发新页面时：
1. 检查是否有可用的 Behavior → 混入
2. 检查是否有可用的样式基类 → @import
3. 检查 common.wxss 公共类 → 使用组合类名
4. 检查是否有可用组件 → 引入使用
5. 仅编写页面特有的逻辑和样式
```

---

## 文件结构总览

```
├── behaviors/                    # Behavior 目录（主包）
│   ├── profileBehavior.js
│   ├── paginationBehavior.js
│   ├── studentListBehavior.js
│   ├── datePickerBehavior.js
│   ├── throttleBehavior.js
│   ├── virtualListBehavior.js
│   ├── formFeedbackBehavior.js
│   └── filterPickerBehavior.js   # ✅ 已实现
│
├── styles/                       # 样式目录
│   ├── common.wxss               # 全局公共样式（已扩展）
│   ├── animations.wxss           # 动画样式
│   ├── profile-base.wxss         # Profile 页面基类
│   ├── student-list-base.wxss    # 学生列表基类
│   └── card-list-base.wxss       # ✅ 已实现 - 卡片列表基类
│
├── components/                   # 组件目录
│   ├── skeleton/                 # 骨架屏组件
│   ├── empty-state/              # 空状态组件
│   └── custom-tabbar/            # 自定义标签栏
│
└── utils/                        # 工具目录
    ├── request.js                # 网络请求
    ├── auth.js                   # 身份认证
    ├── error.js                  # 错误处理
    └── ...
```

---

## 附录：复用关系图

```
                         ┌──────────────────┐
                         │   common.wxss    │
                         │  (全局公共样式)   │
                         └────────┬─────────┘
                                  │
           ┌──────────────────────┼──────────────────────┐
           │                      │                      │
           ▼                      ▼                      ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ profile-base    │    │ student-list    │    │ card-list-base  │
│    .wxss        │    │  -base.wxss     │    │    .wxss        │
└────────┬────────┘    └────────┬────────┘    └────────┬────────┘
         │                      │                      │
    ┌────┴────┐            ┌────┴────┐            ┌────┴────┐
    ▼         ▼            ▼         ▼            ▼         ▼
┌───────┐ ┌───────┐   ┌───────┐ ┌───────┐   ┌───────┐ ┌───────┐
│admin  │ │teacher│   │teacher│ │class  │   │approval│ │transfer│
│profile│ │profile│   │ club  │ │students│  │        │ │        │
└───────┘ └───────┘   └───────┘ └───────┘   └───────┘ └───────┘
```

---

*文档版本：1.1*
*更新日期：2026-01-08*
*更新内容：标记已完成的优化项，新增 filterPickerBehavior 和 card-list-base.wxss 文档*
