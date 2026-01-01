const auth = require('../../../utils/auth')
const dateUtil = require('../../../utils/date')
const request = require('../../../utils/request')
const { SafeToast } = require('../../../utils/error')
import Dialog from '@vant/weapp/dialog/dialog'

Page({
  options: {
    styleIsolation: 'shared'
  },
  data: {
    clubName: '',
    currentDate: '',
    currentTime: '',
    students: [],
    allStudents: [],
    currentIndex: 0,
    currentStudent: null,
    presentCount: 0,
    absentCount: 0,
    remainingCount: 0,
    loading: false,
    // 页面加载状态
    pageLoading: true,
    // 上课日相关
    isClassDay: true,
    noClassMessage: '',
    // 卡片动画样式
    cardStyle: '',
    // 反馈图标透明度
    presentOpacity: 0,
    absentOpacity: 0,
    // 卡片边框状态
    cardBorderClass: '',
    // 操作记录（用于撤销）
    actionHistory: [],
    // 已筛选的学部
    selectedDepts: [],
    // 已点名列表
    showMarkedList: false,
    markedStudents: []
  },

  onLoad() {
    const userInfo = auth.checkRole('teacher')
    if (userInfo) {
      this.setData({ clubName: userInfo.clubName })
    }
    this.updateDateTime()
  },

  onReady() {
    this.loadStudents()
  },

  onShow() {
    // 检查登录状态，防止后台恢复时登录态丢失
    const userInfo = auth.checkRole('teacher')
    if (!userInfo) return

    // 恢复页面数据（小程序被销毁后 clubName 会丢失）
    if (!this.data.clubName) {
      this.setData({ clubName: userInfo.clubName })
      this.loadStudents()
    }

    this.updateDateTime()
  },

  updateDateTime() {
    this.setData({
      currentDate: dateUtil.getCurrentDate(),
      currentTime: dateUtil.getCurrentTime()
    })
  },

  /**
   * 加载社团学生列表
   * 根据当前星期自动筛选对应学部的学生
   */
  async loadStudents() {
    const userInfo = auth.getUserInfo()
    if (!userInfo) return

    try {
      SafeToast.loading({ message: '加载中...', forbidClick: true, duration: 0 })

      this.setData({ pageLoading: true })

      const result = await request.callCloud('students', {
        action: 'getByClub',
        clubName: userInfo.clubName
      }, { showLoading: false, showError: false })

      if (result.success) {
        // 数据已在云函数中按班级+姓名排序，无需前端再次排序
        const allStudents = result.data.map(student => ({
          ...student,
          status: null
        }))

        // 根据星期过滤学部（按中文拼音排序）
        const depts = [...new Set(allStudents.map(s => s.department).filter(d => d))]
          .sort((a, b) => a.localeCompare(b, 'zh-CN'))
        const day = dateUtil.getDayOfWeek()
        let defaultDepts = []
        let isClassDay = true
        let noClassMessage = ''

        if (day === 2) {
          defaultDepts = depts.filter(d => d === '职教一部' || d === '职教二部')
        } else if (day === 4) {
          defaultDepts = depts.filter(d => d === '医药护理部')
        } else {
          isClassDay = false
          noClassMessage = `今天是${dateUtil.getDayOfWeekName()}，无上课任务`
        }

        if (isClassDay && defaultDepts.length === 0) {
          isClassDay = false
          noClassMessage = '当前社团暂无对应学部的学生'
        }

        // 筛选学生
        const filteredStudents = isClassDay
          ? allStudents.filter(s => defaultDepts.includes(s.department))
          : []

        this.setData({
          allStudents,
          students: filteredStudents,
          selectedDepts: defaultDepts,
          isClassDay,
          noClassMessage,
          currentIndex: 0,
          currentStudent: filteredStudents[0] || null,
          remainingCount: filteredStudents.length,
          presentCount: 0,
          absentCount: 0,
          actionHistory: []
        })
      }
    } catch (error) {
      console.error('加载学生列表失败:', error)
      SafeToast.fail('加载失败')
    } finally {
      SafeToast.clear()
      this.setData({ pageLoading: false })
    }
  },

  // ========== 按钮点击处理 ==========

  /**
   * 标记学生到课（按钮点击）
   */
  markPresentByBtn() {
    this.markStudent('present')
  },

  /**
   * 标记学生缺课（按钮点击）
   */
  markAbsentByBtn() {
    this.markStudent('absent')
  },

  /**
   * 标记学生状态
   */
  markStudent(status) {
    const { students, currentIndex, actionHistory, presentCount, absentCount, markedStudents } = this.data

    if (currentIndex >= students.length) return

    // 记录操作
    const student = students[currentIndex]
    student.status = status
    actionHistory.push({ index: currentIndex, status })

    // 添加到已点名列表
    markedStudents.push({
      studentName: student.studentName,
      className: student.className,
      status: status
    })

    // 先显示反馈图标和边框
    this.setData({
      presentOpacity: status === 'present' ? 1 : 0,
      absentOpacity: status === 'absent' ? 1 : 0,
      cardBorderClass: status === 'present' ? 'border-present' : 'border-absent'
    })

    // 延迟后卡片飞出
    setTimeout(() => {
      const direction = status === 'present' ? 1 : -1
      this.setData({
        cardStyle: `transform: translateX(${direction * 500}px) rotate(${direction * 30}deg); transition: all 0.3s ease;`
      })
    }, 150)

    // 延迟更新下一张
    setTimeout(() => {
      const nextIndex = currentIndex + 1
      const isComplete = nextIndex >= students.length

      this.setData({
        currentIndex: nextIndex,
        currentStudent: students[nextIndex] || null,
        remainingCount: students.length - nextIndex,
        presentCount: status === 'present' ? presentCount + 1 : presentCount,
        absentCount: status === 'absent' ? absentCount + 1 : absentCount,
        actionHistory,
        markedStudents,
        cardStyle: '',
        presentOpacity: 0,
        absentOpacity: 0,
        cardBorderClass: ''
      })

      // 点名完成时显示醒目提示
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
    const { students, actionHistory, presentCount, absentCount, markedStudents } = this.data

    if (actionHistory.length === 0) {
      SafeToast.fail('没有可撤销的操作')
      return
    }

    const lastAction = actionHistory.pop()
    const student = students[lastAction.index]

    // 使用学生当前的实际状态来调整计数器（而非actionHistory中的原始状态）
    // 因为用户可能在已点名列表中修改过状态
    const currentStatus = student.status
    student.status = null

    // 从已点名列表中移除
    markedStudents.pop()

    this.setData({
      currentIndex: lastAction.index,
      currentStudent: student,
      remainingCount: students.length - lastAction.index,
      presentCount: currentStatus === 'present' ? presentCount - 1 : presentCount,
      absentCount: currentStatus === 'absent' ? absentCount - 1 : absentCount,
      actionHistory,
      markedStudents,
      cardStyle: ''
    })

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
      // 标记剩余所有学生为到课
      const markedStudents = [...this.data.markedStudents]
      const actionHistory = [...this.data.actionHistory]
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
        actionHistory,
        markedStudents,
        cardStyle: ''
      })

      // 显示醒目提交提示
      Dialog.alert({
        title: '点名完成',
        message: '所有学生已标记为到课，请点击提交按钮保存记录',
        confirmButtonText: '知道了'
      })
    }).catch(() => { })
  },

  // ========== 切换已点名列表显示 ==========
  toggleMarkedList() {
    this.setData({
      showMarkedList: !this.data.showMarkedList
    })
  },

  /**
   * 切换已点名学生的状态
   * 使用数据路径局部更新，减少 setData 数据传输量
   */
  toggleMarkedStudentStatus(e) {
    const index = e.currentTarget.dataset.index
    const { markedStudents, students, presentCount, absentCount } = this.data

    const student = markedStudents[index]
    const oldStatus = student.status
    const newStatus = oldStatus === 'present' ? 'absent' : 'present'

    // 使用数据路径局部更新，避免传输整个数组
    const updates = {
      [`markedStudents[${index}].status`]: newStatus,
      presentCount: oldStatus === 'present' ? presentCount - 1 : presentCount + 1,
      absentCount: oldStatus === 'absent' ? absentCount - 1 : absentCount + 1
    }

    // 同步更新 students 数组中对应学生的状态
    const studentIndex = students.findIndex(s => s.studentName === student.studentName && s.className === student.className)
    if (studentIndex !== -1) {
      updates[`students[${studentIndex}].status`] = newStatus
    }

    this.setData(updates)

    SafeToast.success(`已改为${newStatus === 'present' ? '到课' : '缺课'}`)
  },

  /**
   * 提交点名记录到云端
   * 检查是否有重复记录并提供覆盖或新增选项
   */
  async submitAttendance() {
    const { students, clubName, currentDate, currentTime } = this.data
    const userInfo = auth.getUserInfo()

    // 检查是否全部点名
    const unmarked = students.filter(s => s.status === null)
    if (unmarked.length > 0) {
      SafeToast.fail(`还有 ${unmarked.length} 人未点名`)
      return
    }

    this.setData({ loading: true })

    try {
      // 检查今日记录
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

      // 提交
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
