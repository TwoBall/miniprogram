const auth = require('../../../utils/auth')
const storage = require('../../../utils/storage')
const request = require('../../../utils/request')

Page({
  data: {
    records: [],
    loading: false,
    pageLoading: true,
    // 分页相关
    page: 1,
    pageSize: 20,
    hasMore: true,
    loadingMore: false
  },

  // 上次加载时间（用于防抖）
  lastLoadTime: 0,

  /**
   * 页面加载
   */
  onLoad() {
    auth.checkRole('teacher')
    this.loadHistory()
  },

  onShow() {
    // 5秒内不重复加载（防抖）
    const now = Date.now()
    if (now - this.lastLoadTime < 5000) return
    this.loadHistory()
  },

  /**
   * 页面下拉刷新（强制刷新，忽略缓存）
   */
  async onPullDownRefresh() {
    // 重置分页
    this.setData({ page: 1, hasMore: true, records: [] })
    await this.loadHistory(true)
    wx.stopPullDownRefresh()
  },

  /**
   * 上拉触底加载更多
   */
  async onReachBottom() {
    if (!this.data.hasMore || this.data.loadingMore) return

    this.setData({ loadingMore: true })
    await this.loadMoreHistory()
    this.setData({ loadingMore: false })
  },

  /**
   * 加载历史点名记录（首页）
   * @param {boolean} forceRefresh - 是否强制刷新（忽略缓存）
   */
  async loadHistory(forceRefresh = false) {
    const userInfo = auth.getUserInfo()
    if (!userInfo) return

    this.lastLoadTime = Date.now()

    // 尝试从缓存读取（5分钟有效）- 仅首页使用缓存
    if (!forceRefresh) {
      const cacheKey = `${storage.STORAGE_KEYS.HISTORY_RECORDS}_${userInfo._id}`
      const cacheTimeKey = `${storage.STORAGE_KEYS.HISTORY_RECORDS_TIME}_${userInfo._id}`
      const cached = storage.getWithCache(cacheKey, cacheTimeKey, storage.CACHE_DURATION.FIVE_MINUTES)

      if (cached && cached.records) {
        console.log('使用历史记录缓存')
        this.setData({
          records: cached.records,
          page: cached.page || 1,
          hasMore: cached.hasMore !== false,
          pageLoading: false
        })
        return
      }
    }

    this.setData({ pageLoading: true, page: 1 })

    try {
      wx.showLoading({ title: '加载中...' })

      const result = await request.callCloud('attendance', {
        action: 'getHistory',
        teacherId: userInfo._id,
        clubName: userInfo.clubName,
        page: 1,
        pageSize: this.data.pageSize
      }, { showLoading: false, showError: false })

      if (result.success) {
        const { data, pagination } = result

        // 存入缓存
        const cacheKey = `${storage.STORAGE_KEYS.HISTORY_RECORDS}_${userInfo._id}`
        const cacheTimeKey = `${storage.STORAGE_KEYS.HISTORY_RECORDS_TIME}_${userInfo._id}`
        storage.setWithCache(cacheKey, cacheTimeKey, {
          records: data,
          page: 1,
          hasMore: pagination.hasMore
        })

        this.setData({
          records: data,
          page: 1,
          hasMore: pagination.hasMore
        })
      }
    } catch (error) {
      console.error('加载历史记录失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
      this.setData({ pageLoading: false })
    }
  },

  /**
   * 加载更多历史记录
   */
  async loadMoreHistory() {
    const userInfo = auth.getUserInfo()
    if (!userInfo) return

    const nextPage = this.data.page + 1

    try {
      const result = await request.callCloud('attendance', {
        action: 'getHistory',
        teacherId: userInfo._id,
        clubName: userInfo.clubName,
        page: nextPage,
        pageSize: this.data.pageSize
      }, { showLoading: false, showError: false })

      if (result.success) {
        const { data, pagination } = result

        this.setData({
          records: [...this.data.records, ...data],
          page: nextPage,
          hasMore: pagination.hasMore
        })
      }
    } catch (error) {
      console.error('加载更多记录失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
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
