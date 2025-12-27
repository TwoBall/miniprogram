const { formatDate } = require('../../../utils/date')
const auth = require('../../../utils/auth')
const request = require('../../../utils/request')

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

  onLoad() {
    const userInfo = auth.checkRole('admin')
    if (userInfo) {
      this.setData({ userInfo })
    }
    this.loadStats()
  },

  onShow() {
    // 检查登录状态，防止后台恢复时登录态丢失
    const userInfo = auth.checkRole('admin')
    if (!userInfo) return

    // 恢复页面数据（小程序被销毁后 userInfo 会丢失）
    if (!this.data.userInfo) {
      this.setData({ userInfo })
    }

    // 刷新统计数据
    this.loadStats()
  },

  onPullDownRefresh() {
    this.loadStats().then(() => {
      wx.stopPullDownRefresh()
    }).catch(() => {
      wx.stopPullDownRefresh()
    })
  },

  async loadStats() {
    try {
      const today = formatDate(new Date())

      // 并行调用所有接口获取统计数据
      const [userRes, filterOptions, attendanceRes] = await Promise.all([
        // 获取用户统计（使用 count 查询，不加载全部用户）
        wx.cloud.callFunction({
          name: 'user',
          data: { action: 'getStats' }
        }),
        // 获取社团统计（使用缓存）
        request.getFilterOptions(),
        // 获取今日考勤统计
        wx.cloud.callFunction({
          name: 'attendance',
          data: {
            action: 'getStatistics',
            startDate: today,
            endDate: today
          }
        })
      ])

      // 处理用户统计
      let totalUsers = 0
      let pendingUsers = 0
      if (userRes.result.success && userRes.result.data) {
        totalUsers = userRes.result.data.total
        pendingUsers = userRes.result.data.pending
      }

      // 处理社团统计（从缓存数据获取）
      let totalClubs = 0
      if (filterOptions && filterOptions.clubs) {
        totalClubs = filterOptions.clubs.length
      }

      // 处理今日考勤统计
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
      wx.showToast({
        title: '加载统计数据失败',
        icon: 'none'
      })
    }
  },

  navigateTo(e) {
    const { url } = e.currentTarget.dataset
    wx.navigateTo({
      url,
      fail: () => {
        wx.showToast({
          title: '功能开发中',
          icon: 'none'
        })
      }
    })
  }
})
