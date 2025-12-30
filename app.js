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
    this.handlePrefetchData()
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
    // 跳转到登录页
    wx.reLaunch({
      url: '/pages/login/login'
    })
  },

  /**
   * 检查用户认证状态
   * 从本地缓存恢复用户信息到全局数据
   * 使用异步 API 避免阻塞启动流程
   */
  async checkUserAuth() {
    try {
      const res = await wx.getStorage({ key: 'userInfo' })
      if (res.data) {
        this.globalData.userInfo = res.data
      }
    } catch (e) {
      // 无缓存数据，忽略错误
      // 这是正常情况，用户首次使用或缓存已清除
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

  /**
   * 处理数据预拉取结果
   * 微信客户端会在小程序冷启动前调用 prefetch 云函数
   * 此方法获取预拉取的数据并缓存到 globalData
   */
  handlePrefetchData() {
    wx.getBackgroundFetchData({
      fetchType: 'pre',
      success: (res) => {
        if (res.fetchedData) {
          try {
            const data = JSON.parse(res.fetchedData)
            if (data.success) {
              // 缓存预拉取的筛选选项
              if (data.data.filterOptions) {
                this.globalData.prefetchData = {
                  filterOptions: data.data.filterOptions,
                  timestamp: Date.now()
                }
                console.log('[预拉取] 筛选选项已缓存')
              }
            }
          } catch (e) {
            console.error('[预拉取] 解析数据失败:', e)
          }
        }
      },
      fail: (err) => {
        // 预拉取失败是正常情况（如首次启动、网络问题等）
        console.log('[预拉取] 获取数据失败:', err.errMsg)
      }
    })
  },

  globalData: {
    userInfo: null,
    wasOffline: false,
    networkType: 'unknown',
    prefetchData: null  // 预拉取的数据缓存
  }
})
