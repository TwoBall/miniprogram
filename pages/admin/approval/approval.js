const auth = require('../../../utils/auth')
const storage = require('../../../utils/storage')
const request = require('../../../utils/request')
import Toast from '@vant/weapp/toast/toast'
import Dialog from '@vant/weapp/dialog/dialog'

/**
 * 格式化时间为 YYYY-MM-DD HH:mm
 * @param {Date|string|object} time - 时间对象或字符串
 */
function formatTime(time) {
  if (!time) return ''
  let date
  if (typeof time === 'string') {
    date = new Date(time)
  } else if (time instanceof Date) {
    date = time
  } else if (time.$date) {
    // 云数据库 serverDate 格式
    date = new Date(time.$date)
  } else {
    return ''
  }
  if (isNaN(date.getTime())) return ''
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const h = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${d} ${h}:${min}`
}

/**
 * 格式化用户列表中的时间字段
 */
function formatUserTimes(users) {
  return users.map(user => ({
    ...user,
    createTime: formatTime(user.createTime),
    approvedTime: formatTime(user.approvedTime) || formatTime(user.updateTime)
  }))
}

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

  // 上次加载时间（用于防抖）
  lastLoadTime: 0,

  /**
   * 页面加载
   */
  onLoad() {
    auth.checkRole('admin')
    this.loadAllTabs()
  },

  onShow() {
    // 10秒内不重复加载（防抖）
    const now = Date.now()
    if (now - this.lastLoadTime < 10000) return
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
    this.lastLoadTime = Date.now()
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

      // 尝试从缓存读取待审批列表（2分钟有效，待审批需要较新数据）
      const pendingCacheKey = `${storage.STORAGE_KEYS.ATTENDANCE_DATA}_pending_users`
      const pendingCacheTimeKey = `${storage.STORAGE_KEYS.ATTENDANCE_DATA_TIME}_pending_users`
      let pendingFromCache = null

      if (!forceRefresh) {
        const cached = storage.getWithCache(pendingCacheKey, pendingCacheTimeKey, storage.CACHE_DURATION.TWO_MINUTES)
        if (cached) {
          console.log('使用待审批用户缓存')
          pendingFromCache = cached
        }
      }

      const updateData = {}

      // 如果有待审批缓存，只需加载已通过和已拒绝（仍需2次调用）
      // 如果无缓存，使用 getAllByStatus 一次获取全部（1次调用）
      if (pendingFromCache) {
        updateData.pendingUsers = pendingFromCache

        // 并行加载已通过和已拒绝
        const [approvedResult, rejectedResult] = await Promise.all([
          request.callCloud('user', {
            action: 'getPending',
            status: 'approved',
            page: 1,
            pageSize: this.data.pageSize
          }, { showLoading: false, showError: false }),
          request.callCloud('user', {
            action: 'getPending',
            status: 'rejected',
            page: 1,
            pageSize: this.data.pageSize
          }, { showLoading: false, showError: false })
        ])

        if (approvedResult.success) {
          updateData.approvedUsers = formatUserTimes(approvedResult.data)
          updateData.approvedPage = 1
          updateData.approvedHasMore = approvedResult.pagination.hasMore
        }

        if (rejectedResult.success) {
          updateData.rejectedUsers = formatUserTimes(rejectedResult.data)
          updateData.rejectedPage = 1
          updateData.rejectedHasMore = rejectedResult.pagination.hasMore
        }
      } else {
        // 使用合并查询：一次获取全部三种状态
        const result = await request.callCloud('user', {
          action: 'getAllByStatus',
          pendingPageSize: 100,
          approvedPageSize: this.data.pageSize,
          rejectedPageSize: this.data.pageSize
        }, { showLoading: false, showError: false })

        if (result.success) {
          // 处理待审批数据
          const formattedPending = formatUserTimes(result.pending.data)
          updateData.pendingUsers = formattedPending
          storage.setWithCache(pendingCacheKey, pendingCacheTimeKey, formattedPending)

          // 处理已通过数据
          updateData.approvedUsers = formatUserTimes(result.approved.data)
          updateData.approvedPage = 1
          updateData.approvedHasMore = result.approved.hasMore

          // 处理已拒绝数据
          updateData.rejectedUsers = formatUserTimes(result.rejected.data)
          updateData.rejectedPage = 1
          updateData.rejectedHasMore = result.rejected.hasMore
        }
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
      const result = await request.callCloud('user', {
        action: 'getPending',
        status: 'approved',
        page: nextPage,
        pageSize: this.data.pageSize
      }, { showLoading: false, showError: false })

      if (result.success) {
        this.setData({
          approvedUsers: [...this.data.approvedUsers, ...formatUserTimes(result.data)],
          approvedPage: nextPage,
          approvedHasMore: result.pagination.hasMore
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
      const result = await request.callCloud('user', {
        action: 'getPending',
        status: 'rejected',
        page: nextPage,
        pageSize: this.data.pageSize
      }, { showLoading: false, showError: false })

      if (result.success) {
        this.setData({
          rejectedUsers: [...this.data.rejectedUsers, ...formatUserTimes(result.data)],
          rejectedPage: nextPage,
          rejectedHasMore: result.pagination.hasMore
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
      message: `确定通过 ${user.userName} 的注册申请吗？`
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
      const result = await request.callCloud('user', {
        action: 'approve',
        userId
      }, { showLoading: false, showError: false })

      if (result.success) {
        Toast.success('审批通过')
        setTimeout(() => {
          this.loadAllTabs(true)
        }, 1500)
      } else {
        Toast.fail(result.message || '操作失败')
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
      const result = await request.callCloud('user', {
        action: 'reject',
        userId,
        rejectReason
      }, { showLoading: false, showError: false })

      if (result.success) {
        Toast.success('已拒绝')
        setTimeout(() => {
          this.loadAllTabs(true)
        }, 1500)
      } else {
        Toast.fail(result.message || '操作失败')
      }
    } catch (error) {
      console.error('拒绝失败:', error)
      Toast.fail('操作失败')
    }
  }
})
