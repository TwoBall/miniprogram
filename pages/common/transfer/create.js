// input: 学生信息（studentId, studentName, className, fromClub）
// output: 创建转社团申请
// pos: 页面层 > 公共模块 > 发起转社团申请

const request = require('../../../utils/request')

Page({
  data: {
    // 学生信息（从参数传入）
    studentId: '',
    studentName: '',
    className: '',
    department: '',
    fromClub: '',

    // 表单数据
    toClub: '',
    reason: '',

    // 社团选项
    clubOptions: [],
    showClubPicker: false,

    // 提交状态
    submitting: false,

    // 发起人类型
    initiatorType: ''
  },

  onLoad(options) {
    const { studentId, studentName, className, department, fromClub, initiatorType } = options

    this.setData({
      studentId: studentId || '',
      studentName: decodeURIComponent(studentName || ''),
      className: decodeURIComponent(className || ''),
      department: decodeURIComponent(department || ''),
      fromClub: decodeURIComponent(fromClub || ''),
      initiatorType: initiatorType || 'teacher'
    })

    // 设置导航栏标题
    wx.setNavigationBarTitle({ title: '发起转社团申请' })

    // 加载社团列表
    this.loadClubList()
  },

  /**
   * 加载社团列表
   * 使用带缓存的 getFilterOptions 减少云函数调用
   */
  async loadClubList() {
    try {
      const options = await request.getFilterOptions()

      if (options && options.clubs) {
        // 过滤掉当前社团
        const clubOptions = options.clubs
          .filter(club => club !== this.data.fromClub)
          .map(club => ({ name: club }))

        this.setData({ clubOptions })
      }
    } catch (error) {
      console.error('加载社团列表失败:', error)
      wx.showToast({ title: '加载社团失败', icon: 'none' })
    }
  },

  /**
   * 显示社团选择器
   */
  showClubPicker() {
    if (this.data.clubOptions.length === 0) {
      wx.showToast({ title: '暂无可选社团', icon: 'none' })
      return
    }
    this.setData({ showClubPicker: true })
  },

  /**
   * 社团选择确认
   */
  onClubConfirm(e) {
    this.setData({
      toClub: e.detail.name,
      showClubPicker: false
    })
  },

  /**
   * 社团选择取消
   */
  onClubCancel() {
    this.setData({ showClubPicker: false })
  },

  /**
   * 申请理由输入
   */
  onReasonInput(e) {
    this.setData({ reason: e.detail })
  },

  /**
   * 提交申请
   */
  async submitForm() {
    const { studentId, studentName, className, fromClub, toClub, reason, initiatorType } = this.data

    // 表单验证
    if (!toClub) {
      wx.showToast({ title: '请选择目标社团', icon: 'none' })
      return
    }

    this.setData({ submitting: true })

    try {
      const result = await request.callCloud('transfer', {
        action: 'create',
        studentId,
        studentName,
        className,
        fromClub,
        toClub,
        initiatorType,
        reason
      })

      if (result.success) {
        wx.showToast({ title: '申请已提交', icon: 'success' })
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      } else {
        wx.showToast({ title: result.message || '提交失败', icon: 'none' })
      }
    } catch (error) {
      console.error('提交转社团申请失败:', error)
      wx.showToast({ title: '提交失败', icon: 'none' })
    } finally {
      this.setData({ submitting: false })
    }
  },

  /**
   * 取消
   */
  cancel() {
    wx.navigateBack()
  }
})
