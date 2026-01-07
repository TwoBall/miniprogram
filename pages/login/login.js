/**
 * @file 登录页面
 * @module pages/login/login
 */
const app = getApp()
const request = require('../../utils/request')
const storage = require('../../utils/storage')
const { SafeToast } = require('../../utils/error')

Page({
  data: {
    loading: false
  },

  /** 页面加载 */
  onLoad() {
    this.checkAutoLogin()
  },

  /**
   * 检查自动登录
   */
  async checkAutoLogin() {
    const userInfo = storage.getUserInfo()
    if (!userInfo || !userInfo.role || userInfo.status !== 'approved') {
      return
    }

    try {
      let sessionExpired = false
      try {
        await wx.checkSession()
      } catch {
        sessionExpired = true
      }

      if (sessionExpired) {
        storage.remove(storage.STORAGE_KEYS.USER_INFO)
        storage.remove(storage.STORAGE_KEYS.ALL_USER_ROLES)
        return
      }

      const result = await request.callApi('user', 'login', {}, {
        showLoading: false,
        showError: false
      })

      if (result.success && result.status === 'approved' && result.userList?.length > 0) {
        storage.set(storage.STORAGE_KEYS.ALL_USER_ROLES, result.userList)
        const currentRole = result.userList.find(u => u.role === userInfo.role) || result.userList[0]
        storage.setUserInfo(currentRole)
        app.globalData.userInfo = currentRole
        this.redirectByRole(currentRole.role)
      } else {
        storage.remove(storage.STORAGE_KEYS.USER_INFO)
        storage.remove(storage.STORAGE_KEYS.ALL_USER_ROLES)
      }
    } catch (error) {
      console.error('自动登录验证失败:', error)
      storage.remove(storage.STORAGE_KEYS.USER_INFO)
      storage.remove(storage.STORAGE_KEYS.ALL_USER_ROLES)
    }
  },

  /**
   * 处理微信登录
   */
  async handleWxLogin() {
    if (this.data.loading) return
    this.setData({ loading: true })

    try {
      const loginRes = await wx.login()

      if (!loginRes.code) {
        SafeToast.fail('微信登录失败')
        this.setData({ loading: false })
        return
      }

      const result = await request.callApi('user', 'login', {}, {
        showLoading: false,
        showError: false
      })

      if (!result.success) {
        SafeToast.fail(result.message || '登录失败')
        this.setData({ loading: false })
        return
      }

      if (result.needRegister) {
        SafeToast.fail('未找到账号，即将跳转注册')
        setTimeout(() => {
          wx.redirectTo({ url: `/pages/register/register?openid=${result.openid}` })
        }, 1500)
        return
      }

      if (result.status === 'pending') {
        SafeToast.fail(result.message || '申请正在审核中')
        this.setData({ loading: false })
        return
      }

      if (result.status === 'approved') {
        const userList = result.userList || []
        if (userList.length === 0) {
          SafeToast.fail('未找到有效的角色记录')
          this.setData({ loading: false })
          return
        }

        storage.set(storage.STORAGE_KEYS.ALL_USER_ROLES, userList)
        this.loginSuccess(userList[0])
      }
    } catch (error) {
      console.error('登录失败:', error)
      SafeToast.fail('登录失败，请重试')
      this.setData({ loading: false })
    }
  },

  /**
   * 登录成功处理
   * @param {Object} userInfo - 用户信息对象
   */
  loginSuccess(userInfo) {
    storage.setUserInfo(userInfo)
    app.globalData.userInfo = userInfo
    app.globalData.userRole = userInfo.role

    SafeToast.success('登录成功')

    setTimeout(() => {
      this.redirectByRole(userInfo.role)
    }, 1500)
  },

  /**
   * 根据角色跳转到对应页面
   * @param {string} role - 用户角色
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
  }
})
