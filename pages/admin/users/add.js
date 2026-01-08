const app = getApp()
const storage = require('../../../utils/storage')
const request = require('../../../utils/request')
const { SafeToast } = require('../../../utils/error')

Page({
  data: {
    mode: 'add', // add or edit
    userId: '',

    formData: {
      userName: '',
      role: 'teacher',
      department: '',
      className: '',
      clubName: ''
    },

    roleLabel: '社团老师', // 默认角色标签

    roleOptions: [
      { name: '社团老师', value: 'teacher' },
      { name: '班主任', value: 'classTeacher' },
      { name: '学部领导', value: 'leader' }
    ],

    departmentOptions: [], // 从数据库获取
    classOptions: [], // 从数据库获取
    allClasses: [], // 所有班级原始数据
    classDeptMap: {}, // 班级到学部的映射
    clubOptions: [], // 从数据库获取

    showRolePicker: false,
    showDepartmentPicker: false,
    showClassPicker: false,
    showClubPicker: false,
    submitting: false // 防重复提交
  },

  onLoad(options) {
    // 获取筛选选项（学部、班级、社团）
    this.fetchFilterOptions()

    if (options.id) {
      this.setData({
        mode: 'edit',
        userId: options.id
      })
      this.loadUserData(options.id)
    }
  },

  /**
   * 获取筛选选项（学部、班级、社团）
   */
  async fetchFilterOptions() {
    // 尝试从缓存读取
    const cached = storage.getWithCache(
      storage.STORAGE_KEYS.FILTER_OPTIONS,
      storage.STORAGE_KEYS.FILTER_OPTIONS_TIME,
      storage.CACHE_DURATION.ONE_DAY
    )

    if (cached) {
      this.applyFilterOptions(cached)
      return
    }

    // 从云端获取
    try {
      const result = await request.callApi('students', 'getFilterOptions', {})

      if (result.success && result.data) {
        // 存入缓存
        storage.setWithCache(
          storage.STORAGE_KEYS.FILTER_OPTIONS,
          storage.STORAGE_KEYS.FILTER_OPTIONS_TIME,
          result.data
        )
        this.applyFilterOptions(result.data)
      }
    } catch (error) {
      console.error('获取筛选选项失败:', error)
      // 使用默认值
      this.applyFilterOptions({
        departments: ['小学部', '初中部', '高中部'],
        classes: [],
        clubs: []
      })
    }
  },

  /**
   * 应用筛选选项到 action-sheet 格式
   */
  applyFilterOptions(data) {
    const toOptions = (list) => (list || []).map(item => ({
      name: item,
      value: item
    }))

    this.setData({
      departmentOptions: toOptions(data.departments),
      allClasses: data.classes || [],
      classDeptMap: data.classDeptMap || {},
      classOptions: toOptions(data.classes),
      clubOptions: toOptions(data.clubs)
    })
  },

  async loadUserData(userId) {
    try {
      await SafeToast.loading({ message: '加载中...' })

      const result = await request.callApi('user', 'getAll', {
        page: 1,
        pageSize: 100
      })

      SafeToast.clear()

      if (result.success) {
        const user = result.data.find(u => u._id === userId)
        if (user) {
          const role = user.role || 'teacher'
          this.setData({
            formData: {
              userName: user.userName || '',
              role,
              department: user.department || '',
              className: user.className || '',
              clubName: user.clubName || ''
            },
            roleLabel: this.getRoleLabel(role)
          })
        }
      }
    } catch (error) {
      SafeToast.clear()
      SafeToast.fail('加载失败')
    }
  },

  onNameInput(e) {
    this.setData({
      'formData.userName': e.detail || ''
    })
  },

  showRolePicker() {
    this.setData({ showRolePicker: true })
  },

  onRoleConfirm(e) {
    const role = e.detail.value
    const roleLabel = this.getRoleLabel(role)
    this.setData({
      'formData.role': role,
      roleLabel,
      showRolePicker: false
    })
  },

  onRoleCancel() {
    this.setData({ showRolePicker: false })
  },

  showDepartmentPicker() {
    this.setData({ showDepartmentPicker: true })
  },

  onDepartmentConfirm(e) {
    const department = e.detail.value
    const { formData, allClasses, classDeptMap } = this.data

    // 班主任选择学部后，筛选对应班级
    if (formData.role === 'classTeacher') {
      const filtered = allClasses.filter(cls => classDeptMap[cls] === department)
      filtered.sort((a, b) => a.localeCompare(b, 'zh-CN', { numeric: true }))
      const toOptions = (list) => list.map(item => ({ name: item, value: item }))

      this.setData({
        'formData.department': department,
        'formData.className': '', // 重置班级选择
        classOptions: toOptions(filtered),
        showDepartmentPicker: false
      })
    } else {
      this.setData({
        'formData.department': department,
        showDepartmentPicker: false
      })
    }
  },

  onDepartmentCancel() {
    this.setData({ showDepartmentPicker: false })
  },

  showClassPicker() {
    this.setData({ showClassPicker: true })
  },

  onClassConfirm(e) {
    const className = e.detail.value
    this.setData({
      'formData.className': className,
      showClassPicker: false
    })
  },

  onClassCancel() {
    this.setData({ showClassPicker: false })
  },

  showClubPicker() {
    this.setData({ showClubPicker: true })
  },

  onClubConfirm(e) {
    const clubName = e.detail.value
    this.setData({
      'formData.clubName': clubName,
      showClubPicker: false
    })
  },

  onClubCancel() {
    this.setData({ showClubPicker: false })
  },

  getRoleLabel(role) {
    const option = this.data.roleOptions.find(opt => opt.value === role)
    return option ? option.name : role
  },

  validateForm() {
    const { userName, role, department, className, clubName } = this.data.formData

    if (!userName || !userName.trim()) {
      SafeToast.fail('请输入姓名')
      return false
    }

    if (role === 'leader' && !department) {
      SafeToast.fail('学部领导必须选择学部')
      return false
    }

    if (role === 'classTeacher' && !department) {
      SafeToast.fail('班主任必须先选择学部')
      return false
    }

    if (role === 'classTeacher' && !className) {
      SafeToast.fail('班主任必须选择班级')
      return false
    }

    if (role === 'teacher' && !clubName) {
      SafeToast.fail('社团老师必须选择社团')
      return false
    }

    return true
  },

  async submitForm() {
    if (!this.validateForm()) {
      return
    }

    // 防止重复提交
    if (this.data.submitting) return
    this.setData({ submitting: true })

    const { mode, userId, formData } = this.data

    try {
      await SafeToast.loading({ message: mode === 'add' ? '添加中...' : '更新中...' })

      let result
      if (mode === 'add') {
        result = await request.callApi('user', 'add', formData)
      } else {
        result = await request.callApi('user', 'update', {
          userId,
          updates: formData
        })
      }

      SafeToast.clear()

      if (result.success) {
        SafeToast.success(mode === 'add' ? '添加成功' : '更新成功')

        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      } else {
        throw new Error(result.message)
      }
    } catch (error) {
      SafeToast.clear()
      SafeToast.fail(error.message || '操作失败')
    } finally {
      this.setData({ submitting: false })
    }
  },

  cancel() {
    wx.navigateBack()
  }
})
