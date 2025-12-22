const app = getApp()
import Toast from '@vant/weapp/toast/toast'
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
    // 上课日相关
    isClassDay: true,
    noClassMessage: '',
    // 滑动相关
    startX: 0,
    startY: 0,
    moveX: 0,
    cardStyle: '',
    swipeDirection: '',
    presentOpacity: 0,
    absentOpacity: 0,
    // 操作记录（用于撤销）
    actionHistory: [],
    // 已筛选的学部
    selectedDepts: [],
    // 已点名列表
    showMarkedList: false,
    markedStudents: []
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
    if (!userInfo || userInfo.role !== 'teacher') {
      wx.reLaunch({ url: '/pages/login/login' })
      return
    }
    this.setData({ clubName: userInfo.clubName })
  },

  goToSwitchRole() {
    wx.navigateTo({
      url: '/pages/common/switchRole/switchRole'
    })
  },

  updateDateTime() {
    const now = new Date()
    const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    this.setData({ currentDate: date, currentTime: time })
  },

  async loadStudents() {
    const userInfo = wx.getStorageSync('userInfo')

    try {
      Toast.loading({ message: '加载中...', forbidClick: true, duration: 0 })

      const res = await wx.cloud.callFunction({
        name: 'students',
        data: { action: 'getByClub', clubName: userInfo.clubName }
      })

      if (res.result.success) {
        const allStudents = res.result.data.map(student => ({
          ...student,
          status: null
        }))

        // 根据星期过滤学部
        const depts = [...new Set(allStudents.map(s => s.department).filter(d => d))].sort()
        const day = new Date().getDay()
        let defaultDepts = []
        let isClassDay = true
        let noClassMessage = ''

        if (day === 2) {
          defaultDepts = depts.filter(d => d === '职教一部' || d === '职教二部')
        } else if (day === 4) {
          defaultDepts = depts.filter(d => d === '医药护理部')
        } else {
          isClassDay = false
          const dayNames = ['日', '一', '二', '三', '四', '五', '六']
          noClassMessage = `今天是周${dayNames[day]}，无上课任务`
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
      Toast.fail('加载失败')
    } finally {
      Toast.clear()
    }
  },

  // ========== 触摸事件处理 ==========
  onTouchStart(e) {
    this.setData({
      startX: e.touches[0].clientX,
      startY: e.touches[0].clientY,
      moveX: 0
    })
  },

  onTouchMove(e) {
    const moveX = e.touches[0].clientX - this.data.startX
    const moveY = e.touches[0].clientY - this.data.startY

    // 忽略垂直滑动
    if (Math.abs(moveY) > Math.abs(moveX) && Math.abs(moveX) < 30) {
      return
    }

    const rotation = moveX * 0.05
    const presentOpacity = Math.min(moveX / 100, 1)
    const absentOpacity = Math.min(-moveX / 100, 1)

    this.setData({
      moveX,
      cardStyle: `transform: translateX(${moveX}px) rotate(${rotation}deg); transition: none;`,
      presentOpacity: presentOpacity > 0 ? presentOpacity : 0,
      absentOpacity: absentOpacity > 0 ? absentOpacity : 0,
      swipeDirection: moveX > 50 ? 'swiping-right' : (moveX < -50 ? 'swiping-left' : '')
    })
  },

  onTouchEnd(e) {
    const { moveX } = this.data
    const threshold = 100

    if (moveX > threshold) {
      this.markPresent()
    } else if (moveX < -threshold) {
      this.markAbsent()
    } else {
      // 回弹
      this.setData({
        cardStyle: 'transform: translateX(0) rotate(0); transition: all 0.3s ease;',
        presentOpacity: 0,
        absentOpacity: 0,
        swipeDirection: ''
      })
    }
  },

  // ========== 标记操作 ==========
  markPresent() {
    this.processSwipe('present', 'swipe-out-right')
  },

  markAbsent() {
    this.processSwipe('absent', 'swipe-out-left')
  },

  markPresentByBtn() {
    this.processSwipe('present', 'swipe-out-right')
  },

  markAbsentByBtn() {
    this.processSwipe('absent', 'swipe-out-left')
  },

  processSwipe(status, animClass) {
    const { students, currentIndex, actionHistory, presentCount, absentCount, markedStudents } = this.data

    if (currentIndex >= students.length) return

    // 记录操作
    const student = students[currentIndex]
    student.status = status
    actionHistory.push({ index: currentIndex, status })

    // 添加到已点名列表
    markedStudents.push({
      name: student.name,
      className: student.className,
      status: status
    })

    // 动画效果
    const direction = status === 'present' ? 1 : -1
    this.setData({
      cardStyle: `transform: translateX(${direction * 500}px) rotate(${direction * 30}deg); transition: all 0.3s ease;`,
      presentOpacity: status === 'present' ? 1 : 0,
      absentOpacity: status === 'absent' ? 1 : 0
    })

    // 延迟更新下一张
    setTimeout(() => {
      const nextIndex = currentIndex + 1
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
        swipeDirection: ''
      })
    }, 300)
  },

  // ========== 撤销操作 ==========
  undoLast() {
    const { students, actionHistory, presentCount, absentCount, markedStudents } = this.data

    if (actionHistory.length === 0) {
      Toast('没有可撤销的操作')
      return
    }

    const lastAction = actionHistory.pop()
    const student = students[lastAction.index]
    student.status = null

    // 从已点名列表中移除
    markedStudents.pop()

    this.setData({
      currentIndex: lastAction.index,
      currentStudent: student,
      remainingCount: students.length - lastAction.index,
      presentCount: lastAction.status === 'present' ? presentCount - 1 : presentCount,
      absentCount: lastAction.status === 'absent' ? absentCount - 1 : absentCount,
      actionHistory,
      markedStudents,
      cardStyle: '',
      swipeDirection: ''
    })

    Toast('已撤销')
  },

  // ========== 一键全到 ==========
  markAllPresent() {
    const { students, currentIndex } = this.data

    if (currentIndex >= students.length) {
      Toast('已全部点完')
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
          name: students[i].name,
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

      Toast.success('已全部标记为到课')
    }).catch(() => { })
  },

  // ========== 切换已点名列表显示 ==========
  toggleMarkedList() {
    this.setData({
      showMarkedList: !this.data.showMarkedList
    })
  },

  // ========== 提交点名 ==========
  async submitAttendance() {
    const { students, clubName, currentDate, currentTime } = this.data
    const userInfo = wx.getStorageSync('userInfo')

    // 检查是否全部点名
    const unmarked = students.filter(s => s.status === null)
    if (unmarked.length > 0) {
      Toast.fail(`还有 ${unmarked.length} 人未点名`)
      return
    }

    this.setData({ loading: true })

    try {
      // 检查今日记录
      const checkRes = await wx.cloud.callFunction({
        name: 'attendance',
        data: { action: 'checkTodaySubmissions', clubName, date: currentDate }
      })

      let submitMode = 'add'
      if (checkRes.result.success && checkRes.result.count > 0) {
        try {
          await Dialog.confirm({
            title: '今日已有记录',
            message: `检测到已有 ${checkRes.result.count} 条记录，是否覆盖？`,
            confirmButtonText: '覆盖',
            cancelButtonText: '新增'
          })
          submitMode = 'cover'
        } catch (e) {
          submitMode = 'add'
        }
      }

      // 提交
      const res = await wx.cloud.callFunction({
        name: 'attendance',
        data: {
          action: 'submit',
          clubName,
          teacherId: userInfo._id,
          teacherName: userInfo.name,
          date: currentDate,
          time: currentTime,
          mode: submitMode,
          records: students.map(s => ({
            studentId: s._id,
            studentName: s.name,
            className: s.className,
            department: s.department,
            gender: s.gender || '',
            clubName: s.clubName || clubName,
            classTeacher: s.classTeacher || '',
            classTeacherPhone: s.classTeacherPhone || '',
            status: s.status
          }))
        }
      })

      if (res.result.success) {
        Toast.success(submitMode === 'cover' ? '已覆盖' : '提交成功')
        setTimeout(() => this.loadStudents(), 1500)
      } else {
        Toast.fail(res.result.message || '提交失败')
      }
    } catch (error) {
      console.error('提交失败:', error)
      Toast.fail('提交失败')
    } finally {
      this.setData({ loading: false })
    }
  }
})
