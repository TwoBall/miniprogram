/**
 * 统一响应格式工具
 * 标准化云函数返回数据结构
 */

/**
 * 错误码定义
 */
const ERROR_CODES = {
  SUCCESS: 0,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_ERROR: 500
}

/**
 * 成功响应
 * @param {*} data - 返回数据
 * @param {string} message - 成功消息
 * @returns {Object} 标准响应对象
 */
function success(data = null, message = '操作成功') {
  return {
    success: true,
    code: ERROR_CODES.SUCCESS,
    message,
    data
  }
}

/**
 * 成功响应（带分页）
 * @param {Array} data - 数据列表
 * @param {Object} pagination - 分页信息
 * @param {string} message - 成功消息
 * @returns {Object} 标准响应对象
 */
function successWithPagination(data, pagination, message = '获取成功') {
  return {
    success: true,
    code: ERROR_CODES.SUCCESS,
    message,
    data,
    pagination
  }
}

/**
 * 失败响应
 * @param {string} message - 错误消息
 * @param {number} code - 错误码
 * @param {*} data - 附加数据
 * @returns {Object} 标准响应对象
 */
function fail(message = '操作失败', code = -1, data = null) {
  return {
    success: false,
    code,
    message,
    data
  }
}

/**
 * 参数错误响应
 * @param {string} message - 错误消息
 * @returns {Object} 标准响应对象
 */
function badRequest(message = '参数错误') {
  return fail(message, ERROR_CODES.BAD_REQUEST)
}

/**
 * 权限不足响应
 * @param {string} message - 错误消息
 * @returns {Object} 标准响应对象
 */
function unauthorized(message = '未授权访问') {
  return fail(message, ERROR_CODES.UNAUTHORIZED)
}

/**
 * 禁止访问响应
 * @param {string} message - 错误消息
 * @returns {Object} 标准响应对象
 */
function forbidden(message = '无权限执行此操作') {
  return fail(message, ERROR_CODES.FORBIDDEN)
}

/**
 * 资源不存在响应
 * @param {string} message - 错误消息
 * @returns {Object} 标准响应对象
 */
function notFound(message = '资源不存在') {
  return fail(message, ERROR_CODES.NOT_FOUND)
}

/**
 * 服务器内部错误响应
 * @param {string} message - 错误消息
 * @returns {Object} 标准响应对象
 */
function internalError(message = '服务器内部错误') {
  return fail(message, ERROR_CODES.INTERNAL_ERROR)
}

/**
 * 错误处理包装器
 * 统一处理异步函数的错误，避免每个 handler 都写 try-catch
 * @param {Function} handler - 异步处理函数
 * @returns {Function} 包装后的处理函数
 */
function wrapHandler(handler) {
  return async (event, context) => {
    try {
      return await handler(event, context)
    } catch (error) {
      console.error('Handler error:', error)
      return internalError(error.message || '服务器内部错误')
    }
  }
}

/**
 * 创建带默认错误处理的 action 分发器
 * @param {Object} handlers - action 到处理函数的映射
 * @param {Function} getContext - 获取上下文的函数
 * @returns {Function} 云函数入口函数
 */
function createDispatcher(handlers, getContext = null) {
  return async (event, context) => {
    const { action } = event

    if (!action) {
      return badRequest('缺少 action 参数')
    }

    const handler = handlers[action]
    if (!handler) {
      return badRequest(`无效的操作类型: ${action}`)
    }

    try {
      const ctx = getContext ? await getContext(event, context) : null
      return await handler(event, ctx, context)
    } catch (error) {
      console.error(`Action [${action}] error:`, error)
      return internalError(error.message || '服务器内部错误')
    }
  }
}

module.exports = {
  ERROR_CODES,
  success,
  successWithPagination,
  fail,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  internalError,
  wrapHandler,
  createDispatcher
}