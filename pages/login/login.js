const app = getApp()
import Toast from '@vant/weapp/toast/toast'

Page({
  data: {
    loading: false
  },

  async handleWxLogin() {
    if (this.data.loading) return
    this.setData({ loading: true })

    try {
      const loginRes = await wx.login()

      if (!loginRes.code) {
        Toast.fail('微信登录失败')
        this.setData({ loading: false })
        return
      }

      const cloudRes = await wx.cloud.callFunction({
        name: 'user',
        data: { action: 'login' }
      })

      const result = cloudRes.result
      console.log('Login Result:', result) // 增加调试日志

      if (!result.success) {
        Toast.fail(result.message || '登录失败')
        this.setData({ loading: false })
        return
      }

      if (result.needRegister) {
        // 如果没找到账号，显式告知当前的 openid，方便排查导入问题
        console.warn('No user found for openid:', result.openid)
        Toast(`未找到账号，当前OpenID: ${result.openid.substring(0, 8)}...`)

        setTimeout(() => {
          wx.redirectTo({ url: `/pages/register/register?openid=${result.openid}` })
        }, 2000)
        return
      }

      if (result.status === 'pending') {
        Toast.fail(result.message || '申请正在审核中')
        this.setData({ loading: false })
        return
      }

      if (result.status === 'approved') {
        const userList = result.userList || []
        if (userList.length === 0) {
          Toast.fail('未找到有效的角色记录')
          this.setData({ loading: false })
          return
        }

        // 保存所有角色到 storage（供角色切换页面使用）
        wx.setStorageSync('allUserRoles', userList)

        // 使用第一个角色登录（可在角色切换页面切换）
        this.loginSuccess(userList[0])
      }
    } catch (error) {
      console.error('登录失败:', error)
      Toast.fail('登录失败，请重试')
      this.setData({ loading: false })
    }
  },

  loginSuccess(userInfo) {
    // 保存用户信息
    wx.setStorageSync('userInfo', userInfo)
    app.globalData.userInfo = userInfo
    app.globalData.userRole = userInfo.role

    Toast.success('登录成功')

    // 根据角色跳转到不同页面
    setTimeout(() => {
      this.redirectByRole(userInfo.role)
    }, 1500)
  },

  redirectByRole(role) {
    const routes = {
      'admin': '/pages/admin/approval/approval',
      'teacher': '/pages/teacher/attendance/attendance',
      'classTeacher': '/pages/classTeacher/overview/overview',
      'leader': '/pages/leader/dashboard/dashboard'
    }

    wx.reLaunch({
      url: routes[role] || '/pages/teacher/attendance/attendance'
    })
  }
})
