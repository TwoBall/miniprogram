const app = getApp()
const db = wx.cloud.database()

Page({
    data: {
        recordId: '',
        record: null,
        presentCount: 0,
        absentCount: 0,
        loading: true
    },

    onLoad(options) {
        this.checkAuth()
        if (options.recordId) {
            this.setData({ recordId: options.recordId })
            this.loadRecordDetail(options.recordId)
        } else {
            wx.showToast({
                title: '记录不存在',
                icon: 'none'
            })
            setTimeout(() => {
                wx.navigateBack()
            }, 1500)
        }
    },

    checkAuth() {
        const userInfo = wx.getStorageSync('userInfo')
        if (!userInfo || userInfo.role !== 'teacher') {
            wx.reLaunch({
                url: '/pages/login/login'
            })
        }
    },

    async loadRecordDetail(recordId) {
        try {
            wx.showLoading({ title: '加载中...' })

            // 调用云函数获取记录详情
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
                wx.showToast({
                    title: res.result.message || '记录不存在',
                    icon: 'none'
                })
                setTimeout(() => {
                    wx.navigateBack()
                }, 1500)
            }
        } catch (error) {
            console.error('加载记录详情失败:', error)
            wx.showToast({
                title: '加载失败',
                icon: 'none'
            })
            this.setData({ loading: false })
        } finally {
            wx.hideLoading()
        }
    }
})
