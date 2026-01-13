/**
 * @file 管理员首页
 * @module pages/admin/home/home
 */
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
   * 加载统计数据（使用批量接口，单次请求）
   */
  async loadStats() {
    try {
      const result = await request.callApi('stats', 'getHomeStats', {}, {
        showLoading: false,
        showError: false
      })

      if (result.success) {
        this.setData({
          pageLoading: false,
          stats: result.data
        })
      } else {
        console.error('加载统计数据失败:', result.message)
        this.setData({ pageLoading: false })
      }
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
