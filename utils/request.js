/**
 * 云函数调用封装
 * 统一处理 loading、错误提示、超时等
 */
import Toast from '@vant/weapp/toast/toast'

/**
 * 调用云函数
 * @param {string} name - 云函数名称
 * @param {Object} data - 传递给云函数的数据
 * @param {Object} options - 选项配置
 * @param {boolean} options.showLoading - 是否显示加载提示，默认 true
 * @param {string} options.loadingText - 加载提示文字，默认 '加载中...'
 * @param {boolean} options.showError - 是否显示错误提示，默认 true
 * @param {number} options.timeout - 超时时间（毫秒），默认 15000
 * @returns {Promise<Object>} 云函数返回结果
 */
async function callCloud(name, data = {}, options = {}) {
    const {
        showLoading = true,
        loadingText = '加载中...',
        showError = true,
        timeout = 15000
    } = options

    if (showLoading) {
        Toast.loading({
            message: loadingText,
            forbidClick: true,
            duration: 0
        })
    }

    try {
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
        if (showLoading) {
            Toast.clear()
        }

        console.error(`云函数 ${name} 调用失败:`, error)

        if (showError) {
            const message = error.message === '请求超时' ? '请求超时，请重试' : '网络异常，请重试'
            Toast.fail(message)
        }

        throw error
    }
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
