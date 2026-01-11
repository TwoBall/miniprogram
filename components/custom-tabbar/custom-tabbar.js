/**
 * @file 自定义底部导航栏组件 - Editorial 风格
 * @module components/custom-tabbar/custom-tabbar
 */

// 角色主题色映射
const ROLE_COLORS = {
  admin: '#805ad5',      // 紫色
  teacher: '#2c5282',    // 深蓝色
  classTeacher: '#38a169', // 绿色
  leader: '#d69e2e'      // 金色
}

Component({
  properties: {
    /**
     * 用户角色
     */
    role: {
      type: String,
      value: 'teacher'
    },
    /**
     * 当前激活的标签索引
     */
    active: {
      type: Number,
      value: 0
    }
  },

  data: {
    activeColor: ROLE_COLORS.teacher,
    tabs: {
      teacher: [
        { icon: 'records', text: '点名', url: '/pages/teacher/attendance/attendance' },
        { icon: 'user-o', text: '我的', url: '/pages/teacher/profile/profile' }
      ],
      classTeacher: [
        { icon: 'chart-trending-o', text: '总览', url: '/pages/classTeacher/overview/overview' },
        { icon: 'user-o', text: '我的', url: '/pages/classTeacher/profile/profile' }
      ],
      leader: [
        { icon: 'chart-trending-o', text: '看板', url: '/pages/leader/dashboard/dashboard' },
        { icon: 'user-o', text: '我的', url: '/pages/leader/profile/profile' }
      ],
      admin: [
        { icon: 'wap-home-o', text: '工作台', url: '/pages/admin/home/home' },
        { icon: 'user-o', text: '我的', url: '/pages/admin/profile/profile' }
      ]
    }
  },

  lifetimes: {
    attached() {
      this.updateActiveColor()
    }
  },

  observers: {
    'role': function() {
      this.updateActiveColor()
    }
  },

  methods: {
    /**
     * 更新激活态颜色
     */
    updateActiveColor() {
      const role = this.properties.role
      const activeColor = ROLE_COLORS[role] || ROLE_COLORS.teacher
      this.setData({ activeColor })
    },

    /**
     * 标签切换处理
     * @param {Object} e - 事件对象
     */
    onChange(e) {
      const index = e.detail
      const role = this.properties.role
      const tabs = this.data.tabs[role]

      // 如果点击的是当前已经是激活状态的 tab，则不进行跳转
      if (index === this.properties.active) {
        return
      }

      if (tabs && tabs[index]) {
        wx.redirectTo({
          url: tabs[index].url,
          fail: (err) => {
            // 如果是因为跳转到 tabBar 页面失败（例如页面在 app.json tabBar 中定义了）
            // 尝试 fallback 到 switchTab
            if (err.errMsg && err.errMsg.indexOf('tabBar') !== -1) {
              wx.switchTab({
                url: tabs[index].url
              })
            } else {
              console.error('TabBar navigation failed:', err)
            }
          }
        })
      }
    }
  }
})
