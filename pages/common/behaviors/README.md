# behaviors - 分包共享行为混入

<!-- 一旦我所属的文件夹有所变化，请更新我 -->

## 架构说明

分包共享的 Behavior 模块，提供页面间可复用的数据和方法。

**注意**：由于微信小程序分包之间不能互相引用，`profileBehavior.js` 已移至主包 `behaviors/` 目录。此目录仅存放 common 分包内部使用的 Behavior。

## 文件索引

- `datePickerBehavior.js` - 日期选择器行为，提供日期选择的状态和方法
- `paginationBehavior.js` - 分页加载行为，提供列表分页的状态管理

## 使用方式

在 common 分包页面中引入：

```javascript
const datePickerBehavior = require('../behaviors/datePickerBehavior')

Page({
  behaviors: [datePickerBehavior],
  // ...
})
```

## 跨分包 Behavior

需要被多个分包使用的 Behavior 请放置在主包 `behaviors/` 目录：
- `behaviors/profileBehavior.js` - Profile 页面通用行为（被 admin/teacher/classTeacher/leader 分包使用）
