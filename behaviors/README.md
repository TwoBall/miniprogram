# behaviors - 行为混入模块

<!-- 一旦我所属的文件夹有所变化，请更新我 -->

## 架构说明

行为混入层提供页面间可复用的数据和方法。放置在主包中以便所有分包都能引用。

**注意**：微信小程序的分包之间不能互相引用，但所有分包都可以引用主包的模块。因此 Behavior 必须放在主包中。

## 文件索引

- `profileBehavior.js` - Profile 页面通用行为，提供菜单配置和用户信息加载
- `datePickerBehavior.js` - 日期选择器通用行为，提供日期选择器状态管理和事件处理
- `paginationBehavior.js` - 分页加载通用行为，提供列表分页状态管理和事件处理

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
