const auth = require('../../../utils/auth')
const dateUtil = require('../../../utils/date')

Page({
  data: {
    studentId: '',
    studentName: '',
    clubName: '',
    feedback: '',
    loading: false
  },

  /**
   * 页面加载
   * @param {Object} options - 页面参数,包含学生信息
   */
  onLoad(options) {
    auth.checkRole('classTeacher')
    this.setData({
      studentId: options.studentId,
      studentName: options.studentName,
      clubName: options.clubName
    })
  },

  onFeedbackInput(e) {
    this.setData({
      feedback: e.detail.value
    })
  },

  /**
   * 提交反馈
   */
  async submitFeedback() {
    const { studentId, studentName, clubName, feedback } = this.data
    const userInfo = auth.getUserInfo()

    if (!feedback.trim()) {
      wx.showToast({
        title: '请输入反馈内容',
        icon: 'none'
      })
      return
    }

    this.setData({ loading: true })

    try {
      // 调用云函数提交反馈
      const res = await wx.cloud.callFunction({
        name: 'submitFeedback',
        data: {
          studentId,
          studentName,
          clubName,
          className: userInfo.className,
          teacherName: userInfo.name,
          feedback,
          date: dateUtil.getCurrentDate()
        }
      })

      if (res.result.success) {
        wx.showToast({
          title: '反馈已发送',
          icon: 'success'
        })

        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      } else {
        wx.showToast({
          title: res.result.message || '发送失败',
          icon: 'none'
        })
      }
    } catch (error) {
      console.error('发送反馈失败:', error)
      wx.showToast({
        title: '发送失败，请重试',
        icon: 'none'
      })
    } finally {
      this.setData({ loading: false })
    }
  }
})
