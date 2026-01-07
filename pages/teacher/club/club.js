// input: 社团名称、学生列表、考勤数据
// output: 社团学生管理界面、出勤排行、缺勤预警
// pos: 页面层 > 教师模块 > 社团管理

const studentListBehavior = require('../../../behaviors/studentListBehavior')
const virtualListBehavior = require('../../../behaviors/virtualListBehavior')
const request = require('../../../utils/request')
const { SafeToast } = require('../../../utils/error')

Page({
  behaviors: [studentListBehavior, virtualListBehavior],

  data: {
    pageLoading: true,
    clubInfo: null,

    // 学部班级筛选
    departments: [],           // 学部列表
    classes: [],               // 当前学部下的班级列表
    _allClasses: [],            // 所有班级（按学部分组），纯数据字段优化
    selectedDepartment: '',    // 选中的学部
    selectedClass: '',         // 选中的班级

    // 弹出层状态
    showDeptPicker: false,
    showClassPicker: false,

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
      SafeToast.fail('未关联社团')
      return
    }

    this.setData({ loading: true })

    try {
      const result = await request.callApi('students', 'getByClub', {
        clubName: userInfo.clubName
      })

      if (result.success) {
        const students = result.data || []

        // 构建学部-班级层级数据
        const deptClassMap = {}
        students.forEach(s => {
          const dept = s.department || '未分配'
          const cls = s.className || '未分配'
          if (!deptClassMap[dept]) {
            deptClassMap[dept] = new Set()
          }
          deptClassMap[dept].add(cls)
        })

        // 转换为数组格式
        const departments = ['全部学部', ...Object.keys(deptClassMap).sort()]
        const allClasses = { '全部学部': ['全部班级'] }
        Object.keys(deptClassMap).forEach(dept => {
          allClasses[dept] = ['全部班级', ...Array.from(deptClassMap[dept]).sort()]
        })

        this.setData({
          _students: students, // 使用 studentListBehavior 的 _students
          filteredStudents: students,
          'stats.totalCount': students.length,
          departments,
          _allClasses: allClasses, // 纯数据字段
          classes: ['全部班级'],
          selectedDepartment: '全部学部',
          selectedClass: '全部班级',
          loading: false,
          pageLoading: false
        })

        // 初始化虚拟列表（每项高度约 120px）
        this.initVirtualList(students, { itemHeight: 120, bufferSize: 5 })

        // 加载缺勤预警
        this.loadAbsenceWarnings({ clubName: userInfo.clubName })
      } else {
        throw new Error(result.message)
      }
    } catch (error) {
      console.error('加载学生列表失败:', error)
      this.setData({ loading: false, pageLoading: false })
      SafeToast.fail(error.message || '加载失败')
    }
  },

  async loadAttendanceRank() {
    const userInfo = wx.getStorageSync('userInfo')

    if (!userInfo.clubName) {
      return
    }

    this.setData({ loading: true })

    try {
      const result = await request.callApi('attendance', 'getClubRank', {
        clubName: userInfo.clubName
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
  },

  /**
   * 打开学部选择器
   */
  onShowDeptPicker() {
    this.setData({ showDeptPicker: true })
  },

  /**
   * 关闭学部选择器
   */
  onDeptPickerClose() {
    this.setData({ showDeptPicker: false })
  },

  /**
   * 学部选择确认
   */
  onDeptPickerConfirm(e) {
    const { value } = e.detail
    const { _allClasses } = this.data
    const selectedDepartment = value
    const classes = _allClasses[selectedDepartment] || ['全部班级']

    this.setData({
      showDeptPicker: false,
      selectedDepartment,
      classes,
      selectedClass: '全部班级'
    })

    this.applyFilter()
  },

  /**
   * 打开班级选择器
   */
  onShowClassPicker() {
    if (this.data.selectedDepartment === '全部学部') {
      return
    }
    this.setData({ showClassPicker: true })
  },

  /**
   * 关闭班级选择器
   */
  onClassPickerClose() {
    this.setData({ showClassPicker: false })
  },

  /**
   * 班级选择确认
   */
  onClassPickerConfirm(e) {
    const { value } = e.detail

    this.setData({
      showClassPicker: false,
      selectedClass: value
    })

    this.applyFilter()
  },

  /**
   * 应用筛选条件
   */
  applyFilter() {
    const { _students, selectedDepartment, selectedClass } = this.data

    let filtered = _students

    // 学部筛选
    if (selectedDepartment && selectedDepartment !== '全部学部') {
      filtered = filtered.filter(s => s.department === selectedDepartment)
    }

    // 班级筛选
    if (selectedClass && selectedClass !== '全部班级') {
      filtered = filtered.filter(s => s.className === selectedClass)
    }

    this.setData({ filteredStudents: filtered })

    // 更新虚拟列表
    if (typeof this.updateFullList === 'function') {
      this.updateFullList(filtered)
    }
  },

  /**
   * 重置筛选
   */
  onResetFilter() {
    const { _students } = this.data

    this.setData({
      selectedDepartment: '全部学部',
      selectedClass: '全部班级',
      classes: ['全部班级'],
      filteredStudents: _students
    })

    // 更新虚拟列表
    if (typeof this.updateFullList === 'function') {
      this.updateFullList(_students)
    }
  }
})
