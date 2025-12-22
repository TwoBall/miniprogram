/**
 * 小程序入口文件
 * 负责初始化云开发环境和全局状态管理
 */
App({
  /**
   * 小程序启动时执行
   */
  onLaunch() {
    // 初始化云开发环境
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        env: 'cloud1-1gwywkzq3c422fa5',
        traceUser: true,
      })
    }

    this.checkUserAuth()
  },

  /**
   * 检查用户认证状态
   * 从本地缓存恢复用户信息到全局数据
   */
  checkUserAuth() {
    const userInfo = wx.getStorageSync('userInfo')
    if (userInfo) {
      this.globalData.userInfo = userInfo
    }
  },

  globalData: {
    userInfo: null,
    userRole: null,
  }
})
