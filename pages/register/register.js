/**
 * @file 注册页面
 * @module pages/register/register
 */
const { SafeToast } = require('../../utils/error')
const storage = require('../../utils/storage')
const request = require('../../utils/request')

Page({
  data: {
    openid: '',
    name: '',
    roleIndex: 0,
    roleArray: ['社团老师', '班主任', '学部领导'],
    roleValues: ['teacher', 'classTeacher', 'leader'],
    existingRoles: [],
    departments: [],
    allDepartments: [],
    classes: [],
    allClasses: [],
    classDeptMap: {},
    clubs: [],
    department: '',
    className: '',
    club: '',
    showRolePicker: false,
    showDeptPicker: false,
    showClassPicker: false,
    showClubPicker: false,
    submitting: false
  },

  /**
   * 页面加载
   * @param {Object} options - 页面参数
   */
  onLoad(options) {
    const existingRoles = options.existingRoles ? options.existingRoles.split(',') : []

    const allRoleArray = ['社团老师', '班主任', '学部领导']
    const allRoleValues = ['teacher', 'classTeacher', 'leader']

    const filteredRoleArray = []
    const filteredRoleValues = []
    allRoleValues.forEach((role, index) => {
      if (!existingRoles.includes(role)) {
        filteredRoleArray.push(allRoleArray[index])
        filteredRoleValues.push(role)
      }
    })

    this.setData({
      openid: options.openid || '',
      existingRoles,
      roleArray: filteredRoleArray,
      roleValues: filteredRoleValues,
      roleIndex: 0
    })

    this.fetchOptions()
  },

  /**
   * 获取可选的学部、班级、社团列表
   */
  async fetchOptions() {
    const cached = storage.getWithCache(
      storage.STORAGE_KEYS.FILTER_OPTIONS,
      storage.STORAGE_KEYS.FILTER_OPTIONS_TIME,
      storage.CACHE_DURATION.ONE_DAY
    )

    if (cached && cached.departments && cached.departments.length > 0) {
      this.applyFilterOptions(cached)
      return
    }

    try {
      const result = await request.callCloud('students', { action: 'getFilterOptions' }, {
        showLoading: false,
        showError: false
      })
      if (result.success && result.data) {
        storage.setWithCache(
          storage.STORAGE_KEYS.FILTER_OPTIONS,
          storage.STORAGE_KEYS.FILTER_OPTIONS_TIME,
          result.data
        )
        this.applyFilterOptions(result.data)
      }
    } catch (error) {
      console.error('获取选项失败:', error)
    }
  },

  /**
   * 应用筛选选项到页面数据
   * @param {Object} data - 筛选选项数据
   */
  applyFilterOptions(data) {
    const departments = data.departments || []
    const classes = data.classes || []
    const clubs = data.clubs || []
    const classDeptMap = data.classDeptMap || {}

    classes.sort((a, b) => a.localeCompare(b, 'zh-CN', { numeric: true }))

    this.setData({
      departments,
      allDepartments: departments,
      classes,
      allClasses: classes,
      classDeptMap,
      clubs
    })
  },

  onNameInput(e) {
    this.setData({ name: e.detail })
  },

  showRolePickerPopup() { this.setData({ showRolePicker: true }) },
  onRolePickerClose() { this.setData({ showRolePicker: false }) },
  onRolePickerConfirm(e) {
    this.setData({
      roleIndex: e.detail.index,
      showRolePicker: false
    })
  },

  showDeptPickerPopup() { this.setData({ showDeptPicker: true }) },
  onDeptPickerClose() { this.setData({ showDeptPicker: false }) },
  onDeptPickerConfirm(e) {
    this.setData({ department: e.detail.value, showDeptPicker: false })
  },

  showClassTeacherDeptPickerPopup() {
    this.setData({ showClassTeacherDeptPicker: true })
  },
  onClassTeacherDeptPickerClose() {
    this.setData({ showClassTeacherDeptPicker: false })
  },
  onClassTeacherDeptPickerConfirm(e) {
    const dept = e.detail.value
    const { allClasses, classDeptMap } = this.data

    const filtered = allClasses.filter(cls => classDeptMap[cls] === dept)
    filtered.sort((a, b) => a.localeCompare(b, 'zh-CN', { numeric: true }))

    this.setData({
      classTeacherDept: dept,
      filteredClasses: filtered,
      className: '',
      showClassTeacherDeptPicker: false
    })
  },

  showClassPickerPopup() { this.setData({ showClassPicker: true }) },
  onClassPickerClose() { this.setData({ showClassPicker: false }) },
  onClassPickerConfirm(e) {
    this.setData({ className: e.detail.value, showClassPicker: false })
  },

  showClubPickerPopup() { this.setData({ showClubPicker: true }) },
  onClubPickerClose() { this.setData({ showClubPicker: false }) },
  onClubPickerConfirm(e) {
    this.setData({ clubName: e.detail.value, showClubPicker: false })
  },

  /**
   * 处理注册提交
   */
  async handleRegister() {
    const { openid, name, roleIndex, roleValues, department, className, clubName } = this.data

    if (!name) {
      SafeToast.fail('请输入姓名')
      return
    }

    const role = roleValues[roleIndex]

    if (role === 'teacher' && !clubName) {
      SafeToast.fail('请选择社团名称')
      return
    }

    if (role === 'classTeacher' && !className) {
      SafeToast.fail('请选择班级')
      return
    }

    if (role === 'leader' && !department) {
      SafeToast.fail('请选择学部')
      return
    }

    this.setData({ loading: true })

    try {
      const result = await request.callCloud('user', {
        action: 'register',
        openid,
        name,
        role,
        department: role === 'leader' ? department : '',
        className: role === 'classTeacher' ? className : '',
        clubName: role === 'teacher' ? clubName : ''
      }, { showLoading: false, showError: false })

      if (result.success) {
        SafeToast.success('注册申请已提交，请等待管理员审核')

        setTimeout(() => {
          wx.redirectTo({
            url: '/pages/login/login'
          })
        }, 2000)
      } else {
        SafeToast.fail(result.message || '注册失败')
      }
    } catch (error) {
      console.error('注册失败:', error)
      SafeToast.fail('注册失败，请重试')
    } finally {
      this.setData({ loading: false })
    }
  }
})
