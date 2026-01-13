/**
 * @file 学部领导看板页面
 * @module pages/leader/dashboard/dashboard
 */
const auth = require('../../../utils/auth')
const storage = require('../../../utils/storage')
const request = require('../../../utils/request')
const datePickerBehavior = require('../../../behaviors/datePickerBehavior')
const { SafeToast } = require('../../../utils/error')

Page({
  behaviors: [datePickerBehavior],

  lastLoadTime: 0,

  data: {
    department: '',
    totalClasses: 0,
    totalStudents: 0,
    presentToday: 0,
    absentToday: 0,
    classes: [],
    classRanking: [],
    showRanking: false,
    absenceWarnings: [],
    warningCount: 0
  },

  /** 页面加载 */
  onLoad() {
    const userInfo = auth.checkRole('leader')
    if (userInfo) {
      this.setData({ department: userInfo.department })
    }
    this.initDate()
  },

  /** 页面初次渲染完成 */
  onReady() {
    this.loadData()
  },

  /** 页面显示 */
  onShow() {
    const userInfo = auth.checkRole('leader')
    if (!userInfo) return

    if (!this.data.department) {
      this.setData({ department: userInfo.department })
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
   * 加载学部考勤数据（使用批量接口，包含缺勤预警）
   * @param {boolean} forceRefresh - 是否强制刷新
   */
  async loadData(forceRefresh = false) {
    const userInfo = auth.getUserInfo()
    if (!userInfo) return

    this.lastLoadTime = Date.now()
    const { selectedDate } = this.data

    const cacheKey = `${storage.STORAGE_KEYS.ATTENDANCE_DATA}_dept_${userInfo.department}_${selectedDate}`
    const cacheTimeKey = `${storage.STORAGE_KEYS.ATTENDANCE_DATA_TIME}_dept_${userInfo.department}_${selectedDate}`

    if (!forceRefresh) {
      const cached = storage.getWithCache(cacheKey, cacheTimeKey, storage.CACHE_DURATION.FIVE_MINUTES)
      if (cached) {
        cached.classes.sort((a, b) => a.className.localeCompare(b.className, 'zh-CN', { numeric: true }))
        this.setData({
          classes: cached.classes,
          totalClasses: cached.totalClasses,
          totalStudents: cached.totalStudents,
          presentToday: cached.presentToday,
          absentToday: cached.absentToday,
          absenceWarnings: cached.absenceWarnings || [],
          warningCount: cached.warningCount || 0
        })
        return
      }
    }

    try {
      await SafeToast.loading({
        message: '加载中...',
        forbidClick: true,
        duration: 0
      })

      // 使用批量接口，一次获取考勤数据和缺勤预警
      const result = await request.callApi('stats', 'getDashboardStats', {
        department: userInfo.department,
        date: selectedDate
      }, { showLoading: false, showError: false })

      if (result.success) {
        const data = result.data
        data.classes.sort((a, b) => a.className.localeCompare(b.className, 'zh-CN', { numeric: true }))
        storage.setWithCache(cacheKey, cacheTimeKey, data)

        this.setData({
          classes: data.classes,
          totalClasses: data.totalClasses,
          totalStudents: data.totalStudents,
          presentToday: data.presentToday,
          absentToday: data.absentToday,
          absenceWarnings: data.absenceWarnings || [],
          warningCount: data.warningCount || 0
        })
      }
    } catch (error) {
      console.error('加载数据失败:', error)
      SafeToast.fail('加载失败')
    } finally {
      SafeToast.clear()
    }
  },

  /**
   * 查看班级详情
   * @param {Object} e - 事件对象
   */
  viewClassDetail(e) {
    const classData = e.currentTarget.dataset.class
    wx.navigateTo({
      url: `/pages/leader/detail/detail?className=${classData.className}&date=${this.data.selectedDate}`
    })
  },

  /**
   * 加载班级排名
   */
  async loadClassRanking() {
    const userInfo = auth.getUserInfo()
    if (!userInfo) return

    try {
      await SafeToast.loading({
        message: '加载中...',
        forbidClick: true,
        duration: 0
      })

      const result = await request.callApi('attendance', 'getDepartmentClassRanking', {
        department: userInfo.department
      }, { showLoading: false, showError: false })

      if (result.success) {
        this.setData({ classRanking: result.data || [] })
      }
    } catch (error) {
      console.error('加载班级排名失败:', error)
      SafeToast.fail('加载失败')
    } finally {
      SafeToast.clear()
    }
  },

  /**
   * 切换班级排名显示
   */
  onToggleRanking() {
    if (!this.data.showRanking && this.data.classRanking.length === 0) {
      this.loadClassRanking()
    }
    this.setData({ showRanking: !this.data.showRanking })
  }
})
