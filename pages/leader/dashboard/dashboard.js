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
    department: '',
    totalClasses: 0,
    totalStudents: 0,
    presentToday: 0,
    absentToday: 0,
    classes: [],
    classRanking: [],
    showRanking: false,

    // 缺勤预警
    absenceWarnings: [],
    warningCount: 0
  },

  /**
   * 页面加载
   */
  onLoad() {
    const userInfo = auth.checkRole('leader')
    if (userInfo) {
      this.setData({ department: userInfo.department })
    }
    this.initDate()
    // 延迟加载数据，确保 van-toast 节点已渲染
    wx.nextTick(() => {
      this.loadData()
      this.loadAbsenceWarnings()
    })
  },

  /**
   * 页面显示（30秒内不重复加载）
   */
  onShow() {
    // 检查登录状态，防止后台恢复时登录态丢失
    const userInfo = auth.checkRole('leader')
    if (!userInfo) return

    // 恢复页面数据（小程序被销毁后 department 会丢失）
    if (!this.data.department) {
      this.setData({ department: userInfo.department })
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
    await Promise.all([
      this.loadData(true),
      this.loadAbsenceWarnings()
    ])
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
   * 加载学部考勤数据
   * @param {boolean} forceRefresh - 是否强制刷新
   */
  async loadData(forceRefresh = false) {
    const userInfo = auth.getUserInfo()
    if (!userInfo) return

    this.lastLoadTime = Date.now()
    const { selectedDate } = this.data

    // 尝试从缓存读取（5分钟有效，按学部+日期缓存）
    const cacheKey = `${storage.STORAGE_KEYS.ATTENDANCE_DATA}_dept_${userInfo.department}_${selectedDate}`
    const cacheTimeKey = `${storage.STORAGE_KEYS.ATTENDANCE_DATA_TIME}_dept_${userInfo.department}_${selectedDate}`

    if (!forceRefresh) {
      const cached = storage.getWithCache(cacheKey, cacheTimeKey, storage.CACHE_DURATION.FIVE_MINUTES)
      if (cached) {
        // 班级按自然排序（缓存数据也需要排序以保证一致性）
        cached.classes.sort((a, b) => a.className.localeCompare(b.className, 'zh-CN', { numeric: true }))
        this.setData({
          classes: cached.classes,
          totalClasses: cached.totalClasses,
          totalStudents: cached.totalStudents,
          presentToday: cached.presentToday,
          absentToday: cached.absentToday
        })
        return
      }
    }

    try {
      Toast.loading({
        message: '加载中...',
        forbidClick: true,
        duration: 0
      })

      // 调用云函数获取学部考勤情况
      const result = await request.callCloud('attendance', {
        action: 'getByDepartment',
        department: userInfo.department,
        date: selectedDate
      }, { showLoading: false, showError: false })

      if (result.success) {
        const data = result.data
        // 班级按自然排序（1班 < 2班 < 10班）
        data.classes.sort((a, b) => a.className.localeCompare(b.className, 'zh-CN', { numeric: true }))
        // 存入缓存
        storage.setWithCache(cacheKey, cacheTimeKey, data)

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
  },

  /**
   * 加载班级排名
   */
  async loadClassRanking() {
    const userInfo = auth.getUserInfo()
    if (!userInfo) return

    try {
      Toast.loading({
        message: '加载中...',
        forbidClick: true,
        duration: 0
      })

      const result = await request.callCloud('attendance', {
        action: 'getDepartmentClassRanking',
        department: userInfo.department
      }, { showLoading: false, showError: false })

      if (result.success) {
        this.setData({ classRanking: result.data || [] })
      }
    } catch (error) {
      console.error('加载班级排名失败:', error)
      Toast.fail('加载失败')
    } finally {
      Toast.clear()
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
  },

  /**
   * 加载缺勤预警
   */
  async loadAbsenceWarnings() {
    const userInfo = auth.getUserInfo()
    if (!userInfo) return

    try {
      // 获取当前月份 (YYYY-MM)
      const now = new Date()
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, '0')
      const currentMonth = `${year}-${month}`

      const result = await request.callCloud('attendance', {
        action: 'getAbsenceWarnings',
        month: currentMonth,
        department: userInfo.department
      }, { showLoading: false, showError: false })

      if (result.success) {
        const warnings = result.data || []
        this.setData({
          absenceWarnings: warnings,
          warningCount: warnings.length
        })
      }
    } catch (error) {
      console.error('加载缺勤预警失败:', error)
    }
  }
})
