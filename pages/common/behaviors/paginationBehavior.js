// input: 分页加载交互事件
// output: 分页状态管理和事件处理
// pos: 分包层 > 公共模块 > Behavior

/**
 * 分页加载 Behavior
 * 提供列表分页的通用状态和方法
 *
 * 使用方式：
 * 1. 引入: const paginationBehavior = require('../../common/behaviors/paginationBehavior')
 * 2. 混入: behaviors: [paginationBehavior]
 * 3. 重写: loadList(refresh) 加载数据的实际方法
 * 4. 调用: this.handleLoadSuccess(data, pagination, refresh) 处理加载成功
 *
 * 注意：此 Behavior 仅提供基础分页状态管理，
 * 各页面需根据实际需求自行实现 loadList 方法
 */
module.exports = Behavior({
  data: {
    // 分页数据
    page: 1,
    pageSize: 20,
    hasMore: true,
    loading: false
  },

  methods: {
    /**
     * 重置分页状态
     */
    resetPagination() {
      this.setData({
        page: 1,
        hasMore: true
      })
    },

    /**
     * 下拉刷新处理
     * 需要页面在 onPullDownRefresh 中调用
     */
    async handlePullDownRefresh() {
      this.resetPagination()
      if (typeof this.loadList === 'function') {
        await this.loadList(true)
      }
      wx.stopPullDownRefresh()
    },

    /**
     * 触底加载更多处理
     * 需要页面在 onReachBottom 中调用
     */
    async handleReachBottom() {
      if (!this.data.hasMore || this.data.loading) return

      this.setData({ page: this.data.page + 1 })
      if (typeof this.loadList === 'function') {
        await this.loadList(false)
      }
    },

    /**
     * 处理加载成功
     * @param {Array} newData - 新加载的数据
     * @param {Object} pagination - 分页信息 { hasMore: boolean }
     * @param {boolean} refresh - 是否刷新
     * @param {string} listKey - 列表数据的 key，默认 'list'
     */
    handleLoadSuccess(newData, pagination, refresh, listKey = 'list') {
      const currentList = this.data[listKey] || []
      const mergedList = refresh ? newData : [...currentList, ...newData]

      this.setData({
        [listKey]: mergedList,
        hasMore: pagination.hasMore,
        loading: false
      })
    }
  }
})
