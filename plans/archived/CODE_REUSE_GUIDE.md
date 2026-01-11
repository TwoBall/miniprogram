# 前端代码和样式复用方案

> **状态**: 已归档（2026-01-12）
>
> **归档原因**: 项目已全面迁移至 Editorial 教育杂志设计风格，样式体系发生重大变化。
> 本文档中的样式基类（card-list-base.wxss、student-list-base.wxss）已被删除，
> 新的样式体系请参考 `styles/README.md` 和 `styles/editorial.wxss`。

---

## 目录

1. [复用架构概览](#复用架构概览)
2. [样式复用体系](#样式复用体系)
3. [逻辑复用体系（Behavior）](#逻辑复用体系behavior)
4. [组件复用体系](#组件复用体系)
5. [待集成项](#待集成项)

---

## 复用架构概览

项目采用**四层复用架构**：

```
┌─────────────────────────────────────────────────────────────┐
│                        页面层 (Pages)                        │
│   使用 Behavior 混入逻辑 + Editorial 样式 + 组件组合         │
├─────────────────────────────────────────────────────────────┤
│                       组件层 (Components)                    │
│   skeleton、empty-state、custom-tabbar                      │
├─────────────────────────────────────────────────────────────┤
│                    行为层 (Behaviors)                        │
│   profileBehavior、paginationBehavior、studentListBehavior  │
│   datePickerBehavior、throttleBehavior、virtualListBehavior │
├─────────────────────────────────────────────────────────────┤
│                      样式层 (Styles)                         │
│   editorial.wxss + variables.wxss + common.wxss             │
└─────────────────────────────────────────────────────────────┘
```

### 复用率统计

| 类型 | 复用率 | 说明 |
|------|--------|------|
| 样式复用 | 95% | Editorial 设计系统 + 公共样式 |
| 逻辑复用 | 85% | Behavior 混入 |
| 组件复用 | 70% | 自定义组件广泛使用 |
| 工具复用 | 100% | utils 工具完全复用 |

---

## 样式复用体系

### 当前样式架构（Editorial 设计系统）

项目已迁移至 **Editorial 教育杂志设计风格**，样式文件结构如下：

```
styles/
├── variables.wxss       # 设计变量（色彩、排版、间距）
├── editorial.wxss       # Editorial 组件样式库（20+ 组件类）
├── common.wxss          # 公共样式类库
├── animations.wxss      # 动画样式库
└── profile-base.wxss    # Profile 页面基类
```

**详细文档**: 请参考 [styles/README.md](./styles/README.md)

### Editorial 组件类示例

```html
<view class="ed-page">
  <view class="ed-hero ed-hero-teacher">
    <view class="ed-hero-content">
      <view class="ed-hero-eyebrow">智慧社团</view>
      <view class="ed-hero-title">
        <text class="ed-hero-title-line">考勤</text>
        <text class="ed-hero-title-line ed-hero-title-accent">管理</text>
      </view>
    </view>
  </view>
</view>
```

---

## 逻辑复用体系（Behavior）

### 已使用的 Behavior

| Behavior | 功能 | 使用页面数 |
|----------|------|-----------|
| `profileBehavior` | Profile 页面逻辑（菜单、用户信息、未读通知） | 4 |
| `paginationBehavior` | 分页加载（下拉刷新、触底加载） | 4 |
| `studentListBehavior` | 学生列表（搜索、筛选、预警、分布统计） | 2 |
| `datePickerBehavior` | 日期选择（van-calendar 集成） | 3 |
| `throttleBehavior` | 节流防抖（按钮状态、异步操作） | 2 |
| `virtualListBehavior` | 虚拟列表（长列表性能优化） | 2 |

### 使用示例

```javascript
const paginationBehavior = require('../../../behaviors/paginationBehavior')

Page({
  behaviors: [paginationBehavior],

  async loadList(refresh) {
    const result = await request.callApi('module', 'action', {
      page: this.data.page,
      pageSize: this.data.pageSize
    })
    this.handleLoadSuccess(result.data, result.pagination, refresh)
  }
})
```

**详细文档**: 请参考 [behaviors/README.md](./behaviors/README.md)

---

## 组件复用体系

### 1. skeleton 骨架屏组件

```html
<skeleton type="list" count="{{5}}" />
<skeleton type="overview" />
```

**支持类型**: `card`, `list`, `stats`, `attendance-card`, `history-card`, `overview`, `approval`, `form`

### 2. empty-state 空状态组件

```html
<empty-state type="students" />
<empty-state type="attendance" />
```

**预设类型**: `default`, `students`, `attendance`, `approval`, `notification`, `search`, `network`, `history`, `transfer`, `warning`

### 3. custom-tabbar 自定义标签栏

支持多角色动态切换，Editorial 风格设计。

**详细文档**: 请参考 [components/README.md](./components/README.md)

---

## 待集成项

以下 Behavior 已创建但尚未在页面中使用：

### 1. filterPickerBehavior

**文件**: `behaviors/filterPickerBehavior.js`

**功能**: 提供学部、班级、社团的级联筛选功能

**建议集成页面**:
- `pages/teacher/club/club.js`
- `pages/common/export/export.js`

### 2. formFeedbackBehavior

**文件**: `behaviors/formFeedbackBehavior.js`

**功能**: 表单提交状态管理、震动反馈和错误处理

**建议集成页面**:
- `pages/register/register.js`
- `pages/admin/users/add.js`
- `pages/common/transfer/create.js`

---

## 最佳实践总结

### 样式复用最佳实践

1. **使用 Editorial 组件类**: 优先使用 `ed-*` 类名
2. **使用公共类**: 检查 `common.wxss` 是否有可用类
3. **页面 WXSS 只写差异**: 仅定义特有样式

### 逻辑复用最佳实践

1. **识别重复模式**: 分页、筛选、表单提交等可抽取 Behavior
2. **Behavior 单一职责**: 每个 Behavior 专注一个功能域
3. **组合使用**: 一个页面可混入多个 Behavior
4. **放在主包**: Behavior 放在 `behaviors/` 目录供所有分包引用

### 组件复用最佳实践

1. **统一空状态**: 使用 `empty-state` 组件，禁用 `van-empty`
2. **统一骨架屏**: 使用 `skeleton` 组件提供一致的加载体验
3. **组件接口统一**: 使用 properties 接收参数，triggerEvent 传递事件

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
│   ├── formFeedbackBehavior.js   # 待集成
│   └── filterPickerBehavior.js   # 待集成
│
├── styles/                       # 样式目录
│   ├── variables.wxss            # 设计变量
│   ├── editorial.wxss            # Editorial 组件样式
│   ├── common.wxss               # 公共样式
│   ├── animations.wxss           # 动画样式
│   └── profile-base.wxss         # Profile 页面基类
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

*文档版本：2.0*
*更新日期：2026-01-12*
*更新内容：迁移至 Editorial 设计系统，移除已删除的样式基类，修正 Behavior 状态*
