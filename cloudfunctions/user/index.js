/**
 * 云函数 - 用户管理
 * 处理用户登录、注册、审批等操作
 */
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

/**
 * 云函数入口
 * @param {Object} event - 请求参数
 * @param {string} event.action - 操作类型: login/register/approve/reject/getPending
 */
exports.main = async (event, context) => {
    const { action } = event
    const wxContext = cloud.getWXContext()

    const handlers = {
        login: handleLogin,
        register: handleRegister,
        approve: handleApprove,
        reject: handleApprove, // 使用同一个处理函数
        getPending: handleGetPending,
        getAllByStatus: handleGetAllByStatus,
        getAll: handleGetAll,
        add: handleAdd,
        delete: handleDelete,
        update: handleUpdate
    }

    const handler = handlers[action]
    if (!handler) {
        return { success: false, message: '无效的操作类型' }
    }

    return handler(event, wxContext)
}

/**
 * 处理用户登录
 * 根据openid查询用户记录并返回审核状态
 */
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

/**
 * 处理用户注册
 * 检查预注册账号或创建新的注册申请
 */
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

        const preRegUsers = await db.collection('users').where(preRegQuery).get()

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

/**
 * 处理审批或拒绝操作
 * 验证管理员权限并更新用户状态
 */
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

/**
 * 获取用户列表
 * 支持按状态筛选和分页
 * @param {string} status - 状态筛选: pending/approved/rejected/all
 * @param {number} page - 页码，从1开始，默认1
 * @param {number} pageSize - 每页数量，默认20
 */
async function handleGetPending(event, wxContext) {
    const { status, page = 1, pageSize = 20 } = event

    try {
        const condition = { role: _.neq('admin') }
        if (status && status !== 'all') {
            condition.status = status
        }

        // 获取总数
        const countRes = await db.collection('users')
            .where(condition)
            .count()
        const total = countRes.total

        // 计算跳过的记录数
        const skip = (page - 1) * pageSize

        const result = await db.collection('users')
            .where(condition)
            .orderBy('createTime', 'desc')
            .skip(skip)
            .limit(pageSize)
            .get()

        return {
            success: true,
            data: result.data,
            pagination: {
                page,
                pageSize,
                total,
                hasMore: skip + result.data.length < total
            }
        }
    } catch (error) {
        console.error('获取用户列表失败:', error)
        return { success: false, message: '获取用户列表失败', data: [], pagination: { page: 1, pageSize, total: 0, hasMore: false } }
    }
}

/**
 * 一次性获取所有状态的用户列表
 * 减少云函数调用次数，提升性能
 * @param {number} pendingPageSize - 待审批列表每页数量（通常需要全部加载）
 * @param {number} approvedPageSize - 已通过列表每页数量
 * @param {number} rejectedPageSize - 已拒绝列表每页数量
 */
async function handleGetAllByStatus(event, _wxContext) {
    const {
        pendingPageSize = 100,
        approvedPageSize = 20,
        rejectedPageSize = 20
    } = event

    try {
        const baseCondition = { role: _.neq('admin') }

        // 并行查询三种状态
        const [pendingRes, approvedRes, rejectedRes, pendingCount, approvedCount, rejectedCount] = await Promise.all([
            // 待审批列表
            db.collection('users')
                .where({ ...baseCondition, status: 'pending' })
                .orderBy('createTime', 'desc')
                .limit(pendingPageSize)
                .get(),
            // 已通过列表
            db.collection('users')
                .where({ ...baseCondition, status: 'approved' })
                .orderBy('createTime', 'desc')
                .limit(approvedPageSize)
                .get(),
            // 已拒绝列表
            db.collection('users')
                .where({ ...baseCondition, status: 'rejected' })
                .orderBy('createTime', 'desc')
                .limit(rejectedPageSize)
                .get(),
            // 各状态总数
            db.collection('users').where({ ...baseCondition, status: 'pending' }).count(),
            db.collection('users').where({ ...baseCondition, status: 'approved' }).count(),
            db.collection('users').where({ ...baseCondition, status: 'rejected' }).count()
        ])

        return {
            success: true,
            pending: {
                data: pendingRes.data,
                total: pendingCount.total,
                hasMore: pendingRes.data.length < pendingCount.total
            },
            approved: {
                data: approvedRes.data,
                total: approvedCount.total,
                hasMore: approvedRes.data.length < approvedCount.total
            },
            rejected: {
                data: rejectedRes.data,
                total: rejectedCount.total,
                hasMore: rejectedRes.data.length < rejectedCount.total
            }
        }
    } catch (error) {
        console.error('获取所有状态用户列表失败:', error)
        return {
            success: false,
            message: '获取用户列表失败',
            pending: { data: [], total: 0, hasMore: false },
            approved: { data: [], total: 0, hasMore: false },
            rejected: { data: [], total: 0, hasMore: false }
        }
    }
}

