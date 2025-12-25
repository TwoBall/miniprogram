const app = getApp()

Page({
  data: {
    mode: 'add', // add or edit
    userId: '',

    formData: {
      name: '',
      role: 'teacher',
      department: '',
      className: '',
      clubName: ''
    },

    roleOptions: [
      { value: 'teacher', label: '社团老师' },
      { value: 'classTeacher', label: '班主任' },
      { value: 'leader', label: '学部领导' }
    ],

    departmentOptions: [
      { value: '小学部', label: '小学部' },
      { value: '初中部', label: '初中部' },
      { value: '高中部', label: '高中部' }
    ],

    showRolePicker: false,
    showDepartmentPicker: false
  },

  onLoad(options) {
    if (options.id) {
      this.setData({
        mode: 'edit',
        userId: options.id
      })
      this.loadUserData(options.id)
    }
  },

  async loadUserData(userId) {
    try {
      wx.showLoading({ title: '加载中...' })

      const res = await wx.cloud.callFunction({
        name: 'user',
        data: {
          action: 'getAll',
          page: 1,
          pageSize: 100
        }
      })

      wx.hideLoading()

      if (res.result.success) {
        const user = res.result.data.find(u => u._id === userId)
        if (user) {
          this.setData({
            formData: {
              name: user.name || '',
              role: user.role || 'teacher',
              department: user.department || '',
              className: user.className || '',
              clubName: user.clubName || ''
            }
          })
        }
      }
    } catch (error) {
      wx.hideLoading()
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }
  },

  onNameInput(e) {
    this.setData({
      'formData.name': e.detail.value
    })
  },

  showRolePicker() {
    this.setData({ showRolePicker: true })
  },

  onRoleConfirm(e) {
    const role = e.detail.value
    this.setData({
      'formData.role': role,
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
    this.setData({
      'formData.department': department,
      showDepartmentPicker: false
    })
  },

  onDepartmentCancel() {
    this.setData({ showDepartmentPicker: false })
  },

  onClassInput(e) {
    this.setData({
      'formData.className': e.detail.value
    })
  },

  onClubInput(e) {
    this.setData({
      'formData.clubName': e.detail.value
    })
  },

  getRoleLabel(role) {
    const option = this.data.roleOptions.find(opt => opt.value === role)
    return option ? option.label : role
  },

  validateForm() {
    const { name, role, department, className, clubName } = this.data.formData

    if (!name.trim()) {
      wx.showToast({
        title: '请输入姓名',
        icon: 'none'
      })
      return false
    }

    if (role === 'leader' && !department) {
      wx.showToast({
        title: '学部领导必须选择学部',
        icon: 'none'
      })
      return false
    }

    if (role === 'classTeacher' && !className) {
      wx.showToast({
        title: '班主任必须填写班级',
        icon: 'none'
      })
      return false
    }

    if (role === 'teacher' && !clubName) {
      wx.showToast({
        title: '社团老师必须填写社团名称',
        icon: 'none'
      })
      return false
    }

    return true
  },

  async submitForm() {
    if (!this.validateForm()) {
      return
    }

    const { mode, userId, formData } = this.data

    try {
      wx.showLoading({ title: mode === 'add' ? '添加中...' : '更新中...' })

      const data = {
        action: mode === 'add' ? 'add' : 'update',
        ...formData
      }

      if (mode === 'edit') {
        data.userId = userId
        data.updates = formData
      }

      const res = await wx.cloud.callFunction({
        name: 'user',
        data
      })

      wx.hideLoading()

      if (res.result.success) {
        wx.showToast({
          title: mode === 'add' ? '添加成功' : '更新成功',
          icon: 'success'
        })

        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      } else {
        throw new Error(res.result.message)
      }
    } catch (error) {
      wx.hideLoading()
      wx.showToast({
        title: error.message || '操作失败',
        icon: 'none'
      })
    }
  },

  cancel() {
    wx.navigateBack()
  }
})
