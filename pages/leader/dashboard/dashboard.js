const app = getApp()
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
    classes: []
  },

  /**
   * 页面加载
   */
  onLoad() {
    this.checkAuth()
    this.initDate()
    this.loadData()
  },

  /**
   * 页面下拉刷新
   */
  async onPullDownRefresh() {
    await this.loadData()
    wx.stopPullDownRefresh()
  },

  /**
   * 检查用户权限
   */
  checkAuth() {
    const userInfo = wx.getStorageSync('userInfo')
    if (!userInfo || userInfo.role !== 'leader') {
      wx.reLaunch({
        url: '/pages/login/login'
      })
      return
    }
    this.setData({
      department: userInfo.department
    })
  },

  /**
   * 跳转到角色切换页面
   */
  goToSwitchRole() {
    wx.navigateTo({
      url: '/pages/common/switchRole/switchRole'
    })
  },

  /**
   * 初始化日期为今天
   */
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

  /**
   * 日期选择确认
   */
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

  /**
   * 加载学部考勤数据
   */
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

  /**
   * 查看班级详情
   */
  viewClassDetail(e) {
    const classData = e.currentTarget.dataset.class
    wx.navigateTo({
      url: `/pages/leader/detail/detail?className=${classData.className}&date=${this.data.selectedDate}`
    })
  }
})
