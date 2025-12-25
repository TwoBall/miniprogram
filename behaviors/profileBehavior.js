// input: 用户存储信息、角色类型
// output: 用户信息、菜单列表、菜单点击处理
// pos: 主包 > behaviors > Profile 页面通用行为

// Profile 页面通用行为
const profileBehavior = Behavior({
  data: {
    userInfo: null,
    menuList: [],
    role: '' // 将在各页面中设置
  },

  attached() {
    this.loadProfileData()
  },

  methods: {
    loadProfileData() {
      const userInfo = wx.getStorageSync('userInfo')
      const role = this.data.role || userInfo?.role || 'teacher'

      // 菜单配置
      const menuConfig = {
        // 社团老师菜单
        teacher: [
          { id: 'club', icon: 'friends', text: '社团管理', url: '/pages/teacher/club/club' },
          { id: 'history', icon: 'records', text: '历史记录', url: '/pages/teacher/history/history' },
          { id: 'transfer', icon: 'orders-o', text: '转社团申请', url: '/pages/common/transfer/transfer' },
          { id: 'notifications', icon: 'bell', text: '通知中心', url: '/pages/common/notifications/notifications' }
        ],
        // 班主任菜单
        classTeacher: [
          { id: 'students', icon: 'friends-o', text: '学生管理', url: '/pages/classTeacher/students/students' },
          { id: 'messages', icon: 'chat-o', text: '消息中心', url: '/pages/classTeacher/messages/messages' },
          { id: 'export', icon: 'down', text: '数据导出', url: '/pages/common/export/export' },
          { id: 'transfer', icon: 'orders-o', text: '转社团审批', url: '/pages/common/transfer/transfer' }
        ],
        // 学部领导菜单
        leader: [
          { id: 'export', icon: 'down', text: '数据导出', url: '/pages/common/export/export' },
          { id: 'notifications', icon: 'bell', text: '通知中心', url: '/pages/common/notifications/notifications' }
        ],
        // 管理员菜单
        admin: [
          { id: 'userManage', icon: 'manager-o', text: '用户管理', url: '/pages/admin/users/users' },
          { id: 'data', icon: 'bar-chart-o', text: '数据中心', url: '/pages/admin/data/data' },
          { id: 'approval', icon: 'orders-o', text: '审批中心', url: '/pages/admin/approval/approval' },
          { id: 'notifications', icon: 'bell', text: '通知中心', url: '/pages/common/notifications/notifications' }
        ]
      }

      // 通用菜单（所有角色共享）
      const commonMenus = [
        { id: 'switchRole', icon: 'exchange', text: '切换身份', url: '/pages/common/switchRole/switchRole' },
        { id: 'addRole', icon: 'add-o', text: '添加新身份', url: '/pages/register/register' },
        { id: 'help', icon: 'question-o', text: '使用帮助', url: '/pages/common/help/help' },
        { id: 'logout', icon: 'revoke', text: '退出登录', action: 'logout' }
      ]

      // 合并菜单
      const menuList = [
        ...(menuConfig[role] || []),
        ...commonMenus
      ]

      this.setData({
        userInfo,
        menuList,
        role
      })
    },

    onMenuTap(e) {
      const { url, action } = e.currentTarget.dataset

      if (action === 'logout') {
        this.handleLogout()
      } else if (url) {
        // 检查页面是否存在，如果不存在则提示
        wx.navigateTo({
          url,
          fail: (err) => {
            wx.showToast({
              title: '功能开发中',
              icon: 'none'
            })
          }
        })
      }
    },

    handleLogout() {
      wx.showModal({
        title: '确认退出',
        content: '确定要退出登录吗？',
        success: (res) => {
          if (res.confirm) {
            wx.clearStorageSync()
            wx.reLaunch({
              url: '/pages/login/login'
            })
          }
        }
      })
    }
  }
})

module.exports = profileBehavior
