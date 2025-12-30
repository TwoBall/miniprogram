// input: 性能指标数据
// output: 性能上报、监控数据
// pos: 工具层 > 性能监控

/**
 * 性能监控工具
 * 基于微信小程序 Performance API
 *
 * 使用方式：
 * 1. 在 app.js 中初始化: initPerformanceMonitor()
 * 2. 在页面中使用 performanceMixin
 * 3. 监控云函数调用: monitorCloudCall('funcName', fn)
 */

// 性能指标 ID（需在小程序后台 We分析 中配置）
const PERF_IDS = {
  COLD_START: 1001,      // 冷启动耗时
  PAGE_LOAD: 1002,       // 页面加载耗时
  SETDATA_DURATION: 1003, // setData 耗时
  CLOUD_CALL: 1004,      // 云函数调用耗时
  FIRST_RENDER: 1005     // 首次渲染耗时
}

// setData 警告阈值（毫秒）
const SETDATA_WARN_THRESHOLD = 50

/**
 * 初始化性能监控
 * 在 app.js 的 onLaunch 中调用
 * @returns {Object|null} - 性能观察器实例
 */
function initPerformanceMonitor() {
  try {
    const performance = wx.getPerformance()
    if (!performance) {
      console.warn('[Performance] wx.getPerformance 不可用')
      return null
    }

    const observer = performance.createObserver((entryList) => {
      const entries = entryList.getEntries()
      entries.forEach(entry => {
        if (entry.entryType === 'navigation') {
          // 上报启动性能数据
          const duration = Math.round(entry.duration)
          console.log(`[Performance] 启动耗时: ${duration}ms`)
          safeReportPerformance(PERF_IDS.COLD_START, duration, [entry.name || 'app'])
        }
        if (entry.entryType === 'render') {
          // 上报渲染性能数据
          const duration = Math.round(entry.duration)
          console.log(`[Performance] 渲染耗时: ${duration}ms - ${entry.name}`)
          safeReportPerformance(PERF_IDS.FIRST_RENDER, duration, [entry.name || 'unknown'])
        }
      })
    })

    observer.observe({ entryTypes: ['navigation', 'render'] })
    console.log('[Performance] 性能监控已初始化')
    return observer
  } catch (error) {
    console.error('[Performance] 初始化失败:', error)
    return null
  }
}

/**
 * 安全的性能上报（兼容不支持的版本）
 */
function safeReportPerformance(id, value, dimensions = []) {
  try {
    if (typeof wx.reportPerformance === 'function') {
      wx.reportPerformance(id, value, dimensions)
    }
  } catch (error) {
    // 忽略上报错误
  }
}

/**
 * 包装 setData，监控耗时
 * @param {Object} component - 页面或组件实例
 */
function wrapSetData(component) {
  if (!component || !component.setData || component._setDataWrapped) {
    return
  }

  const originalSetData = component.setData.bind(component)
  const route = component.route || 'unknown'

  component.setData = function(data, callback) {
    const start = Date.now()

    originalSetData(data, function() {
      const duration = Date.now() - start

      // 超过阈值记录警告
      if (duration > SETDATA_WARN_THRESHOLD) {
        console.warn(
          `[Performance] setData 耗时: ${duration}ms`,
          `页面: ${route}`,
          `字段: ${Object.keys(data).join(', ')}`
        )
        safeReportPerformance(PERF_IDS.SETDATA_DURATION, duration, [route])
      }

      if (typeof callback === 'function') {
        callback()
      }
    })
  }

  component._setDataWrapped = true
}

/**
 * 监控云函数调用
 * @param {string} name - 云函数名称
 * @param {Function} fn - 调用函数
 * @returns {Promise} - 云函数结果
 *
 * @example
 * const result = await monitorCloudCall('attendance', () => {
 *   return wx.cloud.callFunction({ name: 'attendance', data: { action: 'getRecords' } })
 * })
 */
async function monitorCloudCall(name, fn) {
  const start = Date.now()

  try {
    const result = await fn()
    const duration = Date.now() - start

    // 上报云函数调用耗时
    safeReportPerformance(PERF_IDS.CLOUD_CALL, duration, [name])

    if (duration > 1000) {
      console.warn(`[Performance] 云函数 ${name} 耗时: ${duration}ms`)
    }

    return result
  } catch (error) {
    const duration = Date.now() - start
    console.error(`[Performance] 云函数 ${name} 失败，耗时: ${duration}ms`, error)
    throw error
  }
}

/**
 * 页面性能监控 Mixin
 * 在页面的 behaviors 中使用
 *
 * @example
 * Page({
 *   ...performanceMixin,
 *   // 其他页面配置
 * })
 */
const performanceMixin = {
  onLoad() {
    this._pageLoadStart = Date.now()
  },

  onReady() {
    if (this._pageLoadStart) {
      const duration = Date.now() - this._pageLoadStart
      const route = this.route || 'unknown'

      console.log(`[Performance] 页面加载: ${route} - ${duration}ms`)
      safeReportPerformance(PERF_IDS.PAGE_LOAD, duration, [route])
    }

    // 包装 setData
    wrapSetData(this)
  }
}

/**
 * 创建性能计时器
 * @param {string} name - 计时器名称
 * @returns {Object} - 计时器对象
 *
 * @example
 * const timer = createTimer('loadData')
 * // ... 执行操作
 * timer.end() // 输出: [Timer] loadData: xxxms
 */
function createTimer(name) {
  const start = Date.now()
  return {
    end() {
      const duration = Date.now() - start
      console.log(`[Timer] ${name}: ${duration}ms`)
      return duration
    }
  }
}

/**
 * 获取当前页面路径
 * @returns {string}
 */
function getCurrentPageRoute() {
  const pages = getCurrentPages()
  if (pages.length > 0) {
    return pages[pages.length - 1].route || 'unknown'
  }
  return 'unknown'
}

module.exports = {
  PERF_IDS,
  initPerformanceMonitor,
  wrapSetData,
  monitorCloudCall,
  performanceMixin,
  createTimer,
  getCurrentPageRoute,
  safeReportPerformance
}
