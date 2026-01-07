/**
 * @file 用户管理模块
 * @module api/modules/user
 * @description 处理用户登录、注册、审批等操作
 */
const {
    verifyAdmin,
    paginate,
    checkRateLimit,
    RATE_LIMIT_CONFIGS,
    ROLES,
    USER_STATUS,
    success,
    successWithPagination,
    fail,
    unauthorized,
    badRequest,
    notFound
} = require('../common')

/**
 * 前置钩子 - 权限验证
 * @param {string} action - 操作类型
 * @param {Object} data - 请求数据
 * @param {Object} ctx - 上下文
 * @returns {Object|null} 验证失败返回错误响应，成功返回 null
 */
async function beforeAction(action, data, ctx) {
    const { openid } = ctx

    // login 和 register 不需要验证
    if (['login', 'register'].includes(action)) {
        return null
    }

    // 其他操作需要 openid
    if (!openid) {
        return unauthorized('未授权访问')
    }

    return null
}

// ========== 处理函数 ==========

/**
 * 处理用户登录
 */
async function handleLogin(event, ctx) {
    const { db, openid } = ctx
    const _ = db.command

    try {
        if (!openid) {
            return fail('获取用户信息失败')
        }

        // 获取该 openid 下的所有账号记录（排除已删除的）
        const userRes = await db.collection('users')
            .where({ _openid: openid, deleted: _.neq(true) })
            .field({ _id: true, _openid: true, userName: true, role: true, department: true, className: true, clubName: true, status: true })
            .get()

        if (userRes.data.length === 0) {
            return { success: true, needRegister: true, openid }
        }

        const users = userRes.data
        const approvedUsers = users.filter(u => u.status === USER_STATUS.APPROVED)
        const pendingUsers = users.filter(u => u.status === USER_STATUS.PENDING)

        if (approvedUsers.length > 0) {
            return {
                success: true,
                needRegister: false,
                status: USER_STATUS.APPROVED,
                userList: approvedUsers.map(u => ({
                    _id: u._id,
                    _openid: u._openid,
                    userName: u.userName,
                    role: u.role,
                    department: u.department || '',
                    className: u.className || '',
                    clubName: u.clubName || '',
                    status: u.status
                }))
            }
        }

        if (pendingUsers.length > 0) {
            return { success: true, needRegister: false, status: USER_STATUS.PENDING, message: '您的注册申请正在审核中' }
        }

        return { success: true, needRegister: true, message: '您的历史申请未通过，可以重新提交申请', openid }
    } catch (error) {
        console.error('登录失败:', error)
        return fail('登录失败：' + error.message)
    }
}

/**
 * 处理用户注册
 */
async function handleRegister(event, ctx) {
    const { name, role, department, className, clubName } = event
    const { db, openid } = ctx
    const _ = db.command

    if (!openid) {
        return fail('获取用户信息失败')
    }

    try {
        const rateLimit = await checkRateLimit(db, openid, 'register', RATE_LIMIT_CONFIGS.register)
        if (!rateLimit.allowed) {
            return fail(rateLimit.message)
        }

        // 检查该 openid 下是否已有该角色的账号
        const sameRoleRes = await db.collection('users').where({ _openid: openid, role, deleted: _.neq(true) }).get()
        if (sameRoleRes.data.length > 0) {
            const user = sameRoleRes.data[0]
            if (user.status === USER_STATUS.APPROVED) return fail('您已拥有该角色权限')
            if (user.status === USER_STATUS.PENDING) return fail('该角色的注册申请正在审核中')
        }

        // 检查预注册账号
        const preRegQuery = {
            userName: name,
            role,
            _openid: _.or(_.exists(false), _.eq(null), _.eq(''))
        }

        if (role === 'classTeacher') {
            preRegQuery.className = className
        } else if (role === 'leader') {
            preRegQuery.department = department
        } else if (role === 'teacher') {
            preRegQuery.clubName = clubName
        }

        const preRegUsers = await db.collection('users').where(preRegQuery).get()

        if (preRegUsers.data.length > 0) {
            const userId = preRegUsers.data[0]._id
            await db.collection('users').doc(userId).update({
                data: {
                    _openid: openid,
                    updateTime: db.serverDate()
                }
            })
            return {
                success: true,
                message: '已成功关联预注册账号',
                data: { _id: userId, isPreReg: true }
            }
        }

        // 创建新的申请记录
        const result = await db.collection('users').add({
            data: {
                _openid: openid,
                userName: name,
                role,
                department: department || '',
                className: className || '',
                clubName: clubName || '',
                status: USER_STATUS.PENDING,
                createTime: db.serverDate(),
                updateTime: db.serverDate()
            }
        })

        return success({ _id: result._id }, '注册申请已提交，请等待审核')
    } catch (error) {
        console.error('注册失败:', error)
        return fail('注册失败：' + error.message)
    }
}

