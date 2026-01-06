/**
 * 云函数公共模块统一入口
 * 导出所有公共工具函数和常量
 */

const dbUtils = require('./db-utils')
const authUtils = require('./auth-utils')
const responseUtils = require('./response-utils')
const sortUtils = require('./sort-utils')
const constants = require('./constants')
const rateLimitUtils = require('./rate-limit')
const validatorUtils = require('./validator')

module.exports = {
  // 数据库工具
  ...dbUtils,
  // 权限验证工具
  ...authUtils,
  // 响应格式工具
  ...responseUtils,
  // 排序工具
  ...sortUtils,
  // 常量
  ...constants,
  // 限频工具
  ...rateLimitUtils,
  // 校验工具
  ...validatorUtils
}
