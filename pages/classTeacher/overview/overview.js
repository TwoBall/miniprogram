const app = getApp()
const db = wx.cloud.database()
import Toast from '@vant/weapp/toast/toast'

Page({
  data: {
    className: '',
    selectedDate: '',
    selectedDateTimestamp: new Date().getTime(),
    minDate: new Date(2020, 0, 1).getTime(),
    maxDate: new Date().getTime(),
    showDatePicker: false,
    totalStudents: 0,
    joinedClubs: 0,
    presentToday: 0,
    absentToday: 0,
    students: [],
    isDebugMode: false
  },

  onLoad() {
    this.checkAuth()
    this.initDate()
    this.loadData()
  },

  checkAuth() {
    const userInfo = wx.getStorageSync('userInfo')
    const isDebugMode = userInfo && userInfo._isDebugMode && userInfo._originalRole === 'admin'
    if (!userInfo || (userInfo.role !== 'classTeacher' && !isDebugMode)) {
      wx.reLaunch({
        url: '/pages/login/login'
      })
      return
    }
    this.setData({
      className: userInfo.className || '测试班级',
      isDebugMode: isDebugMode
    })
  },

  returnToAdmin() {
    const userInfo = wx.getStorageSync('userInfo')
    if (userInfo && userInfo._originalRole === 'admin') {
      const adminInfo = { ...userInfo, role: 'admin' }
      delete adminInfo._isDebugMode
      delete adminInfo._originalRole
      wx.setStorageSync('userInfo', adminInfo)
      wx.reLaunch({ url: '/pages/admin/home/home' })
    }
  },

  initDate() {
    const now = new Date()
    const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    this.setData({
      selectedDate: date,
      selectedDateTimestamp: now.getTime()
    })
  },

  showDatePickerPopup() {
    this.setData({ showDatePicker: true })
  },

  onDatePickerClose() {
    this.setData({ showDatePicker: false })
  },

  onDatePickerConfirm(e) {
    const date = new Date(e.detail)
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

    this.setData({
      selectedDate: dateStr,
      selectedDateTimestamp: e.detail,
      showDatePicker: false
    })
    this.loadData()
  },

  async loadData() {
    const userInfo = wx.getStorageSync('userInfo')
    const { selectedDate } = this.data

    try {
      Toast.loading({
        message: '加载中...',
        forbidClick: true,
        duration: 0
      })

      // 调用云函数获取班级学生考勤情况
      const res = await wx.cloud.callFunction({
        name: 'attendance',
        data: {
          action: 'getByClass',
          className: userInfo.className,
          date: selectedDate
        }
      })

      if (res.result.success) {
        const data = res.result.data
        // 排序：缺课 > 到课 > 未点名
        const sortedStudents = data.students.sort((a, b) => {
          const statusOrder = { 'absent': 0, 'present': 1, null: 2 }
          return (statusOrder[a.todayStatus] ?? 2) - (statusOrder[b.todayStatus] ?? 2)
        })

        this.setData({
          students: sortedStudents,
          totalStudents: data.totalStudents,
          joinedClubs: data.joinedClubs,
          presentToday: data.presentToday,
          absentToday: data.absentToday
        })
      }
    } catch (error) {
      console.error('加载数据失败:', error)
      Toast.fail('加载失败')
    } finally {
      Toast.clear()
    }
  },

  sendFeedback(e) {
    const student = e.currentTarget.dataset.student
    wx.navigateTo({
      url: `/pages/classTeacher/feedback/feedback?studentId=${student._id}&studentName=${student.name}&clubName=${student.clubName}`
    })
  }
})
