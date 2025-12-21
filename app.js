App({
  onLaunch() {
    // 初始化云开发环境
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        env: 'cloud1-1gwywkzq3c422fa5', // 请替换为您的云开发环境ID
        traceUser: true,
      })
    }

    // 检查用户登录状态
    this.checkUserAuth()
  },

  // 检查用户认证状态
  checkUserAuth() {
    const userInfo = wx.getStorageSync('userInfo')
    if (userInfo) {
      this.globalData.userInfo = userInfo
    }
  },

  globalData: {
    userInfo: null,
    userRole: null, // 'teacher', 'classTeacher', 'leader'
  }
})
