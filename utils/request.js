/**
 * @file 云函数调用封装
 * @module utils/request
 * @description 统一处理 loading、错误提示、超时、重试等
 */
import Dialog from '@vant/weapp/dialog/dialog'
const errorUtil = require('./error')
const { SafeToast } = errorUtil
const storage = require('./storage')

/**
 * 延迟执行
 * @param {number} ms - 延迟毫秒数
 * @returns {Promise<void>}
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 调用云函数（带重试机制）
 * @param {string} name - 云函数名称
 * @param {Object} [data={}] - 传递给云函数的数据
 * @param {Object} [options={}] - 选项配置
 * @param {boolean} [options.showLoading=true] - 是否显示加载提示
 * @param {string} [options.loadingText='加载中...'] - 加载提示文字
 * @param {boolean} [options.showError=true] - 是否显示错误提示
 * @param {number} [options.timeout=15000] - 超时时间（毫秒）
 * @param {number} [options.retryCount=2] - 重试次数
 * @param {number} [options.retryDelay=1000] - 重试间隔（毫秒）
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

  const isOnline = await errorUtil.checkNetwork()
  if (!isOnline) {
    errorUtil.showNetworkError()
    throw new Error('网络不可用')
  }

  if (showLoading) {
    SafeToast.loading({
      message: loadingText,
      forbidClick: true,
      duration: 0
    })
  }

  let lastError = null

  for (let attempt = 0; attempt <= retryCount; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`云函数 ${name} 第 ${attempt} 次重试...`)
        if (showLoading) {
          SafeToast.loading({
            message: '重试中...',
            forbidClick: true,
            duration: 0
          })
        }
      }

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('请求超时')), timeout)
      })

      const cloudPromise = wx.cloud.callFunction({
        name,
        data
      })

      const res = await Promise.race([cloudPromise, timeoutPromise])

      if (showLoading) {
        SafeToast.clear()
      }

      return res.result
    } catch (error) {
      lastError = error
      console.error(`云函数 ${name} 调用失败 (尝试 ${attempt + 1}/${retryCount + 1}):`, error)

      if (attempt < retryCount) {
        await delay(retryDelay)
      }
    }
  }

  if (showLoading) {
    SafeToast.clear()
  }

  if (showError) {
    const isNetworkError = lastError?.message?.includes('网络') ||
                          lastError?.message?.includes('timeout') ||
                          lastError?.errMsg?.includes('request:fail')
    
    if (isNetworkError) {
      try {
        await Dialog.confirm({
          title: '网络异常',
          message: '请检查网络连接后重试',
          confirmButtonText: '重试',
          cancelButtonText: '取消'
        })

        try {
          return await callCloud(name, data, options)
        } catch (e) {
          console.error('重试失败:', e)
        }
      } catch (e) {
        // 用户取消
      }
    } else {
      errorUtil.handleError(lastError, { context: `云函数 ${name}` })
    }
  }

  throw lastError
}

/**
 * 调用云函数（静默模式）
 * @param {string} name - 云函数名称
 * @param {Object} [data={}] - 传递给云函数的数据
 * @returns {Promise<Object>} 云函数返回结果
 */
async function callCloudSilent(name, data = {}) {
  return callCloud(name, data, {
    showLoading: false,
    showError: false
  })
}

/**
 * 获取筛选选项（带缓存）
 * @param {boolean} [forceRefresh=false] - 是否强制刷新缓存
 * @returns {Promise<Object>} 筛选选项 { departments, classes, clubs, classDeptMap }
 */
async function getFilterOptions(forceRefresh = false) {
  const cacheKey = storage.STORAGE_KEYS.FILTER_OPTIONS
  const cacheTimeKey = storage.STORAGE_KEYS.FILTER_OPTIONS_TIME

  if (!forceRefresh) {
    const cached = storage.getWithCache(cacheKey, cacheTimeKey, storage.CACHE_DURATION.TEN_MINUTES)
    if (cached) {
      return cached
    }
  }

  const result = await callCloudSilent('students', { action: 'getFilterOptions' })

  if (result && result.success) {
    storage.setWithCache(cacheKey, cacheTimeKey, result.data)
    return result.data
  }

  throw new Error(result?.message || '获取筛选选项失败')
}

module.exports = {
  callCloud,
  callCloudSilent,
  getFilterOptions
}
