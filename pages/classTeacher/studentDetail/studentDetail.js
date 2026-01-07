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
      this.loadStudentDetail()
      this.loadAttendanceHistory()
    }
  },

  onPullDownRefresh() {
    this.loadStudentDetail()
    this.loadAttendanceHistory()
  },

  // 加载学生详情
  async loadStudentDetail() {
    try {
      const result = await request.callApi('students', 'getById', {
        studentId: this.data.studentId
      }, { showLoading: false })

      if (result.success && result.data) {
        this.setData({ student: result.data })
      } else {
        SafeToast.fail(result.message || '加载失败')
      }
    } catch (error) {
      console.error('加载学生详情失败:', error)
      SafeToast.fail('加载失败')
    }
  },

  // 加载考勤历史
  async loadAttendanceHistory() {
    this.setData({ loading: true })

    try {
      const result = await request.callApi('attendance', 'getByStudent', {
        studentId: this.data.studentId
      })

      if (result.success) {
        const records = result.data || []

        // 计算统计数据并预处理每条记录的学生状态
        let presentCount = 0
        let absentCount = 0
        let lateCount = 0

        const processedRecords = records.map(record => {
          const studentRecord = record.records.find(s => s.studentId === this.data.studentId)

          if (studentRecord) {
            switch (studentRecord.status) {
              case 'present':
                presentCount++
                break
              case 'absent':
                absentCount++
                break
              case 'late':
                lateCount++
                break
            }
          }

          // 为每条记录添加该学生的状态信息
          return {
            ...record,
            studentStatus: studentRecord?.status || 'unknown',
            studentNote: studentRecord?.note || ''
          }
        })

        const totalRecords = records.length
        const attendanceRate = totalRecords > 0
          ? Math.round(((presentCount + lateCount) / totalRecords) * 100)
          : 0

        this.setData({
          attendanceHistory: processedRecords,
          totalRecords,
          presentCount,
          absentCount,
          lateCount,
          attendanceRate,
          loading: false
        })

        wx.stopPullDownRefresh()
      } else {
        SafeToast.fail(result.message || '加载失败')
        this.setData({ loading: false })
      }
    } catch (error) {
      console.error('加载考勤历史失败:', error)
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
