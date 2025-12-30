/**
 * 全局错误处理工具
 * 统一管理错误捕获、日志记录和用户提示
 */
import Toast from '@vant/weapp/toast/toast'

/**
 * Toast 是否已就绪
 * 用于跟踪当前页面的 van-toast 组件是否已渲染
 */
let toastReady = false
let toastReadyPromise = null

/**
 * 标记 Toast 已就绪
 * 应在页面 onReady 生命周期后调用
 */
function markToastReady() {
  toastReady = true
  if (toastReadyPromise) {
    toastReadyPromise.resolve()
    toastReadyPromise = null
  }
}

/**
 * 重置 Toast 状态
 * 应在页面 onUnload 时调用
 */
function resetToastState() {
  toastReady = false
  toastReadyPromise = null
}

/**
 * 等待 Toast 就绪
 * @returns {Promise<void>}
 */
function waitForToast() {
  if (toastReady) return Promise.resolve()

  if (!toastReadyPromise) {
    let resolve
    toastReadyPromise = new Promise(r => { resolve = r })
    toastReadyPromise.resolve = resolve
    // 设置超时，避免无限等待
    setTimeout(() => {
      toastReady = true
      if (toastReadyPromise) {
        toastReadyPromise.resolve()
        toastReadyPromise = null
      }
    }, 500)
  }

  return toastReadyPromise
}

/**
 * 安全的 Toast.loading 包装器
 * @param {Object|string} options - Toast 选项或消息
 */
async function safeLoading(options) {
  await waitForToast()
  const opts = typeof options === 'string' ? { message: options } : options
  return Toast.loading({
    forbidClick: true,
    duration: 0,
    ...opts
  })
}

/**
 * 安全的 Toast.success 包装器
 */
async function safeSuccess(options) {
  await waitForToast()
  const opts = typeof options === 'string' ? { message: options } : options
  return Toast.success(opts)
}

/**
 * 安全的 Toast.fail 包装器
 */
async function safeFail(options) {
  await waitForToast()
  const opts = typeof options === 'string' ? { message: options } : options
  return Toast.fail(opts)
}

/**
 * 安全的 Toast.clear 包装器
 */
function safeClear() {
  if (toastReady) {
    Toast.clear()
  }
}

/**
 * 安全的 Toast 对象
 */
const SafeToast = {
  loading: safeLoading,
  success: safeSuccess,
  fail: safeFail,
  clear: safeClear,
  markReady: markToastReady,
  reset: resetToastState
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
