const auth = require('../../../utils/auth')
const dateUtil = require('../../../utils/date')
const storage = require('../../../utils/storage')
const request = require('../../../utils/request')
import Toast from '@vant/weapp/toast/toast'

Page({
  // 上次加载时间（用于防抖）
  lastLoadTime: 0,

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
    const userInfo = auth.checkRole('leader')
    if (userInfo) {
      this.setData({ department: userInfo.department })
    }
    this.initDate()
    this.loadData()
  },

  /**
   * 页面显示（30秒内不重复加载）
   */
  onShow() {
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
        console.log('使用学部考勤缓存')
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
  }
})
