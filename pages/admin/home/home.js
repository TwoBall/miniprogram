const { formatDate } = require('../../../utils/date')

Page({
  data: {
    userInfo: null,
    stats: {
      totalUsers: 0,
      pendingUsers: 0,
      totalClubs: 0,
      todayAttendance: 0
    }
  },

  onLoad() {
    const userInfo = wx.getStorageSync('userInfo')
    this.setData({ userInfo })
    this.loadStats()
  },

  onShow() {
    // 刷新统计数据
    this.loadStats()
  },

  async loadStats() {
    try {
      const today = formatDate(new Date())

      // 并行调用所有云函数获取统计数据
      const [userRes, clubRes, attendanceRes] = await Promise.all([
        // 获取用户统计
        wx.cloud.callFunction({
          name: 'user',
          data: {
            action: 'getAll',
            page: 1,
            pageSize: 10000
          }
        }),
        // 获取社团统计
        wx.cloud.callFunction({
          name: 'students',
          data: {
            action: 'getFilterOptions'
          }
        }),
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
        const users = userRes.result.data
        totalUsers = users.length
        pendingUsers = users.filter(u => u.status === 'pending').length
      }

      // 处理社团统计
      let totalClubs = 0
      if (clubRes.result.success && clubRes.result.data && clubRes.result.data.clubs) {
        totalClubs = clubRes.result.data.clubs.length
      }

      // 处理今日考勤统计
      let todayAttendance = 0
      if (attendanceRes.result.success && attendanceRes.result.data) {
        todayAttendance = attendanceRes.result.data.total
      }

      this.setData({
        stats: {
          totalUsers,
          pendingUsers,
          totalClubs,
          todayAttendance
        }
      })
    } catch (error) {
      console.error('加载统计数据失败:', error)
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
