const auth = require('../../utils/auth')
const storage = require('../../utils/storage')

Page({
  data: {
    records: [],
    loading: false
  },

  /**
   * 页面加载
   */
  onLoad() {
    auth.checkRole('teacher')
    this.loadHistory()
  },

  onShow() {
    this.loadHistory()
  },

  /**
   * 页面下拉刷新
   */
  async onPullDownRefresh() {
    await this.loadHistory()
    wx.stopPullDownRefresh()
  },

  /**
   * 加载历史点名记录
   */
  async loadHistory() {
    const userInfo = auth.getUserInfo()
    if (!userInfo) return

    try {
      wx.showLoading({ title: '加载中...' })

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
