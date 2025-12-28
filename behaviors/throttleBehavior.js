// input: 按钮点击、表单提交等高频操作事件
// output: 节流防抖处理和按钮加载状态管理
// pos: 主包 > behaviors > 节流防抖通用行为

/**
 * 节流防抖 Behavior
 * 提供按钮节流、防抖和异步操作状态管理
 *
 * 使用方式：
 * 1. 引入: const throttleBehavior = require('../../../behaviors/throttleBehavior')
 * 2. 混入: behaviors: [throttleBehavior]
 * 3. 调用: this.throttle(() => {...}, 1000, 'btnKey')
 * 4. 或者: await this.safeAsyncAction('btnKey', async () => {...})
 *
 * 在 WXML 中使用加载状态：
 * <van-button loading="{{btnLoadingMap.submit}}" bind:click="onSubmit">提交</van-button>
 */
module.exports = Behavior({
  data: {
    // 按钮加载状态映射表
    btnLoadingMap: {}
  },

  /**
   * 页面销毁时清理定时器
   */
  detached() {
    this._clearAllTimers()
  },

  methods: {
    /**
     * 初始化定时器存储
     * @private
     */
    _initTimerStore() {
      if (!this._throttleTimers) {
        this._throttleTimers = {}
      }
      if (!this._debounceTimers) {
        this._debounceTimers = {}
      }
    },

    /**
     * 清理所有定时器
     * @private
     */
    _clearAllTimers() {
      if (this._throttleTimers) {
        Object.values(this._throttleTimers).forEach(timerId => {
          if (timerId) clearTimeout(timerId)
        })
        this._throttleTimers = {}
      }
      if (this._debounceTimers) {
        Object.values(this._debounceTimers).forEach(timerId => {
          if (timerId) clearTimeout(timerId)
        })
        this._debounceTimers = {}
      }
    },

    /**
     * 节流函数 - 在指定时间内只执行一次
     * 适用于按钮点击防止重复提交
     *
     * @param {Function} fn - 要执行的函数
     * @param {number} delay - 节流时间间隔（毫秒），默认 1000ms
     * @param {string} key - 节流标识，用于区分不同操作，默认 'default'
     * @returns {boolean} - 是否执行了函数
     *
     * @example
     * onSubmit() {
     *   if (this.throttle(() => this.doSubmit(), 1000, 'submit')) {
     *     console.log('提交中...')
     *   }
     * }
     */
    throttle(fn, delay = 1000, key = 'default') {
      this._initTimerStore()

      // 如果该 key 对应的操作正在节流中，直接返回
      if (this._throttleTimers[key]) {
        return false
      }

      // 执行函数
      fn()

      // 设置节流定时器
      this._throttleTimers[key] = setTimeout(() => {
        this._throttleTimers[key] = null
      }, delay)

      return true
    },

    /**
     * 防抖函数 - 延迟执行，每次调用重置计时器
     * 适用于搜索输入等场景
     *
     * @param {Function} fn - 要执行的函数
     * @param {number} delay - 防抖延迟时间（毫秒），默认 300ms
     * @param {string} key - 防抖标识，用于区分不同操作，默认 'default'
     *
     * @example
     * onSearchInput(e) {
     *   this.debounce(() => this.doSearch(e.detail.value), 300, 'search')
     * }
     */
    debounce(fn, delay = 300, key = 'default') {
      this._initTimerStore()

      // 清除之前的定时器
      if (this._debounceTimers[key]) {
        clearTimeout(this._debounceTimers[key])
      }

      // 设置新的定时器
      this._debounceTimers[key] = setTimeout(() => {
        fn()
        this._debounceTimers[key] = null
      }, delay)
    },

    /**
     * 设置按钮加载状态
     *
     * @param {string} btnKey - 按钮标识
     * @param {boolean} loading - 是否加载中
     */
    setBtnLoading(btnKey, loading) {
      this.setData({
        [`btnLoadingMap.${btnKey}`]: loading
      })
    },

    /**
     * 安全的异步操作包装器
     * 自动管理加载状态，防止重复点击
     *
     * @param {string} btnKey - 按钮标识，用于显示加载状态
     * @param {Function} asyncFn - 异步函数
     * @returns {Promise<any>} - 异步函数的返回值
     *
     * @example
     * async onApprove() {
     *   const result = await this.safeAsyncAction('approve', async () => {
     *     return await this.callApproveAPI()
     *   })
     *   if (result) {
     *     wx.showToast({ title: '审批成功' })
     *   }
     * }
     */
    async safeAsyncAction(btnKey, asyncFn) {
      // 如果正在加载中，直接返回
      if (this.data.btnLoadingMap[btnKey]) {
        return null
      }

      this.setBtnLoading(btnKey, true)

      try {
        const result = await asyncFn()
        return result
      } catch (error) {
        console.error(`[throttleBehavior] safeAsyncAction error (${btnKey}):`, error)
        throw error
      } finally {
        this.setBtnLoading(btnKey, false)
      }
    },

    /**
     * 批量重置按钮状态
     *
     * @param {string[]} btnKeys - 要重置的按钮标识数组
     */
    resetBtnLoading(btnKeys = []) {
      if (btnKeys.length === 0) {
        // 重置所有按钮
        this.setData({ btnLoadingMap: {} })
      } else {
        const updates = {}
        btnKeys.forEach(key => {
          updates[`btnLoadingMap.${key}`] = false
        })
        this.setData(updates)
      }
    }
  }
})