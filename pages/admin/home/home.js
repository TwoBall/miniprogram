const app = getApp()
import Toast from '@vant/weapp/toast/toast'

Page({
    data: {
        adminInfo: null,
        currentRole: 'admin',
        debugRoles: [
            { key: 'admin', name: '系统管理员', icon: 'setting-o', color: '#722ed1', desc: '用户审批管理' },
            { key: 'teacher', name: '社团老师', icon: 'friends-o', color: '#1890ff', desc: '社团点名' },
            { key: 'classTeacher', name: '班主任', icon: 'home-o', color: '#52c41a', desc: '班级考勤查看' },
            { key: 'leader', name: '学部领导', icon: 'cluster-o', color: '#fa8c16', desc: '学部数据统计' }
        ],
        // 测试用的模拟数据
        testData: {
            teacher: { clubName: '测试社团' },
            classTeacher: { className: '测试班级' },
            leader: { department: '测试学部' }
        }
    },

    onLoad() {
        this.checkAuth()
    },

    onShow() {
        this.checkAuth()
    },

    checkAuth() {
        const userInfo = wx.getStorageSync('userInfo')
        if (!userInfo || userInfo.role !== 'admin') {
            Toast.fail('无权限访问')
            setTimeout(() => {
                wx.reLaunch({
                    url: '/pages/login/login'
                })
            }, 1500)
            return
        }
        this.setData({ adminInfo: userInfo })
    },

    // 切换到指定角色页面（调试模式）
    switchToRole(e) {
        const role = e.currentTarget.dataset.role
        const adminInfo = this.data.adminInfo
        const testData = this.data.testData

        // 根据角色跳转到对应页面
        const routes = {
            'admin': '/pages/admin/approval/approval',
            'teacher': '/pages/teacher/attendance/attendance',
            'classTeacher': '/pages/classTeacher/overview/overview',
            'leader': '/pages/leader/dashboard/dashboard'
        }

        // 如果不是 admin 角色，需要临时修改 userInfo
        if (role !== 'admin') {
            // 创建一个临时的调试用户信息
            const debugUserInfo = {
                ...adminInfo,
                role: role,
                _originalRole: 'admin',  // 保存原始角色
                _isDebugMode: true,       // 标记为调试模式
                clubName: testData.teacher.clubName,
                className: testData.classTeacher.className,
                department: testData.leader.department
            }

            wx.setStorageSync('userInfo', debugUserInfo)
            app.globalData.userInfo = debugUserInfo
            app.globalData.userRole = role

            Toast.success(`已切换到${this.getRoleName(role)}模式`)
        }

        setTimeout(() => {
            wx.reLaunch({
                url: routes[role]
            })
        }, 500)
    },

    getRoleName(role) {
        const names = {
            'admin': '系统管理员',
            'teacher': '社团老师',
            'classTeacher': '班主任',
            'leader': '学部领导'
        }
        return names[role] || role
    },

    // 前往审批页面
    goToApproval() {
        wx.navigateTo({
            url: '/pages/admin/approval/approval'
        })
    },

    // 退出登录
    logout() {
        wx.showModal({
            title: '确认退出',
            content: '确定要退出登录吗？',
            success: (res) => {
                if (res.confirm) {
                    wx.removeStorageSync('userInfo')
                    app.globalData.userInfo = null
                    app.globalData.userRole = null

                    wx.reLaunch({
                        url: '/pages/login/login'
                    })
                }
            }
        })
    }
})
