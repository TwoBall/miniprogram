// input: 无（自动加载统计数据）
// output: 用户统计、学生统计、考勤统计数据展示
// pos: 页面层 > 管理员模块 > 数据中心

const _app = getApp()
const request = require('../../../utils/request')
const { SafeToast } = require('../../../utils/error')

Page({
  data: {
    loading: false,

    // 用户统计
    userStats: {
      total: 0,
      byRole: {
        teacher: 0,
        classTeacher: 0,
        leader: 0,
        admin: 0
      },
      byStatus: {
        approved: 0,
        pending: 0,
        rejected: 0
      },
      bound: 0,
      unbound: 0
    },

    // 学生统计
    studentStats: {
      total: 0,
      byDepartment: {},
      byGrade: {}
    },

    // 社团统计
    clubStats: {
      total: 0,
      byDepartment: {}
    },

    // 考勤统计
    attendanceStats: {
      todayTotal: 0,
      weekTotal: 0,
      monthTotal: 0,
      todayRate: 0,
      weekRate: 0,
      monthRate: 0
    },

    // 日期范围
    dateRange: {
      start: '',
      end: ''
    }
  },

  onLoad() {
    this.initDateRange()
    this.loadAllStats()
  },

  onPullDownRefresh() {
    this.loadAllStats().then(() => {
      wx.stopPullDownRefresh()
    }).catch(() => {
      wx.stopPullDownRefresh()
    })
  },

  initDateRange() {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    const end = now

    this.setData({
      'dateRange.start': this.formatDate(start),
      'dateRange.end': this.formatDate(end)
    })
  },

  formatDate(date) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  },

  /**
   * 加载所有统计数据（使用批量接口，单次请求）
   */
  async loadAllStats() {
    this.setData({ loading: true })

    try {
      const result = await request.callApi('stats', 'getDataCenterStats', {})

      if (result.success) {
        const { userStats, studentStats, clubStats, attendanceStats } = result.data

        // 格式化学生统计数据
        const formattedStudentStats = {
          total: studentStats.total,
          byDepartment: studentStats.byDepartment,
          byGrade: {},
          byGender: studentStats.byGender
        }

        // 格式化社团统计数据
        const formattedClubStats = {
          total: clubStats.total,
          list: clubStats.list,
          byDepartment: { '全部': clubStats.total }
        }

        this.setData({
          userStats,
          studentStats: formattedStudentStats,
          clubStats: formattedClubStats,
          attendanceStats,
          loading: false
        })
      } else {
        console.error('加载统计数据失败:', result.message)
        this.setData({ loading: false })
        SafeToast.fail('加载失败')
      }
    } catch (error) {
      console.error('加载统计数据失败:', error)
      this.setData({ loading: false })
      SafeToast.fail('加载失败')
    }
  },

  exportData() {
    wx.navigateTo({
      url: '/pages/common/export/export'
    })
  }
})
