const app = getApp()

Page({
  data: {
    clubInfo: null,
    students: [],
    attendanceRank: [],
    activeTab: 'students',
    loading: false,

    // 统计数据
    stats: {
      totalStudents: 0,
      avgAttendanceRate: 0
    },

    // 缺勤预警
    absenceWarnings: [],
    warningStudentIds: new Set()
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
      this.loadAbsenceWarnings()
    ]).then(() => {
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
        this.setData({
          students,
          'stats.totalStudents': students.length,
          loading: false
        })

        // 加载缺勤预警
        this.loadAbsenceWarnings()
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

  // 加载缺勤预警
  async loadAbsenceWarnings() {
    const userInfo = wx.getStorageSync('userInfo')

    if (!userInfo.clubName) {
      return
    }

    try {
      // 获取当前月份 (YYYY-MM)
      const now = new Date()
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, '0')
      const currentMonth = `${year}-${month}`

      const res = await wx.cloud.callFunction({
        name: 'attendance',
        data: {
          action: 'getAbsenceWarnings',
          month: currentMonth,
          clubName: userInfo.clubName
        }
      })

      if (res.result.success) {
        const warnings = res.result.data || []

        // 创建预警学生ID集合
        const warningIds = warnings.map(w => w.studentId)

        this.setData({
          absenceWarnings: warnings,
          warningStudentIds: warningIds
        })
      }
    } catch (error) {
      console.error('加载缺勤预警失败:', error)
    }
  },

  onTabChange(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({ activeTab: tab })

    if (tab === 'rank' && this.data.attendanceRank.length === 0) {
      this.loadAttendanceRank()
    }
  },

  viewStudentDetail(e) {
    const student = e.currentTarget.dataset.student
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    })
  }
})
