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
    this.setupNetworkListener()
  },

  /**
   * 全局错误处理
   * 捕获未处理的脚本错误
   * @param {string} msg - 错误信息
   */
  onError(msg) {
    console.error('[全局错误]', msg)
    // 可在此添加错误上报逻辑
  },

  /**
   * 未处理的 Promise 拒绝
   * @param {Object} res - 拒绝信息
   */
  onUnhandledRejection(res) {
    console.error('[未处理的Promise拒绝]', res.reason)
    // 可在此添加错误上报逻辑
  },

  /**
   * 页面不存在时调用
   * @param {Object} res - 页面信息
   */
  onPageNotFound(res) {
    console.error('[页面不存在]', res.path)
    // 跳转到首页或错误页
    wx.switchTab({
      url: '/pages/index/index'
    })
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

  /**
   * 设置网络状态监听
   * 网络变化时提示用户
   */
  setupNetworkListener() {
    wx.onNetworkStatusChange((res) => {
      if (!res.isConnected) {
        wx.showToast({
          title: '网络已断开',
          icon: 'none',
          duration: 2000
        })
      } else if (this.globalData.wasOffline) {
        wx.showToast({
          title: '网络已恢复',
          icon: 'success',
          duration: 1500
        })
      }
      this.globalData.wasOffline = !res.isConnected
      this.globalData.networkType = res.networkType
    })
  },

  globalData: {
    userInfo: null,
    userRole: null,
    wasOffline: false,
    networkType: 'unknown'
  }
})
