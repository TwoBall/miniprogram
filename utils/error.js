/**
 * @file 全局错误处理工具
 * @module utils/error
 * @description 统一管理错误捕获、日志记录和用户提示
 */
import Toast from '@vant/weapp/toast/toast'

/**
 * 错误类型枚举
 * @enum {string}
 */
const ErrorType = {
  NETWORK: 'network',
  TIMEOUT: 'timeout',
  CLOUD: 'cloud',
  AUTH: 'auth',
  UNKNOWN: 'unknown'
}

/**
 * 错误消息映射
 * @type {Object<string, string>}
 */
const ErrorMessages = {
  [ErrorType.NETWORK]: '网络异常，请检查网络连接',
  [ErrorType.TIMEOUT]: '请求超时，请稍后重试',
  [ErrorType.CLOUD]: '服务异常，请稍后重试',
  [ErrorType.AUTH]: '登录已过期，请重新登录',
  [ErrorType.UNKNOWN]: '系统异常，请稍后重试'
}

/**
 * 获取当前页面实例
 * @returns {Object|null} 页面实例
 */
function getCurrentPage() {
  const pages = getCurrentPages()
  return pages.length > 0 ? pages[pages.length - 1] : null
}

/**
 * 检查当前页面的 van-toast 组件是否存在
 * @returns {boolean} 组件是否存在
 */
function checkToastComponent() {
  const page = getCurrentPage()
  if (!page) return false

  try {
    const toast = page.selectComponent('#van-toast')
    return !!toast
  } catch {
    return false
  }
}

/**
 * 等待 Toast 组件就绪
 * @returns {Promise<boolean>} 组件是否就绪
 */
function waitForToast() {
  return new Promise((resolve) => {
    let attempts = 0
    const maxAttempts = 20

    const check = () => {
      if (checkToastComponent()) {
        resolve(true)
        return
      }

      attempts++
      if (attempts >= maxAttempts) {
        resolve(false)
        return
      }

      setTimeout(check, 50)
    }

    wx.nextTick(check)
  })
}

/**
 * 安全调用 Toast 方法
 * @param {string} method - Toast 方法名
 * @param {Object} options - Toast 选项
 * @returns {*} Toast 返回值
 */
function safeCallToast(method, options) {
  try {
    return Toast[method](options)
  } catch (e) {
    if (e.message && e.message.includes('van-toast')) {
      console.warn('[SafeToast] 组件未就绪，已跳过:', method)
      return null
    }
    throw e
  }
}

/**
 * 安全的 Toast.loading 包装器
 * @param {Object|string} options - Toast 选项或消息
 * @returns {Promise<*>} Toast 返回值
 */
async function safeLoading(options) {
  const ready = await waitForToast()
  const opts = typeof options === 'string' ? { message: options } : options

  if (ready) {
    return Toast.loading({
      forbidClick: true,
      duration: 0,
      ...opts
    })
  } else {
    wx.showLoading({
      title: opts.message || '加载中...',
      mask: opts.forbidClick !== false
    })
    return null
  }
}

/**
 * 安全的 Toast.success 包装器
 * @param {Object|string} options - Toast 选项或消息
 * @returns {Promise<*>} Toast 返回值
 */
async function safeSuccess(options) {
  await waitForToast()
  const opts = typeof options === 'string' ? { message: options } : options
  return safeCallToast('success', opts)
}

/**
 * 安全的 Toast.fail 包装器
 * @param {Object|string} options - Toast 选项或消息
 * @returns {Promise<*>} Toast 返回值
 */
async function safeFail(options) {
  await waitForToast()
  const opts = typeof options === 'string' ? { message: options } : options
  return safeCallToast('fail', opts)
}

/**
 * 安全的 Toast.clear 包装器
 * @returns {void}
 */
function safeClear() {
  try {
    Toast.clear()
  } catch {
    // 静默处理
  }
  try {
    wx.hideLoading()
  } catch {
    // 静默处理
  }
}

/**
 * 安全的 Toast 对象
 * @type {Object}
 */
const SafeToast = {
  loading: safeLoading,
  success: safeSuccess,
  fail: safeFail,
  clear: safeClear
}

/**
 * 解析错误类型
 * @param {Error} error - 错误对象
 * @returns {string} 错误类型
 */
function parseErrorType(error) {
  if (!error) return ErrorType.UNKNOWN

  const message = error.message || error.errMsg || ''

  if (message.includes('timeout') || message.includes('超时')) {
    return ErrorType.TIMEOUT
  }

  if (message.includes('network') || message.includes('网络') ||
      message.includes('request:fail') || message.includes('ERR_CONNECTION')) {
    return ErrorType.NETWORK
  }

  if (message.includes('cloud') || message.includes('云函数')) {
    return ErrorType.CLOUD
  }

  if (message.includes('auth') || message.includes('login') || message.includes('登录')) {
    return ErrorType.AUTH
  }

  return ErrorType.UNKNOWN
}

/**
 * 获取友好的错误消息
 * @param {Error} error - 错误对象
 * @returns {string} 友好的错误消息
 */
function getFriendlyMessage(error) {
  const errorType = parseErrorType(error)
  return ErrorMessages[errorType]
}

/**
 * 处理错误并显示提示
 * @param {Error} error - 错误对象
 * @param {Object} [options={}] - 选项配置
 * @param {boolean} [options.showToast=true] - 是否显示 Toast 提示
 * @param {string} [options.context=''] - 错误上下文（用于日志）
 * @returns {Object} 错误信息对象
 */
function handleError(error, options = {}) {
  const { showToast = true, context = '' } = options

  const errorType = parseErrorType(error)
  const logMessage = context ? `[${context}] ${error.message}` : error.message
  console.error(`[${errorType}] ${logMessage}`, error)

  if (showToast) {
    const message = getFriendlyMessage(error)
    SafeToast.fail(message)
  }

  return {
    type: errorType,
    message: error.message,
    friendlyMessage: getFriendlyMessage(error)
  }
}

/**
 * 检查网络状态
 * @returns {Promise<boolean>} 网络是否可用
 */
async function checkNetwork() {
  return new Promise((resolve) => {
    wx.getNetworkType({
      success: (res) => {
        resolve(res.networkType !== 'none')
      },
      fail: () => {
        resolve(false)
      }
    })
  })
}

/**
 * 显示网络异常提示
 * @returns {void}
 */
function showNetworkError() {
  SafeToast.fail('网络异常，请检查网络连接')
}

module.exports = {
  handleError,
  checkNetwork,
  showNetworkError,
  SafeToast
}
