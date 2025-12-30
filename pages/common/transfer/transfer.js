// 转社团申请页面
const request = require('../../../utils/request')
const { formatRelativeTime } = require('../../../utils/date')
const paginationBehavior = require('../../../behaviors/paginationBehavior')
const throttleBehavior = require('../../../behaviors/throttleBehavior')

Page({
  behaviors: [paginationBehavior, throttleBehavior],

  data: {
    activeTab: 'pending',
    transfers: [],
    userInfo: null,
    role: '',

    // 状态映射
    statusMap: {
      pending_teacher: { text: '等待老师确认', type: 'warning' },
      pending_classTeacher: { text: '等待班主任审批', type: 'primary' },
      approved: { text: '已通过', type: 'success' },
      rejected: { text: '已拒绝', type: 'danger' }
    },

    // 拒绝原因输入
    rejectReason: '',
    currentRequestId: ''
  },

  onLoad() {
    const userInfo = wx.getStorageSync('userInfo')
    this.setData({
      userInfo,
      role: userInfo?.role || 'teacher'
    })
    this.loadList(true)
  },

  onPullDownRefresh() {
    this.setData({ transfers: [] })
    this.handlePullDownRefresh()
  },

  onReachBottom() {
    this.handleReachBottom()
  },

  // 切换标签
  onTabChange(e) {
    const tab = e.detail.name
    this.setData({ activeTab: tab, transfers: [] })
    this.resetPagination()
    this.loadList(true)
  },

  // 加载转社团申请列表
  async loadList(refresh = false) {
    if (this.data.loading) return

    this.setData({ loading: true })

    try {
      const { activeTab, role, page, pageSize } = this.data

      const result = await request.callCloud('transfer', {
        action: 'getList',
        role,
        page,
        pageSize,
        status: activeTab === 'all' ? 'all' : activeTab
      })

      if (result.success) {
        // 格式化时间
        const formattedData = result.data.map(item => ({
          ...item,
          createTime: this.formatTime(item.createTime),
          updateTime: this.formatTime(item.updateTime)
        }))

        this.handleLoadSuccess(formattedData, result.pagination, refresh, 'transfers')

        if (refresh) {
          wx.stopPullDownRefresh()
        }
      } else {
        wx.showToast({
          title: result.message || '加载失败',
          icon: 'none'
        })
        this.setData({ loading: false })
      }
    } catch (error) {
      console.error('加载转社团申请失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
      this.setData({ loading: false })
      if (refresh) {
        wx.stopPullDownRefresh()
      }
    }
  },

  // 确认申请（老师间确认）
  onConfirm(e) {
    const { id } = e.currentTarget.dataset

    wx.showModal({
      title: '确认',
      content: '确定要确认这个转社团申请吗？',
      success: async (res) => {
        if (res.confirm) {
          await this.safeAsyncAction(`confirm_${id}`, async () => {
            const result = await request.callCloud('transfer', {
              action: 'confirm',
              requestId: id
            })

            if (result.success) {
              wx.showToast({
                title: result.message,
                icon: 'success'
              })
              // 刷新列表
              this.loadList(true)
            } else {
              wx.showToast({
                title: result.message || '确认失败',
                icon: 'none'
              })
            }
          })
        }
      }
    })
  },

  // 审批通过（班主任）
  onApprove(e) {
    const { id } = e.currentTarget.dataset

    wx.showModal({
      title: '审批通过',
      content: '确定要通过这个转社团申请吗？学生的社团归属将被更新。',
      success: async (res) => {
        if (res.confirm) {
          await this.safeAsyncAction(`approve_${id}`, async () => {
            const result = await request.callCloud('transfer', {
              action: 'approve',
              requestId: id
            })

            if (result.success) {
              wx.showToast({
                title: result.message,
                icon: 'success'
              })
              // 刷新列表
              this.loadList(true)
            } else {
              wx.showToast({
                title: result.message || '审批失败',
                icon: 'none'
              })
            }
          })
        }
      }
    })
  },

  // 拒绝申请
  onReject(e) {
    const { id } = e.currentTarget.dataset
    this.setData({ currentRequestId: id })
    this.selectComponent('#rejectDialog').setData({ show: true })
  },

  onRejectReasonInput(e) {
    this.setData({ rejectReason: e.detail })
  },

  async onRejectConfirm() {
    const { currentRequestId, rejectReason } = this.data

    if (!rejectReason.trim()) {
      wx.showToast({
        title: '请输入拒绝原因',
        icon: 'none'
      })
      return
    }

    this.selectComponent('#rejectDialog').setData({ show: false })

    await this.safeAsyncAction(`reject_${currentRequestId}`, async () => {
      const result = await request.callCloud('transfer', {
        action: 'reject',
        requestId: currentRequestId,
        reason: rejectReason
      })

      if (result.success) {
        wx.showToast({
          title: result.message,
          icon: 'success'
        })
        // 清空输入
        this.setData({ rejectReason: '', currentRequestId: '' })
        // 刷新列表
        this.loadList(true)
      } else {
        wx.showToast({
          title: result.message || '拒绝失败',
          icon: 'none'
        })
      }
    })
  },

  onRejectCancel() {
    this.setData({ rejectReason: '', currentRequestId: '' })
  },

  // 查看申请详情
  onViewDetail(e) {
    const { transfer } = e.currentTarget.dataset

    let detailContent = `学生：${transfer.studentName}\n班级：${transfer.className}\n`
    detailContent += `转出社团：${transfer.fromClub}\n转入社团：${transfer.toClub}\n`
    detailContent += `发起人：${transfer.initiatorName}\n`

    if (transfer.reason) {
      detailContent += `申请理由：${transfer.reason}\n`
    }

    detailContent += `\n确认状态：\n`
    detailContent += `- 转出老师：${transfer.fromTeacherConfirmed ? '✓ 已确认' : '✗ 未确认'}\n`
    detailContent += `- 转入老师：${transfer.toTeacherConfirmed ? '✓ 已确认' : '✗ 未确认'}\n`

    if (transfer.status === 'approved') {
      detailContent += `\n审批信息：\n`
      detailContent += `审批人：${transfer.approvedByName}\n`
      detailContent += `审批时间：${transfer.approvedTime ? this.formatTime(transfer.approvedTime) : '-'}`
    } else if (transfer.status === 'rejected') {
      detailContent += `\n拒绝信息：\n`
      detailContent += `拒绝人：${transfer.rejectedByName}\n`
      detailContent += `拒绝原因：${transfer.rejectReason}\n`
      detailContent += `拒绝时间：${transfer.rejectedTime ? this.formatTime(transfer.rejectedTime) : '-'}`
    }

    wx.showModal({
      title: '申请详情',
      content: detailContent,
      showCancel: false
    })
  },

  // 时间格式化
  formatTime(time) {
    return formatRelativeTime(time)
  }
})
