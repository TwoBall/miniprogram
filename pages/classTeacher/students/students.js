// input: 班级名称、学生列表、考勤数据
// output: 班级学生管理界面、出勤排行、缺勤预警
// pos: 页面层 > 班主任模块 > 学生管理

const studentListBehavior = require('../../../behaviors/studentListBehavior')
const request = require('../../../utils/request')
const { SafeToast } = require('../../../utils/error')

Page({
  behaviors: [studentListBehavior],

  data: {
    pageLoading: true,
    userInfo: null,
    className: '',

    // 社团分布
    clubDistribution: [],
    distributionField: 'clubName'
  },

  onLoad() {
    const userInfo = wx.getStorageSync('userInfo')
    this.setData({
      userInfo,
      className: userInfo?.className || ''
    })

    if (this.data.className) {
      this.loadStudents()
    } else {
      SafeToast.fail('未找到班级信息')
    }
  },

  onPullDownRefresh() {
    Promise.all([
      this.loadStudents(),
      this.loadAbsenceWarnings({ className: this.data.className })
    ]).then(() => {
      wx.stopPullDownRefresh()
    }).catch(() => {
      wx.stopPullDownRefresh()
    })
  },

  // 加载班级学生列表
  async loadStudents() {
    this.setData({ loading: true })

    try {
      const result = await request.callCloud('students', {
        action: 'getByClass',
        className: this.data.className
      })

      if (result.success) {
        const students = result.data || []

        // 计算社团分布
        const clubDistribution = this.calculateDistribution(students, 'clubName')

        this.setData({
          students,
          filteredStudents: students,
          'stats.totalCount': students.length,
          clubDistribution,
          loading: false,
          pageLoading: false
        })

        // 加载缺勤预警
        this.loadAbsenceWarnings({ className: this.data.className })

        wx.stopPullDownRefresh()
      } else {
        SafeToast.fail(result.message || '加载失败')
        this.setData({ loading: false, pageLoading: false })
      }
    } catch (error) {
      console.error('加载学生列表失败:', error)
      SafeToast.fail('加载失败')
      this.setData({ loading: false, pageLoading: false })
      wx.stopPullDownRefresh()
    }
  },

  // 加载出勤排行
  async loadAttendanceRank() {
    if (!this.data.className) {
      return
    }

    this.setData({ loading: true })

    try {
      const result = await request.callCloud('attendance', {
        action: 'getClassRank',
        className: this.data.className
      })

      if (result.success) {
        const rank = result.data || []

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
        throw new Error(result.message)
      }
    } catch (error) {
      console.error('加载出勤率排行失败:', error)
      this.setData({ loading: false })
      SafeToast.fail(error.message || '加载失败')
    }
  },

  // 查看学生详情
  onStudentTap(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/classTeacher/studentDetail/studentDetail?studentId=${id}`
    })
  }
})
