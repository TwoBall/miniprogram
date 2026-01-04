/**
 * @file 管理员首页
 * @module pages/admin/home/home
 */
const { formatDate } = require('../../../utils/date')
const auth = require('../../../utils/auth')
const request = require('../../../utils/request')
const { SafeToast } = require('../../../utils/error')

Page({
  data: {
    userInfo: null,
    pageLoading: true,
    stats: {
      totalUsers: 0,
      pendingUsers: 0,
      totalClubs: 0,
      todayAttendance: 0
    }
  },

  /** 页面加载 */
  onLoad() {
    const userInfo = auth.checkRole('admin')
    if (userInfo) {
      this.setData({ userInfo })
    }
    this.loadStats()
  },

  /** 页面显示 */
  onShow() {
    const userInfo = auth.checkRole('admin')
    if (!userInfo) return

    if (!this.data.userInfo) {
      this.setData({ userInfo })
    }

    this.loadStats()
  },

  /** 页面下拉刷新 */
  onPullDownRefresh() {
    this.loadStats().then(() => {
      wx.stopPullDownRefresh()
    }).catch(() => {
      wx.stopPullDownRefresh()
    })
  },

  /**
   * 加载统计数据
   */
  async loadStats() {
    try {
      const today = formatDate(new Date())

      const [userRes, filterOptions, attendanceRes] = await Promise.all([
        wx.cloud.callFunction({
          name: 'user',
          data: { action: 'getStats' }
        }),
        request.getFilterOptions(),
        wx.cloud.callFunction({
          name: 'attendance',
          data: {
            action: 'getStatistics',
            startDate: today,
            endDate: today
          }
        })
      ])

      let totalUsers = 0
      let pendingUsers = 0
      if (userRes.result.success && userRes.result.data) {
        totalUsers = userRes.result.data.total
        pendingUsers = userRes.result.data.pending
      }

      let totalClubs = 0
      if (filterOptions && filterOptions.clubs) {
        totalClubs = filterOptions.clubs.length
      }

      let todayAttendance = 0
      if (attendanceRes.result.success && attendanceRes.result.data) {
        todayAttendance = attendanceRes.result.data.total
      }

      this.setData({
        pageLoading: false,
        stats: {
          totalUsers,
          pendingUsers,
          totalClubs,
          todayAttendance
        }
      })
    } catch (error) {
      console.error('加载统计数据失败:', error)
      this.setData({ pageLoading: false })
      SafeToast.fail('加载统计数据失败')
    }
  },

  /**
   * 导航到指定页面
   * @param {Object} e - 事件对象
   */
  navigateTo(e) {
    const { url } = e.currentTarget.dataset
    wx.navigateTo({
      url,
      fail: () => {
        SafeToast.fail('功能开发中')
      }
    })
  }
})
