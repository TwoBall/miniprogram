const auth = require('../../../utils/auth')
const storage = require('../../../utils/storage')

Page({
  data: {
    records: [],
    loading: false,
    pageLoading: true
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
    await this.loadHistory(true)
    wx.stopPullDownRefresh()
  },

  /**
   * 加载历史点名记录
   * @param {boolean} forceRefresh - 是否强制刷新（忽略缓存）
   */
  async loadHistory(forceRefresh = false) {
    const userInfo = auth.getUserInfo()
    if (!userInfo) return

    this.lastLoadTime = Date.now()

    // 尝试从缓存读取（5分钟有效）
    if (!forceRefresh) {
      const cacheKey = `${storage.STORAGE_KEYS.HISTORY_RECORDS}_${userInfo._id}`
      const cacheTimeKey = `${storage.STORAGE_KEYS.HISTORY_RECORDS_TIME}_${userInfo._id}`
      const cached = storage.getWithCache(cacheKey, cacheTimeKey, storage.CACHE_DURATION.FIVE_MINUTES)

      if (cached) {
        console.log('使用历史记录缓存')
        this.setData({ records: cached, pageLoading: false })
        return
      }
    }

    this.setData({ pageLoading: true })

    try {
      wx.showLoading({ title: '加载中...' })

      const res = await wx.cloud.callFunction({
        name: 'attendance',
        data: {
          action: 'getHistory',
          teacherId: userInfo._id
        }
      })

      if (res.result.success) {
        // 存入缓存
        const cacheKey = `${storage.STORAGE_KEYS.HISTORY_RECORDS}_${userInfo._id}`
        const cacheTimeKey = `${storage.STORAGE_KEYS.HISTORY_RECORDS_TIME}_${userInfo._id}`
        storage.setWithCache(cacheKey, cacheTimeKey, res.result.data)

        this.setData({
          records: res.result.data
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
   * 查看点名记录详情
   */
  viewDetail(e) {
    const record = e.currentTarget.dataset.record
    wx.navigateTo({
      url: `/pages/teacher/detail/detail?recordId=${record._id}`
    })
  },

  /**
   * 跳转到角色切换页面
   */
  goToSwitchRole() {
    wx.navigateTo({
      url: '/pages/common/switchRole/switchRole'
    })
  }
})
