# 样式文件清理迁移计划

> 创建日期：2026-01-12
> 目标：完成 Editorial 设计系统迁移后，清理 common.wxss 中的冗余样式

## 一、现状分析

### 文件概览

| 文件 | 行数 | 说明 |
|------|------|------|
| `styles/editorial.wxss` | 976 行 | Editorial 设计系统（新） |
| `styles/common.wxss` | 644 行 | 旧样式 + 兼容层（待清理） |
| `styles/variables.wxss` | 158 行 | CSS 变量定义 |
| `styles/animations.wxss` | - | 动画样式库 |

### 样式使用统计

| 样式系列 | 旧类名 | 新类名 | 旧使用次数 | 新使用次数 |
|----------|--------|--------|------------|------------|
| 页面容器 | `.page-container` | `.ed-page` | 0 | 26 |
| 头部区域 | `.header-section` | `.ed-hero` | 0 | 159 |
| 统计卡片 | `.stats-section` | `.ed-stats-grid` | 1 | 已迁移 |
| 卡片 | `.card` | `.ed-card` | 179 | 已迁移 |
| Tab 切换 | `.tabs` | `.ed-tabs` | 23 | 0 |
| 徽章 | `.status-badge` | `.ed-badge` | 2 | 0 |
| 排行榜 | `.ranking-item` | `.ed-ranking-item` | 6 | 8 |
| 筛选器 | `.filter-section` | `.ed-filter` | 0 | 21 |
| 搜索框 | `.search-bar` | `.ed-search` | 0 | 6 |
| 对话框 | `.dialog-content` | `.ed-dialog-content` | 1 | 4 |
| 空状态 | `.empty-state` | `.ed-empty` | 26 | 组件封装 |
| 加载状态 | `.loading-wrapper` | `.ed-loading` | 1 | 8 |

---

## 二、迁移阶段规划

### 阶段 0：立即删除（无使用样式）✅ 已完成

**执行日期**：2026-01-12
**实际删除行数**：146 行（644 行 → 498 行）
**风险等级**：低

已删除 `common.wxss` 中确认无使用的样式：

| 行号 | 样式类 | 状态 |
|------|--------|------|
| 46-57 | `.header-section`, `.header-top` | ✅ 已删除 |
| 423-427 | `.search-bar` | ✅ 已删除 |
| 429-457 | `.fab-btn*` | ✅ 已删除 |
| 478-561 | `.filter-section*` 全系列 | ✅ 已删除 |
| 179-188 | `.page-container*` | ✅ 已删除 |

**附加操作**：章节编号已整理为连续编号（2.1-2.12）

---

### 阶段 1：迁移 Tab 切换样式 ✅ 已完成

**执行日期**：2026-01-12
**实际删除行数**：35 行（498 行 → 463 行）
**风险等级**：低

#### 执行结果

经过检查，所有页面都已经使用 `van-tabs` 组件，`.tabs` 和 `.tab-item` 类名无任何页面使用：

| 页面 | 实际情况 |
|------|----------|
| `pages/admin/users/users.wxml` | ✅ 已使用 `van-tabs` |
| `pages/admin/approval/approval.wxml` | ✅ 已使用 `van-tabs` |
| `pages/teacher/club/club.wxml` | ✅ 已使用 `van-tabs` |
| `pages/classTeacher/students/students.wxml` | ✅ 已使用 `van-tabs` |
| `pages/classTeacher/studentDetail/studentDetail.wxml` | ✅ 已使用 `van-tabs` |
| `pages/common/transfer/transfer.wxml` | ✅ 已使用 `van-tabs` |
| `pages/common/notifications/notifications.wxml` | ✅ 已使用 `van-tabs` |
| `pages/common/design-test/design-test.wxml` | ✅ 使用 `editorial-tabs`（非 `.tabs`）|

**操作**：直接删除 `common.wxss` 中的 `.tabs*` 样式（原 284-317 行），无需页面修改。

---

### 阶段 2：迁移状态徽章样式 ✅ 已完成

**执行日期**：2026-01-12
**实际删除行数**：32 行（463 行 → 431 行）
**风险等级**：低

#### 执行结果

经过检查，两个页面都已使用 `.ed-status-badge`（Editorial 风格）：

| 页面 | 实际情况 |
|------|----------|
| `pages/teacher/detail/detail.wxml` | ✅ 已使用 `.ed-status-badge` |
| `pages/leader/detail/detail.wxml` | ✅ 已使用 `.ed-status-badge` |

**操作**：直接删除 `common.wxss` 中的 `.status-badge*` 样式（原 193-223 行），无需页面修改。

