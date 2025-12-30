const auth = require('../../../utils/auth')
const request = require('../../../utils/request')
const { SafeToast } = require('../../../utils/error')

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

      const result = await request.callCloud('attendance', {
        action: 'getByClass',
        className,
        date
      }, { showLoading: false, showError: false })

      if (result.success) {
        const students = result.data.students
        // 数据已从云函数按姓名排序返回
        // 前端按业务需求重新排序：缺课 > 到课 > 未点名
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
      SafeToast.fail('加载失败')
    } finally {
      wx.hideLoading()
    }
  }
})
