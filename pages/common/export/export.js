const app = getApp()
const { formatDate } = require('../../../utils/date')
const request = require('../../../utils/request')

Page({
  data: {
    userInfo: null,
    exportType: 'attendance', // attendance | summary | students

    // 日期范围
    dateRange: 'today', // today | week | month | custom
    startDate: '',
    endDate: '',
    showStartDatePicker: false,
    showEndDatePicker: false,
    minDate: new Date(2020, 0, 1).getTime(),
    maxDate: new Date().getTime(),

    // 筛选条件
    department: '',
    clubName: '',
    className: '',

    // 选项列表
    departments: [],
    clubs: [],
    classes: [],

    // 选择器状态
    showDepartmentPicker: false,
    showClubPicker: false,
    showClassPicker: false,
    departmentActions: [],
    clubActions: [],
    classActions: [],

    // 导出中
    exporting: false
  },

  onLoad() {
    const userInfo = wx.getStorageSync('userInfo')
    this.setData({ userInfo })

    // 根据角色设置默认筛选条件
    if (userInfo.role === 'teacher') {
      this.setData({ clubName: userInfo.clubName })
    } else if (userInfo.role === 'classTeacher') {
      this.setData({ className: userInfo.className })
    } else if (userInfo.role === 'leader') {
      this.setData({ department: userInfo.department })
    }

    this.loadFilterOptions()
    this.setDateRange('today')
  },

  // 跳转到导出历史页面
  goToHistory() {
    wx.navigateTo({
      url: '/pages/common/export/history'
    })
  },

  // 加载筛选选项（使用带缓存的方法）
  async loadFilterOptions() {
    try {
      const data = await request.getFilterOptions()
      const { departments, clubs, classes } = data

      // 转换为 action-sheet 格式
      const departmentActions = [
        { name: '全部', value: '' },
        ...(departments || []).map(d => ({ name: d, value: d }))
      ]

      const clubActions = [
        { name: '全部', value: '' },
        ...(clubs || []).map(c => ({ name: c, value: c }))
      ]

      const classActions = [
        { name: '全部', value: '' },
        ...(classes || []).map(c => ({ name: c, value: c }))
      ]

      this.setData({
        departments,
        clubs,
        classes,
        departmentActions,
        clubActions,
        classActions
      })
    } catch (error) {
      console.error('加载筛选选项失败:', error)
    }
  },

  // 设置日期范围
  setDateRange(range) {
    const today = new Date()
    const year = today.getFullYear()
    const month = today.getMonth()
    const day = today.getDate()

    let startDate, endDate

    switch (range) {
      case 'today':
        startDate = endDate = formatDate(today)
        break
      case 'week':
        const weekStart = new Date(year, month, day - today.getDay())
        startDate = formatDate(weekStart)
        endDate = formatDate(today)
        break
      case 'month':
        startDate = formatDate(new Date(year, month, 1))
        endDate = formatDate(today)
        break
      case 'custom':
        // 自定义范围，不设置默认值
        return
    }

    this.setData({ dateRange: range, startDate, endDate })
  },

  // 导出类型切换
  onExportTypeChange(e) {
    this.setData({ exportType: e.detail })
  },

  // 日期范围切换
  onDateRangeChange(e) {
    const range = e.detail
    this.setData({ dateRange: range })
    if (range !== 'custom') {
      this.setDateRange(range)
    }
  },

  // 显示日期选择器
  onShowStartDatePicker() {
    this.setData({ showStartDatePicker: true })
  },

  onShowEndDatePicker() {
    this.setData({ showEndDatePicker: true })
  },

  // 确认开始日期
  onConfirmStartDate(e) {
    const date = new Date(e.detail)
    this.setData({
      startDate: formatDate(date),
      showStartDatePicker: false
    })
  },

  // 确认结束日期
  onConfirmEndDate(e) {
    const date = new Date(e.detail)
    this.setData({
      endDate: formatDate(date),
      showEndDatePicker: false
    })
  },

  // 取消日期选择
  onCancelDatePicker() {
    this.setData({
      showStartDatePicker: false,
      showEndDatePicker: false
    })
  },

  // 显示筛选选择器
  showDepartmentPicker() {
    if (this.data.userInfo.role === 'admin' || this.data.userInfo.role === 'leader') {
      this.setData({ showDepartmentPicker: true })
    }
  },

  showClubPicker() {
    if (this.data.userInfo.role !== 'teacher') {
      this.setData({ showClubPicker: true })
    }
  },

  showClassPicker() {
    if (this.data.userInfo.role !== 'classTeacher') {
      this.setData({ showClassPicker: true })
    }
  },

  // 选择筛选项
  onSelectDepartment(e) {
    this.setData({
      department: e.detail.value,
      showDepartmentPicker: false
    })
  },

  onSelectClub(e) {
    this.setData({
      clubName: e.detail.value,
      showClubPicker: false
    })
  },

  onSelectClass(e) {
    this.setData({
      className: e.detail.value,
      showClassPicker: false
    })
  },

  // 关闭选择器
  onCloseDepartmentPicker() {
    this.setData({ showDepartmentPicker: false })
  },

  onCloseClubPicker() {
    this.setData({ showClubPicker: false })
  },

  onCloseClassPicker() {
    this.setData({ showClassPicker: false })
  },

  // 执行导出
  async onExport() {
    const { exportType, startDate, endDate, department, clubName, className, exporting } = this.data

    if (exporting) return

    // 验证日期范围
    if ((exportType === 'attendance' || exportType === 'summary') && (!startDate || !endDate)) {
      wx.showToast({
        title: '请选择日期范围',
        icon: 'none'
      })
      return
    }

    this.setData({ exporting: true })
    wx.showLoading({ title: '导出中...' })

    try {
      const res = await wx.cloud.callFunction({
        name: 'export',
        data: {
          action: exportType,
          startDate,
          endDate,
          department,
          clubName,
          className
        }
      })

      wx.hideLoading()

      if (res.result.success) {
        const { tempFileURL, fileName, recordCount } = res.result.data

        // 下载文件
        wx.downloadFile({
          url: tempFileURL,
          success: (downloadRes) => {
            if (downloadRes.statusCode === 200) {
              // 保存文件
              const fs = wx.getFileSystemManager()
              const filePath = `${wx.env.USER_DATA_PATH}/${fileName}`

              fs.saveFile({
                tempFilePath: downloadRes.tempFilePath,
                filePath,
                success: () => {
                  wx.showModal({
                    title: '导出成功',
                    content: `已导出 ${recordCount} 条记录\n文件：${fileName}`,
                    confirmText: '打开文件',
                    success: (modalRes) => {
                      if (modalRes.confirm) {
                        wx.openDocument({
                          filePath,
                          fileType: 'xlsx',
                          fail: (err) => {
                            console.error('打开文件失败:', err)
                            wx.showToast({
                              title: '文件已保存，但打开失败',
                              icon: 'none'
                            })
                          }
                        })
                      }
                    }
                  })
                },
                fail: (err) => {
                  console.error('保存文件失败:', err)
                  wx.showToast({
                    title: '保存文件失败',
                    icon: 'none'
                  })
                }
              })
            } else {
              wx.showToast({
                title: '下载文件失败',
                icon: 'none'
              })
            }
          },
          fail: (err) => {
            console.error('下载文件失败:', err)
            wx.showToast({
              title: '下载文件失败',
              icon: 'none'
            })
          }
        })
      } else {
        wx.showToast({
          title: res.result.message || '导出失败',
          icon: 'none'
        })
      }
    } catch (error) {
      wx.hideLoading()
      console.error('导出失败:', error)
      wx.showToast({
        title: '导出失败',
        icon: 'none'
      })
    } finally {
      this.setData({ exporting: false })
    }
  }
})