---

### 阶段 3：迁移排行榜样式

**预计耗时**：30 分钟
**风险等级**：中
**涉及页面**：4 个

#### 需要修改的页面

| 页面 | `.ranking-item` | `.rank-badge` | `.rate-badge` |
|------|-----------------|---------------|---------------|
| `pages/teacher/club/club.wxml` | 1 | 1 | 1 |
| `pages/classTeacher/students/students.wxml` | 1 | 1 | 1 |
| `pages/leader/dashboard/dashboard.wxml` | 1 | 1 | 1 |
| `pages/common/design-test/design-test.wxml` | 3 | - | - |

#### 迁移映射

```html
<!-- 旧写法 -->
<view class="ranking-item">
  <view class="rank-badge first">1</view>
  <view class="student-info">...</view>
  <view class="rate-badge excellent">98%</view>
</view>

<!-- 新写法 -->
<view class="ed-ranking-item ed-rank-first">
  <view class="ed-rank-position">
    <text class="ed-rank-num">1</text>
  </view>
  <view class="ed-rank-info">...</view>
  <view class="ed-rank-score">
    <text class="ed-rank-score-value">98</text>
    <text class="ed-rank-score-unit">%</text>
  </view>
</view>
```

#### 操作清单

- [ ] 修改 `pages/teacher/club/club.wxml`
- [ ] 修改 `pages/classTeacher/students/students.wxml`
- [ ] 修改 `pages/leader/dashboard/dashboard.wxml`
- [ ] 修改 `pages/common/design-test/design-test.wxml`
- [ ] 编译测试
- [ ] 删除 `common.wxss` 中的 `.ranking-item*`, `.rank-badge*`, `.rate-badge*` 样式（343-406 行）

---

### 阶段 4：迁移信息行与用户头部

**预计耗时**：45 分钟
**风险等级**：中
**涉及页面**：10 个

#### 4.1 `.info-row` 迁移（26 处）

| 页面 | 使用次数 |
|------|----------|
| `pages/classTeacher/studentDetail/studentDetail.wxml` | 9 |
| `pages/leader/detail/detail.wxml` | 4 |
| `components/skeleton/skeleton.wxml` | 4 |
| `pages/teacher/attendance/attendance.wxml` | 3 |
| `pages/common/transfer/transfer.wxml` | 3 |
| `pages/common/transfer/create.wxml` | 3 |

迁移方案：保留 `.info-row` 或迁移到 `.ed-card-meta-item`

#### 4.2 `.user-header` 迁移（4 处）

| 页面 | 使用次数 |
|------|----------|
| `pages/admin/profile/profile.wxml` | 1 |
| `pages/teacher/profile/profile.wxml` | 1 |
| `pages/classTeacher/profile/profile.wxml` | 1 |
| `pages/leader/profile/profile.wxml` | 1 |

迁移方案：Profile 页面已使用 Editorial 风格，检查是否需要更新

#### 操作清单

- [ ] 评估 `.info-row` 是否需要迁移（功能性样式，可保留）
- [ ] 检查 Profile 页面 `.user-header` 使用情况
- [ ] 如需迁移则逐页修改
- [ ] 编译测试

---

### 阶段 5：迁移对话框样式

**预计耗时**：15 分钟
**风险等级**：低
**涉及页面**：1 个

#### 需要修改的页面

| 页面 | 使用次数 |
|------|----------|
| `pages/admin/approval/approval.wxml` | 1 (dialog-content) + 4 (ed-dialog) |

**说明**：该页面已部分迁移，需要统一为 Editorial 风格

#### 操作清单

- [ ] 修改 `pages/admin/approval/approval.wxml`，统一使用 `.ed-dialog-*`
- [ ] 编译测试
- [ ] 删除 `common.wxss` 中的 `.dialog-*` 样式（459-476 行）

---

### 阶段 6：迁移操作按钮组

**预计耗时**：10 分钟
**风险等级**：低
**涉及页面**：2 个

#### 需要修改的页面

| 页面 | 使用次数 |
|------|----------|
| `pages/common/transfer/transfer.wxml` | 1 |
| `pages/admin/users/add.wxml` | 1 |

#### 迁移映射

```html
<!-- 旧写法 -->
<view class="action-buttons center">
  <van-button>取消</van-button>
  <van-button type="primary">确认</van-button>
</view>

<!-- 新写法 -->
<view class="ed-actions ed-actions-center">
  <van-button>取消</van-button>
  <van-button type="primary">确认</van-button>
</view>
```

#### 操作清单

