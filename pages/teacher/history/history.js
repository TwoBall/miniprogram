const auth = require('../../../utils/auth')
const storage = require('../../../utils/storage')
const request = require('../../../utils/request')
const paginationBehavior = require('../../../behaviors/paginationBehavior')

Page({
  behaviors: [paginationBehavior],

  data: {
    records: [],
    pageLoading: true
  },

  // 上次加载时间（用于防抖）
  lastLoadTime: 0,

  /**
   * 页面加载
   */
  onLoad() {
    auth.checkRole('teacher')
    this.loadList()
  },

  onShow() {
    // 检查登录状态，防止后台恢复时登录态丢失
    if (!auth.checkRole('teacher')) return

    // 5秒内不重复加载（防抖）
    const now = Date.now()
    if (now - this.lastLoadTime < 5000) return
    this.loadList()
  },

  /**
   * 页面下拉刷新（强制刷新，忽略缓存）
   */
  async onPullDownRefresh() {
    this.setData({ records: [] })
    await this.handlePullDownRefresh()
    // 清除缓存
    const userInfo = auth.getUserInfo()
    if (userInfo) {
      const cacheKey = `${storage.STORAGE_KEYS.HISTORY_RECORDS}_${userInfo._id}`
      const cacheTimeKey = `${storage.STORAGE_KEYS.HISTORY_RECORDS_TIME}_${userInfo._id}`
      wx.removeStorageSync(cacheKey)
      wx.removeStorageSync(cacheTimeKey)
    }
  },

  /**
   * 上拉触底加载更多
   */
  onReachBottom() {
    this.handleReachBottom()
  },

  /**
   * 加载历史点名记录
   * @param {boolean} refresh - 是否刷新
   */
  async loadList(refresh = false) {
    const userInfo = auth.getUserInfo()
    if (!userInfo) return

    this.lastLoadTime = Date.now()

    // 尝试从缓存读取（5分钟有效）- 仅首页使用缓存
    if (!refresh && this.data.page === 1) {
      const cacheKey = `${storage.STORAGE_KEYS.HISTORY_RECORDS}_${userInfo._id}`
      const cacheTimeKey = `${storage.STORAGE_KEYS.HISTORY_RECORDS_TIME}_${userInfo._id}`
      const cached = storage.getWithCache(cacheKey, cacheTimeKey, storage.CACHE_DURATION.FIVE_MINUTES)

      if (cached && cached.records) {
        this.setData({
          records: cached.records,
          page: cached.page || 1,
          hasMore: cached.hasMore !== false,
          pageLoading: false
        })
        return
      }
    }

    if (refresh || this.data.page === 1) {
      this.setData({ pageLoading: true })
    }

    try {
      if (this.data.page === 1) {
        wx.showLoading({ title: '加载中...' })
      }

      const result = await request.callCloud('attendance', {
        action: 'getHistory',
        teacherId: userInfo._id,
        clubName: userInfo.clubName,
        page: this.data.page,
        pageSize: this.data.pageSize
      }, { showLoading: false, showError: false })

      if (result.success) {
        const { data, pagination } = result

        // 首页存入缓存
        if (this.data.page === 1) {
          const cacheKey = `${storage.STORAGE_KEYS.HISTORY_RECORDS}_${userInfo._id}`
          const cacheTimeKey = `${storage.STORAGE_KEYS.HISTORY_RECORDS_TIME}_${userInfo._id}`
          storage.setWithCache(cacheKey, cacheTimeKey, {
            records: data,
            page: 1,
            hasMore: pagination.hasMore
          })
        }

        this.handleLoadSuccess(data, pagination, refresh, 'records')
      }
    } catch (error) {
      console.error('加载历史记录失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
      this.setData({ loading: false })
    } finally {
      wx.hideLoading()
      this.setData({ pageLoading: false })
    }
  },

  /**
   * 查看点名记录详情
   */
  viewDetail(e) {
    const record = e.currentTarget.dataset.record
    // 预传递数据，减少详情页云函数调用
    wx.setStorageSync('temp_record_detail', record)
    wx.navigateTo({
      url: `/pages/teacher/detail/detail?recordId=${record._id}`
    })
  }
})
