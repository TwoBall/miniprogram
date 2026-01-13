/**
 * @file 通用数据加载工具
 * @module utils/loader
 * @description 封装带缓存的数据加载逻辑，减少页面样板代码
 */

const request = require('./request')
const storage = require('./storage')
const { SafeToast } = require('./error')

/**
 * 带缓存的数据加载
 * @param {Object} options - 配置项
 * @param {string} options.cacheKey - 缓存键名
 * @param {number} [options.cacheDuration] - 缓存时长（毫秒），默认5分钟
 * @param {boolean} [options.forceRefresh=false] - 是否强制刷新
 * @param {string} [options.loadingMessage='加载中...'] - 加载提示文字
 * @param {boolean} [options.showLoading=true] - 是否显示加载提示
 * @param {string} options.apiModule - API模块名
 * @param {string} options.apiAction - API操作名
 * @param {Object} [options.apiData={}] - API参数
 * @param {Function} [options.transform] - 数据转换函数
 * @returns {Promise<Object>} { success, data, fromCache, error }
 */
async function loadWithCache(options) {
  const {
    cacheKey,
    cacheDuration = storage.CACHE_DURATION.FIVE_MINUTES,
    forceRefresh = false,
    loadingMessage = '加载中...',
    showLoading = true,
    apiModule,
    apiAction,
    apiData = {},
    transform
  } = options

  const cacheTimeKey = `${cacheKey}_time`

  // 检查缓存
  if (!forceRefresh) {
    const cached = storage.getWithCache(cacheKey, cacheTimeKey, cacheDuration)
    if (cached) {
      return { success: true, data: cached, fromCache: true }
    }
  }

  // 调用API
  try {
    if (showLoading) {
      await SafeToast.loading({
        message: loadingMessage,
        forbidClick: true,
        duration: 0
      })
    }

    const result = await request.callApi(apiModule, apiAction, apiData, {
      showLoading: false,
      showError: false
    })

    if (result.success) {
      // 应用数据转换
      const data = transform ? transform(result.data) : result.data
      // 保存缓存
      storage.setWithCache(cacheKey, cacheTimeKey, data)
      return { success: true, data, fromCache: false }
    }

    return { success: false, error: result.message || '加载失败' }
  } catch (error) {
    console.error(`[loadWithCache] ${apiModule}.${apiAction} 失败:`, error)
    return { success: false, error: error.message || '网络异常' }
  } finally {
    if (showLoading) {
      SafeToast.clear()
    }
  }
}

/**
 * 批量加载多个数据源（并行）
 * @param {Array<Object>} loaders - 加载器配置数组，每项同 loadWithCache 参数
 * @param {Object} [options] - 全局选项
 * @param {boolean} [options.showLoading=true] - 是否显示加载提示
 * @param {string} [options.loadingMessage='加载中...'] - 加载提示文字
 * @returns {Promise<Object>} { results: Array, allSuccess: boolean }
 */
async function loadMultiple(loaders, options = {}) {
  const { showLoading = true, loadingMessage = '加载中...' } = options

  try {
    if (showLoading) {
      await SafeToast.loading({
        message: loadingMessage,
        forbidClick: true,
        duration: 0
      })
    }

    // 并行加载所有数据
    const results = await Promise.all(
      loaders.map(loader => loadWithCache({ ...loader, showLoading: false }))
    )

    const allSuccess = results.every(r => r.success)

    return { results, allSuccess }
  } finally {
    if (showLoading) {
      SafeToast.clear()
    }
  }
}

/**
 * 创建页面数据加载器
 * 返回一个绑定了页面上下文的加载函数
 * @param {Object} page - 页面实例 (this)
 * @param {Object} config - 加载配置
 * @param {string} config.dataKey - setData 的键名
 * @param {string} config.cacheKey - 缓存键名
 * @param {string} config.apiModule - API模块名
 * @param {string} config.apiAction - API操作名
 * @param {Function} [config.getApiData] - 获取API参数的函数
 * @param {Function} [config.transform] - 数据转换函数
 * @param {number} [config.cacheDuration] - 缓存时长
 * @returns {Function} 加载函数 (forceRefresh) => Promise
 */
function createLoader(page, config) {
  const {
    dataKey,
    cacheKey,
    apiModule,
    apiAction,
    getApiData = () => ({}),
    transform,
    cacheDuration = storage.CACHE_DURATION.FIVE_MINUTES
  } = config

  return async function (forceRefresh = false) {
    page.setData({ loading: true })

    const result = await loadWithCache({
      cacheKey,
      cacheDuration,
      forceRefresh,
      apiModule,
      apiAction,
      apiData: getApiData(),
      transform,
      showLoading: !page.data[dataKey] // 首次加载显示loading
    })

    if (result.success) {
      page.setData({
        [dataKey]: result.data,
        loading: false
      })
    } else {
      page.setData({ loading: false })
      if (!result.fromCache) {
        SafeToast.fail(result.error || '加载失败')
      }
    }

    return result
  }
}

module.exports = {
  loadWithCache,
  loadMultiple,
  createLoader
}
