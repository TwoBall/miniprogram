# ESLint 配置说明

本项目的 ESLint 配置专为**微信小程序开发**优化，涵盖了常见问题和最佳实践。

## 📋 规则分类

### 1️⃣ 基础代码质量
- ✅ 未使用的变量检测（支持 `_` 前缀忽略）
- ✅ 未定义变量检测
- ✅ 允许使用 console（小程序调试需要）

### 2️⃣ 代码风格
- 不使用分号（`never`）
- 优先使用单引号，允许模板字符串
- 2 空格缩进
- 文件末尾空行

### 3️⃣ 微信小程序特定规则 🔥

#### 🚫 禁止 setData 反模式

##### 问题 1：数组 length 设置错误
```javascript
// ❌ 错误：会导致 RangeError: Invalid array length
const updates = {
  [`markedStudents.length`]: markedStudents.length - 1
}
this.setData(updates)

// ✅ 正确：先修改数组，再传入整个数组
markedStudents.pop()
this.setData({ markedStudents })
```

##### 问题 2：传输所有数据（性能问题）
```javascript
// ❌ 错误：传输所有数据，严重影响性能
this.setData(this.data)

// ✅ 正确：只传输变化的数据
this.setData({
  userName: newName,
  age: newAge
})
```

##### 问题 3：直接修改 this.data
```javascript
// ❌ 错误：不会触发视图更新
this.data.count = 10

// ✅ 正确：使用 setData
this.setData({ count: 10 })
```

### 4️⃣ 异步和 Promise 处理
- Promise.reject 应使用 Error 对象
- 禁止异步 Promise executor
- 防止竞态条件
- 避免不必要的 `return await`

```javascript
// ❌ 错误
Promise.reject('error message')

// ✅ 正确
Promise.reject(new Error('error message'))
```

### 5️⃣ 变量声明
- 🚫 禁止使用 `var`，使用 `const` 或 `let`
- 优先使用 `const`
- 警告变量遮蔽（允许常见回调参数名）
- 禁止初始化为 `undefined`

```javascript
// ❌ 错误
var count = 0
let name = undefined

// ✅ 正确
const count = 0
let name
```

### 6️⃣ 类型比较
- 强制使用 `===` 和 `!==`
- 禁止隐式类型转换

```javascript
// ❌ 错误
if (value == null) {}
const num = +str

// ✅ 正确
if (value === null || value === undefined) {}
const num = Number(str)
```

### 7️⃣ 错误处理
- 抛出异常必须使用 Error 对象
- 回调函数必须处理 err 参数

```javascript
// ❌ 错误
throw 'error occurred'

// ✅ 正确
throw new Error('error occurred')
```

### 8️⃣ 数组和对象操作
- 禁止使用 `new Array()`
- 优先使用扩展运算符 `...`
- 优先使用点号访问属性
- 禁止直接调用 `Object.prototype` 方法

```javascript
// ❌ 错误
const arr = new Array(1, 2, 3)
obj.hasOwnProperty('key')

// ✅ 正确
const arr = [1, 2, 3]
Object.prototype.hasOwnProperty.call(obj, 'key')
```

### 9️⃣ 性能优化
- 🚫 禁止在循环中创建函数
- 🚫 禁止使用 `eval`
- 🚫 禁止扩展原生对象
- 🚫 禁止使用 `new Function`

```javascript
// ❌ 错误：每次循环都创建新函数
for (let i = 0; i < 10; i++) {
  setTimeout(() => console.log(i), 100)
}

// ✅ 正确：提取函数到循环外
const logValue = (value) => console.log(value)
for (let i = 0; i < 10; i++) {
  setTimeout(() => logValue(i), 100)
}
```

### 🔟 代码清晰度
- 禁止多余的 `else return`
- 禁止 Yoda 条件
- 禁止多余的 return
- 最多 2 个连续空行

```javascript
// ❌ 错误
if (condition) {
  return true
} else {
  return false
}

// ✅ 正确
return condition
```

### 1️⃣1️⃣ 安全相关
- 🚫 禁止 `javascript:` URL
- 🚫 禁止八进制转义序列

## 🎯 使用建议

### 自动修复
```bash
npm run lint:fix
```

### 检查代码
```bash
npm run lint
```

### IDE 集成
推荐安装 ESLint 插件，保存时自动格式化：
- VS Code: `dbaeumer.vscode-eslint`
- WebStorm: 内置支持

## 📚 相关文档

- [微信小程序 setData 使用指南](https://developers.weixin.qq.com/miniprogram/dev/reference/api/Page.html#Page.prototype.setData-Object-data-Function-callback)
- [ESLint 官方文档](https://eslint.org/docs/latest/rules/)
- [ESLint 中文文档](https://zh-hans.eslint.org/)

## 🔄 版本历史

### v1.0.0 (2026-01-20)
- ✅ 初始配置，包含 50+ 规则
- ✅ 微信小程序 setData 专项检测
- ✅ 性能和安全最佳实践
- ✅ 完整的中文注释说明
