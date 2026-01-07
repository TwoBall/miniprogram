const auth = require('../../../utils/auth')
const dateUtil = require('../../../utils/date')
const request = require('../../../utils/request')
const { SafeToast } = require('../../../utils/error')

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
      SafeToast.fail('请输入反馈内容')
      return
    }

    this.setData({ loading: true })

    try {
      // 调用云函数提交反馈
      const result = await request.callApi('feedback', 'submit', {
        studentId,
        studentName,
        clubName,
        className: userInfo.className,
        teacherName: userInfo.userName,
        feedback,
        date: dateUtil.getCurrentDate()
      }, { showLoading: false, showError: false })

      if (result.success) {
        SafeToast.success('反馈已发送')

        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      } else {
        SafeToast.fail(result.message || '发送失败')
      }
    } catch (error) {
      console.error('发送反馈失败:', error)
      SafeToast.fail('发送失败，请重试')
    } finally {
      this.setData({ loading: false })
    }
  }
})
