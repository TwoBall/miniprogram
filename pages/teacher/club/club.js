// input: 社团名称、学生列表、考勤数据
// output: 社团学生管理界面、出勤排行、缺勤预警
// pos: 页面层 > 教师模块 > 社团管理

const studentListBehavior = require('../../../behaviors/studentListBehavior')

Page({
  behaviors: [studentListBehavior],

  data: {
    clubInfo: null,

    // 班级分布
    classDistribution: [],
    distributionField: 'className',

    // 学生操作菜单
    showStudentActions: false,
    currentStudent: null,
    studentActions: [
      { name: '申请转社团', code: 'transfer' }
    ]
  },

  onLoad() {
    const userInfo = wx.getStorageSync('userInfo')
    this.setData({
      clubInfo: {
        name: userInfo.clubName,
        teacher: userInfo.userName,
        department: userInfo.department
      }
    })
    this.loadStudents()
  },

  onPullDownRefresh() {
    Promise.all([
      this.loadStudents(),
      this.loadAbsenceWarnings({ clubName: this.data.clubInfo?.name })
    ]).then(() => {
      wx.stopPullDownRefresh()
    }).catch(() => {
      wx.stopPullDownRefresh()
    })
  },

  async loadStudents() {
    const userInfo = wx.getStorageSync('userInfo')

    if (!userInfo.clubName) {
      wx.showToast({
        title: '未关联社团',
        icon: 'none'
      })
      return
    }

    this.setData({ loading: true })

    try {
      const res = await wx.cloud.callFunction({
        name: 'students',
        data: {
          action: 'getByClub',
          clubName: userInfo.clubName
        }
      })

      if (res.result.success) {
        const students = res.result.data || []

        // 计算班级分布
        const classDistribution = this.calculateDistribution(students, 'className')

        this.setData({
          students,
          filteredStudents: students,
          'stats.totalCount': students.length,
          classDistribution,
          loading: false
        })

        // 加载缺勤预警
        this.loadAbsenceWarnings({ clubName: userInfo.clubName })
      } else {
        throw new Error(res.result.message)
      }
    } catch (error) {
      console.error('加载学生列表失败:', error)
      this.setData({ loading: false })
      wx.showToast({
        title: error.message || '加载失败',
        icon: 'none'
      })
    }
  },

  async loadAttendanceRank() {
    const userInfo = wx.getStorageSync('userInfo')

    if (!userInfo.clubName) {
      return
    }

    this.setData({ loading: true })

    try {
      const res = await wx.cloud.callFunction({
        name: 'attendance',
        data: {
          action: 'getClubRank',
          clubName: userInfo.clubName
        }
      })

      if (res.result.success) {
        const rank = res.result.data || []

        // 计算平均出勤率
        let totalRate = 0
        rank.forEach(item => {
          totalRate += parseFloat(item.rate)
        })
        const avgRate = rank.length > 0 ? (totalRate / rank.length).toFixed(1) : 0

        this.setData({
          attendanceRank: rank,
          'stats.avgAttendanceRate': avgRate,
          loading: false
        })
      } else {
        throw new Error(res.result.message)
      }
    } catch (error) {
      console.error('加载出勤率排行失败:', error)
      this.setData({ loading: false })
      wx.showToast({
        title: error.message || '加载失败',
        icon: 'none'
      })
    }
  },

  // 点击学生卡片 - 跳转详情
  onStudentTap(e) {
    const student = e.currentTarget.dataset.student
    // 跳转到学生详情页（如有）
    // 目前保持原有行为：弹出操作菜单
    this.setData({
      currentStudent: student,
      showStudentActions: true
    })
  },

  // 长按学生卡片 - 弹出操作菜单
  onStudentLongPress(e) {
    const student = e.currentTarget.dataset.student
    this.setData({
      currentStudent: student,
      showStudentActions: true
    })
  },

  /**
   * 学生操作菜单选择
   */
  onStudentActionSelect(e) {
    const { code } = e.detail
    const student = this.data.currentStudent

    this.setData({ showStudentActions: false })

    if (code === 'transfer') {
      this.goToTransfer(student)
    }
  },

  /**
   * 关闭学生操作菜单
   */
  onStudentActionClose() {
    this.setData({ showStudentActions: false })
  },

  /**
   * 跳转到转社团申请页面
   */
  goToTransfer(student) {
    const userInfo = wx.getStorageSync('userInfo')
    const params = [
      `studentId=${student._id}`,
      `studentName=${encodeURIComponent(student.studentName)}`,
      `className=${encodeURIComponent(student.className || '')}`,
      `department=${encodeURIComponent(student.department || '')}`,
      `fromClub=${encodeURIComponent(userInfo.clubName)}`,
      `initiatorType=fromTeacher`
    ].join('&')

    wx.navigateTo({
      url: `/pages/common/transfer/create?${params}`
    })
  }
})
