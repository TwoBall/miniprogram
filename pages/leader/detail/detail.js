const auth = require('../../../utils/auth')

Page({
  data: {
    className: '',
    date: '',
    students: []
  },

  /**
   * 页面加载
   * @param {Object} options - 页面参数,包含班级名称和日期
   */
  onLoad(options) {
    auth.checkRole('leader')
    this.setData({
      className: options.className,
      date: options.date
    })
    this.loadDetail()
  },

  /**
   * 加载班级详细考勤情况
   */
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
