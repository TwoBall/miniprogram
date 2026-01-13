/**
 * @file 学部领导看板页面
 * @module pages/leader/dashboard/dashboard
 */
const auth = require('../../../utils/auth')
const storage = require('../../../utils/storage')
const request = require('../../../utils/request')
const datePickerBehavior = require('../../../behaviors/datePickerBehavior')
const { SafeToast } = require('../../../utils/error')
const { loadWithCache } = require('../../../utils/loader')

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
    warningCount: 0,
    pageLoading: true
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
    const cacheKey = `leader_dashboard_${userInfo.department}_${selectedDate}`

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
        apiAction: 'getDashboardStats',
        apiData: {
          department: userInfo.department,
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
      classes: data.classes,
      totalClasses: data.totalClasses,
      totalStudents: data.totalStudents,
      presentToday: data.presentToday,
      absentToday: data.absentToday,
      absenceWarnings: data.absenceWarnings || [],
      warningCount: data.warningCount || 0
    })
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
