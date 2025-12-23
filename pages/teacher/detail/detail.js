const auth = require('../../../utils/auth')
import Toast from '@vant/weapp/toast/toast'

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
            this.loadRecordDetail(options.recordId)
        } else {
            Toast('记录不存在')
            setTimeout(() => {
                wx.navigateBack()
            }, 1500)
        }
    },

    /**
     * 加载点名记录详情
     * @param {string} recordId - 记录ID
     */
    async loadRecordDetail(recordId) {
        try {
            wx.showLoading({ title: '加载中...' })

            const res = await wx.cloud.callFunction({
                name: 'attendance',
                data: {
                    action: 'getDetail',
                    recordId: recordId
                }
            })

            if (res.result.success && res.result.data) {
                const record = res.result.data
                const presentCount = record.records.filter(r => r.status === 'present').length
                const absentCount = record.records.filter(r => r.status === 'absent').length

                this.setData({
                    record,
                    presentCount,
                    absentCount,
                    loading: false
                })
            } else {
                Toast(res.result.message || '记录不存在')
                setTimeout(() => {
                    wx.navigateBack()
                }, 1500)
            }
        } catch (error) {
            console.error('加载记录详情失败:', error)
            Toast('加载失败')
            this.setData({ loading: false })
        } finally {
            wx.hideLoading()
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
            const res = await wx.cloud.callFunction({
                name: 'attendance',
                data: {
                    action: 'updateRecords',
                    recordId,
                    records: record.records
                }
            })

            if (res.result.success) {
                Toast.success('保存成功')
                this.setData({ hasChanges: false })
            } else {
                Toast.fail(res.result.message || '保存失败')
            }
        } catch (error) {
            console.error('保存失败:', error)
            Toast.fail('保存失败')
        } finally {
            this.setData({ saving: false })
        }
    }
})
