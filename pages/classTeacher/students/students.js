// 班主任学生管理页面
const request = require('../../../utils/request')

Page({
  data: {
    students: [],
    filteredStudents: [],
    loading: false,
    searchValue: '',
    userInfo: null,
    className: '',

    // 统计数据
    totalCount: 0,
    clubDistribution: [],

    // 缺勤预警
    absenceWarnings: [],
    warningStudentIds: []
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
      wx.showToast({
        title: '未找到班级信息',
        icon: 'none'
      })
    }
  },

  onPullDownRefresh() {
    Promise.all([
      this.loadStudents(),
      this.loadAbsenceWarnings()
    ]).then(() => {
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
        // 计算社团分布
        const clubMap = {}
        result.data.forEach(student => {
          const club = student.clubName || '未分配'
          clubMap[club] = (clubMap[club] || 0) + 1
        })

        const clubDistribution = Object.entries(clubMap)
          .map(([clubName, count]) => ({ clubName, count }))
          .sort((a, b) => b.count - a.count)

        this.setData({
          students: result.data,
          filteredStudents: result.data,
          totalCount: result.data.length,
          clubDistribution,
          loading: false
        })

        // 加载缺勤预警
        this.loadAbsenceWarnings()

        wx.stopPullDownRefresh()
      } else {
        wx.showToast({
          title: result.message || '加载失败',
          icon: 'none'
        })
        this.setData({ loading: false })
      }
    } catch (error) {
      console.error('加载学生列表失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
      this.setData({ loading: false })
      wx.stopPullDownRefresh()
    }
  },

  // 搜索
  onSearch(e) {
    const value = e.detail.trim()
    this.setData({ searchValue: value })
    this.filterStudents(value)
  },

  onSearchClear() {
    this.setData({ searchValue: '' })
    this.filterStudents('')
  },

  filterStudents(keyword) {
    if (!keyword) {
      this.setData({ filteredStudents: this.data.students })
      return
    }

    const filtered = this.data.students.filter(student => {
      return student.name.includes(keyword) ||
             student.clubName?.includes(keyword)
    })

    this.setData({ filteredStudents: filtered })
  },

  // 加载缺勤预警
  async loadAbsenceWarnings() {
    try {
      // 获取当前月份 (YYYY-MM)
      const now = new Date()
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, '0')
      const currentMonth = `${year}-${month}`

      const result = await request.callCloud('attendance', {
        action: 'getAbsenceWarnings',
        month: currentMonth,
        className: this.data.className
      })

      if (result.success) {
        const warnings = result.data || []

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

  // 查看学生详情
  onStudentTap(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/classTeacher/studentDetail/studentDetail?studentId=${id}`
    })
  },

  // 按社团筛选
  onClubFilter(e) {
    const { club } = e.currentTarget.dataset

    if (club === '全部') {
      this.setData({
        filteredStudents: this.data.students,
        searchValue: ''
      })
    } else {
      const filtered = this.data.students.filter(s => s.clubName === club)
      this.setData({
        filteredStudents: filtered,
        searchValue: ''
      })
    }
  }
})
