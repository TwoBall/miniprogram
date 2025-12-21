const app = getApp()
const db = wx.cloud.database()
import Toast from '@vant/weapp/toast/toast'

Page({
  data: {
    department: '',
    selectedDate: '',
    selectedDateTimestamp: new Date().getTime(),
    minDate: new Date(2020, 0, 1).getTime(),
    maxDate: new Date().getTime(),
    showDatePicker: false,
    totalClasses: 0,
    totalStudents: 0,
    presentToday: 0,
    absentToday: 0,
    classes: [],
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
    if (!userInfo || (userInfo.role !== 'leader' && !isDebugMode)) {
      wx.reLaunch({
        url: '/pages/login/login'
      })
      return
    }
    this.setData({
      department: userInfo.department || '测试学部',
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

      // 调用云函数获取学部考勤情况
      const res = await wx.cloud.callFunction({
        name: 'attendance',
        data: {
          action: 'getByDepartment',
          department: userInfo.department,
          date: selectedDate
        }
      })

      if (res.result.success) {
        const data = res.result.data
        this.setData({
          classes: data.classes,
          totalClasses: data.totalClasses,
          totalStudents: data.totalStudents,
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

  viewClassDetail(e) {
    const classData = e.currentTarget.dataset.class
    wx.navigateTo({
      url: `/pages/leader/detail/detail?className=${classData.className}&date=${this.data.selectedDate}`
    })
  }
})
