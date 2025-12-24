const _app = getApp()
const auth = require('../../../utils/auth')
const _dateUtil = require('../../../utils/date')
import Toast from '@vant/weapp/toast/toast'
import Dialog from '@vant/weapp/dialog/dialog'

Page({
  data: {
    activeTab: 0,
    pendingUsers: [],
    approvedUsers: [],
    rejectedUsers: [],
    loading: false,
    pageLoading: true,
    showRejectDialog: false,
    currentUser: null,
    rejectReason: '',
    // 分页相关 - 已通过列表
    approvedPage: 1,
    approvedHasMore: true,
    approvedLoading: false,
    // 分页相关 - 已拒绝列表
    rejectedPage: 1,
    rejectedHasMore: true,
    rejectedLoading: false,
    // 通用分页配置
    pageSize: 20
  },

  /**
   * 页面加载
   */
  onLoad() {
    auth.checkRole('admin')
    this.loadAllTabs()
  },

  onShow() {
    this.loadAllTabs()
  },

  /**
   * 页面下拉刷新
   */
  async onPullDownRefresh() {
    await this.loadAllTabs(true)
    wx.stopPullDownRefresh()
  },

  /**
   * 上拉触底加载更多
   */
  async onReachBottom() {
    const { activeTab } = this.data

    if (activeTab === 1) {
      // 已通过列表
      await this.loadMoreApproved()
    } else if (activeTab === 2) {
      // 已拒绝列表
      await this.loadMoreRejected()
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
   * 加载所有标签页数据
   * @param {boolean} forceRefresh - 是否强制刷新
   */
  async loadAllTabs(forceRefresh = false) {
    this.setData({ pageLoading: true })

    try {
      Toast.loading({
        message: '加载中...',
        forbidClick: true,
        duration: 0
      })

      // 重置分页状态
      if (forceRefresh) {
        this.setData({
          approvedPage: 1,
          approvedHasMore: true,
          rejectedPage: 1,
          rejectedHasMore: true
        })
      }

      // 并行加载三个列表的首页数据
      const [pendingRes, approvedRes, rejectedRes] = await Promise.all([
        wx.cloud.callFunction({
          name: 'user',
          data: { action: 'getPending', status: 'pending', page: 1, pageSize: 100 }
        }),
        wx.cloud.callFunction({
          name: 'user',
          data: { action: 'getPending', status: 'approved', page: 1, pageSize: this.data.pageSize }
        }),
        wx.cloud.callFunction({
          name: 'user',
          data: { action: 'getPending', status: 'rejected', page: 1, pageSize: this.data.pageSize }
        })
      ])

      const updateData = {}

      if (pendingRes.result.success) {
        updateData.pendingUsers = pendingRes.result.data
      }

      if (approvedRes.result.success) {
        updateData.approvedUsers = approvedRes.result.data
        updateData.approvedPage = 1
        updateData.approvedHasMore = approvedRes.result.pagination.hasMore
      }

      if (rejectedRes.result.success) {
        updateData.rejectedUsers = rejectedRes.result.data
        updateData.rejectedPage = 1
        updateData.rejectedHasMore = rejectedRes.result.pagination.hasMore
      }

      this.setData(updateData)
    } catch (error) {
      console.error('加载用户列表失败:', error)
      Toast.fail('加载失败')
    } finally {
      Toast.clear()
      this.setData({ pageLoading: false })
    }
  },

  /**
   * 加载更多已通过用户
   */
  async loadMoreApproved() {
    if (!this.data.approvedHasMore || this.data.approvedLoading) return

    this.setData({ approvedLoading: true })

    try {
      const nextPage = this.data.approvedPage + 1
      const res = await wx.cloud.callFunction({
        name: 'user',
        data: {
          action: 'getPending',
          status: 'approved',
          page: nextPage,
          pageSize: this.data.pageSize
        }
      })

      if (res.result.success) {
        this.setData({
          approvedUsers: [...this.data.approvedUsers, ...res.result.data],
          approvedPage: nextPage,
          approvedHasMore: res.result.pagination.hasMore
        })
      }
    } catch (error) {
      console.error('加载更多已通过用户失败:', error)
      Toast.fail('加载失败')
    } finally {
      this.setData({ approvedLoading: false })
    }
  },

  /**
   * 加载更多已拒绝用户
   */
  async loadMoreRejected() {
    if (!this.data.rejectedHasMore || this.data.rejectedLoading) return

    this.setData({ rejectedLoading: true })

    try {
      const nextPage = this.data.rejectedPage + 1
      const res = await wx.cloud.callFunction({
        name: 'user',
        data: {
          action: 'getPending',
          status: 'rejected',
          page: nextPage,
          pageSize: this.data.pageSize
        }
      })

      if (res.result.success) {
        this.setData({
          rejectedUsers: [...this.data.rejectedUsers, ...res.result.data],
          rejectedPage: nextPage,
          rejectedHasMore: res.result.pagination.hasMore
        })
      }
    } catch (error) {
      console.error('加载更多已拒绝用户失败:', error)
      Toast.fail('加载失败')
    } finally {
      this.setData({ rejectedLoading: false })
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
          this.loadAllTabs(true)
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
          this.loadAllTabs(true)
        }, 1500)
      } else {
        Toast.fail(res.result.message || '操作失败')
      }
    } catch (error) {
      console.error('拒绝失败:', error)
      Toast.fail('操作失败')
    }
  }
})
