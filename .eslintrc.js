/**
 * ESLint 配置文件
 * 适用于微信小程序项目
 */
module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true
  },
  globals: {
    // 微信小程序全局变量
    wx: 'readonly',
    App: 'readonly',
    Page: 'readonly',
    Component: 'readonly',
    Behavior: 'readonly',
    getApp: 'readonly',
    getCurrentPages: 'readonly',
    requirePlugin: 'readonly',
    // 云开发
    cloud: 'readonly'
  },
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  rules: {
    // ========================================
    // 1. 基础代码质量规则
    // ========================================
    'no-unused-vars': ['warn', {
      'argsIgnorePattern': '^_',
      'varsIgnorePattern': '^_',
      'caughtErrors': 'none' // 允许 catch 中的错误参数未使用
    }],
    'no-undef': 'error',
    'no-console': 'off', // 小程序中允许使用 console

    // ========================================
    // 2. 代码风格规则
    // ========================================
    'semi': ['warn', 'never'],
    'quotes': ['warn', 'single', { 'allowTemplateLiterals': true }],
    'indent': ['warn', 2, { 'SwitchCase': 1 }],
    'comma-dangle': 'off',
    'no-trailing-spaces': 'warn',
    'eol-last': ['warn', 'always'],

    // ========================================
    // 3. 最佳实践 - 类型和比较
    // ========================================
    'eqeqeq': ['error', 'smart'], // 强制使用 === 和 !==
    'no-eq-null': 'off', // eqeqeq 的 smart 模式已覆盖
    'no-implicit-coercion': 'warn', // 禁止隐式类型转换

    // ========================================
    // 4. 变量声明和作用域
    // ========================================
    'no-var': 'error', // 禁止使用 var
    'prefer-const': 'warn', // 优先使用 const
    'no-shadow': ['warn', {
      'builtinGlobals': false,
      'hoist': 'functions',
      'allow': ['resolve', 'reject', 'done', 'cb', 'callback', 'err', 'error']
    }],
    'no-use-before-define': ['error', {
      'functions': false, // 函数声明提升，允许先使用后定义
      'classes': true,
      'variables': true
    }],
    'no-undef-init': 'warn', // 禁止初始化为 undefined

    // ========================================
    // 5. 微信小程序 - setData 相关规则
    // ========================================
    'no-restricted-syntax': [
      'error',
      {
        // 🚫 禁止在 setData 中使用 .length] 模式（会导致 RangeError）
        selector: 'CallExpression[callee.property.name="setData"] Property[computed=true][key.type="TemplateLiteral"] > TemplateLiteral:has(TemplateElement[value.raw=/\\.length\\]$/])',
        message: '❌ 禁止在 setData 中使用 `.length]` 模式设置数组长度。\n   正确做法：先修改数组，再传入整个数组\n   示例：arr.pop(); this.setData({ arr })'
      },
      {
        // 🚫 禁止 this.setData(this.data) 性能反模式
        selector: 'CallExpression[callee.property.name="setData"][arguments.0.type="MemberExpression"][arguments.0.object.type="ThisExpression"][arguments.0.property.name="data"]',
        message: '❌ 禁止使用 this.setData(this.data)\n   原因：会传输所有数据，严重影响性能\n   正确做法：只传输变化的数据字段'
      }
    ],

    // 🚫 禁止直接修改 this.data（必须使用 setData）
    'no-restricted-properties': [
      'error',
      {
        object: 'this',
        property: 'data',
        message: '❌ 禁止直接给 this.data 赋值（不会触发视图更新）\n   正确做法：this.setData({ key: value })'
      }
    ],

    // ========================================
    // 6. Promise 和异步处理
    // ========================================
    'prefer-promise-reject-errors': 'warn', // Promise.reject 应该使用 Error 对象
    'no-async-promise-executor': 'error', // 禁止异步 Promise executor
    'require-atomic-updates': 'warn', // 防止竞态条件
    'no-return-await': 'warn', // 禁止不必要的 return await

    // ========================================
    // 7. 错误处理
    // ========================================
    'no-throw-literal': 'error', // 抛出异常时必须使用 Error 对象
    'handle-callback-err': ['warn', '^(err|error)$'], // 回调函数中必须处理 err 参数

    // ========================================
    // 8. 数组和对象操作
    // ========================================
    'no-array-constructor': 'warn', // 禁止使用 Array 构造函数
    'prefer-spread': 'warn', // 优先使用扩展运算符 ...
    'dot-notation': ['warn', { 'allowKeywords': true }], // 优先使用点号访问属性
    'no-prototype-builtins': 'warn', // 禁止直接调用 Object.prototype 方法
    'prefer-object-spread': 'warn', // 优先使用对象扩展运算符

    // ========================================
    // 9. 性能相关
    // ========================================
    'no-loop-func': 'warn', // 禁止在循环中创建函数
    'no-caller': 'error', // 禁止使用 arguments.caller 和 callee
    'no-extend-native': 'error', // 禁止扩展原生对象
    'no-new-func': 'error', // 禁止使用 new Function
    'no-new-wrappers': 'error', // 禁止使用原始包装器
    'no-new-object': 'warn', // 禁止使用 new Object()

    // ========================================
    // 10. 潜在错误和陷阱
    // ========================================
    'no-unmodified-loop-condition': 'warn', // 检测死循环
    'no-eval': 'error', // 禁止使用 eval
    'no-implied-eval': 'error', // 禁止隐式 eval
    'no-with': 'error', // 禁止使用 with
    'no-new': 'warn', // 禁止单独使用 new 不赋值
    'no-sequences': 'error', // 禁止逗号操作符
    'no-multi-str': 'warn', // 禁止多行字符串
    'radix': 'warn', // parseInt 必须指定进制

    // ========================================
    // 11. 代码清晰度
    // ========================================
    'no-multiple-empty-lines': ['warn', { 'max': 2 }],
    'no-else-return': 'warn', // 禁止 if 中有 return 后还有 else
    'no-lonely-if': 'warn', // 禁止 else 中只有一个 if
    'no-useless-return': 'warn', // 禁止多余的 return
    'no-useless-concat': 'warn', // 禁止不必要的字符串拼接
    'yoda': ['warn', 'never'], // 禁止 Yoda 条件

    // ========================================
    // 12. 安全相关
    // ========================================
    'no-script-url': 'error', // 禁止 javascript: URL
    'no-octal-escape': 'error' // 禁止八进制转义序列
  },
  ignorePatterns: [
    'node_modules/',
    'miniprogram_npm/',
    'cloudfunctions/',
    '*.wxs'
  ]
}
