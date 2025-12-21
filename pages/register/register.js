const db = wx.cloud.database()
import Toast from '@vant/weapp/toast/toast'

Page({
  data: {
    openid: '',
    name: '',
    roleIndex: 0,
    roleArray: ['社团老师', '班主任', '学部领导'],
    roleValues: ['teacher', 'classTeacher', 'leader'],
    showRolePicker: false,
    department: '',
    className: '',
    clubName: '',
    loading: false,
    // 选项列表
    departments: [],
    classes: [],
    clubs: [],
    // 弹窗控制
    showDeptPicker: false,
    showClassPicker: false,
    showClubPicker: false
  },

  onLoad(options) {
    // 从登录页面传递过来的 openid
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
        this.setData({
          departments: res.result.data.departments,
          classes: res.result.data.classes,
          clubs: res.result.data.clubs
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

    const role = roleValues[roleIndex]

    // 根据角色验证必填字段
    if (role === 'teacher' && !clubName) {
      Toast.fail('请输入社团名称')
      return
    }

    if (role === 'classTeacher' && !className) {
      Toast.fail('请输入班级')
      return
    }

    if (role === 'leader' && !department) {
      Toast.fail('请输入学部')
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
