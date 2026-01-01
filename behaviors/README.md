# behaviors - 行为混入模块

<!-- 一旦我所属的文件夹有所变化，请更新我 -->

## 架构说明

行为混入层提供页面间可复用的数据和方法。放置在主包中以便所有分包都能引用。

**注意**：微信小程序的分包之间不能互相引用，但所有分包都可以引用主包的模块。因此 Behavior 必须放在主包中。

## 文件索引

- `profileBehavior.js` - Profile 页面通用行为，提供菜单配置、用户信息加载和未读通知数获取
- `datePickerBehavior.js` - 日期选择器通用行为，提供日期选择器状态管理和事件处理
- `paginationBehavior.js` - 分页加载通用行为，提供列表分页状态管理和事件处理
- `studentListBehavior.js` - 学生列表通用行为，提供搜索、筛选、缺勤预警、分布统计等功能
- `throttleBehavior.js` - 节流防抖通用行为，提供按钮节流、防抖和异步操作状态管理
- `formFeedbackBehavior.js` - 表单反馈通用行为，提供表单提交状态管理、震动反馈和错误处理
- `virtualListBehavior.js` - 虚拟列表通用行为，只渲染可视区域的列表项提升长列表性能

## profileBehavior 功能

### 数据字段
- `userInfo` - 用户信息
- `menuList` - 菜单列表配置
- `role` - 当前角色
- `unreadCount` - 未读通知数

### 方法
- `loadUserInfo()` - 加载用户信息
- `loadUnreadCount()` - 获取未读通知数量
- `getMenuListByRole(role)` - 根据角色获取菜单配置
- `onMenuTap(e)` - 菜单点击事件处理
- `onLogout()` - 退出登录

### 菜单配置
各角色菜单中的通知入口配置了 `showBadge: true`，用于显示未读通知数徽章。

## 使用方式

在页面中引入并使用 Behavior：

```javascript
const profileBehavior = require('../../../behaviors/profileBehavior')

Page({
  behaviors: [profileBehavior],
  // ...
})
```

## 使用该 Behavior 的页面

### profileBehavior
- `pages/admin/profile/profile.js`
- `pages/teacher/profile/profile.js`
- `pages/classTeacher/profile/profile.js`
- `pages/leader/profile/profile.js`

### datePickerBehavior
- `pages/leader/dashboard/dashboard.js`
- `pages/classTeacher/overview/overview.js`

### paginationBehavior
- `pages/admin/users/users.js`
- `pages/teacher/history/history.js`
- `pages/common/transfer/transfer.js`
- `pages/common/notifications/notifications.js`

### studentListBehavior
- `pages/teacher/club/club.js`
- `pages/classTeacher/students/students.js`

## studentListBehavior 功能

### 数据字段
- `students` - 原始学生列表
- `filteredStudents` - 过滤后的学生列表
- `loading` - 加载状态
- `searchValue` - 搜索关键词
- `absenceWarnings` - 缺勤预警列表
- `warningStudentIds` - 预警学生ID数组
- `distribution` - 分布统计
- `selectedDistribution` - 当前选中的分布筛选
- `stats` - 统计数据（totalCount, warningCount, avgAttendanceRate）
- `activeTab` - 当前激活的Tab
- `attendanceRank` - 出勤排行

### 方法
- `onSearch(e)` - 搜索输入处理
- `onSearchClear()` - 清除搜索
- `filterStudents()` - 过滤学生列表
- `onDistributionFilter(e)` - 分布筛选
- `calculateDistribution(students, field)` - 计算分布统计
- `loadAbsenceWarnings(params)` - 加载缺勤预警
- `onTabChange(e)` - Tab切换
- `hasWarning(studentId)` - 检查学生是否有预警

## throttleBehavior 功能

### 数据字段
- `btnLoadingMap` - 按钮加载状态映射表