/**
 * 获取所有用户（管理员专用）
 * 支持按角色、状态筛选和分页
 * @param {string} role - 角色筛选（可选）
 * @param {string} status - 状态筛选（可选）
 * @param {number} page - 页码
 * @param {number} pageSize - 每页数量
 */
async function handleGetAll(event, wxContext) {
    const { role, status, page = 1, pageSize = 20 } = event
    const adminOpenid = wxContext.OPENID

    try {
        // 验证管理员权限
        const adminRes = await db.collection('users')
            .where({ openid: adminOpenid, role: 'admin', status: 'approved' })
            .field({ _id: true })
            .get()

        if (adminRes.data.length === 0) {
            return { success: false, message: '无权限执行此操作' }
        }

        // 构建查询条件
        const condition = { deleted: _.neq(true) }
        if (role) condition.role = role
        if (status) condition.status = status

        // 获取总数
        const countRes = await db.collection('users').where(condition).count()
        const total = countRes.total

        // 分页查询
        const skip = (page - 1) * pageSize
        const result = await db.collection('users')
            .where(condition)
            .orderBy('createTime', 'desc')
            .skip(skip)
            .limit(pageSize)
            .get()

        return {
            success: true,
            data: result.data,
            pagination: {
                page,
                pageSize,
                total,
                hasMore: skip + result.data.length < total
            }
        }
    } catch (error) {
        console.error('获取用户列表失败:', error)
        return { success: false, message: '获取用户列表失败：' + error.message }
    }
}

/**
 * 添加用户（管理员专用）
 * 管理员可直接创建已审批的用户账号
 */
async function handleAdd(event, wxContext) {
    const { name, role, department, className, clubName } = event
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

        // 创建预注册账号（无 openid，等待用户关联）
        const result = await db.collection('users').add({
            data: {
                name,
                role,
                department: department || '',
                className: className || '',
                clubName: clubName || '',
                status: 'approved',
                approvedBy: admin._id,
                approvedByName: admin.name,
                approvedTime: db.serverDate(),
                createTime: db.serverDate(),
                updateTime: db.serverDate()
            }
        })

        return {
            success: true,
            message: '用户添加成功',
            data: { _id: result._id }
        }
    } catch (error) {
        console.error('添加用户失败:', error)
        return { success: false, message: '添加用户失败：' + error.message }
    }
}

/**
 * 删除用户（管理员专用）
 * 使用软删除，标记 deleted 字段
 */
async function handleDelete(event, wxContext) {
    const { userId } = event
    const adminOpenid = wxContext.OPENID

    try {
        // 验证管理员权限
        const adminRes = await db.collection('users')
            .where({ openid: adminOpenid, role: 'admin', status: 'approved' })
            .field({ _id: true })
            .get()

        if (adminRes.data.length === 0) {
            return { success: false, message: '无权限执行此操作' }
        }

        // 检查是否为管理员账号
        const targetUser = await db.collection('users').doc(userId).get()
        if (!targetUser.data) {
            return { success: false, message: '用户不存在' }
        }

        if (targetUser.data.role === 'admin') {
            return { success: false, message: '不能删除管理员账号' }
        }

        // 软删除
        const result = await db.collection('users').doc(userId).update({
            data: {
                deleted: true,
                deletedTime: db.serverDate(),
                updateTime: db.serverDate()
            }
        })

        if (result.stats.updated === 0) {
            return { success: false, message: '删除失败' }
        }

        return { success: true, message: '用户已删除' }
    } catch (error) {
        console.error('删除用户失败:', error)
        return { success: false, message: '删除用户失败：' + error.message }
    }
}

/**
 * 更新用户信息（管理员专用）
 */
async function handleUpdate(event, wxContext) {
    const { userId, updates } = event
    const adminOpenid = wxContext.OPENID

    try {
        // 验证管理员权限
        const adminRes = await db.collection('users')
            .where({ openid: adminOpenid, role: 'admin', status: 'approved' })
            .field({ _id: true })
            .get()

        if (adminRes.data.length === 0) {
            return { success: false, message: '无权限执行此操作' }
        }

        // 防止修改敏感字段
        const allowedFields = ['name', 'role', 'department', 'className', 'clubName', 'status']
        const updateData = {}
        for (const key of allowedFields) {
            if (updates[key] !== undefined) {
                updateData[key] = updates[key]
            }
        }

        if (Object.keys(updateData).length === 0) {
            return { success: false, message: '没有可更新的字段' }
        }

        updateData.updateTime = db.serverDate()

        const result = await db.collection('users').doc(userId).update({
            data: updateData
        })

        if (result.stats.updated === 0) {
            return { success: false, message: '用户不存在或更新失败' }
        }

        return { success: true, message: '用户信息已更新' }
    } catch (error) {
        console.error('更新用户失败:', error)
        return { success: false, message: '更新用户失败：' + error.message }
    }
}
