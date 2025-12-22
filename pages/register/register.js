const db = wx.cloud.database()
import Toast from '@vant/weapp/toast/toast'

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
    isAddingRole: false, // 是否是添加新身份模式
    showRolePicker: false,
    department: '',
    className: '',
    clubName: '',
    // 班主任选择学部（级联选择）
    classTeacherDept: '',
    showClassTeacherDeptPicker: false,
    loading: false,
    // 选项列表
    departments: [],
    classes: [],
    allClasses: [], // 全部班级（用于级联过滤）
    filteredClasses: [], // 根据学部过滤后的班级
    clubs: [],
    // 弹窗控制
    showDeptPicker: false,
    showClassPicker: false,
    showClubPicker: false
  },

  onLoad(options) {
    // 从登录页面或角色管理页面传递过来的 openid
    if (options.openid) {
      this.setData({ openid: options.openid })
    } else {
      // 如果没有 openid，返回登录页
      Toast.fail('请先登录')
      setTimeout(() => {
        wx.redirectTo({
          url: '/pages/login/login'
        })
      }, 1500)
      return
    }

    // 处理已有的具体社团、班级、学部（用于过滤选项列表）
    const existingClubs = options.existingClubs ? options.existingClubs.split(',').filter(r => r) : []
    const existingClasses = options.existingClasses ? options.existingClasses.split(',').filter(r => r) : []
    const existingDepartments = options.existingDepartments ? options.existingDepartments.split(',').filter(r => r) : []

    if (existingClubs.length > 0 || existingClasses.length > 0 || existingDepartments.length > 0) {
      this.setData({
        existingClubs,
        existingClasses,
        existingDepartments,
        isAddingRole: true
      })
    }

    this.fetchOptions()
  },


  async fetchOptions() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'students',
        data: { action: 'getFilterOptions' }
      })
      if (res.result.success) {
        const { existingClubs, existingClasses, existingDepartments } = this.data

        // 过滤掉已注册的具体选项
        let departments = res.result.data.departments || []
        let classes = res.result.data.classes || []
        let clubs = res.result.data.clubs || []
        const classDeptMap = res.result.data.classDeptMap || {}

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
          allDepartments: res.result.data.departments || [], // 未过滤的学部列表（班主任用）
          classes,
          allClasses: classes, // 保存全部班级用于级联过滤
          classDeptMap, // 班级与学部的对应关系
          clubs
        })
      }
    } catch (e) {
      console.error('获取选项失败', e)
    }
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

  async handleRegister() {
    const { openid, name, roleIndex, roleValues, department, className, clubName } = this.data

    // 验证输入
    if (!name) {
      Toast.fail('请输入姓名')
      return
    }

    const role = availableRoleValues[roleIndex]

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
