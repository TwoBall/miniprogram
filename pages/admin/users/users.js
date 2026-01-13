// input: 角色筛选、搜索关键词、分页参数
// output: 用户列表展示、用户增删改操作
// pos: 页面层 > 管理员模块 > 用户管理

const paginationBehavior = require('../../../behaviors/paginationBehavior')
const request = require('../../../utils/request')
const { SafeToast } = require('../../../utils/error')
const { USER_STATUS, ROLES } = require('../../../utils/constants')
import Dialog from '@vant/weapp/dialog/dialog'

Page({
  behaviors: [paginationBehavior],

  data: {
    pageLoading: true,
    activeTab: 'all',
    searchKeyword: '',
    users: [],
    total: 0,

    roleOptions: [
      { value: 'all', label: '全部' },
      { value: 'teacher', label: ROLES.teacher.text },
      { value: 'classTeacher', label: ROLES.classTeacher.text },
      { value: 'leader', label: ROLES.leader.text }
    ],

    // 使用 constants.js 统一管理，在 WXML 中通过 WXS 或函数调用
    statusMap: USER_STATUS,
    roleMap: ROLES
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
    // 加载中则跳过
    if (this.data.loading) return
    // 非刷新模式下，无更多数据则跳过
    if (!refresh && !this.data.hasMore) return

    this.setData({ loading: true })

    try {
      const params = {
        page: this.data.page,
        pageSize: this.data.pageSize
      }

      if (this.data.activeTab !== 'all') {
        params.role = this.data.activeTab
      }

      // 服务端搜索
      if (this.data.searchKeyword) {
        params.keyword = this.data.searchKeyword
      }

      const result = await request.callApi('user', 'getAll', params)

      if (result.success) {
        const users = result.data
        this.handleLoadSuccess(users, result.pagination, refresh, 'users')
        this.setData({ total: result.pagination.total, pageLoading: false })
      } else {
        throw new Error(result.message)
      }
    } catch (error) {
      console.error('加载用户列表失败:', error)
      SafeToast.fail(error.message || '加载失败')
      this.setData({ loading: false, pageLoading: false })
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

  async deleteUser(e) {
    const user = e.currentTarget.dataset.user

    if (user.role === 'admin') {
      SafeToast.fail('不能删除管理员')
      return
    }

    try {
      await Dialog.confirm({
        title: '确认删除',
        message: `确定要删除用户"${user.userName}"吗？删除后该用户将无法登录系统。`
      })

      try {
        await SafeToast.loading({ message: '删除中...' })

        const result = await request.callApi('user', 'delete', {
          userId: user._id
        })

        SafeToast.clear()

        if (result.success) {
          SafeToast.success('删除成功')

          // 刷新列表
          this.setData({ users: [] })
          this.resetPagination()
          this.loadList()
        } else {
          throw new Error(result.message)
        }
      } catch (error) {
        SafeToast.clear()
        SafeToast.fail(error.message || '删除失败')
      }
    } catch (e) {
      // 用户取消
    }
  },

  getUserExtraInfo(user) {
    const parts = []
    if (user.department) parts.push(user.department)
    if (user.className) parts.push(user.className)
    if (user.clubName) parts.push(user.clubName)
    return parts.join(' · ')
  }
})
