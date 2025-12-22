const app = getApp()

Page({
  data: {
    records: [],
    loading: false
  },

  /**
   * 页面加载
   */
  onLoad() {
    this.checkAuth()
    this.loadHistory()
  },

  onShow() {
    this.loadHistory()
  },

  /**
   * 检查用户权限
   */
  checkAuth() {
    const userInfo = wx.getStorageSync('userInfo')
    if (!userInfo || userInfo.role !== 'teacher') {
      wx.reLaunch({
        url: '/pages/login/login'
      })
    }
  },

  /**
   * 加载历史点名记录
   */
  async loadHistory() {
    const userInfo = wx.getStorageSync('userInfo')

    try {
      wx.showLoading({ title: '加载中...' })

      // 获取历史点名记录
      const res = await wx.cloud.callFunction({
        name: 'attendance',
        data: {
          action: 'getHistory',
          teacherId: userInfo._id
        }
      })

      if (res.result.success) {
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
