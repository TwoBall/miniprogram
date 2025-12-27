// input: 用户导出历史记录请求
// output: 展示导出历史列表，支持重新下载和删除
// pos: 页面层 > 公共模块 > 导出历史

const paginationBehavior = require('../../../behaviors/paginationBehavior')

Page({
  behaviors: [paginationBehavior],

  data: {
    records: [],
    loading: false,
    downloading: {} // 记录正在下载的项
  },

  onLoad() {
    this.loadRecords()
  },

  onShow() {
    // 每次显示时刷新数据
    if (this.data.records.length > 0) {
      this.loadRecords()
    }
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadRecords().then(() => {
      wx.stopPullDownRefresh()
    })
  },

  // 上拉加载更多
  onReachBottom() {
    if (!this.data.loading && this.data.hasMore) {
      this.loadMore()
    }
  },

  // 加载导出记录
  async loadRecords() {
    this.setData({ loading: true, page: 1 })

    try {
      const res = await wx.cloud.callFunction({
        name: 'export',
        data: {
          action: 'getHistory',
          page: 1,
          pageSize: 20
        }
      })

      if (res.result.success) {
        const records = this.formatRecords(res.result.data)
        this.setData({
          records,
          hasMore: res.result.pagination.hasMore,
          total: res.result.pagination.total
        })
      } else {
        wx.showToast({
          title: res.result.message || '加载失败',
          icon: 'none'
        })
      }
    } catch (error) {
      console.error('加载导出历史失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  // 加载更多
  async loadMore() {
    if (this.data.loading || !this.data.hasMore) return

    const nextPage = this.data.page + 1
    this.setData({ loading: true })

    try {
      const res = await wx.cloud.callFunction({
        name: 'export',
        data: {
          action: 'getHistory',
          page: nextPage,
          pageSize: 20
        }
      })

      if (res.result.success) {
        const newRecords = this.formatRecords(res.result.data)
        this.setData({
          records: [...this.data.records, ...newRecords],
          page: nextPage,
          hasMore: res.result.pagination.hasMore
        })
      }
    } catch (error) {
      console.error('加载更多失败:', error)
    } finally {
      this.setData({ loading: false })
    }
  },

  // 格式化记录
  formatRecords(records) {
    const typeMap = {
      attendance: '考勤明细',
      summary: '考勤汇总',
      students: '学生名单'
    }

    return records.map(record => ({
      ...record,
      typeName: typeMap[record.exportType] || record.exportType,
      createTimeStr: this.formatDateTime(record.createTime),
      filterDesc: this.getFilterDesc(record.filters)
    }))
  },

  // 格式化时间
  formatDateTime(timestamp) {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hour = String(date.getHours()).padStart(2, '0')
    const minute = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day} ${hour}:${minute}`
  },

  // 获取筛选条件描述
  getFilterDesc(filters) {
    if (!filters) return ''
    const parts = []
    if (filters.startDate && filters.endDate) {
      parts.push(`${filters.startDate} ~ ${filters.endDate}`)
    }
    if (filters.department) parts.push(filters.department)
    if (filters.clubName) parts.push(filters.clubName)
    if (filters.className) parts.push(filters.className)
    return parts.join(' | ') || '全部数据'
  },

  // 下载文件
  async onDownload(e) {
    const { id, fileId } = e.currentTarget.dataset

    if (this.data.downloading[id]) return

    this.setData({ [`downloading.${id}`]: true })
    wx.showLoading({ title: '获取下载链接...' })

    try {
      // 重新获取临时下载链接
      const res = await wx.cloud.callFunction({
        name: 'export',
        data: {
          action: 'getDownloadUrl',
          fileID: fileId
        }
      })

      wx.hideLoading()

      if (res.result.success) {
        const { tempFileURL } = res.result.data
        const record = this.data.records.find(r => r._id === id)

        // 下载文件
        wx.showLoading({ title: '下载中...' })

        wx.downloadFile({
          url: tempFileURL,
          success: (downloadRes) => {
            wx.hideLoading()
            if (downloadRes.statusCode === 200) {
              const fs = wx.getFileSystemManager()
              const filePath = `${wx.env.USER_DATA_PATH}/${record.fileName}`

              fs.saveFile({
                tempFilePath: downloadRes.tempFilePath,
                filePath,
                success: () => {
                  wx.showModal({
                    title: '下载成功',
                    content: `文件：${record.fileName}`,
                    confirmText: '打开文件',
                    success: (modalRes) => {
                      if (modalRes.confirm) {
                        wx.openDocument({
                          filePath,
                          fileType: 'xlsx',
                          fail: (err) => {
                            console.error('打开文件失败:', err)
                            wx.showToast({
                              title: '打开失败',
                              icon: 'none'
                            })
                          }
                        })
                      }
                    }
                  })
                },
                fail: (err) => {
                  console.error('保存文件失败:', err)
                  wx.showToast({
                    title: '保存失败',
                    icon: 'none'
                  })
                }
              })
            } else {
              wx.showToast({
                title: '下载失败',
                icon: 'none'
              })
            }
          },
          fail: (err) => {
            wx.hideLoading()
            console.error('下载文件失败:', err)
            wx.showToast({
              title: '下载失败',
              icon: 'none'
            })
          }
        })
      } else {
        wx.showToast({
          title: res.result.message || '获取链接失败',
          icon: 'none'
        })
      }
    } catch (error) {
      wx.hideLoading()
      console.error('获取下载链接失败:', error)
      wx.showToast({
        title: '获取链接失败',
        icon: 'none'
      })
    } finally {
      this.setData({ [`downloading.${id}`]: false })
    }
  },

  // 删除记录
  onDelete(e) {
    const { id, fileId } = e.currentTarget.dataset

    wx.showModal({
      title: '确认删除',
      content: '删除后将无法恢复，确定要删除吗？',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中...' })

          try {
            const result = await wx.cloud.callFunction({
              name: 'export',
              data: {
                action: 'deleteRecord',
                recordId: id,
                fileID: fileId
              }
            })

            wx.hideLoading()

            if (result.result.success) {
              // 从列表中移除
              const records = this.data.records.filter(r => r._id !== id)
              this.setData({ records })
              wx.showToast({
                title: '删除成功',
                icon: 'success'
              })
            } else {
              wx.showToast({
                title: result.result.message || '删除失败',
                icon: 'none'
              })
            }
          } catch (error) {
            wx.hideLoading()
            console.error('删除失败:', error)
            wx.showToast({
              title: '删除失败',
              icon: 'none'
            })
          }
        }
      }
    })
  }
})
