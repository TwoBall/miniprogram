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
    saving: false
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
      Toast('记录不存在')
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    }
  },

  /**
   * 应用记录数据到页面
   * @param {Object} record - 考勤记录
   */
  applyRecordData(record) {
    const presentCount = record.records.filter(r => r.status === 'present').length
    const absentCount = record.records.filter(r => r.status === 'absent').length

    this.setData({
      record,
      presentCount,
      absentCount,
      loading: false
    })
  },

  /**
     * 加载点名记录详情
     * @param {string} recordId - 记录ID
     */
  async loadRecordDetail(recordId) {
    try {
      await SafeToast.loading({ message: '加载中...' })

      const result = await request.callCloud('attendance', {
        action: 'getDetail',
        recordId: recordId
      }, { showLoading: false, showError: false })

      if (result.success && result.data) {
        const record = result.data
        const presentCount = record.records.filter(r => r.status === 'present').length
        const absentCount = record.records.filter(r => r.status === 'absent').length

        this.setData({
          record,
          presentCount,
          absentCount,
          loading: false
        })
      } else {
        Toast(result.message || '记录不存在')
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      }
    } catch (error) {
      console.error('加载记录详情失败:', error)
      Toast('加载失败')
      this.setData({ loading: false })
    } finally {
      SafeToast.clear()
    }
  },

  /**
     * 切换学生状态
     */
  toggleStudentStatus(e) {
    const index = e.currentTarget.dataset.index
    const { record, presentCount, absentCount } = this.data

    const student = record.records[index]
    const oldStatus = student.status
    const newStatus = oldStatus === 'present' ? 'absent' : 'present'

    record.records[index].status = newStatus

    this.setData({
      record,
      presentCount: oldStatus === 'present' ? presentCount - 1 : presentCount + 1,
      absentCount: oldStatus === 'absent' ? absentCount - 1 : absentCount + 1,
      hasChanges: true
    })

    Toast(`已改为${newStatus === 'present' ? '到课' : '缺课'}`)
  },

  /**
     * 保存修改到云端
     */
  async saveChanges() {
    const { recordId, record } = this.data

    this.setData({ saving: true })

    try {
      const result = await request.callCloud('attendance', {
        action: 'updateRecords',
        recordId,
        records: record.records
      }, { showLoading: false, showError: false })

      if (result.success) {
        SafeToast.success('保存成功')
        this.setData({ hasChanges: false })
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
