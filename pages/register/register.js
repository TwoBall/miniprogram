import Toast from '@vant/weapp/toast/toast'
const storage = require('../../utils/storage')

Page({
  data: {
    openid: '',
    name: '',
    roleIndex: 0,
    roleArray: ['社团老师', '班主任', '学部领导'],
    roleValues: ['teacher', 'classTeacher', 'leader'],
    // 已有的具体选项（用于过滤，而非过滤角色类型）
    existingClubs: [],
    existingClasses: [],
    existingDepartments: [],
    // 可选列表
    departments: [],
    allDepartments: [], // 未过滤的学部列表
    classes: [],
    allClasses: [],
    classDeptMap: {},
    clubs: [],
    // 选中值
    department: '',
    className: '',
    club: '',
    // 弹窗状态
    showRolePicker: false,
    showDepartmentPicker: false,
    showClassPicker: false,
    showClubPicker: false,
    // 提交状态
    submitting: false
  },

  /**
   * 页面加载
   * @param {Object} options - 页面参数
   */
  onLoad(options) {
    // 获取openid和已有的具体选项
    this.setData({
      openid: options.openid || '',
      existingClubs: options.existingClubs ? options.existingClubs.split(',') : [],
      existingClasses: options.existingClasses ? options.existingClasses.split(',') : [],
      existingDepartments: options.existingDepartments ? options.existingDepartments.split(',') : []
    })

    this.fetchOptions()
  },


  /**
   * 获取可选的学部、班级、社团列表
   * 优先使用缓存（24小时有效），减少云函数调用
   */
  async fetchOptions() {
    // 尝试从缓存读取
    const cached = storage.getWithCache(
      storage.STORAGE_KEYS.FILTER_OPTIONS,
      storage.STORAGE_KEYS.FILTER_OPTIONS_TIME,
      storage.CACHE_DURATION.ONE_DAY
    )

    if (cached) {
      console.log('使用筛选选项缓存')
      this.applyFilterOptions(cached)
      return
    }

    // 缓存不存在或过期，从云端获取
    try {
      const res = await wx.cloud.callFunction({
        name: 'students',
        data: { action: 'getFilterOptions' }
      })
      if (res.result.success) {
        // 存入缓存
        storage.setWithCache(
          storage.STORAGE_KEYS.FILTER_OPTIONS,
          storage.STORAGE_KEYS.FILTER_OPTIONS_TIME,
          res.result.data
        )
        this.applyFilterOptions(res.result.data)
      }
    } catch (error) {
      console.error('获取选项失败:', error)
    }
  },

  /**
   * 应用筛选选项到页面数据
   */
  applyFilterOptions(data) {
    const { existingClubs, existingClasses, existingDepartments } = this.data

    // 过滤掉已注册的具体选项
    let departments = data.departments || []
    let classes = data.classes || []
    let clubs = data.clubs || []
    const classDeptMap = data.classDeptMap || {}

    if (existingClubs && existingClubs.length > 0) {
      clubs = clubs.filter(c => !existingClubs.includes(c))
    }
    if (existingClasses && existingClasses.length > 0) {
      classes = classes.filter(c => !existingClasses.includes(c))
    }
    if (existingDepartments && existingDepartments.length > 0) {
      departments = departments.filter(d => !existingDepartments.includes(d))
    }

    // 班级按升序排列
    classes.sort((a, b) => a.localeCompare(b, 'zh-CN'))

    this.setData({
      departments,
      allDepartments: data.departments || [],
      classes,
      allClasses: classes,
      classDeptMap,
      clubs
    })
  },

  onNameInput(e) {
    this.setData({ name: e.detail })
  },

  // 弹窗控制
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

  // 班主任选择学部（级联选择）
  showClassTeacherDeptPickerPopup() {
    this.setData({ showClassTeacherDeptPicker: true })
  },
  onClassTeacherDeptPickerClose() {
    this.setData({ showClassTeacherDeptPicker: false })
  },
  onClassTeacherDeptPickerConfirm(e) {
    const dept = e.detail.value
    const { allClasses, existingClasses, classDeptMap } = this.data

    // 根据班级与学部的映射关系过滤（从数据库获取的真实数据）
    let filtered = allClasses.filter(cls => classDeptMap[cls] === dept)

    // 过滤掉已注册的班级
    if (existingClasses && existingClasses.length > 0) {
      filtered = filtered.filter(c => !existingClasses.includes(c))
    }

    // 升序排列
    filtered.sort((a, b) => a.localeCompare(b, 'zh-CN'))

    this.setData({
      classTeacherDept: dept,
      filteredClasses: filtered,
      className: '', // 清空已选班级
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
   * 验证输入并调用云函数创建注册申请
   */
  async handleRegister() {
    const { openid, name, roleIndex, roleValues, department, className, clubName } = this.data

    // 验证输入
    if (!name) {
      Toast.fail('请输入姓名')
      return
    }

    const role = roleValues[roleIndex]

    // 根据角色验证必填字段
    if (role === 'teacher' && !clubName) {
      Toast.fail('请选择社团名称')
      return
    }

    if (role === 'classTeacher' && !className) {
      Toast.fail('请选择班级')
      return
    }

    if (role === 'leader' && !department) {
      Toast.fail('请选择学部')
      return
    }

    this.setData({ loading: true })

    try {
      // 调用云函数进行注册
      const res = await wx.cloud.callFunction({
        name: 'user',
        data: {
          action: 'register',
          openid,
          name,
          role,
          department: role === 'leader' ? department : '',
          className: role === 'classTeacher' ? className : '',
          clubName: role === 'teacher' ? clubName : ''
        }
      })

      if (res.result.success) {
        Toast.success('注册申请已提交，请等待管理员审核')

        setTimeout(() => {
          wx.redirectTo({
            url: '/pages/login/login'
          })
        }, 2000)
      } else {
        Toast.fail(res.result.message || '注册失败')
      }
    } catch (error) {
      console.error('注册失败:', error)
      Toast.fail('注册失败，请重试')
    } finally {
      this.setData({ loading: false })
    }
  }
})
