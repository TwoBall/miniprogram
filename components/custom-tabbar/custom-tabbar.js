/**
 * @file 自定义底部导航栏组件
 * @module components/custom-tabbar/custom-tabbar
 */
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

  methods: {
    /**
     * 标签切换处理
     * @param {Object} e - 事件对象
     */
    onChange(e) {
      const index = e.detail
      const role = this.properties.role
      const tabs = this.data.tabs[role]

      if (tabs && tabs[index]) {
        wx.redirectTo({
          url: tabs[index].url,
          fail: (err) => {
            console.error('TabBar navigation failed:', err)
          }
        })
      }
    }
  }
})
