/**
 * @file 班主任总览页面
 * @module pages/classTeacher/overview/overview
 */
const auth = require('../../../utils/auth')
const storage = require('../../../utils/storage')
const datePickerBehavior = require('../../../behaviors/datePickerBehavior')
const { SafeToast } = require('../../../utils/error')
const { loadWithCache } = require('../../../utils/loader')

Page({
  behaviors: [datePickerBehavior],

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

  /** 页面加载 */
  onLoad() {
    const userInfo = auth.checkRole('classTeacher')
    if (userInfo) {
      this.setData({ className: userInfo.className })
    }
    this.initDate()
  },

  /** 页面初次渲染完成 */
  onReady() {
    this.loadData()
  },

  /** 页面显示 */
  onShow() {
    const userInfo = auth.checkRole('classTeacher')
    if (!userInfo) return

    if (!this.data.className) {
      this.setData({ className: userInfo.className })
      this.initDate()
    }

    const now = Date.now()
    if (this.lastLoadTime && now - this.lastLoadTime < 30000) return
    this.loadData()
  },

  /** 页面下拉刷新 */
  async onPullDownRefresh() {
    await this.loadData(true)
    wx.stopPullDownRefresh()
  },

  /**
   * 日期变化回调
   */
  onDateChange() {
    this.loadData(true)
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
    const cacheKey = `class_overview_${userInfo.className}_${selectedDate}`

    this.setData({ pageLoading: true })

    try {
      await SafeToast.loading({
        message: '加载中...',
        forbidClick: true,
        duration: 0
      })

      // 使用 loader.js 统一加载逻辑，调用批量统计接口
      const result = await loadWithCache({
        cacheKey,
        cacheDuration: storage.CACHE_DURATION.FIVE_MINUTES,
        forceRefresh,
        apiModule: 'stats',
        apiAction: 'getClassOverviewStats',
        apiData: {
          className: userInfo.className,
          date: selectedDate
        }
      })

      if (result.success) {
        this.applyData(result.data)
      }
    } catch (error) {
      console.error('加载数据失败:', error)
      SafeToast.fail('加载失败')
    } finally {
      SafeToast.clear()
      this.setData({ pageLoading: false })
    }
  },

  /**
   * 应用数据到页面
   * @param {Object} data - 考勤数据
   */
  applyData(data) {
    // 数据已经在 API 层排序，直接使用
    this.setData({
      students: data.students,
      totalStudents: data.totalStudents,
      joinedClubs: data.joinedClubs,
      presentToday: data.presentToday,
      absentToday: data.absentToday
    })
  },

  /**
   * 发送反馈
   * @param {Object} e - 事件对象
   */
  sendFeedback(e) {
    const student = e.currentTarget.dataset.student
    wx.navigateTo({
      url: `/pages/classTeacher/feedback/feedback?studentId=${student._id}&studentName=${student.studentName}&clubName=${student.clubName}`
    })
  }
})
