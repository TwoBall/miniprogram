const app = getApp()
const db = wx.cloud.database()

Page({
  data: {
    className: '',
    date: '',
    students: []
  },

  onLoad(options) {
    this.checkAuth()
    this.setData({
      className: options.className,
      date: options.date
    })
    this.loadDetail()
  },

  checkAuth() {
    const userInfo = wx.getStorageSync('userInfo')
    if (!userInfo || userInfo.role !== 'leader') {
      wx.reLaunch({
        url: '/pages/login/login'
      })
    }
  },

  async loadDetail() {
    const { className, date } = this.data

    try {
      wx.showLoading({ title: '加载中...' })

      const res = await wx.cloud.callFunction({
        name: 'attendance',
        data: {
          action: 'getByClass',
          className,
          date
        }
      })

      if (res.result.success) {
        const students = res.result.data.students
        // 排序：缺课 > 到课 > 未点名
        const sortedStudents = students.sort((a, b) => {
          const statusOrder = { 'absent': 0, 'present': 1, null: 2 }
          return (statusOrder[a.todayStatus] ?? 2) - (statusOrder[b.todayStatus] ?? 2)
        })

        this.setData({
          students: sortedStudents
        })
      }
    } catch (error) {
      console.error('加载详情失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
    }
  }
})
