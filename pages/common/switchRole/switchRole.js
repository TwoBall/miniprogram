const app = getApp()
import Toast from '@vant/weapp/toast/toast'

Page({
    data: {
        roles: [],
        currentRole: null,
        loading: true,
        hasMultipleRoles: false
    },

    onLoad() {
        this.loadRoles()
    },

    onShow() {
        // 每次显示时刷新，因为可能刚注册了新角色
        this.loadRoles()
    },

    loadRoles() {
        const userInfo = wx.getStorageSync('userInfo')
        const allRoles = wx.getStorageSync('allUserRoles') || []

        // 如果 storage 没有角色列表，从云端获取
        if (allRoles.length === 0) {
            this.fetchRolesFromCloud()
            return
        }

        const roleLabels = {
            'admin': '系统管理员',
            'teacher': '社团老师',
            'classTeacher': '班主任',
            'leader': '学部领导'
        }

        const roles = allRoles.map(r => ({
            ...r,
            roleLabel: roleLabels[r.role] || r.role,
            isCurrent: userInfo && userInfo._id === r._id,
            extraInfo: r.clubName || r.className || r.department || ''
        }))

        this.setData({
            roles,
            currentRole: userInfo,
            loading: false,
            hasMultipleRoles: roles.length > 1
        })
    },

    async fetchRolesFromCloud() {
        try {
            const res = await wx.cloud.callFunction({
                name: 'user',
                data: { action: 'login' }
            })

            if (res.result.success && res.result.userList) {
                wx.setStorageSync('allUserRoles', res.result.userList)
                this.loadRoles()
            } else {
                this.setData({ loading: false })
                Toast.fail('获取角色失败')
            }
        } catch (error) {
            console.error('获取角色失败:', error)
            this.setData({ loading: false })
            Toast.fail('获取角色失败')
        }
    },

    switchRole(e) {
        const role = e.currentTarget.dataset.role

        if (role._id === this.data.currentRole?._id) {
            Toast('当前已是该身份')
            return
        }

        // 切换角色
        wx.setStorageSync('userInfo', role)
        app.globalData.userInfo = role
        app.globalData.userRole = role.role

        Toast.success('切换成功')

        // 跳转到对应页面
        setTimeout(() => {
            this.redirectByRole(role.role)
        }, 1000)
    },

    redirectByRole(role) {
        const routes = {
            'admin': '/pages/admin/approval/approval',
            'teacher': '/pages/teacher/attendance/attendance',
            'classTeacher': '/pages/classTeacher/overview/overview',
            'leader': '/pages/leader/dashboard/dashboard'
        }

        wx.reLaunch({
            url: routes[role] || '/pages/teacher/attendance/attendance'
        })
    },

    addNewRole() {
        // 获取已有的具体社团、班级、学部（而不是角色类型）
        const roles = this.data.roles
        // 社团老师：过滤已注册的社团
        const existingClubs = roles.filter(r => r.clubName).map(r => r.clubName)
        // 班主任：过滤已注册的班级
        const existingClasses = roles.filter(r => r.className).map(r => r.className)
        // 学部领导：只有 leader 角色才过滤学部，班主任虽然有 department 字段但不应过滤学部
        const existingDepartments = roles.filter(r => r.role === 'leader' && r.department).map(r => r.department)
        const openid = roles[0]?.openid || ''

        // 传递已有的具体选项
        let url = `/pages/register/register?openid=${openid}`
        if (existingClubs.length > 0) url += `&existingClubs=${existingClubs.join(',')}`
        if (existingClasses.length > 0) url += `&existingClasses=${existingClasses.join(',')}`
        if (existingDepartments.length > 0) url += `&existingDepartments=${existingDepartments.join(',')}`

        wx.navigateTo({ url })
    },

    goBack() {
        wx.navigateBack()
    }
})
