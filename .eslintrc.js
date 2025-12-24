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
    // 错误级别规则
    'no-unused-vars': ['warn', {
      'argsIgnorePattern': '^_',
      'varsIgnorePattern': '^_'
    }],
    'no-undef': 'error',
    'no-console': 'off',

    // 代码风格规则
    'semi': ['warn', 'never'],
    'quotes': ['warn', 'single', { 'allowTemplateLiterals': true }],
    'indent': ['warn', 2, { 'SwitchCase': 1 }],
    'comma-dangle': 'off',
    'no-trailing-spaces': 'warn',
    'eol-last': ['warn', 'always'],

    // 最佳实践
    'eqeqeq': ['warn', 'smart'],
    'no-var': 'warn',
    'prefer-const': 'warn',
    'no-multiple-empty-lines': ['warn', { 'max': 2 }]
  },
  ignorePatterns: [
    'node_modules/',
    'miniprogram_npm/',
    'cloudfunctions/',
    '*.wxs'
  ]
}
