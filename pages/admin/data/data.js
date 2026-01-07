// input: 无（自动加载统计数据）
// output: 用户统计、学生统计、考勤统计数据展示
// pos: 页面层 > 管理员模块 > 数据中心

const app = getApp()
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

  async loadAllStats() {
    this.setData({ loading: true })

    try {
      await Promise.all([
        this.loadUserStats(),
        this.loadStudentStats(),
        this.loadClubStats(),
        this.loadAttendanceStats()
      ])

      this.setData({ loading: false })
    } catch (error) {
      this.setData({ loading: false })
      SafeToast.fail('加载失败')
    }
  },

  async loadUserStats() {
    try {
      const result = await request.callApi('user', 'getAll', {
        page: 1,
        pageSize: 1000
      })

      if (result.success) {
        const users = result.data
        const userStats = {
          total: users.length,
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
        }

        users.forEach(user => {
          userStats.byRole[user.role] = (userStats.byRole[user.role] || 0) + 1
          userStats.byStatus[user.status] = (userStats.byStatus[user.status] || 0) + 1
          if (user._openid) {
            userStats.bound++
          } else {
            userStats.unbound++
          }
        })

        this.setData({ userStats })
      }
    } catch (error) {
      console.error('加载用户统计失败:', error)
    }
  },

  async loadStudentStats() {
    try {
      // 使用云端聚合统计，避免加载全部1300+学生数据
      const result = await request.callApi('students', 'getStatistics', {})

      if (result.success) {
        const stats = result.data
        const studentStats = {
          total: stats.total,
          byDepartment: {},
          byGrade: {},
          byGender: stats.genderStats || {}
        }

        // 格式化学部统计
        if (stats.deptStats) {
          stats.deptStats.forEach(item => {
            studentStats.byDepartment[item.name] = item.count
          })
        }

        this.setData({ studentStats })
      }
    } catch (error) {
      console.error('加载学生统计失败:', error)
    }
  },

  async loadClubStats() {
    try {
      // 使用云端聚合统计获取社团数据
      const result = await request.callApi('students', 'getStatistics', {})

      if (result.success) {
        const stats = result.data
        const clubStats = {
          total: stats.clubStats ? stats.clubStats.length : 0,
          list: stats.clubStats || [],
          byDepartment: { '全部': stats.clubStats ? stats.clubStats.length : 0 }
        }

        this.setData({ clubStats })
      }
    } catch (error) {
      console.error('加载社团统计失败:', error)
    }
  },

  async loadAttendanceStats() {
    try {
      const now = new Date()
      const today = this.formatDate(now)

      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

      // 获取今日、本周、本月的考勤记录
      const [todayRes, weekRes, monthRes] = await Promise.all([
        this.getAttendanceCount(today, today),
        this.getAttendanceCount(this.formatDate(weekAgo), today),
        this.getAttendanceCount(this.formatDate(monthAgo), today)
      ])

      const attendanceStats = {
        todayTotal: todayRes.total,
        weekTotal: weekRes.total,
        monthTotal: monthRes.total,
        todayRate: todayRes.rate,
        weekRate: weekRes.rate,
        monthRate: monthRes.rate
      }

      this.setData({ attendanceStats })
    } catch (error) {
      console.error('加载考勤统计失败:', error)
    }
  },

  async getAttendanceCount(startDate, endDate) {
    try {
      const result = await request.callApi('attendance', 'getStatistics', {
        startDate,
        endDate
      })

      if (result.success) {
        return result.data
      } else {
        console.error('获取考勤统计失败:', result.message)
        return { total: 0, rate: 0 }
      }
    } catch (error) {
      console.error('获取考勤统计失败:', error)
      return { total: 0, rate: 0 }
    }
  },

  exportData() {
    wx.navigateTo({
      url: '/pages/common/export/export'
    })
  }
})