- [ ] 修改 `pages/common/transfer/transfer.wxml`
- [ ] 修改 `pages/admin/users/add.wxml`
- [ ] 编译测试
- [ ] 删除 `common.wxss` 中的 `.action-buttons*` 样式（408-421 行）

---

### 阶段 7：处理剩余样式

**预计耗时**：30 分钟
**风险等级**：低

#### 7.1 保留的功能性样式

以下样式建议**保留**在 `common.wxss` 中，因为它们是基础功能样式：

| 样式类 | 使用次数 | 保留原因 |
|--------|----------|----------|
| `.card*` | 179 | 广泛使用，与 `.ed-card` 并存 |
| `.empty-state` | 26 | 与 `empty-state` 组件配合 |
| `.no-more` | 7 | 列表底部提示 |
| `.loading-wrapper` | 1 | 加载状态容器 |
| `.info-row*` | 26 | 基础布局样式 |
| `.badge*` | - | 数字徽章（非状态徽章）|
| `.swipe-action*` | 1 | 滑动操作 |
| `.detail-row` | - | 详情行布局 |
| `.load-more*` | - | 加载更多 |

#### 7.2 可选删除（迁移完成后）

| 样式类 | 条件 |
|--------|------|
| `.switch-role-btn*` | 确认 switchRole 页面完全使用 Editorial |
| `.date-selector` | 确认 dashboard/overview 页面完全使用 Editorial |
| `.stats-section*` | 确认 overview 页面完全使用 `.ed-stats-grid` |

---

## 三、迁移执行清单

### 总览

| 阶段 | 内容 | 预计耗时 | 可删除行数 |
|------|------|----------|------------|
| 阶段 0 | 立即删除无使用样式 | 10 分钟 | ~120 行 |
| 阶段 1 | Tab 切换迁移 | 30 分钟 | ~35 行 |
| 阶段 2 | 状态徽章迁移 | 15 分钟 | ~30 行 |
| 阶段 3 | 排行榜迁移 | 30 分钟 | ~65 行 |
| 阶段 4 | 信息行与用户头部 | 45 分钟 | ~50 行（可选）|
| 阶段 5 | 对话框迁移 | 15 分钟 | ~20 行 |
| 阶段 6 | 操作按钮组迁移 | 10 分钟 | ~15 行 |
| 阶段 7 | 处理剩余样式 | 30 分钟 | ~30 行（可选）|
| **总计** | | **~3 小时** | **~365 行**（最多）|

### 预期结果

| 项目 | 迁移前 | 迁移后 |
|------|--------|--------|
| `common.wxss` 行数 | 644 行 | ~280 行 |
| 删除样式 | - | ~365 行 |
| 保留样式 | - | ~280 行（基础功能样式）|

---

## 四、验证清单

每个阶段完成后执行：

- [ ] 微信开发者工具编译无报错
- [ ] 涉及页面功能正常
- [ ] 样式显示正确
- [ ] 真机预览测试

全部迁移完成后：

- [ ] 所有页面功能回归测试
- [ ] 删除 `common.wxss.bak` 备份文件
- [ ] 更新 `styles/README.md` 文档
- [ ] 提交代码并记录变更

---

## 五、回滚方案

如果迁移过程中出现问题：

```bash
# 恢复备份
cp styles/common.wxss.bak styles/common.wxss

# 或从 Git 恢复
git checkout styles/common.wxss
```

---

## 六、注意事项

1. **分步执行**：每个阶段完成后提交代码，便于回滚
2. **充分测试**：每个阶段修改后在真机预览
3. **保留兼容**：`.card` 系列样式暂时保留，与 `.ed-card` 并存
4. **文档同步**：迁移完成后更新 `styles/README.md`

---

## 附录：common.wxss 清理后结构

```css
/**
 * 公共样式 - 基础功能样式
 * 设计规范文档保留
 */

/* 设计规范注释（1-44 行）保留 */

/* ========== 保留的基础样式 ========== */

/* 通用卡片 - 与 .ed-card 并存 */
.card { ... }
.card-header { ... }
.card-title { ... }

/* 空状态 - 与 empty-state 组件配合 */
.empty-state { ... }

/* 列表状态 */
.no-more { ... }
.loading-wrapper { ... }
.load-more { ... }

/* 信息行布局 */
.info-row { ... }
.detail-row { ... }

/* 统计项 */
.stat-item { ... }
.stat-value { ... }

/* 数字徽章 */
.badge { ... }

/* 滑动操作 */
.swipe-action* { ... }

/* 用户信息 */
.user-header { ... }
.user-name { ... }
.user-meta { ... }
```
