/**
 * @file 社团老师点名页面
 * @module pages/teacher/attendance/attendance
 */
const auth = require('../../../utils/auth')
const dateUtil = require('../../../utils/date')
const request = require('../../../utils/request')
const { SafeToast } = require('../../../utils/error')
const { getTodaySchedule } = require('../../../utils/config')
import Dialog from '@vant/weapp/dialog/dialog'

Page({
  options: {
    styleIsolation: 'shared',
    pureDataPattern: /^_/
  },
  data: {
    clubName: '',
    currentDate: '',
    currentTime: '',
    students: [], // 当前展示的卡片列表，渲染层需要
    _allStudents: [], // 完整数据，逻辑层使用
    currentIndex: 0,
    currentStudent: null,
    presentCount: 0,
    absentCount: 0,
    remainingCount: 0,
    loading: false,
    pageLoading: true,
    isClassDay: true,
    noClassMessage: '',
    cardStyle: '',
    presentOpacity: 0,
    absentOpacity: 0,
    cardBorderClass: '',
    _actionHistory: [],
    selectedDepts: [],
    showMarkedList: false,
    markedStudents: []
  },

  /** 页面加载 */
  onLoad() {
    const userInfo = auth.checkRole('teacher')
    if (userInfo) {
      this.setData({ clubName: userInfo.clubName })
    }
    this.updateDateTime()
  },

  /** 页面初次渲染完成 */
  onReady() {
    this.loadStudents()
  },

  /** 页面显示 */
  onShow() {
    const userInfo = auth.checkRole('teacher')
    if (!userInfo) return

    if (!this.data.clubName) {
      this.setData({ clubName: userInfo.clubName })
      this.loadStudents()
    }

    this.updateDateTime()
  },

  /**
   * 更新日期时间
   */
  updateDateTime() {
    this.setData({
      currentDate: dateUtil.getCurrentDate(),
      currentTime: dateUtil.getCurrentTime()
    })
  },

  /**
   * 加载社团学生列表
   */
  async loadStudents() {
    const userInfo = auth.getUserInfo()
    if (!userInfo) return

    try {
      SafeToast.loading({ message: '加载中...', forbidClick: true, duration: 0 })

      // 先展示骨架屏，避免闪烁
      this.setData({ pageLoading: true })

      const result = await request.callCloud('students', {
        action: 'getByClub',
        clubName: userInfo.clubName
      }, { showLoading: false, showError: false })

      if (result.success) {
        const allStudents = result.data.map(student => ({
          ...student,
          status: null
        }))

        // 获取可用学部列表
        const depts = [...new Set(allStudents.map(s => s.department).filter(d => d))]
          .sort((a, b) => a.localeCompare(b, 'zh-CN'))
        
        // 使用配置化的排课规则
        const day = dateUtil.getDayOfWeek()
        const schedule = await getTodaySchedule(day, depts)
        
        const { isClassDay, departments: defaultDepts, noClassMessage } = schedule

        const filteredStudents = isClassDay
          ? allStudents.filter(s => defaultDepts.includes(s.department))
          : []

        this.setData({
          _allStudents: allStudents,
          students: filteredStudents,
          selectedDepts: defaultDepts,
          isClassDay,
          noClassMessage,
          currentIndex: 0,
          currentStudent: filteredStudents[0] || null,
          remainingCount: filteredStudents.length,
          presentCount: 0,
          absentCount: 0,
          _actionHistory: []
        })
      }
    } catch (error) {
      console.error('加载学生列表失败:', error)
      SafeToast.fail('加载失败')
    } finally {
      SafeToast.clear()
      
      // 延迟关闭 loading 以避免闪烁，并确保骨架屏平滑过渡到真实内容
      setTimeout(() => {
        this.setData({ pageLoading: false })
      }, 300)
    }
  },

  /**
   * 标记学生到课
   */
  markPresentByBtn() {
    this.markStudent('present')
  },

  /**
   * 标记学生缺课
   */
  markAbsentByBtn() {
    this.markStudent('absent')
  },

  /**
   * 标记学生状态
   * @param {string} status - 状态（present/absent）
   */
  markStudent(status) {
    const { students, currentIndex, _actionHistory, presentCount, absentCount, markedStudents } = this.data

    if (currentIndex >= students.length) return

    const student = students[currentIndex]
    _actionHistory.push({ index: currentIndex, status })

    const newMarkedStudent = {
      studentName: student.studentName,
      className: student.className,
      status: status
    }

    this.setData({
      [`students[${currentIndex}].status`]: status,
      presentOpacity: status === 'present' ? 1 : 0,
      absentOpacity: status === 'absent' ? 1 : 0,
      cardBorderClass: status === 'present' ? 'border-present' : 'border-absent'
    })

    setTimeout(() => {
      const direction = status === 'present' ? 1 : -1
      this.setData({
        cardStyle: `transform: translateX(${direction * 500}px) rotate(${direction * 30}deg); transition: all 0.3s ease;`
      })
    }, 150)

    setTimeout(() => {
      const nextIndex = currentIndex + 1
      const isComplete = nextIndex >= students.length

      const updates = {
        currentIndex: nextIndex,
        currentStudent: students[nextIndex] || null,
        remainingCount: students.length - nextIndex,
        presentCount: status === 'present' ? presentCount + 1 : presentCount,
        absentCount: status === 'absent' ? absentCount + 1 : absentCount,
        [`markedStudents[${markedStudents.length}]`]: newMarkedStudent,
        cardStyle: '',
        presentOpacity: 0,
        absentOpacity: 0,
        cardBorderClass: '',
        _actionHistory
      }

      this.setData(updates)

      if (isComplete) {
        Dialog.alert({
          title: '点名完成',
          message: '所有学生已点名完成，请点击提交按钮保存记录',
          confirmButtonText: '知道了'
        })
      }
    }, 450)
  },

  /**
   * 撤销上一次标记操作
   */
  undoLast() {
    const { students, _actionHistory, presentCount, absentCount, markedStudents } = this.data

    if (_actionHistory.length === 0) {
      SafeToast.fail('没有可撤销的操作')
      return
    }

    const lastAction = _actionHistory.pop()
    const student = students[lastAction.index]
    const currentStatus = student.status

    const updates = {
      currentIndex: lastAction.index,
      currentStudent: student,
      remainingCount: students.length - lastAction.index,
      presentCount: currentStatus === 'present' ? presentCount - 1 : presentCount,
      absentCount: currentStatus === 'absent' ? absentCount - 1 : absentCount,
      [`students[${lastAction.index}].status`]: null,
      [`markedStudents.length`]: markedStudents.length - 1,
      cardStyle: '',
      _actionHistory
    }

    markedStudents.pop()
    updates.markedStudents = markedStudents

    this.setData(updates)

    SafeToast.success('已撤销')
  },

  /**
   * 一键将剩余学生全部标记为到课
   */
  markAllPresent() {
    const { students, currentIndex } = this.data

    if (currentIndex >= students.length) {
      SafeToast.fail('已全部点完')
      return
    }

    Dialog.confirm({
      title: '一键全到',
      message: `确定将剩余 ${students.length - currentIndex} 名学生全部标记为到课？`
    }).then(() => {
      const markedStudents = [...this.data.markedStudents]
      const actionHistory = [...this.data._actionHistory]
      let presentCount = this.data.presentCount

      for (let i = currentIndex; i < students.length; i++) {
        students[i].status = 'present'
        actionHistory.push({ index: i, status: 'present' })
        markedStudents.push({
          studentName: students[i].studentName,
          className: students[i].className,
          status: 'present'
        })
        presentCount++
      }

      this.setData({
        currentIndex: students.length,
        currentStudent: null,
        remainingCount: 0,
        presentCount,
        _actionHistory: actionHistory,
        markedStudents,
        cardStyle: ''
      })

      Dialog.alert({
        title: '点名完成',
        message: '所有学生已标记为到课，请点击提交按钮保存记录',
        confirmButtonText: '知道了'
      })
    }).catch(() => { })
  },

  /**
   * 切换已点名列表显示
   */
  toggleMarkedList() {
    this.setData({
      showMarkedList: !this.data.showMarkedList
    })
  },

  /**
   * 切换已点名学生的状态
   * @param {Object} e - 事件对象
   */
  toggleMarkedStudentStatus(e) {
    const index = e.currentTarget.dataset.index
    const { markedStudents, students, presentCount, absentCount } = this.data

    const student = markedStudents[index]
    const oldStatus = student.status
    const newStatus = oldStatus === 'present' ? 'absent' : 'present'

    const updates = {
      [`markedStudents[${index}].status`]: newStatus,
      presentCount: oldStatus === 'present' ? presentCount - 1 : presentCount + 1,
      absentCount: oldStatus === 'absent' ? absentCount - 1 : absentCount + 1
    }

    const studentIndex = students.findIndex(s => s.studentName === student.studentName && s.className === student.className)
    if (studentIndex !== -1) {
      updates[`students[${studentIndex}].status`] = newStatus
    }

    this.setData(updates)

    SafeToast.success(`已改为${newStatus === 'present' ? '到课' : '缺课'}`)
  },

  /**
   * 提交点名记录到云端
   */
  async submitAttendance() {
    const { students, clubName, currentDate, currentTime } = this.data
    const userInfo = auth.getUserInfo()

    const unmarked = students.filter(s => s.status === null)
    if (unmarked.length > 0) {
      SafeToast.fail(`还有 ${unmarked.length} 人未点名`)
      return
    }

    this.setData({ loading: true })

    try {
      const checkResult = await request.callCloud('attendance', {
        action: 'checkTodaySubmissions',
        clubName,
        date: currentDate
      }, { showLoading: false, showError: false })

      let submitMode = 'add'
      if (checkResult.success && checkResult.count > 0) {
        try {
          await Dialog.confirm({
            title: '今日已有记录',
            message: `检测到已有 ${checkResult.count} 条记录，是否覆盖？`,
            confirmButtonText: '覆盖',
            cancelButtonText: '新增'
          })
          submitMode = 'cover'
        } catch (e) {
          submitMode = 'add'
        }
      }

      const submitResult = await request.callCloud('attendance', {
        action: 'submit',
        clubName,
        teacherId: userInfo._id,
        teacherName: userInfo.userName,
        date: currentDate,
        time: currentTime,
        mode: submitMode,
        records: students.map(s => ({
          studentId: s._id,
          studentName: s.studentName,
          className: s.className,
          department: s.department,
          gender: s.gender || '',
          clubName: s.clubName || clubName,
          classTeacher: s.classTeacher || '',
          classTeacherPhone: s.classTeacherPhone || '',
          status: s.status
        }))
      }, { showLoading: false, showError: false })

      if (submitResult.success) {
        SafeToast.success(submitMode === 'cover' ? '已覆盖' : '提交成功')
        setTimeout(() => this.loadStudents(), 1500)
      } else {
        SafeToast.fail(submitResult.message || '提交失败')
      }
    } catch (error) {
      console.error('提交失败:', error)
      SafeToast.fail('提交失败')
    } finally {
      this.setData({ loading: false })
    }
  }
})
