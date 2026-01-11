// input: 页面调用搜索/筛选/预警加载方法
// output: 过滤后的学生列表、预警数据、分布统计
// pos: 行为层 > 学生列表公共行为

const request = require('../utils/request')

/**
 * 学生列表页面公共行为
 * 提供搜索、筛选、缺勤预警、分布统计等通用功能
 *
 * 使用此 Behavior 的页面：
 * - pages/teacher/club/club.js
 * - pages/classTeacher/students/students.js
 */
module.exports = Behavior({
  options: {
    pureDataPattern: /^_/
  },
  data: {
    // 学生数据 (纯数据字段)
    _students: [],
    filteredStudents: [],
    loading: false,

    // 搜索
    searchValue: '',

    // 缺勤预警
    absenceWarnings: [],
    warningStudentIds: [],

    // 分布统计
    distribution: [],
    selectedDistribution: '',

    // 统计
    stats: {
      totalCount: 0,
      warningCount: 0,
      avgAttendanceRate: 0
    },

    // Tab 切换
    activeTab: 'students',

    // 出勤排行
    attendanceRank: []
  },

  methods: {
    // ========== 搜索功能 ==========

    /**
     * 搜索输入
     */
    onSearch(e) {
      const value = (e.detail || '').trim()
      this.setData({ searchValue: value })
      this.filterStudents()
    },

    /**
     * 清除搜索
     */
    onSearchClear() {
      this.setData({ searchValue: '' })
      this.filterStudents()
    },

    /**
     * 过滤学生列表
     * 综合搜索关键词和分布筛选条件
     */
    filterStudents() {
      const { _students, searchValue, selectedDistribution, distributionField } = this.data

      let filtered = _students

      // 分布筛选
      if (selectedDistribution && selectedDistribution !== '全部') {
        const field = distributionField || 'clubName'
        filtered = filtered.filter(s => s[field] === selectedDistribution)
      }

      // 搜索关键词
      if (searchValue) {
        const keyword = searchValue.toLowerCase()
        filtered = filtered.filter(student => {
          return student.studentName?.toLowerCase().includes(keyword) ||
                 student.clubName?.toLowerCase().includes(keyword) ||
                 student.className?.toLowerCase().includes(keyword)
        })
      }

      this.setData({ filteredStudents: filtered })

      // 如果混入了虚拟列表 Behavior，更新虚拟列表
      if (typeof this.updateFullList === 'function') {
        this.updateFullList(filtered)
      }
    },

    // ========== 分布筛选 ==========

    /**
     * 点击分布标签筛选
     */
    onDistributionFilter(e) {
      const { value } = e.currentTarget.dataset
      this.setData({ selectedDistribution: value })
      this.filterStudents()
    },

    /**
     * 计算分布统计
     * @param {Array} students - 学生列表
     * @param {string} field - 统计字段 (clubName/className)
     * @returns {Array} 分布统计数组
     */
    calculateDistribution(students, field) {
      const map = {}
      students.forEach(student => {
        const value = student[field] || '未分配'
        map[value] = (map[value] || 0) + 1
      })

      return Object.entries(map)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
    },

    // ========== 缺勤预警 ==========

    /**
     * 加载缺勤预警
     * @param {Object} params - 查询参数 { clubName, className }
     */
    async loadAbsenceWarnings(params) {
      try {
        // 获取当前月份 (YYYY-MM)
        const now = new Date()
        const year = now.getFullYear()
        const month = String(now.getMonth() + 1).padStart(2, '0')
        const currentMonth = `${year}-${month}`

        const result = await request.callApi('attendance', 'getAbsenceWarnings', {
          month: currentMonth,
          ...params
        })

        if (result.success) {
          const warnings = result.data || []
          const warningIds = warnings.map(w => w.studentId)

          this.setData({
            absenceWarnings: warnings,
            warningStudentIds: warningIds,
            'stats.warningCount': warnings.length
          })
        }
      } catch (error) {
        console.error('加载缺勤预警失败:', error)
      }
    },

    // ========== Tab 切换 ==========

    /**
     * Tab 切换
     */
    onTabChange(e) {
      const tab = e.detail.name
      this.setData({ activeTab: tab })

      // 切换到排行榜时加载数据
      if (tab === 'rank' && this.data.attendanceRank.length === 0) {
        if (typeof this.loadAttendanceRank === 'function') {
          this.loadAttendanceRank()
        }
      }
    },

    // ========== 学生操作 ==========

    /**
     * 检查学生是否有缺勤预警
     * @param {string} studentId - 学生ID
     * @returns {boolean}
     */
    hasWarning(studentId) {
      return this.data.warningStudentIds.includes(studentId)
    }
  }
})
