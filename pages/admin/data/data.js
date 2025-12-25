// input: 无（自动加载统计数据）
// output: 用户统计、学生统计、考勤统计数据展示
// pos: 页面层 > 管理员模块 > 数据中心

const app = getApp()

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
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }
  },

  async loadUserStats() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'user',
        data: {
          action: 'getAll',
          page: 1,
          pageSize: 1000
        }
      })

      if (res.result.success) {
        const users = res.result.data
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
      const res = await wx.cloud.callFunction({
        name: 'students',
        data: {
          action: 'getFilterOptions'
        }
      })

      if (res.result.success) {
        const options = res.result.data
        const studentStats = {
          total: 0,
          byDepartment: {},
          byGrade: {}
        }

        // 统计各学部学生数
        if (options.departments) {
          options.departments.forEach(dept => {
            studentStats.byDepartment[dept] = 0
          })
        }

        // 获取所有学生详情进行统计
        const studentsRes = await wx.cloud.callFunction({
          name: 'students',
          data: {
            action: 'getAll',
            page: 1,
            pageSize: 10000
          }
        })

        if (studentsRes.result && studentsRes.result.data) {
          const students = studentsRes.result.data
          studentStats.total = students.length

          students.forEach(student => {
            if (student.department) {
              studentStats.byDepartment[student.department] =
                (studentStats.byDepartment[student.department] || 0) + 1
            }

            if (student.className) {
              const grade = student.className.split('年级')[0] + '年级'
              studentStats.byGrade[grade] = (studentStats.byGrade[grade] || 0) + 1
            }
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
      const res = await wx.cloud.callFunction({
        name: 'students',
        data: {
          action: 'getFilterOptions'
        }
      })

      if (res.result.success) {
        const options = res.result.data
        const clubStats = {
          total: options.clubs ? options.clubs.length : 0,
          byDepartment: {}
        }

        // 通过社团名称统计（简化版本）
        if (options.clubs) {
          options.clubs.forEach(club => {
            // 这里可以根据社团名称推断学部，或从数据库获取更详细信息
            clubStats.byDepartment['全部'] = (clubStats.byDepartment['全部'] || 0) + 1
          })
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
      const res = await wx.cloud.callFunction({
        name: 'attendance',
        data: {
          action: 'getStatistics',
          startDate,
          endDate
        }
      })

      if (res.result.success) {
        return res.result.data
      } else {
        console.error('获取考勤统计失败:', res.result.message)
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