/**
 * 处理审批或拒绝操作
 */
async function handleApprove(event, ctx) {
    const { userId, action, rejectReason } = event
    const { db, openid } = ctx

    try {
        const admin = await verifyAdmin(db, openid)
        if (!admin) {
            return unauthorized('无权限执行此操作')
        }

        const rateLimit = await checkRateLimit(db, openid, 'approve', RATE_LIMIT_CONFIGS.approve)
        if (!rateLimit.allowed) {
            return fail(rateLimit.message)
        }

        if (action === 'reject' && !rejectReason) {
            return badRequest('拒绝时必须提供原因')
        }

        const userRes = await db.collection('users').doc(userId).get()
        if (!userRes.data) {
            return notFound('用户不存在')
        }
        const user = userRes.data

        const updateData = {
            status: action === 'approve' ? USER_STATUS.APPROVED : USER_STATUS.REJECTED,
            approvedBy: admin._id,
            approvedByName: admin.userName,
            approvedTime: db.serverDate(),
            updateTime: db.serverDate()
        }

        if (action === 'reject') {
            updateData.rejectReason = rejectReason
        }

        const result = await db.collection('users').doc(userId).update({ data: updateData })

        if (result.stats.updated === 0) {
            return fail('用户不存在或更新失败')
        }

        // 发送审批结果通知
        if (user._openid) {
            const roleNames = {
                teacher: '社团老师',
                classTeacher: '班主任',
                leader: '学部领导',
                admin: '管理员'
            }
            const roleName = roleNames[user.role] || user.role

            const title = action === 'approve' ? '注册审批通过' : '注册申请被拒绝'
            const content = action === 'approve'
                ? `恭喜！您的 ${roleName} 注册申请已通过审批，现在可以使用系统了。`
                : `抱歉，您的 ${roleName} 注册申请未通过。原因：${rejectReason}`

            await db.collection('notifications').add({
                data: {
                    type: 'register_result',
                    recipientId: user._openid,
                    title,
                    content,
                    data: {
                        userId,
                        userName: user.userName,
                        role: user.role,
                        action,
                        rejectReason: rejectReason || ''
                    },
                    read: false,
                    createTime: db.serverDate()
                }
            })
        }

        return success(
            { userId, action, approvedBy: admin.userName },
            action === 'approve' ? '审批通过' : '已拒绝'
        )
    } catch (error) {
        console.error('审批失败:', error)
        return fail('审批失败：' + error.message)
    }
}

/**
 * 获取待审批用户列表
 */
async function handleGetPending(event, ctx) {
    const { status, page = 1, pageSize = 20 } = event
    const { db, openid } = ctx
    const _ = db.command

    try {
        const admin = await verifyAdmin(db, openid)
        if (!admin) {
            return unauthorized('无权限执行此操作')
        }

        const condition = { role: _.neq('admin') }
        if (status && status !== 'all') {
            condition.status = status
        }

        const countRes = await db.collection('users').where(condition).count()
        const total = countRes.total

        const skip = (page - 1) * pageSize
        const result = await db.collection('users')
            .where(condition)
            .orderBy('createTime', 'desc')
            .skip(skip)
            .limit(pageSize)
            .get()

        return successWithPagination(result.data, { page, pageSize, total, hasMore: skip + result.data.length < total })
    } catch (error) {
        console.error('获取用户列表失败:', error)
        return fail('获取用户列表失败')
    }
}

