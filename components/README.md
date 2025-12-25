# components - 组件模块

<!-- 一旦我所属的文件夹有所变化，请更新我 -->

## 架构说明

组件层提供可复用的自定义组件，封装通用的 UI 逻辑和交互行为。

## 文件索引

- `custom-tabbar/` - 自定义底部标签栏组件，支持多角色动态切换
- `skeleton/` - 骨架屏加载组件，提供页面加载时的占位效果

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
    "custom-tabbar": "/components/custom-tabbar/custom-tabbar"
  }
}
```

在页面的 `.wxml` 文件中使用：

```xml
<custom-tabbar></custom-tabbar>
```

## 组件开发规范

- 组件应保持单一职责，功能清晰
- 使用 properties 接收外部参数
- 使用 triggerEvent 向外部传递事件
- 保持组件的独立性和可复用性
