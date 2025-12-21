const app = getApp()
const db = wx.cloud.database()
import Toast from '@vant/weapp/toast/toast'
import Dialog from '@vant/weapp/dialog/dialog'

Page({
  data: {
    clubName: '',
    currentDate: '',
    currentTime: '',
    students: [], // 显示的学生列表
    allStudents: [], // 所有学生列表
    presentCount: 0,
    absentCount: 0,
    totalCount: 0,
    loading: false,
    isDebugMode: false,
    // 筛选相关
    departments: [], // 学部选项
    selectedDepts: [], // 选中的学部
    showFilter: false
  },

  onLoad() {
    this.checkAuth()
    this.updateDateTime()
    this.loadStudents()
  },

  onShow() {
    this.updateDateTime()
  },

  checkAuth() {
    const userInfo = wx.getStorageSync('userInfo')
    // 允许 admin 调试模式访问
    const isDebugMode = !!(userInfo && userInfo._isDebugMode && userInfo._originalRole === 'admin')
    if (!userInfo || (userInfo.role !== 'teacher' && !isDebugMode)) {
      wx.reLaunch({
        url: '/pages/login/login'
      })
      return
    }
    this.setData({
      clubName: userInfo.clubName || '测试社团',
      isDebugMode: isDebugMode
    })
  },

  // 返回管理员中心（调试模式）
  returnToAdmin() {
    const userInfo = wx.getStorageSync('userInfo')
    if (userInfo && userInfo._originalRole === 'admin') {
      // 恢复管理员身份
      const adminInfo = {
        ...userInfo,
        role: 'admin'
      }
      delete adminInfo._isDebugMode
      delete adminInfo._originalRole
      wx.setStorageSync('userInfo', adminInfo)

      wx.reLaunch({
        url: '/pages/admin/home/home'
      })
    }
  },

  updateDateTime() {
    const now = new Date()
    const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

    this.setData({
      currentDate: date,
      currentTime: time
    })
  },

  async loadStudents() {
    const userInfo = wx.getStorageSync('userInfo')

    try {
      Toast.loading({
        message: '加载中...',
        forbidClick: true,
        duration: 0
      })

      // 调用云函数获取社团学生列表
      const res = await wx.cloud.callFunction({
        name: 'students',
        data: {
          action: 'getByClub',
          clubName: userInfo.clubName
        }
      })

      if (res.result.success) {
        const allStudents = res.result.data.map(student => ({
          ...student,
          status: null // null: 未点名, 'present': 到课, 'absent': 缺课
        }))

        // 1. 提取所有学部并去重
        const depts = [...new Set(allStudents.map(s => s.department).filter(d => d))].sort()
        const departmentOptions = depts.map(d => ({ text: d, value: d }))

        // 2. 根据星期应用默认筛选
        // 星期二(2): 职教一部, 职教二部
        // 星期四(4): 医药护理部
        const day = new Date().getDay()
        let defaultDepts = []

        if (day === 2) {
          defaultDepts = depts.filter(d => d === '职教一部' || d === '职教二部')
        } else if (day === 4) {
          defaultDepts = depts.filter(d => d === '医药护理部')
        } else {
          defaultDepts = depts // 其他时间默认全选
        }

        // 如果没有匹配到默认部门（比如数据里没有），则全选
        if (defaultDepts.length === 0 && depts.length > 0) {
          defaultDepts = depts
        }

        this.setData({
          allStudents,
          departments: departmentOptions,
          selectedDepts: defaultDepts
        })

        // 3. 应用筛选
        this.filterStudents()
      }
    } catch (error) {
      console.error('加载学生列表失败:', error)
      Toast.fail('加载失败')
    } finally {
      Toast.clear()
    }
  },

  // 筛选改变
  onDeptChange(e) {
    this.setData({
      selectedDepts: e.detail
    })
    this.filterStudents()
  },

  toggleDept(e) {
    const { name } = e.currentTarget.dataset
    const { selectedDepts } = this.data
    const index = selectedDepts.indexOf(name)
    if (index > -1) {
      selectedDepts.splice(index, 1)
    } else {
      selectedDepts.push(name)
    }
    this.setData({ selectedDepts })
    this.filterStudents()
  },

  filterStudents() {
    const { allStudents, selectedDepts } = this.data
    const filtered = allStudents.filter(s => selectedDepts.includes(s.department))

    this.setData({
      students: filtered,
      totalCount: filtered.length
    })
    // 更新统计
    this.updateStats(filtered)
  },

  markPresent(e) {
    const index = e.currentTarget.dataset.index
    const students = this.data.students

    students[index].status = students[index].status === 'present' ? null : 'present'

    this.updateStats(students)
  },

  markAbsent(e) {
    const index = e.currentTarget.dataset.index
    const students = this.data.students

    students[index].status = students[index].status === 'absent' ? null : 'absent'

    this.updateStats(students)
  },

  updateStats(students) {
    const presentCount = students.filter(s => s.status === 'present').length
    const absentCount = students.filter(s => s.status === 'absent').length

    this.setData({
      students,
      presentCount,
      absentCount
    })
  },

  markAllPresent() {
    const students = this.data.students.map(s => ({
      ...s,
      status: 'present'
    }))
    this.updateStats(students)
    Toast.success('已全部标记为到课')
  },

  async submitAttendance() {
    const { students } = this.data

    // 检查是否所有学生都已点名
    const unmarked = students.filter(s => s.status === null)
    if (unmarked.length > 0) {
      Dialog.confirm({
        title: '提示',
        message: `还有${unmarked.length}名学生未点名，是否继续提交？`
      }).then(() => {
        this.doSubmit()
      }).catch(() => {
        // 用户取消
      })
      return
    }

    this.doSubmit()
  },

  async doSubmit() {
    const { students, clubName, currentDate, currentTime } = this.data
    const userInfo = wx.getStorageSync('userInfo')

    this.setData({ loading: true })

    try {
      // 1. 检查今日是否已有点名记录
      const checkRes = await wx.cloud.callFunction({
        name: 'attendance',
        data: {
          action: 'checkTodaySubmissions',
          clubName,
          date: currentDate
        }
      })

      let submitMode = 'add' // 默认新增

      if (checkRes.result.success && checkRes.result.count > 0) {
        // 弹出询问框
        try {
          const action = await Dialog.confirm({
            title: '今日已有记录',
            message: `检测到 ${currentDate} 已有 ${checkRes.result.count} 条点名记录，是否覆盖？\n(点击"确定"将覆盖旧记录，"取消"则新增一条)`,
            confirmButtonText: '覆盖旧记录',
            cancelButtonText: '新增一条',
            confirmButtonColor: '#ff4d4f'
          })
          submitMode = 'cover'
        } catch (e) {
          // 用户点击取消，意为新增
          submitMode = 'add'
        }
      }

      // 2. 提交记录
      const res = await wx.cloud.callFunction({
        name: 'attendance',
        data: {
          action: 'submit',
          clubName,
          teacherId: userInfo._id,
          teacherName: userInfo.name,
          date: currentDate,
          time: currentTime,
          mode: submitMode, // 传递提交模式
          records: students.map(s => ({
            studentId: s._id,
            studentName: s.name,
            className: s.className,
            department: s.department,
            gender: s.gender || '',
            clubName: s.clubName || clubName,
            classTeacher: s.classTeacher || '',
            classTeacherPhone: s.classTeacherPhone || '',
            status: s.status || 'absent'
          }))
        }
      })

      if (res.result.success) {
        Toast.success(submitMode === 'cover' ? '已覆盖旧记录' : '提交成功')

        // 重置列表
        setTimeout(() => {
          this.loadStudents()
        }, 1500)
      } else {
        Toast.fail(res.result.message || '提交失败')
      }
    } catch (error) {
      console.error('提交失败:', error)
      Toast.fail('提交失败，请重试')
    } finally {
      this.setData({ loading: false })
    }
  }
})
