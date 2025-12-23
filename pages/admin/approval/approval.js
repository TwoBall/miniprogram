const app = getApp()
import Toast from '@vant/weapp/toast/toast'
import Dialog from '@vant/weapp/dialog/dialog'

Page({
  data: {
    activeTab: 0,
    pendingUsers: [],
    approvedUsers: [],
    rejectedUsers: [],
    loading: false,
    showRejectDialog: false,
    currentUser: null,
    rejectReason: ''
  },

  /**
   * 页面加载
   */
  onLoad() {
    this.checkAuth()
    this.loadUsers()
  },

  onShow() {
    this.loadUsers()
  },

  /**
   * 页面下拉刷新
   */
  async onPullDownRefresh() {
    await this.loadUsers()
    wx.stopPullDownRefresh()
  },

  /**
   * 检查管理员权限
   */
  checkAuth() {
    const userInfo = wx.getStorageSync('userInfo')
    if (!userInfo || userInfo.role !== 'admin') {
      Toast.fail('无权限访问')
      setTimeout(() => {
        wx.reLaunch({
          url: '/pages/login/login'
        })
      }, 1500)
    }
  },

  /**
   * 跳转到角色切换页面
   */
  goToSwitchRole() {
    wx.navigateTo({
      url: '/pages/common/switchRole/switchRole'
    })
  },

  onTabChange(e) {
    this.setData({
      activeTab: e.detail.index
    })
  },

  /**
   * 加载用户列表
   */
  async loadUsers() {
    this.setData({ loading: true })

    try {
      Toast.loading({
        message: '加载中...',
        forbidClick: true,
        duration: 0
      })

      // 获取所有用户
      const res = await wx.cloud.callFunction({
        name: 'user',
        data: {
          action: 'getPending',
          status: 'all'
        }
      })

      if (res.result.success) {
        const users = res.result.data

        // 分类用户
        const pendingUsers = users.filter(u => u.status === 'pending')
        const approvedUsers = users.filter(u => u.status === 'approved')
        const rejectedUsers = users.filter(u => u.status === 'rejected')

        this.setData({
          pendingUsers,
          approvedUsers,
          rejectedUsers
        })
      } else {
        Toast.fail('加载失败')
      }
    } catch (error) {
      console.error('加载用户列表失败:', error)
      Toast.fail('加载失败')
    } finally {
      Toast.clear()
      this.setData({ loading: false })
    }
  },

  /**
   * 处理审批通过
   */
  handleApprove(e) {
    const user = e.currentTarget.dataset.user

    Dialog.confirm({
      title: '确认通过',
      message: `确定通过 ${user.name} 的注册申请吗？`
    }).then(() => {
      this.doApprove(user._id)
    }).catch(() => {
      // 用户取消
    })
  },

  /**
   * 处理审批拒绝
   */
  handleReject(e) {
    const user = e.currentTarget.dataset.user

    this.setData({
      showRejectDialog: true,
      currentUser: user,
      rejectReason: ''
    })
  },

  onRejectReasonInput(e) {
    this.setData({
      rejectReason: e.detail
    })
  },

  closeRejectDialog() {
    this.setData({
      showRejectDialog: false,
      currentUser: null,
      rejectReason: ''
    })
  },

  confirmReject() {
    const { currentUser, rejectReason } = this.data

    if (!rejectReason || rejectReason.trim() === '') {
      Toast.fail('请输入拒绝原因')
      return
    }

    this.doReject(currentUser._id, rejectReason)
    this.closeRejectDialog()
  },

  /**
   * 执行审批通过操作
   */
  async doApprove(userId) {
    Toast.loading({
      message: '处理中...',
      forbidClick: true,
      duration: 0
    })

    try {
      const res = await wx.cloud.callFunction({
        name: 'user',
        data: {
          action: 'approve',
          userId
        }
      })

      if (res.result.success) {
        Toast.success('审批通过')
        setTimeout(() => {
          this.loadUsers()
        }, 1500)
      } else {
        Toast.fail(res.result.message || '操作失败')
      }
    } catch (error) {
      console.error('审批失败:', error)
      Toast.fail('操作失败')
    }
  },

  /**
   * 执行审批拒绝操作
   */
  async doReject(userId, rejectReason) {
    Toast.loading({
      message: '处理中...',
      forbidClick: true,
      duration: 0
    })

    try {
      const res = await wx.cloud.callFunction({
        name: 'user',
        data: {
          action: 'reject',
          userId,
          rejectReason
        }
      })

      if (res.result.success) {
        Toast.success('已拒绝')
        setTimeout(() => {
          this.loadUsers()
        }, 1500)
      } else {
        Toast.fail(res.result.message || '操作失败')
      }
    } catch (error) {
      console.error('拒绝失败:', error)
      Toast.fail('操作失败')
    }
  },

  /**
   * 格式化时间
   */
  formatTime(date) {
    if (!date) return ''
    const d = new Date(date)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }
})
