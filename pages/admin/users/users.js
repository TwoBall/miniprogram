// input: 角色筛选、搜索关键词、分页参数
// output: 用户列表展示、用户增删改操作
// pos: 页面层 > 管理员模块 > 用户管理

const paginationBehavior = require('../../../behaviors/paginationBehavior')

Page({
  behaviors: [paginationBehavior],

  data: {
    activeTab: 'all',
    searchKeyword: '',
    users: [],
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
    this.loadList()
  },

  onTabChange(e) {
    const role = e.detail.name
    this.setData({ activeTab: role, users: [] })
    this.resetPagination()
    this.loadList()
  },

  onSearchChange(e) {
    this.setData({ searchKeyword: e.detail })
  },

  onSearch() {
    this.setData({ users: [] })
    this.resetPagination()
    this.loadList()
  },

  onSearchClear() {
    this.setData({ searchKeyword: '', users: [] })
    this.resetPagination()
    this.loadList()
  },

  async loadList(refresh = false) {
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

        this.handleLoadSuccess(users, res.result.pagination, refresh, 'users')
        this.setData({ total: res.result.pagination.total })
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
    this.handleReachBottom()
  },

  onPullDownRefresh() {
    this.setData({ users: [] })
    this.handlePullDownRefresh()
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
              this.setData({ users: [] })
              this.resetPagination()
              this.loadList()
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
