const app = getApp()

Page({
  data: {
    activeTab: 'all',
    searchKeyword: '',
    users: [],
    loading: false,
    page: 1,
    pageSize: 20,
    hasMore: true,
    total: 0,

    roleOptions: [
      { value: 'all', label: '全部' },
      { value: 'teacher', label: '社团老师' },
      { value: 'classTeacher', label: '班主任' },
      { value: 'leader', label: '学部领导' }
    ],

    statusMap: {
      pending: { text: '待审批', type: 'warning' },
      approved: { text: '已通过', type: 'success' },
      rejected: { text: '已拒绝', type: 'danger' }
    },

    roleMap: {
      teacher: '社团老师',
      classTeacher: '班主任',
      leader: '学部领导',
      admin: '管理员'
    }
  },

  onLoad() {
    this.loadUsers()
  },

  onTabChange(e) {
    const role = e.detail.name
    this.setData({
      activeTab: role,
      users: [],
      page: 1,
      hasMore: true
    })
    this.loadUsers()
  },

  onSearchChange(e) {
    this.setData({ searchKeyword: e.detail })
  },

  onSearch() {
    this.setData({
      users: [],
      page: 1,
      hasMore: true
    })
    this.loadUsers()
  },

  onSearchClear() {
    this.setData({
      searchKeyword: '',
      users: [],
      page: 1,
      hasMore: true
    })
    this.loadUsers()
  },

  async loadUsers() {
    if (this.data.loading || !this.data.hasMore) return

    this.setData({ loading: true })

    try {
      const params = {
        action: 'getAll',
        page: this.data.page,
        pageSize: this.data.pageSize
      }

      if (this.data.activeTab !== 'all') {
        params.role = this.data.activeTab
      }

      const res = await wx.cloud.callFunction({
        name: 'user',
        data: params
      })

      if (res.result.success) {
        let users = res.result.data

        // 客户端搜索过滤
        if (this.data.searchKeyword) {
          const keyword = this.data.searchKeyword.toLowerCase()
          users = users.filter(user =>
            user.userName.toLowerCase().includes(keyword) ||
            user.department?.toLowerCase().includes(keyword) ||
            user.className?.toLowerCase().includes(keyword) ||
            user.clubName?.toLowerCase().includes(keyword)
          )
        }

        this.setData({
          users: this.data.page === 1 ? users : [...this.data.users, ...users],
          hasMore: res.result.pagination.hasMore,
          total: res.result.pagination.total,
          loading: false
        })
      } else {
        throw new Error(res.result.message)
      }
    } catch (error) {
      console.error('加载用户列表失败:', error)
      wx.showToast({
        title: error.message || '加载失败',
        icon: 'none'
      })
      this.setData({ loading: false })
    }
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.setData({ page: this.data.page + 1 })
      this.loadUsers()
    }
  },

  onPullDownRefresh() {
    this.setData({
      users: [],
      page: 1,
      hasMore: true
    })
    this.loadUsers().then(() => {
      wx.stopPullDownRefresh()
    })
  },

  goToAddUser() {
    wx.navigateTo({
      url: '/pages/admin/users/add'
    })
  },

  editUser(e) {
    const user = e.currentTarget.dataset.user
    wx.navigateTo({
      url: `/pages/admin/users/add?id=${user._id}&mode=edit`
    })
  },

  deleteUser(e) {
    const user = e.currentTarget.dataset.user

    if (user.role === 'admin') {
      wx.showToast({
        title: '不能删除管理员',
        icon: 'none'
      })
      return
    }

    wx.showModal({
      title: '确认删除',
      content: `确定要删除用户"${user.userName}"吗？删除后该用户将无法登录系统。`,
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '删除中...' })

            const result = await wx.cloud.callFunction({
              name: 'user',
              data: {
                action: 'delete',
                userId: user._id
              }
            })

            wx.hideLoading()

            if (result.result.success) {
              wx.showToast({
                title: '删除成功',
                icon: 'success'
              })

              // 刷新列表
              this.setData({
                users: [],
                page: 1,
                hasMore: true
              })
              this.loadUsers()
            } else {
              throw new Error(result.result.message)
            }
          } catch (error) {
            wx.hideLoading()
            wx.showToast({
              title: error.message || '删除失败',
              icon: 'none'
            })
          }
        }
      }
    })
  },

  getUserExtraInfo(user) {
    const parts = []
    if (user.department) parts.push(user.department)
    if (user.className) parts.push(user.className)
    if (user.clubName) parts.push(user.clubName)
    return parts.join(' · ')
  }
})
