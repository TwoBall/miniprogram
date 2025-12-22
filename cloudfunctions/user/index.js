// 云函数入口文件 - 用户管理统一接口
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

// 云函数入口函数
exports.main = async (event, context) => {
    const { action } = event
    const wxContext = cloud.getWXContext()

    const handlers = {
        login: handleLogin,
        register: handleRegister,
        approve: handleApprove,
        reject: handleApprove, // 使用同一个处理函数
        getPending: handleGetPending
    }

    const handler = handlers[action]
    if (!handler) {
        return { success: false, message: '无效的操作类型' }
    }

    return handler(event, wxContext)
}

// ========== 登录 ==========
async function handleLogin(event, wxContext) {
    try {
        const openid = wxContext.OPENID
        if (!openid) {
            return { success: false, message: '获取用户信息失败' }
        }

        // 获取该 openid 下的所有账号记录
        const userRes = await db.collection('users')
            .where({ openid })
            .field({ _id: true, openid: true, name: true, role: true, department: true, className: true, clubName: true, status: true })
            .get()

        if (userRes.data.length === 0) {
            return { success: true, needRegister: true, openid }
        }

        const users = userRes.data
        const approvedUsers = users.filter(u => u.status === 'approved')
        const pendingUsers = users.filter(u => u.status === 'pending')

        // 逻辑调整：
        // 1. 如果有审核通过的账号，返回所有通过的账号供选择（或者直接进入，如果只有一个）
        // 2. 如果没有通过的，但有审核中的，提示审核中
        // 3. 如果只有拒绝的，允许去注册页（或者提示拒绝）

        if (approvedUsers.length > 0) {
            return {
                success: true,
                needRegister: false,
                status: 'approved',
                userList: approvedUsers.map(u => ({
                    _id: u._id,
                    openid: u.openid,
                    name: u.name,
                    role: u.role,
                    department: u.department || '',
                    className: u.className || '',
                    clubName: u.clubName || ''
                }))
            }
        }

        if (pendingUsers.length > 0) {
            return { success: true, needRegister: false, status: 'pending', message: '您的注册申请正在审核中' }
        }

        // 只有被拒绝的记录
        return { success: true, needRegister: true, message: '您的历史申请未通过，可以重新提交申请', openid }

    } catch (error) {
        console.error('登录失败:', error)
        return { success: false, message: '登录失败：' + error.message }
    }
}

// ========== 注册 ==========
async function handleRegister(event, wxContext) {
    const { openid, name, role, department, className, clubName } = event

    try {
        // 1. 检查该 openid 下是否已经有该角色的账号
        const sameRoleRes = await db.collection('users').where({ openid, role }).get()
        if (sameRoleRes.data.length > 0) {
            const user = sameRoleRes.data[0]
            if (user.status === 'approved') return { success: false, message: '您已拥有该角色权限' }
            if (user.status === 'pending') return { success: false, message: '该角色的注册申请正在审核中' }
            // 如果是被拒绝的，允许重新注册（这里逻辑可以根据需求调整，也可以更新原记录）
        }

        // 2. 检查是否存在匹配的预注册账号（没有 openid 或 openid 为空）
        const preRegQuery = {
            name,
            role,
            openid: _.or(_.exists(false), _.eq(null), _.eq(''))
        }

        if (role === 'classTeacher') {
            preRegQuery.className = className
            // 班主任只需匹配班级，不需要匹配学部
        } else if (role === 'leader') {
            preRegQuery.department = department
        } else if (role === 'teacher') {
            preRegQuery.clubName = clubName
        }

        console.log('预注册匹配查询条件:', JSON.stringify(preRegQuery))
        const preRegUsers = await db.collection('users').where(preRegQuery).get()
        console.log('预注册匹配结果:', preRegUsers.data.length, '条')

        if (preRegUsers.data.length > 0) {
            const userId = preRegUsers.data[0]._id
            await db.collection('users').doc(userId).update({
                data: {
                    openid,
                    updateTime: db.serverDate()
                }
            })
            return {
                success: true,
                message: '已成功关联预注册账号',
                data: { _id: userId, isPreReg: true }
            }
        }

        // 3. 创建新的申请记录
        const result = await db.collection('users').add({
            data: {
                openid,
                name,
                role,
                department: department || '',
                className: className || '',
                clubName: clubName || '',
                status: 'pending',
                createTime: db.serverDate(),
                updateTime: db.serverDate()
            }
        })

        return { success: true, message: '注册申请已提交，请等待审核', data: { _id: result._id } }
    } catch (error) {
        console.error('注册失败:', error)
        return { success: false, message: '注册失败：' + error.message }
    }
}

// ========== 审批/拒绝 ==========
async function handleApprove(event, wxContext) {
    const { userId, action, rejectReason } = event
    const adminOpenid = wxContext.OPENID

    try {
        // 验证管理员权限
        const adminRes = await db.collection('users')
            .where({ openid: adminOpenid, role: 'admin', status: 'approved' })
            .field({ _id: true, name: true })
            .get()

        if (adminRes.data.length === 0) {
            return { success: false, message: '无权限执行此操作' }
        }

        const admin = adminRes.data[0]

        if (action === 'reject' && !rejectReason) {
            return { success: false, message: '拒绝时必须提供原因' }
        }

        const updateData = {
            status: action === 'approve' ? 'approved' : 'rejected',
            approvedBy: admin._id,
            approvedByName: admin.name,
            approvedTime: db.serverDate(),
            updateTime: db.serverDate()
        }

        if (action === 'reject') {
            updateData.rejectReason = rejectReason
        }

        const result = await db.collection('users').doc(userId).update({ data: updateData })

        if (result.stats.updated === 0) {
            return { success: false, message: '用户不存在或更新失败' }
        }

        return {
            success: true,
            message: action === 'approve' ? '审批通过' : '已拒绝',
            data: { userId, action, approvedBy: admin.name }
        }
    } catch (error) {
        console.error('审批失败:', error)
        return { success: false, message: '审批失败：' + error.message }
    }
}

// ========== 获取用户列表 ==========
async function handleGetPending(event, wxContext) {
    const { status } = event
    const adminOpenid = wxContext.OPENID

    try {
        // 可选：验证管理员权限
        const condition = { role: _.neq('admin') }
        if (status && status !== 'all') {
            condition.status = status
        }

        const result = await db.collection('users')
            .where(condition)
            .orderBy('createTime', 'desc')
            .limit(100)
            .get()

        return { success: true, data: result.data }
    } catch (error) {
        console.error('获取用户列表失败:', error)
        return { success: false, message: '获取用户列表失败', data: [] }
    }
}
