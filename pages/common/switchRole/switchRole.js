// input: 用户已登录的角色列表（从storage或云端获取）
// output: 角色切换、跳转到对应角色首页
// pos: 页面层 > 公共模块 > 角色切换

const app = getApp()
const auth = require('../../../utils/auth')
const storage = require('../../../utils/storage')
const request = require('../../../utils/request')
const { SafeToast } = require('../../../utils/error')

Page({
  data: {
    roles: [],
    currentRole: null,
    loading: true,
    hasMultipleRoles: false
  },

  /**
     * 页面加载
     */
  onLoad() {
    this.loadRoles()
  },

  onShow() {
    // 检查是否有登录信息，没有则跳转登录页
    const userInfo = auth.getUserInfo()
    const allRoles = auth.getAllUserRoles()
    if (!userInfo && allRoles.length === 0) {
      wx.reLaunch({ url: '/pages/login/login' })
      return
    }

    // 每次显示时刷新，因为可能刚注册了新角色
    this.loadRoles()
  },

  /**
     * 加载用户的所有角色
     */
  loadRoles() {
    const userInfo = auth.getUserInfo()
    const allRoles = auth.getAllUserRoles()

    // 如果 storage 没有角色列表，从云端获取
    if (allRoles.length === 0) {
      this.fetchRolesFromCloud()
      return
    }

    const roleLabels = {
      'admin': '系统管理员',
      'teacher': '社团老师',
      'classTeacher': '班主任',
      'leader': '学部领导'
    }

    const roles = allRoles.map(r => ({
      ...r,
      roleLabel: roleLabels[r.role] || r.role,
      isCurrent: userInfo && userInfo._id === r._id,
      extraInfo: r.clubName || r.className || r.department || ''
    }))

    this.setData({
      roles,
      currentRole: userInfo,
      loading: false,
      hasMultipleRoles: roles.length > 1
    })
  },

  /**
     * 从云端获取角色列表
     */
  async fetchRolesFromCloud() {
    try {
      const result = await request.callCloud('user', { action: 'login' }, {
        showLoading: false,
        showError: false
      })

      if (result.success && result.userList) {
        storage.set(storage.STORAGE_KEYS.ALL_USER_ROLES, result.userList)
        this.loadRoles()
      } else {
        this.setData({ loading: false })
        SafeToast.fail('获取角色失败')
      }
    } catch (error) {
      console.error('获取角色失败:', error)
      this.setData({ loading: false })
      SafeToast.fail('获取角色失败')
    }
  },

  /**
     * 切换角色
     */
  switchRole(e) {
    const role = e.currentTarget.dataset.role

    if (role._id === this.data.currentRole?._id) {
      Toast('当前已是该身份')
      return
    }

    // 切换角色
    storage.set(storage.STORAGE_KEYS.USER_INFO, role)
    app.globalData.userInfo = role
    app.globalData.userRole = role.role

    SafeToast.success('切换成功')

    // 跳转到对应页面
    setTimeout(() => {
      this.redirectByRole(role.role)
    }, 1000)
  },

  /**
     * 根据角色跳转到对应页面
     */
  redirectByRole(role) {
    const routes = {
      'admin': '/pages/admin/home/home',
      'teacher': '/pages/teacher/attendance/attendance',
      'classTeacher': '/pages/classTeacher/overview/overview',
      'leader': '/pages/leader/dashboard/dashboard'
    }

    wx.reLaunch({
      url: routes[role] || '/pages/teacher/attendance/attendance'
    })
  },

  /**
     * 添加新角色
     * 跳转到注册页面，传递已有的角色类型用于过滤（每种角色只能注册一个）
     */
  addNewRole() {
    const roles = this.data.roles
    // 获取已有的角色类型（与后端逻辑一致：每种角色类型只能有一个）
    const existingRoles = [...new Set(roles.map(r => r.role))]
    const openid = roles[0]?._openid || ''

    let url = `/pages/register/register?openid=${openid}`
    if (existingRoles.length > 0) {
      url += `&existingRoles=${existingRoles.join(',')}`
    }

    wx.navigateTo({ url })
  },

  goBack() {
    wx.navigateBack()
  }
})