/**
 * 一次性获取所有状态的用户列表
 */
async function handleGetAllByStatus(event, ctx) {
    const { pendingPageSize = 100, approvedPageSize = 20, rejectedPageSize = 20 } = event
    const { db, openid } = ctx
    const _ = db.command

    try {
        const admin = await verifyAdmin(db, openid)
        if (!admin) {
            return unauthorized('无权限执行此操作')
        }

        const baseCondition = { role: _.neq('admin') }

        const [pendingRes, approvedRes, rejectedRes, pendingCount, approvedCount, rejectedCount] = await Promise.all([
            db.collection('users').where({ ...baseCondition, status: USER_STATUS.PENDING }).orderBy('createTime', 'desc').limit(pendingPageSize).get(),
            db.collection('users').where({ ...baseCondition, status: USER_STATUS.APPROVED }).orderBy('createTime', 'desc').limit(approvedPageSize).get(),
            db.collection('users').where({ ...baseCondition, status: USER_STATUS.REJECTED }).orderBy('createTime', 'desc').limit(rejectedPageSize).get(),
            db.collection('users').where({ ...baseCondition, status: USER_STATUS.PENDING }).count(),
            db.collection('users').where({ ...baseCondition, status: USER_STATUS.APPROVED }).count(),
            db.collection('users').where({ ...baseCondition, status: USER_STATUS.REJECTED }).count()
        ])

        return {
            success: true,
            pending: { data: pendingRes.data, total: pendingCount.total, hasMore: pendingRes.data.length < pendingCount.total },
            approved: { data: approvedRes.data, total: approvedCount.total, hasMore: approvedRes.data.length < approvedCount.total },
            rejected: { data: rejectedRes.data, total: rejectedCount.total, hasMore: rejectedRes.data.length < rejectedCount.total }
        }
    } catch (error) {
        console.error('获取所有状态用户列表失败:', error)
        return fail('获取用户列表失败')
    }
}

/**
 * 获取所有用户（管理员专用）
 */
async function handleGetAll(event, ctx) {
    const { role, status, keyword, page = 1, pageSize = 20 } = event
    const { db, openid } = ctx
    const _ = db.command

    try {
        const admin = await verifyAdmin(db, openid)
        if (!admin) {
            return unauthorized('无权限执行此操作')
        }

        const condition = { deleted: _.neq(true) }
        if (role) condition.role = role
        if (status) condition.status = status

        if (keyword && keyword.trim()) {
            const searchRegex = db.RegExp({ regexp: keyword.trim(), options: 'i' })
            condition._or = [
                { userName: searchRegex },
                { department: searchRegex },
                { className: searchRegex },
                { clubName: searchRegex }
            ]
        }

        const countRes = await db.collection('users').where(condition).count()
        const total = countRes.total

        const skip = (page - 1) * pageSize
        const result = await db.collection('users')
            .where(condition)
            .orderBy('createTime', 'desc')
            .skip(skip)
            .limit(pageSize)
            .get()

        return successWithPagination(result.data, { page, pageSize, total, hasMore: skip + result.data.length < total })
    } catch (error) {
        console.error('获取用户列表失败:', error)
        return fail('获取用户列表失败：' + error.message)
    }
}

/**
 * 添加用户（管理员专用）
 */
