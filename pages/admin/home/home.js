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
    // TODO: 调用云函数获取统计数据
    // 暂时使用模拟数据
    this.setData({
      stats: {
        totalUsers: 0,
        pendingUsers: 0,
        totalClubs: 0,
        todayAttendance: 0
      }
    })
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
