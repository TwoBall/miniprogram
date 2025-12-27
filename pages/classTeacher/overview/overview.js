const auth = require('../../../utils/auth')
const storage = require('../../../utils/storage')
const request = require('../../../utils/request')
const datePickerBehavior = require('../../../behaviors/datePickerBehavior')
import Toast from '@vant/weapp/toast/toast'

Page({
  behaviors: [datePickerBehavior],

  // 上次加载时间（用于防抖）
  lastLoadTime: 0,

  data: {
    className: '',
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
   * 页面显示（30秒内不重复加载）
   */
  onShow() {
    // 检查登录状态，防止后台恢复时登录态丢失
    const userInfo = auth.checkRole('classTeacher')
    if (!userInfo) return

    // 恢复页面数据（小程序被销毁后 className 会丢失）
    if (!this.data.className) {
      this.setData({ className: userInfo.className })
      this.initDate()
    }

    const now = Date.now()
    if (this.lastLoadTime && now - this.lastLoadTime < 30000) return
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
   * 初始化日期为今天
   */
  // initDate 由 datePickerBehavior 提供

  // showDatePickerPopup 由 datePickerBehavior 提供

  // onDatePickerClose 由 datePickerBehavior 提供

  /**
   * 日期变化回调（由 datePickerBehavior 调用）
   */
  onDateChange() {
    this.loadData(true) // 切换日期强制刷新
  },

  /**
   * 加载班级考勤数据
   * @param {boolean} forceRefresh - 是否强制刷新
   */
  async loadData(forceRefresh = false) {
    const userInfo = auth.getUserInfo()
    if (!userInfo) return

    this.lastLoadTime = Date.now()
    const { selectedDate } = this.data

    // 尝试从缓存读取（5分钟有效，按班级+日期缓存）
    const cacheKey = `${storage.STORAGE_KEYS.ATTENDANCE_DATA}_class_${userInfo.className}_${selectedDate}`
    const cacheTimeKey = `${storage.STORAGE_KEYS.ATTENDANCE_DATA_TIME}_class_${userInfo.className}_${selectedDate}`

    if (!forceRefresh) {
      const cached = storage.getWithCache(cacheKey, cacheTimeKey, storage.CACHE_DURATION.FIVE_MINUTES)
      if (cached) {
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
      const result = await request.callCloud('attendance', {
        action: 'getByClass',
        className: userInfo.className,
        date: selectedDate
      }, { showLoading: false, showError: false })

      if (result.success) {
        // 存入缓存
        storage.setWithCache(cacheKey, cacheTimeKey, result.data)
        this.applyData(result.data)
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
    // 数据已从云函数按姓名排序返回
    // 前端按业务需求重新排序：缺课 > 到课 > 未点名
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
      url: `/pages/classTeacher/feedback/feedback?studentId=${student._id}&studentName=${student.studentName}&clubName=${student.clubName}`
    })
  }
})
