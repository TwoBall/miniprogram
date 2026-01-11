const auth = require('../../../utils/auth')
const request = require('../../../utils/request')
const { SafeToast } = require('../../../utils/error')

Page({
  data: {
    recordId: '',
    record: null,
    presentCount: 0,
    absentCount: 0,
    loading: true,
    hasChanges: false,
    saving: false,
    _pendingChanges: [],  // 待提交的变更记录
    // 动态高度虚拟列表配置
    listHeight: 0,
    virtualList: [],
    _fullList: [],
    _itemHeights: [],      // 每项高度
    _itemOffsets: [],      // 每项的累计偏移量
    totalHeight: 0,
    offsetY: 0,
    startIndex: 0,
    bufferSize: 3
  },

  /**
     * 页面加载
     * @param {Object} options - 页面参数,包含recordId
     */
  onLoad(options) {
    auth.checkRole('teacher')
    if (options.recordId) {
      this.setData({ recordId: options.recordId })

      // 优先使用预传递的数据
      const cachedRecord = wx.getStorageSync('temp_record_detail')
      if (cachedRecord && cachedRecord._id === options.recordId && cachedRecord.records) {
        wx.removeStorageSync('temp_record_detail')
        this.applyRecordData(cachedRecord)
      } else {
        wx.removeStorageSync('temp_record_detail')
        this.loadRecordDetail(options.recordId)
      }
    } else {
      SafeToast.fail('记录不存在')
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    }
  },

  /**
   * 计算单项高度
   * @param {Object} item - 学生记录
   * @returns {number} 高度(px)
   */
  calculateItemHeight(item) {
    let height = 100  // 基础高度：姓名、学部班级、状态按钮
    if (item.classTeacher) height += 25  // 班主任信息
    if (item.feedback) height += 40      // 反馈信息
    return height
  },

  /**
   * 初始化动态高度虚拟列表
   * @param {Array} list - 完整数据列表
   * @param {number} containerHeight - 容器高度
   */
  initDynamicVirtualList(list, containerHeight) {
    const itemHeights = list.map(item => this.calculateItemHeight(item))
    const itemOffsets = []
    let totalHeight = 0

    // 计算累计偏移量
    for (let i = 0; i < itemHeights.length; i++) {
      itemOffsets.push(totalHeight)
      totalHeight += itemHeights[i]
    }

    // 计算初始可见项
    const visibleItems = this.getVisibleItems(list, itemHeights, itemOffsets, 0, containerHeight)

    this.setData({
      _fullList: list,
      _itemHeights: itemHeights,
      _itemOffsets: itemOffsets,
      totalHeight,
      virtualList: visibleItems.items,
      startIndex: visibleItems.startIndex,
      offsetY: visibleItems.offsetY
    })
  },

  /**
   * 获取可见区域的项目
   * @param {Array} list - 完整列表
   * @param {Array} heights - 高度数组
   * @param {Array} offsets - 偏移量数组
   * @param {number} scrollTop - 滚动位置
   * @param {number} containerHeight - 容器高度
   * @returns {Object} { items, startIndex, offsetY }
   */
  getVisibleItems(list, heights, offsets, scrollTop, containerHeight) {
    if (!list.length) return { items: [], startIndex: 0, offsetY: 0 }

    // 二分查找起始索引
    let startIndex = this.binarySearchStart(offsets, scrollTop)
    startIndex = Math.max(0, startIndex - this.data.bufferSize)

    // 找到结束索引
    let endIndex = startIndex
    let accHeight = offsets[startIndex] || 0
    const targetHeight = scrollTop + containerHeight

    while (endIndex < list.length && accHeight < targetHeight) {
      accHeight += heights[endIndex]
      endIndex++
    }
    endIndex = Math.min(list.length, endIndex + this.data.bufferSize)

    return {
      items: list.slice(startIndex, endIndex),
      startIndex,
      offsetY: offsets[startIndex] || 0
    }
  },

  /**
   * 二分查找起始索引
   * @param {Array} offsets - 偏移量数组
   * @param {number} scrollTop - 滚动位置
   * @returns {number} 起始索引
   */
  binarySearchStart(offsets, scrollTop) {
    let left = 0
    let right = offsets.length - 1

    while (left <= right) {
      const mid = Math.floor((left + right) / 2)
      if (offsets[mid] <= scrollTop) {
        left = mid + 1
      } else {
        right = mid - 1
      }
    }
    return Math.max(0, right)
  },

  /**
   * 滚动事件处理
   * @param {Object} e - 滚动事件
   */
  onVirtualScroll(e) {
    const scrollTop = e.detail.scrollTop
    const { _fullList, _itemHeights, _itemOffsets, listHeight, startIndex, bufferSize } = this.data

    const visible = this.getVisibleItems(_fullList, _itemHeights, _itemOffsets, scrollTop, listHeight)

    // 只有当起始索引变化超过缓冲区的一半时才更新
    if (Math.abs(visible.startIndex - startIndex) >= Math.floor(bufferSize / 2)) {
      this.setData({
        virtualList: visible.items,
        startIndex: visible.startIndex,
        offsetY: visible.offsetY
      })
    }
  },

  /**
   * 应用记录数据到页面
   * @param {Object} record - 考勤记录
   */
  applyRecordData(record) {
    const presentCount = record.records.filter(r => r.status === 'present').length
    const absentCount = record.records.filter(r => r.status === 'absent').length

    // 计算列表高度（屏幕高度 - 头部和统计区域约 380rpx）
    const systemInfo = wx.getSystemInfoSync()
    const listHeight = systemInfo.windowHeight - 190

    this.setData({
      record,
      presentCount,
      absentCount,
      loading: false,
      listHeight
    })

    // 初始化动态高度虚拟列表
    this.initDynamicVirtualList(record.records, listHeight)
  },

  /**
     * 加载点名记录详情
     * @param {string} recordId - 记录ID
     */
  async loadRecordDetail(recordId) {
    try {
      await SafeToast.loading({ message: '加载中...' })

      const result = await request.callApi('attendance', 'getDetail', {
        recordId: recordId
      }, { showLoading: false, showError: false })

      if (result.success && result.data) {
        this.applyRecordData(result.data)
      } else {
        SafeToast.fail(result.message || '记录不存在')
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      }
    } catch (error) {
      console.error('加载记录详情失败:', error)
      SafeToast.fail('加载失败')
      this.setData({ loading: false })
    } finally {
      SafeToast.clear()
    }
  },

  /**
     * 切换学生状态
     */
  toggleStudentStatus(e) {
    const studentId = e.currentTarget.dataset.studentId
    const { record, presentCount, absentCount, _fullList, _itemHeights, _itemOffsets, listHeight, startIndex, _pendingChanges } = this.data

    // 在完整列表中查找学生索引
    const realIndex = _fullList.findIndex(r => r.studentId === studentId)
    if (realIndex === -1) return

    const student = _fullList[realIndex]
    const oldStatus = student.status
    const newStatus = oldStatus === 'present' ? 'absent' : 'present'

    // 记录变更信息（用于通知班主任）
    const changeIndex = _pendingChanges.findIndex(c => c.studentId === studentId)
    if (changeIndex >= 0) {
      // 如果改回原状态，移除变更记录
      if (_pendingChanges[changeIndex].oldStatus === newStatus) {
        _pendingChanges.splice(changeIndex, 1)
      } else {
        _pendingChanges[changeIndex].newStatus = newStatus
      }
    } else {
      _pendingChanges.push({
        studentId,
        studentName: student.studentName,
        className: student.className,
        oldStatus,
        newStatus
      })
    }

    // 更新原始数据
    _fullList[realIndex].status = newStatus
    record.records[realIndex].status = newStatus

    // 重新获取可见项（使用当前偏移量）
    const currentScrollTop = _itemOffsets[startIndex] || 0
    const visible = this.getVisibleItems(_fullList, _itemHeights, _itemOffsets, currentScrollTop, listHeight)

    this.setData({
      record,
      presentCount: oldStatus === 'present' ? presentCount - 1 : presentCount + 1,
      absentCount: oldStatus === 'absent' ? absentCount - 1 : absentCount + 1,
      hasChanges: _pendingChanges.length > 0,
      _fullList,
      _pendingChanges,
      virtualList: visible.items
    })

    SafeToast.success(`已改为${newStatus === 'present' ? '到课' : '缺课'}`)
  },

  /**
     * 保存修改到云端
     */
  async saveChanges() {
    const { recordId, record, _pendingChanges } = this.data

    this.setData({ saving: true })

    try {
      const result = await request.callApi('attendance', 'updateRecords', {
        recordId,
        records: record.records,
        changes: _pendingChanges  // 传递变更信息用于通知班主任
      }, { showLoading: false, showError: false })

      if (result.success) {
        SafeToast.success('保存成功')
        this.setData({ hasChanges: false, _pendingChanges: [] })
      } else {
        SafeToast.fail(result.message || '保存失败')
      }
    } catch (error) {
      console.error('保存失败:', error)
      SafeToast.fail('保存失败')
    } finally {
      this.setData({ saving: false })
    }
  }
})
