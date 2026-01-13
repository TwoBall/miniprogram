// 学生详情页面
const request = require('../../../utils/request')
const { SafeToast } = require('../../../utils/error')

Page({
  data: {
    studentId: '',
    student: null,
    attendanceHistory: [],
    loading: false,
    activeTab: 'info',

    // 统计数据
    totalRecords: 0,
    presentCount: 0,
    absentCount: 0,
    lateCount: 0,
    attendanceRate: 0
  },

  onLoad(options) {
    const { studentId } = options
    if (studentId) {
      this.setData({ studentId })
      this.loadStudentData()
    }
  },

  onPullDownRefresh() {
    this.loadStudentData()
  },

  /**
   * 加载学生数据（使用批量接口，包含学生信息和考勤历史）
   */
  async loadStudentData() {
    this.setData({ loading: true })

    try {
      // 使用批量接口，一次获取学生信息和考勤历史
      const result = await request.callApi('students', 'getStudentWithAttendance', {
        studentId: this.data.studentId
      }, { showLoading: false })

      if (result.success && result.data) {
        const { student, attendanceHistory, stats } = result.data

        this.setData({
          student,
          attendanceHistory,
          totalRecords: stats.totalRecords,
          presentCount: stats.presentCount,
          absentCount: stats.absentCount,
          lateCount: stats.lateCount,
          attendanceRate: stats.attendanceRate,
          loading: false
        })

        wx.stopPullDownRefresh()
      } else {
        SafeToast.fail(result.message || '加载失败')
        this.setData({ loading: false })
      }
    } catch (error) {
      console.error('加载学生数据失败:', error)
      SafeToast.fail('加载失败')
      this.setData({ loading: false })
      wx.stopPullDownRefresh()
    }
  },

  // 切换标签
  onTabChange(e) {
    this.setData({ activeTab: e.detail.name })
  },

  // 格式化状态
  getStatusText(status) {
    const statusMap = {
      present: '正常',
      absent: '缺勤',
      late: '迟到'
    }
    return statusMap[status] || status
  },

  getStatusType(status) {
    const typeMap = {
      present: 'success',
      absent: 'danger',
      late: 'warning'
    }
    return typeMap[status] || 'default'
  },

  /**
   * 申请转社团
   */
  goToTransfer() {
    const { student } = this.data
    if (!student) {
      SafeToast.fail('学生信息加载中')
      return
    }

    const params = [
      `studentId=${student._id}`,
      `studentName=${encodeURIComponent(student.studentName)}`,
      `className=${encodeURIComponent(student.className || '')}`,
      `department=${encodeURIComponent(student.department || '')}`,
      `fromClub=${encodeURIComponent(student.clubName || '')}`,
      `initiatorType=classTeacher`
    ].join('&')

    wx.navigateTo({
      url: `/pages/common/transfer/create?${params}`
    })
  }
})
