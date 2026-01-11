/**
 * @file 社团老师历史记录页面
 * @module pages/teacher/history/history
 */
const auth = require('../../../utils/auth')
const storage = require('../../../utils/storage')
const request = require('../../../utils/request')
const paginationBehavior = require('../../../behaviors/paginationBehavior')
const { SafeToast } = require('../../../utils/error')

Page({
  behaviors: [paginationBehavior],

  data: {
    records: [],
    pageLoading: true
  },

  lastLoadTime: 0,

  /** 页面加载 */
  onLoad() {
    auth.checkRole('teacher')
    this.loadList()
  },

  /** 页面显示 */
  onShow() {
    if (!auth.checkRole('teacher')) return

    const now = Date.now()
    if (now - this.lastLoadTime < 5000) return
    this.loadList()
  },

  /** 页面下拉刷新 */
  async onPullDownRefresh() {
    this.setData({ records: [] })
    await this.handlePullDownRefresh()
    const userInfo = auth.getUserInfo()
    if (userInfo) {
      const cacheKey = `${storage.STORAGE_KEYS.HISTORY_RECORDS}_${userInfo._id}`
      const cacheTimeKey = `${storage.STORAGE_KEYS.HISTORY_RECORDS_TIME}_${userInfo._id}`
      wx.removeStorageSync(cacheKey)
      wx.removeStorageSync(cacheTimeKey)
    }
  },

  /** 上拉触底加载更多 */
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
        await SafeToast.loading({ message: '加载中...' })
      }

      const result = await request.callApi('attendance', 'getHistory', {
        teacherId: userInfo._id,
        clubName: userInfo.clubName,
        page: this.data.page,
        pageSize: this.data.pageSize
      }, { showLoading: false, showError: false })

      if (result.success) {
        const { data, pagination } = result

        // 处理日期格式，提取日和月用于显示
        const processedData = data.map(item => {
          if (item.date) {
            const parts = item.date.split('-')
            if (parts.length === 3) {
              item.dateMonth = `${parseInt(parts[1], 10)}月`
              item.dateDay = parseInt(parts[2], 10).toString()
            }
          }
          return item
        })

        if (this.data.page === 1) {
          const cacheKey = `${storage.STORAGE_KEYS.HISTORY_RECORDS}_${userInfo._id}`
          const cacheTimeKey = `${storage.STORAGE_KEYS.HISTORY_RECORDS_TIME}_${userInfo._id}`
          storage.setWithCache(cacheKey, cacheTimeKey, {
            records: processedData,
            page: 1,
            hasMore: pagination.hasMore
          })
        }

        this.handleLoadSuccess(processedData, pagination, refresh, 'records')
      }
    } catch (error) {
      console.error('加载历史记录失败:', error)
      SafeToast.fail('加载失败')
      this.setData({ loading: false })
    } finally {
      SafeToast.clear()
      this.setData({ pageLoading: false })
    }
  },

  /**
   * 查看点名记录详情
   * @param {Object} e - 事件对象
   */
  viewDetail(e) {
    const record = e.currentTarget.dataset.record
    wx.setStorageSync('temp_record_detail', record)
    wx.navigateTo({
      url: `/pages/teacher/detail/detail?recordId=${record._id}`
    })
  }
})
