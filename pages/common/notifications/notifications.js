const request = require('../../../utils/request')
const { formatRelativeTime } = require('../../../utils/date')
const paginationBehavior = require('../../../behaviors/paginationBehavior')
const { SafeToast } = require('../../../utils/error')
import Dialog from '@vant/weapp/dialog/dialog'

Page({
  behaviors: [paginationBehavior],

  data: {
    notifications: [],
    activeTab: 'all',
    unreadCount: 0
  },

  onLoad() {
    this.loadList()
    this.loadUnreadCount()
  },

  onPullDownRefresh() {
    this.setData({ notifications: [] })
    this.handlePullDownRefresh()
    this.loadUnreadCount()
  },

  onReachBottom() {
    this.handleReachBottom()
  },

  /**
   * 加载通知列表
   */
  async loadList(refresh = false) {
    if (this.data.loading) return

    this.setData({ loading: true })

    try {
      const { activeTab, page, pageSize } = this.data
      const params = {
        page,
        pageSize
      }

      // 根据 tab 设置已读/未读筛选
      if (activeTab === 'unread') {
        params.read = false
      } else if (activeTab === 'read') {
        params.read = true
      }

      const result = await request.callApi('notification', 'getList', params, {
        showLoading: false,
        showError: false
      })

      if (result.success) {
        // 格式化时间
        const formattedData = result.data.map(item => ({
          ...item,
          createTime: this.formatTime(item.createTime)
        }))

        this.handleLoadSuccess(formattedData, result.pagination, refresh, 'notifications')
      }
    } catch (error) {
      console.error('加载通知失败:', error)
      this.setData({ loading: false })
      SafeToast.fail('加载失败')
    }
  },

  /**
   * 加载未读数量
   */
  async loadUnreadCount() {
    try {
      const result = await request.callApi('notification', 'getUnreadCount', {}, {
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
    this.setData({ activeTab: tab, notifications: [] })
    this.resetPagination()
    this.loadList(true)
  },

  /**
   * 标记单条通知为已读
   */
  async markAsRead(e) {
    const { id } = e.currentTarget.dataset

    try {
      const result = await request.callApi('notification', 'markRead', {
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
      SafeToast.fail('操作失败')
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
      SafeToast.fail('没有未读通知')
      return
    }

    try {
      const result = await request.callApi('notification', 'markRead', {
        notificationIds: unreadIds
      })

      if (result.success) {
        SafeToast.success(result.message)
        // 刷新列表
        this.setData({ notifications: [] })
        this.resetPagination()
        this.loadList(true)
        this.loadUnreadCount()
      }
    } catch (error) {
      console.error('批量标记失败:', error)
      SafeToast.fail('操作失败')
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
    const { type, data, title, content } = notification

    switch (type) {
      case 'absence_warning':
        // 缺勤提醒可能包含多个学生，如果没有单个studentId，则弹窗显示详情
        if (data && data.studentId) {
          wx.navigateTo({
            url: `/pages/classTeacher/feedback/feedback?studentId=${data.studentId}`
          })
        } else {
          // 显示完整通知内容
          Dialog.alert({
            title: title,
            message: content,
            confirmButtonText: '知道了'
          })
        }
        break
      case 'attendance_update':
        // 考勤修改通知，显示变更详情
        Dialog.alert({
          title: title,
          message: content,
          confirmButtonText: '知道了'
        })
        break
      case 'transfer_request':
        // 跳转到转社团申请页面
        wx.navigateTo({
          url: '/pages/common/transfer/transfer'
        })
        break
      case 'transfer_result':
        // 转社团结果通知通常较短，但也可能包含长原因，使用弹窗展示更佳
        Dialog.alert({
          title: title,
          message: content,
          confirmButtonText: '关闭'
        })
        break
      case 'register_result':
        // 注册审批结果可能包含拒绝原因
        Dialog.alert({
          title: title,
          message: content,
          confirmButtonText: '关闭'
        })
        break
      default:
        // 默认行为：展示完整内容，防止被截断
        Dialog.alert({
          title: title || '通知详情',
          message: content,
          confirmButtonText: '关闭'
        })
        break
    }
  },

  /**
   * 格式化通知类型
   */
  formatNotificationType(type) {
    const typeMap = {
      absence_warning: '缺勤提醒',
      attendance_update: '考勤修改',
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