### 方法
- `throttle(fn, delay, key)` - 节流函数，在指定时间内只执行一次
- `debounce(fn, delay, key)` - 防抖函数，延迟执行，每次调用重置计时器
- `setBtnLoading(btnKey, loading)` - 设置按钮加载状态
- `safeAsyncAction(btnKey, asyncFn)` - 安全的异步操作包装器，自动管理加载状态
- `resetBtnLoading(btnKeys)` - 批量重置按钮状态

### 使用示例

```javascript
const throttleBehavior = require('../../../behaviors/throttleBehavior')

Page({
  behaviors: [throttleBehavior],

  // 方式1：使用节流函数
  onSubmit() {
    this.throttle(() => this.doSubmit(), 1000, 'submit')
  },

  // 方式2：使用安全异步操作
  async onApprove() {
    await this.safeAsyncAction('approve', async () => {
      return await this.callApproveAPI()
    })
  }
})
```

```xml
<!-- WXML 中使用加载状态 -->
<van-button loading="{{btnLoadingMap.submit}}" bind:click="onSubmit">提交</van-button>
```

## formFeedbackBehavior 功能

### 数据字段
- `formSubmitting` - 表单是否正在提交
- `formErrors` - 字段级错误信息
- `formDirty` - 表单是否有修改

### 方法
- `markFormDirty()` - 标记表单已修改
- `resetFormState()` - 重置表单状态
- `setFieldError(field, message)` - 设置字段错误
- `clearFieldError(field)` - 清除字段错误
- `setFormErrors(errors)` - 批量设置错误
- `validateRequired(data, requiredFields)` - 验证必填字段
- `submitForm(submitFn, options)` - 提交表单的包装函数
- `vibrateOnSuccess()` - 成功时震动反馈
- `vibrateOnError()` - 错误时震动反馈
- `checkBeforeLeave()` - 页面离开前检查

### 使用示例

```javascript
const formFeedbackBehavior = require('../../../behaviors/formFeedbackBehavior')

Page({
  behaviors: [formFeedbackBehavior],

  async onSubmit() {
    // 验证必填字段
    if (!this.validateRequired(this.data.formData, [
      { field: 'name', label: '姓名' },
      { field: 'phone', label: '手机号' }
    ])) return

    // 提交表单
    await this.submitForm(async () => {
      return await this.callSubmitAPI()
    }, {
      successMessage: '注册成功',
      onSuccess: () => wx.navigateBack()
    })
  }
})
```

### 使用该 Behavior 的页面

### throttleBehavior
- `pages/admin/approval/approval.js`
- `pages/common/transfer/transfer.js`

### formFeedbackBehavior
- （待集成）

## virtualListBehavior 功能

### 数据字段
- `visibleItems` - 可视区域内的列表项
- `scrollTop` - 当前滚动位置
- `containerHeight` - 容器高度
- `itemHeight` - 每项高度
- `bufferSize` - 缓冲区大小
- `startIndex` - 可视区域起始索引
- `endIndex` - 可视区域结束索引

### 方法
- `initVirtualList(options)` - 初始化虚拟列表
- `updateFullList(list)` - 更新完整列表数据
- `onVirtualScroll(e)` - 滚动事件处理
- `scrollToIndex(index)` - 滚动到指定索引位置
- `refreshVisibleItems()` - 刷新可视区域项目

### 使用示例

```javascript
const virtualListBehavior = require('../../../behaviors/virtualListBehavior')

Page({
  behaviors: [virtualListBehavior],

  onReady() {
    this.initVirtualList({
      itemHeight: 100,
      containerHeight: wx.getSystemInfoSync().windowHeight,
      bufferSize: 5
    })
  },

  async loadData() {
    const data = await fetchData()
    this.updateFullList(data)
  }
})
```

### 使用该 Behavior 的页面

### virtualListBehavior
- `pages/teacher/club/club.js`
- `pages/classTeacher/students/students.js`
