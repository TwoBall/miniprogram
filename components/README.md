# components - 组件模块

<!-- 一旦我所属的文件夹有所变化，请更新我 -->

## 架构说明

组件层提供可复用的自定义组件，封装通用的 UI 逻辑和交互行为。

## 文件索引

- `custom-tabbar/` - 自定义底部标签栏组件，支持多角色动态切换
- `skeleton/` - 骨架屏加载组件，提供页面加载时的占位效果
- `lazy-image/` - 懒加载图片组件，使用 IntersectionObserver 实现视口内懒加载
- `empty-state/` - 空状态组件，提供统一的空数据展示样式

## 组件结构

每个组件目录包含：
- `{name}.js` - 组件逻辑
- `{name}.wxml` - 组件结构
- `{name}.wxss` - 组件样式
- `{name}.json` - 组件配置

## 使用方式

在页面的 `.json` 文件中引入组件：

```json
{
  "usingComponents": {
    "custom-tabbar": "/components/custom-tabbar/custom-tabbar",
    "skeleton": "/components/skeleton/skeleton",
    "lazy-image": "/components/lazy-image/lazy-image",
    "empty-state": "/components/empty-state/empty-state"
  }
}
```

在页面的 `.wxml` 文件中使用：

```xml
<custom-tabbar></custom-tabbar>
```

## skeleton 骨架屏组件

支持的类型：
- `card` - 通用卡片骨架
- `list` - 列表骨架
- `stats` - 统计骨架
- `attendance-card` - 点名卡片骨架
- `history-card` - 历史记录卡片骨架
- `overview` - 概览页骨架（统计卡片 + 列表）
- `approval` - 审批卡片骨架
- `form` - 表单骨架

使用示例：
```xml
<skeleton type="list" count="{{5}}" avatar="{{true}}" />
<skeleton type="overview" />
<skeleton type="form" row="{{4}}" />
```

## lazy-image 懒加载图片组件

功能特性：
- 视口懒加载：仅当图片进入视口时才开始加载
- 占位图：加载前显示占位图
- 加载动画：加载完成后淡入显示
- 错误处理：加载失败显示默认图片
- 支持圆形和方形

使用示例：
```xml
<lazy-image
  src="{{item.avatar}}"
  placeholder="/images/avatar-placeholder.png"
  width="160rpx"
  height="160rpx"
  round="{{true}}"
/>
```

## empty-state 空状态组件

预设类型：
- `default` - 默认空状态
- `students` - 暂无学生
- `attendance` - 暂无点名记录
- `approval` - 暂无待审批
- `notification` - 暂无通知
- `search` - 搜索无结果
- `network` - 网络异常
- `history` - 暂无历史记录
- `transfer` - 暂无转社团申请
- `warning` - 暂无预警学生

使用示例：
```xml
<empty-state type="students" />
<empty-state
  image="/images/empty-custom.png"
  title="暂无数据"
  description="请稍后再试"
  buttonText="刷新"
  bind:action="onRefresh"
/>
```

## 组件开发规范

- 组件应保持单一职责，功能清晰
- 使用 properties 接收外部参数
- 使用 triggerEvent 向外部传递事件
- 保持组件的独立性和可复用性
