// input: 列表容器选择器、列表项选择器、配置选项
// output: 列表项可见状态、可见/隐藏回调
// pos: 主包 > behaviors > 懒加载通用行为

/**
 * 懒加载 Behavior
 * 使用 IntersectionObserver 实现列表项按需渲染
 *
 * 使用方式：
 * 1. 引入: const lazyLoadBehavior = require('../../../behaviors/lazyLoadBehavior')
 * 2. 混入: behaviors: [lazyLoadBehavior]
 * 3. 在 onReady 中调用: this.initListObserver('.list-container', '.list-item')
 *
 * 在 WXML 中使用：
 * <view class="list-item" data-index="{{index}}">
 *   <block wx:if="{{itemsLoadState[index] === 'visible'}}">完整内容</block>
 *   <block wx:else>占位内容</block>
 * </view>
 */
module.exports = Behavior({
  data: {
    // 当前可见的项目索引集合（用于快速查询）
    visibleItemsSet: {},
    // 项目加载状态映射 { index: 'visible' | 'hidden' }
    itemsLoadState: {}
  },

  lifetimes: {
    attached() {
      this._observers = []
    },
    detached() {
      this._disconnectObservers()
    }
  },

  pageLifetimes: {
    hide() {
      // 页面隐藏时断开观察器，节省资源
      this._disconnectObservers()
    }
  },

  methods: {
    /**
     * 初始化列表项观察器
     * @param {string} containerSelector - 容器选择器，如 '.list-container'
     * @param {string} itemSelector - 列表项选择器，如 '.list-item'
     * @param {Object} options - 配置选项
     * @param {Array} options.thresholds - 交叉比例阈值，默认 [0, 0.1]
     * @param {Object} options.rootMargin - 根元素边距，默认 { top: 100, bottom: 100 }
     */
    initListObserver(containerSelector, itemSelector, options = {}) {
      const {
        thresholds = [0, 0.1],
        rootMargin = { top: 100, bottom: 100 }
      } = options

      // 先断开之前的观察器
      this._disconnectObservers()

      const observer = this.createIntersectionObserver({
        thresholds,
        observeAll: true
      })

      observer
        .relativeTo(containerSelector, rootMargin)
        .observe(itemSelector, (res) => {
          const dataset = res.dataset || {}
          const index = dataset.index

          if (index !== undefined) {
            if (res.intersectionRatio > 0) {
              this._onItemVisible(index, res)
            } else {
              this._onItemHidden(index, res)
            }
          }
        })

      this._observers.push(observer)
    },

    /**
     * 使用视口作为参照的观察器
     * 适用于没有固定容器的场景
     * @param {string} itemSelector - 列表项选择器
     * @param {Object} options - 配置选项
     */
    initViewportObserver(itemSelector, options = {}) {
      const {
        thresholds = [0, 0.1],
        rootMargin = { top: 100, bottom: 100 }
      } = options

      this._disconnectObservers()

      const observer = this.createIntersectionObserver({
        thresholds,
        observeAll: true
      })

      observer
        .relativeToViewport(rootMargin)
        .observe(itemSelector, (res) => {
          const dataset = res.dataset || {}
          const index = dataset.index

          if (index !== undefined) {
            if (res.intersectionRatio > 0) {
              this._onItemVisible(index, res)
            } else {
              this._onItemHidden(index, res)
            }
          }
        })

      this._observers.push(observer)
    },

    /**
     * 项目进入可视区域
     * @private
     */
    _onItemVisible(index, res) {
      // 避免重复设置
      if (this.data.visibleItemsSet[index]) {
        return
      }

      this.setData({
        [`visibleItemsSet.${index}`]: true,
        [`itemsLoadState.${index}`]: 'visible'
      })

      // 触发自定义回调
      if (typeof this.onItemVisible === 'function') {
        this.onItemVisible(index, res)
      }
    },

    /**
     * 项目离开可视区域
     * @private
     */
    _onItemHidden(index, res) {
      // 避免重复设置
      if (!this.data.visibleItemsSet[index]) {
        return
      }

      this.setData({
        [`visibleItemsSet.${index}`]: false,
        [`itemsLoadState.${index}`]: 'hidden'
      })

      // 触发自定义回调
      if (typeof this.onItemHidden === 'function') {
        this.onItemHidden(index, res)
      }
    },

    /**
     * 检查项目是否可见
     * @param {number} index - 项目索引
     * @returns {boolean}
     */
    isItemVisible(index) {
      return !!this.data.visibleItemsSet[index]
    },

    /**
     * 重置所有项目状态
     * 在列表数据更新时调用
     */
    resetLoadState() {
      this.setData({
        visibleItemsSet: {},
        itemsLoadState: {}
      })
    },

    /**
     * 断开所有观察器
     * @private
     */
    _disconnectObservers() {
      if (this._observers) {
        this._observers.forEach(observer => {
          if (observer) {
            observer.disconnect()
          }
        })
        this._observers = []
      }
    }
  }
})
