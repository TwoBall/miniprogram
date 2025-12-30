/**
 * 全局错误处理工具
 * 统一管理错误捕获、日志记录和用户提示
 */
import Toast from '@vant/weapp/toast/toast'

/**
 * 获取当前页面实例
 */
function getCurrentPage() {
  const pages = getCurrentPages()
  return pages.length > 0 ? pages[pages.length - 1] : null
}

/**
 * 检查当前页面的 van-toast 组件是否存在
 * @returns {boolean}
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
 * 通过轮询检测组件是否存在，最多等待 1 秒
 * @returns {Promise<boolean>} 组件是否就绪
 */
function waitForToast() {
  return new Promise((resolve) => {
    let attempts = 0
    const maxAttempts = 20 // 最多尝试 20 次，每次 50ms，共 1 秒

    const check = () => {
      if (checkToastComponent()) {
        resolve(true)
        return
      }

      attempts++
      if (attempts >= maxAttempts) {
        // 超时后仍然尝试调用，让原生 Toast 自己处理
        resolve(false)
        return
      }

      setTimeout(check, 50)
    }

    // 先用 nextTick 确保当前渲染周期完成
    wx.nextTick(check)
  })
}

/**
 * 安全调用 Toast，捕获组件未找到的错误
 */
function safeCallToast(method, options) {
  try {
    return Toast[method](options)
  } catch (e) {
    // 静默处理组件未找到的错误
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
    // 组件未就绪时使用 wx.showLoading 作为降级方案
    wx.showLoading({
      title: opts.message || '加载中...',
      mask: opts.forbidClick !== false
    })
    return null
  }
}

/**
 * 安全的 Toast.success 包装器
 */
async function safeSuccess(options) {
  await waitForToast()
  const opts = typeof options === 'string' ? { message: options } : options
  return safeCallToast('success', opts)
}

/**
 * 安全的 Toast.fail 包装器
 */
async function safeFail(options) {
  await waitForToast()
  const opts = typeof options === 'string' ? { message: options } : options
  return safeCallToast('fail', opts)
}

/**
 * 安全的 Toast.clear 包装器
 */
function safeClear() {
  try {
    Toast.clear()
  } catch {
    // 静默处理
  }
  // 同时清除 wx.showLoading（降级方案）
  try {
    wx.hideLoading()
  } catch {
    // 静默处理
  }
}

/**
 * 安全的 Toast 对象
 */
const SafeToast = {
  loading: safeLoading,
  success: safeSuccess,
  fail: safeFail,
  clear: safeClear
}

/**
 * 错误类型枚举
 */
const ErrorType = {
  NETWORK: 'network',      // 网络错误
  TIMEOUT: 'timeout',      // 超时错误
  CLOUD: 'cloud',          // 云函数错误
  AUTH: 'auth',            // 认证错误
  UNKNOWN: 'unknown'       // 未知错误
}

/**
 * 错误消息映射
 */
const ErrorMessages = {
  [ErrorType.NETWORK]: '网络异常，请检查网络连接',
  [ErrorType.TIMEOUT]: '请求超时，请稍后重试',
  [ErrorType.CLOUD]: '服务异常，请稍后重试',
  [ErrorType.AUTH]: '登录已过期，请重新登录',
  [ErrorType.UNKNOWN]: '系统异常，请稍后重试'
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
 * @param {Object} options - 选项
 * @param {boolean} options.showToast - 是否显示 Toast 提示
 * @param {string} options.context - 错误上下文（用于日志）
 */
function handleError(error, options = {}) {
  const { showToast = true, context = '' } = options

  // 记录错误日志
  const errorType = parseErrorType(error)
  const logMessage = context ? `[${context}] ${error.message}` : error.message
  console.error(`[${errorType}] ${logMessage}`, error)

  // 显示用户友好提示（使用安全 Toast）
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
