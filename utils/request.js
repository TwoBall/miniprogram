/**
 * 云函数调用封装
 * 统一处理 loading、错误提示、超时、重试等
 */
import Toast from '@vant/weapp/toast/toast'
const errorUtil = require('./error')

/**
 * 延迟函数
 * @param {number} ms - 延迟毫秒数
 */
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 调用云函数（带重试）
 * @param {string} name - 云函数名称
 * @param {Object} data - 传递给云函数的数据
 * @param {Object} options - 选项配置
 * @param {boolean} options.showLoading - 是否显示加载提示，默认 true
 * @param {string} options.loadingText - 加载提示文字，默认 '加载中...'
 * @param {boolean} options.showError - 是否显示错误提示，默认 true
 * @param {number} options.timeout - 超时时间（毫秒），默认 15000
 * @param {number} options.retryCount - 重试次数，默认 2
 * @param {number} options.retryDelay - 重试间隔（毫秒），默认 1000
 * @returns {Promise<Object>} 云函数返回结果
 */
async function callCloud(name, data = {}, options = {}) {
    const {
        showLoading = true,
        loadingText = '加载中...',
        showError = true,
        timeout = 15000,
        retryCount = 2,
        retryDelay = 1000
    } = options

    // 检查网络状态
    const isOnline = await errorUtil.checkNetwork()
    if (!isOnline) {
        errorUtil.showNetworkError()
        throw new Error('网络不可用')
    }

    if (showLoading) {
        Toast.loading({
            message: loadingText,
            forbidClick: true,
            duration: 0
        })
    }

    let lastError = null

    // 尝试调用（包含重试）
    for (let attempt = 0; attempt <= retryCount; attempt++) {
        try {
            // 重试时显示提示
            if (attempt > 0) {
                console.log(`云函数 ${name} 第 ${attempt} 次重试...`)
                if (showLoading) {
                    Toast.loading({
                        message: '重试中...',
                        forbidClick: true,
                        duration: 0
                    })
                }
            }

            // 创建超时 Promise
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('请求超时')), timeout)
            })

            // 云函数调用
            const cloudPromise = wx.cloud.callFunction({
                name,
                data
            })

            // 竞争：谁先完成用谁的结果
            const res = await Promise.race([cloudPromise, timeoutPromise])

            if (showLoading) {
                Toast.clear()
            }

            return res.result
        } catch (error) {
            lastError = error
            console.error(`云函数 ${name} 调用失败 (尝试 ${attempt + 1}/${retryCount + 1}):`, error)

            // 如果还有重试机会，等待后重试
            if (attempt < retryCount) {
                await delay(retryDelay)
            }
        }
    }

    // 所有重试都失败
    if (showLoading) {
        Toast.clear()
    }

    if (showError) {
        errorUtil.handleError(lastError, { context: `云函数 ${name}` })
    }

    throw lastError
}

/**
 * 调用云函数（静默模式，不显示任何提示）
 * @param {string} name - 云函数名称
 * @param {Object} data - 传递给云函数的数据
 * @returns {Promise<Object>} 云函数返回结果
 */
async function callCloudSilent(name, data = {}) {
    return callCloud(name, data, {
        showLoading: false,
        showError: false
    })
}

module.exports = {
    callCloud,
    callCloudSilent
}
