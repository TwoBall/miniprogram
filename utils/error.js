/**
 * 全局错误处理工具
 * 统一管理错误捕获、日志记录和用户提示
 */
import Toast from '@vant/weapp/toast/toast'

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

  // 显示用户友好提示
  if (showToast) {
    const message = getFriendlyMessage(error)
    Toast.fail(message)
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
  Toast.fail('网络异常，请检查网络连接')
}

module.exports = {
  handleError,
  checkNetwork,
  showNetworkError
}