async function handleAdd(event, ctx) {
    const { userName, role, department, className, clubName } = event
    const { db, openid } = ctx

    try {
        const admin = await verifyAdmin(db, openid)
        if (!admin) {
            return unauthorized('无权限执行此操作')
        }

        if (!userName || !userName.trim()) {
            return badRequest('请输入用户姓名')
        }

        const result = await db.collection('users').add({
            data: {
                userName: userName.trim(),
                role,
                department: department || '',
                className: className || '',
                clubName: clubName || '',
                status: USER_STATUS.APPROVED,
                approvedBy: admin._id,
                approvedByName: admin.userName,
                approvedTime: db.serverDate(),
                createTime: db.serverDate(),
                updateTime: db.serverDate()
            }
        })

        return success({ _id: result._id }, '用户添加成功')
    } catch (error) {
        console.error('添加用户失败:', error)
        return fail('添加用户失败：' + error.message)
    }
}

/**
 * 删除用户（管理员专用）
 */
async function handleDelete(event, ctx) {
    const { userId } = event
    const { db, openid } = ctx

    try {
        const admin = await verifyAdmin(db, openid)
        if (!admin) {
            return unauthorized('无权限执行此操作')
        }

        const targetUser = await db.collection('users').doc(userId).get()
        if (!targetUser.data) {
            return notFound('用户不存在')
        }

        if (targetUser.data.role === ROLES.ADMIN) {
            return fail('不能删除管理员账号')
        }

        const result = await db.collection('users').doc(userId).update({
            data: {
                deleted: true,
                deletedTime: db.serverDate(),
                updateTime: db.serverDate()
            }
        })

        if (result.stats.updated === 0) {
            return fail('删除失败')
        }

        return success(null, '用户已删除')
    } catch (error) {
        console.error('删除用户失败:', error)
        return fail('删除用户失败：' + error.message)
    }
}

/**
 * 更新用户信息（管理员专用）
 */
async function handleUpdate(event, ctx) {
    const { userId, updates } = event
    const { db, openid } = ctx

    try {
        const admin = await verifyAdmin(db, openid)
        if (!admin) {
            return unauthorized('无权限执行此操作')
        }

        const allowedFields = ['userName', 'role', 'department', 'className', 'clubName', 'status']
        const updateData = {}
        for (const key of allowedFields) {
            if (updates[key] !== undefined) {
                updateData[key] = updates[key]
            }
        }

        if (Object.keys(updateData).length === 0) {
            return badRequest('没有可更新的字段')
        }

        updateData.updateTime = db.serverDate()

        const result = await db.collection('users').doc(userId).update({ data: updateData })

        if (result.stats.updated === 0) {
            return fail('用户不存在或更新失败')
        }

        return success(null, '用户信息已更新')
    } catch (error) {
        console.error('更新用户失败:', error)
        return fail('更新用户失败：' + error.message)
    }
}

/**
 * 获取用户统计数据
 */
async function handleGetStats(event, ctx) {
    const { db, openid } = ctx
    const _ = db.command

    try {
        const admin = await verifyAdmin(db, openid)
        if (!admin) {
            return unauthorized('无权限执行此操作')
        }

        const baseCondition = { deleted: _.neq(true) }

        const [totalRes, pendingRes, approvedRes, rejectedRes] = await Promise.all([
            db.collection('users').where(baseCondition).count(),
            db.collection('users').where({ ...baseCondition, status: USER_STATUS.PENDING }).count(),
            db.collection('users').where({ ...baseCondition, status: USER_STATUS.APPROVED }).count(),
            db.collection('users').where({ ...baseCondition, status: USER_STATUS.REJECTED }).count()
        ])

        return success({
            total: totalRes.total,
            pending: pendingRes.total,
            approved: approvedRes.total,
            rejected: rejectedRes.total
        })
    } catch (error) {
        console.error('获取用户统计失败:', error)
        return fail('获取用户统计失败：' + error.message)
    }
}

// 导出模块
module.exports = {
    beforeAction,
    handlers: {
        login: handleLogin,
        register: handleRegister,
        approve: handleApprove,
        reject: handleApprove,
        getPending: handleGetPending,
        getAllByStatus: handleGetAllByStatus,
        getAll: handleGetAll,
        getStats: handleGetStats,
        add: handleAdd,
        delete: handleDelete,
        update: handleUpdate
    }
}
