const _app = getApp()
const auth = require('../../../utils/auth')
const dateUtil = require('../../../utils/date')
const storage = require('../../../utils/storage')
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
    pageLoading: true
  },

  /**
   * 页面加载
   */
  onLoad() {
    const userInfo = auth.checkRole('classTeacher')
    if (userInfo) {
      this.setData({ className: userInfo.className })
    }
    this.initDate()
    this.loadData()
  },

  /**
   * 页面下拉刷新（强制刷新）
   */
  async onPullDownRefresh() {
    await this.loadData(true)
    wx.stopPullDownRefresh()
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
    this.setData({
      selectedDate: dateUtil.getCurrentDate(),
      selectedDateTimestamp: new Date().getTime()
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
    const dateStr = dateUtil.formatDate(e.detail)

    this.setData({
      selectedDate: dateStr,
      selectedDateTimestamp: e.detail,
      showDatePicker: false
    })
    this.loadData(true) // 切换日期强制刷新
  },

  /**
   * 加载班级考勤数据
   * @param {boolean} forceRefresh - 是否强制刷新
   */
  async loadData(forceRefresh = false) {
    const userInfo = auth.getUserInfo()
    if (!userInfo) return

    const { selectedDate } = this.data

    // 尝试从缓存读取（5分钟有效，按班级+日期缓存）
    const cacheKey = `${storage.STORAGE_KEYS.ATTENDANCE_DATA}_class_${userInfo.className}_${selectedDate}`
    const cacheTimeKey = `${storage.STORAGE_KEYS.ATTENDANCE_DATA_TIME}_class_${userInfo.className}_${selectedDate}`

    if (!forceRefresh) {
      const cached = storage.getWithCache(cacheKey, cacheTimeKey, storage.CACHE_DURATION.FIVE_MINUTES)
      if (cached) {
        console.log('使用班级考勤缓存')
        this.applyData(cached)
        this.setData({ pageLoading: false })
        return
      }
    }

    this.setData({ pageLoading: true })

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
        // 存入缓存
        storage.setWithCache(cacheKey, cacheTimeKey, res.result.data)
        this.applyData(res.result.data)
      }
    } catch (error) {
      console.error('加载数据失败:', error)
      Toast.fail('加载失败')
    } finally {
      Toast.clear()
      this.setData({ pageLoading: false })
    }
  },

  /**
   * 应用数据到页面
   */
  applyData(data) {
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
  },

  /**
   * 发送反馈
   */
  sendFeedback(e) {
    const student = e.currentTarget.dataset.student
    wx.navigateTo({
      url: `/pages/classTeacher/feedback/feedback?studentId=${student._id}&studentName=${student.name}&clubName=${student.clubName}`
    })
  }
})
