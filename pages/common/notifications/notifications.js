const request = require('../../../utils/request')
const { formatRelativeTime } = require('../../../utils/date')
import Toast from '@vant/weapp/toast/toast'

Page({
  data: {
    notifications: [],
    loading: false,
    hasMore: true,
    page: 1,
    pageSize: 20,
    activeTab: 'all',
    unreadCount: 0
  },

  onLoad() {
    this.loadNotifications()
    this.loadUnreadCount()
  },

  onPullDownRefresh() {
    this.setData({ page: 1, hasMore: true })
    this.loadNotifications(true).then(() => {
      wx.stopPullDownRefresh()
    })
    this.loadUnreadCount()
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.setData({ page: this.data.page + 1 })
      this.loadNotifications()
    }
  },

  /**
   * 加载通知列表
   */
  async loadNotifications(refresh = false) {
    if (this.data.loading) return

    this.setData({ loading: true })

    try {
      const { activeTab, page, pageSize } = this.data
      const params = {
        action: 'getList',
        page,
        pageSize
      }

      // 根据 tab 设置已读/未读筛选
      if (activeTab === 'unread') {
        params.read = false
      } else if (activeTab === 'read') {
        params.read = true
      }

      const result = await request.callCloud('notification', params, {
        showLoading: false,
        showError: false
      })

      if (result.success) {
        // 格式化时间
        const formattedData = result.data.map(item => ({
          ...item,
          createTime: this.formatTime(item.createTime)
        }))

        const newNotifications = refresh
          ? formattedData
          : [...this.data.notifications, ...formattedData]

        this.setData({
          notifications: newNotifications,
          hasMore: result.pagination.hasMore,
          loading: false
        })
      }
    } catch (error) {
      console.error('加载通知失败:', error)
      this.setData({ loading: false })
      Toast.fail('加载失败')
    }
  },

  /**
   * 加载未读数量
   */
  async loadUnreadCount() {
    try {
      const result = await request.callCloud('notification', {
        action: 'getUnreadCount'
      }, {
        showLoading: false,
        showError: false
      })

      if (result.success) {
        this.setData({ unreadCount: result.data.count })
      }
    } catch (error) {
      console.error('获取未读数失败:', error)
    }
  },

  /**
   * Tab 切换
   */
  onTabChange(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({
      activeTab: tab,
      page: 1,
      notifications: [],
      hasMore: true
    })
    this.loadNotifications(true)
  },

  /**
   * 标记单条通知为已读
   */
  async markAsRead(e) {
    const { id } = e.currentTarget.dataset

    try {
      const result = await request.callCloud('notification', {
        action: 'markRead',
        notificationId: id
      })

      if (result.success) {
        // 更新本地数据
        const notifications = this.data.notifications.map(n =>
          n._id === id ? { ...n, read: true } : n
        )
        this.setData({ notifications })
        this.loadUnreadCount()
      }
    } catch (error) {
      console.error('标记已读失败:', error)
      Toast.fail('操作失败')
    }
  },

  /**
   * 全部标记为已读
   */
  async markAllAsRead() {
    const unreadIds = this.data.notifications
      .filter(n => !n.read)
      .map(n => n._id)

    if (unreadIds.length === 0) {
      Toast('没有未读通知')
      return
    }

    try {
      const result = await request.callCloud('notification', {
        action: 'markRead',
        notificationIds: unreadIds
      })

      if (result.success) {
        Toast.success(result.message)
        // 刷新列表
        this.setData({ page: 1, notifications: [], hasMore: true })
        this.loadNotifications(true)
        this.loadUnreadCount()
      }
    } catch (error) {
      console.error('批量标记失败:', error)
      Toast.fail('操作失败')
    }
  },

  /**
   * 点击通知项
   */
  onNotificationTap(e) {
    const { notification } = e.currentTarget.dataset

    // 标记为已读
    if (!notification.read) {
      this.markAsRead(e)
    }

    // 根据通知类型跳转到对应页面
    this.handleNotificationAction(notification)
  },

  /**
   * 处理通知点击动作
   */
  handleNotificationAction(notification) {
    const { type, data } = notification

    switch (type) {
      case 'absence_warning':
        // 跳转到学生详情或反馈页面
        if (data.studentId) {
          wx.navigateTo({
            url: `/pages/classTeacher/feedback/feedback?studentId=${data.studentId}`
          })
        }
        break
      case 'transfer_request':
        // 跳转到转社团申请页面
        wx.navigateTo({
          url: '/pages/common/transfer/transfer'
        })
        break
      case 'transfer_result':
        // 显示结果提示
        Toast(notification.content)
        break
      case 'register_result':
        // 显示结果提示
        Toast(notification.content)
        break
      default:
        break
    }
  },

  /**
   * 格式化通知类型
   */
  formatNotificationType(type) {
    const typeMap = {
      absence_warning: '缺勤提醒',
      transfer_request: '转社团申请',
      transfer_result: '转社团结果',
      register_result: '注册审批'
    }
    return typeMap[type] || '系统通知'
  },

  /**
   * 格式化时间
   */
  formatTime(time) {
    return formatRelativeTime(time)
  }
})
