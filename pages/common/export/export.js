const app = getApp()
const { formatDate } = require('../../../utils/date')
const request = require('../../../utils/request')
const { SafeToast, SafeDialog } = require('../../../utils/error')
const datePickerBehavior = require('../../../behaviors/datePickerBehavior')

Page({
  behaviors: [datePickerBehavior],

  data: {
    userInfo: null,
    exportType: 'attendance', // attendance | summary | students

    // 日期范围
    dateRange: 'today', // today | week | month | custom
    startDate: '',
    endDate: '',

    // 筛选条件
    department: '',
    clubName: '',
    className: '',

    // 选项列表
    departments: [],
    clubs: [],
    classes: [],
    allClasses: [], // 所有班级原始列表
    classDeptMap: {}, // 班级到学部的映射

    // 选择器状态
    showDepartmentPicker: false,
    showClubPicker: false,
    showClassPicker: false,
    departmentColumns: [],
    clubColumns: [],
    classColumns: [],

    // 导出中
    exporting: false
  },

  onLoad() {
    this.initDatePicker()
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
      const { departments, clubs, classes, classDeptMap } = data

      // 转换为 picker columns 格式
      const departmentColumns = ['全部', ...(departments || [])]
      const clubColumns = ['全部', ...(clubs || [])]
      const classColumns = ['全部', ...(classes || [])]

      this.setData({
        departments,
        clubs,
        classes,
        allClasses: classes || [],
        classDeptMap: classDeptMap || {},
        departmentColumns,
        clubColumns,
        classColumns
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
    this.showDatePickerPopup('start', this.data.startDate)
  },

  onShowEndDatePicker() {
    this.showDatePickerPopup('end', this.data.endDate)
  },

  // 日期选择回调
  onDateChange(dateStr, dateType) {
    if (dateType === 'start') {
      this.setData({ startDate: dateStr })
    } else if (dateType === 'end') {
      this.setData({ endDate: dateStr })
    }
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

  // 选择筛选项 (picker confirm)
  onConfirmDepartment(e) {
    const value = e.detail.value
    const department = value === '全部' ? '' : value
    const { allClasses, classDeptMap } = this.data

    // 根据学部筛选班级列表
    let filteredClasses
    if (department) {
      filteredClasses = allClasses.filter(cls => classDeptMap[cls] === department)
      filteredClasses.sort((a, b) => a.localeCompare(b, 'zh-CN', { numeric: true }))
    } else {
      filteredClasses = allClasses
    }

    this.setData({
      department,
      className: '', // 重置班级选择
      classColumns: ['全部', ...filteredClasses],
      showDepartmentPicker: false
    })
  },

  onConfirmClub(e) {
    const value = e.detail.value
    this.setData({
      clubName: value === '全部' ? '' : value,
      showClubPicker: false
    })
  },

  onConfirmClass(e) {
    const value = e.detail.value
    this.setData({
      className: value === '全部' ? '' : value,
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
      SafeToast.fail('请选择日期范围')
      return
    }

    this.setData({ exporting: true })
    await SafeToast.loading({ message: '导出中...' })

    try {
      const result = await request.callApi('export', exportType, {
        startDate,
        endDate,
        department,
        clubName,
        className
      })

      SafeToast.clear()

      if (result.success) {
        const { tempFileURL, fileName, recordCount } = result.data

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
                success: async () => {
                  try {
                    await SafeDialog.confirm({
                      title: '导出成功',
                      message: `已导出 ${recordCount} 条记录\n文件：${fileName}`,
                      confirmButtonText: '打开文件'
                    })

                    wx.openDocument({
                      filePath,
                      fileType: 'xlsx',
                      fail: (err) => {
                        console.error('打开文件失败:', err)
                        SafeToast.fail('文件已保存，但打开失败')
                      }
                    })
                  } catch (e) {
                    // 用户取消
                  }
                },
                fail: (err) => {
                  console.error('保存文件失败:', err)
                  SafeToast.fail('保存文件失败')
                }
              })
            } else {
              SafeToast.fail('下载文件失败')
            }
          },
          fail: (err) => {
            console.error('下载文件失败:', err)
            SafeToast.fail('下载文件失败')
          }
        })
      } else {
        SafeToast.fail(result.message || '导出失败')
      }
    } catch (error) {
      SafeToast.clear()
      console.error('导出失败:', error)
      SafeToast.fail('导出失败')
    } finally {
      this.setData({ exporting: false })
    }
  }
})
