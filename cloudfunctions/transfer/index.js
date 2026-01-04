/**
 * @file 转社团申请管理云函数 - 处理学生转社团的申请、审批和确认流程
 * @module cloudfunctions/transfer
 */
const cloud = require('wx-server-sdk')
const {
  ROLES,
  success,
  successWithPagination,
  fail,
  unauthorized,
  badRequest
} = require('./common')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// ========== 状态机定义 ==========
/**
 * 转社团申请状态机
 * 定义所有有效的状态流转路径
 */
const TRANSFER_STATUS = {
  PENDING_TEACHER: 'pending_teacher',           // 待老师确认
  PENDING_CLASS_TEACHER: 'pending_classTeacher', // 待班主任审批
  APPROVED: 'approved',                          // 已通过（终态）
  REJECTED: 'rejected'                           // 已拒绝（终态）
}

/**
 * 状态流转规则
 * key: 当前状态
 * value: 允许流转到的状态数组
 */
const STATE_TRANSITIONS = {
  [TRANSFER_STATUS.PENDING_TEACHER]: [
    TRANSFER_STATUS.PENDING_CLASS_TEACHER, // 双方老师都确认后
    TRANSFER_STATUS.REJECTED               // 任意老师拒绝
  ],
  [TRANSFER_STATUS.PENDING_CLASS_TEACHER]: [
    TRANSFER_STATUS.APPROVED,              // 班主任通过
    TRANSFER_STATUS.REJECTED               // 班主任拒绝
  ],
  [TRANSFER_STATUS.APPROVED]: [],          // 终态，不可流转
  [TRANSFER_STATUS.REJECTED]: []           // 终态，不可流转
}

/**
 * 验证状态流转是否合法
 * @param {string} currentStatus - 当前状态
 * @param {string} newStatus - 目标状态
 * @returns {boolean} 是否允许流转
 */
function canTransition(currentStatus, newStatus) {
  const validNextStates = STATE_TRANSITIONS[currentStatus]
  if (!validNextStates) {
    console.error(`[状态机] 未知状态: ${currentStatus}`)
    return false
  }
  const allowed = validNextStates.includes(newStatus)
  if (!allowed) {
    console.warn(`[状态机] 非法状态流转: ${currentStatus} -> ${newStatus}`)
  }
  return allowed
}

/**
 * 检查是否为终态
 * @param {string} status - 状态
 * @returns {boolean} 是否为终态
 */
function isTerminalState(status) {
  return status === TRANSFER_STATUS.APPROVED || status === TRANSFER_STATUS.REJECTED
}

/**
 * 云函数入口
 * @param {Object} event - 请求参数
 * @param {string} event.action - 操作类型: create/getList/approve/reject/confirm
 * @param {Object} context - 云函数上下文
 * @returns {Promise<Object>} 返回结果
 */
exports.main = async (event, context) => {
    const { action } = event
    const wxContext = cloud.getWXContext()

    const handlers = {
        create: handleCreate,
        getList: handleGetList,
        approve: handleApprove,
        reject: handleReject,
        confirm: handleConfirm
    }

    const handler = handlers[action]
    if (!handler) {
        return { success: false, message: '无效的操作类型' }
    }

    return handler(event, wxContext)
}

/**
 * 创建转社团申请
 * @param {Object} event - 请求参数
 * @param {string} event.studentId - 学生ID
 * @param {string} event.studentName - 学生姓名
 * @param {string} event.className - 班级名称
 * @param {string} event.fromClub - 原社团
 * @param {string} event.toClub - 目标社团
 * @param {string} event.initiatorType - 发起人类型
 * @param {string} [event.reason] - 转社团原因
 * @param {Object} wxContext - 微信上下文
 * @returns {Promise<Object>} 创建结果
 */
async function handleCreate(event, wxContext) {
    const {
        studentId,
        studentName,
        className,
        fromClub,
        toClub,
        initiatorType,
        reason
    } = event

    const openid = wxContext.OPENID

    if (!studentId || !fromClub || !toClub || !initiatorType) {
        return { success: false, message: '参数错误' }
    }

    if (fromClub === toClub) {
        return { success: false, message: '目标社团不能与当前社团相同' }
    }

    try {
        // 查询发起人信息
        const initiatorRes = await db.collection('users')
            .where({ _openid: openid, status: 'approved' })
            .field({ _id: true, userName: true, role: true, clubName: true, className: true })
            .get()

        if (initiatorRes.data.length === 0) {
            return { success: false, message: '无权限发起申请' }
        }

        const initiator = initiatorRes.data[0]

        // 检查是否有进行中的申请
        const existingRes = await db.collection('transfer_requests')
            .where({
                studentId,
                status: db.command.in(['pending_teacher', 'pending_classTeacher'])
            })
            .get()

        if (existingRes.data.length > 0) {
            return { success: false, message: '该学生已有进行中的转社团申请' }
        }

        // 确定初始状态
        let initialStatus = 'pending_teacher'
        if (initiatorType === 'fromTeacher') {
            // 转出老师发起，需要转入老师确认
            initialStatus = 'pending_teacher'
        } else if (initiatorType === 'toTeacher') {
            // 转入老师发起，需要转出老师确认
            initialStatus = 'pending_teacher'
        } else if (initiatorType === 'classTeacher') {
            // 班主任发起，需要双方老师确认
            initialStatus = 'pending_teacher'
        }

        // 创建申请记录
        const result = await db.collection('transfer_requests').add({
            data: {
                studentId,
                studentName,
                className,
                fromClub,
                toClub,
                initiatorType,
                initiatorId: initiator._id,
                initiatorName: initiator.userName,
                reason: reason || '',
                status: initialStatus,
                fromTeacherConfirmed: initiatorType === 'fromTeacher',
                toTeacherConfirmed: initiatorType === 'toTeacher',
                classTeacherConfirmed: initiatorType === 'classTeacher',
                createTime: db.serverDate(),
                updateTime: db.serverDate()
            }
        })

        // 发送通知
        await sendTransferNotification(studentId, studentName, fromClub, toClub, 'created', initiatorType)

        return {
            success: true,
            message: '转社团申请已提交',
            data: { _id: result._id }
        }
    } catch (error) {
        console.error('创建转社团申请失败:', error)
        return { success: false, message: '创建申请失败' }
    }
}

/**
 * 获取转社团申请列表
 * @param {Object} event - 请求参数
 * @param {string} [event.role] - 角色筛选
 * @param {number} [event.page=1] - 页码
 * @param {number} [event.pageSize=20] - 每页数量
 * @param {string} [event.status] - 状态筛选
 * @param {Object} wxContext - 微信上下文
 * @returns {Promise<Object>} 分页的申请列表
 */
async function handleGetList(event, wxContext) {
    const { role, page = 1, pageSize = 20, status } = event
    const openid = wxContext.OPENID

    try {
        // 查询当前用户信息
        const userRes = await db.collection('users')
            .where({ _openid: openid, status: 'approved' })
            .field({ _id: true, userName: true, role: true, clubName: true, className: true })
            .get()

        if (userRes.data.length === 0) {
            return { success: false, message: '用户未找到' }
        }

        const user = userRes.data[0]

        // 根据角色构建查询条件
        let condition = {}
        if (role === 'teacher' || user.role === 'teacher') {
            // 社团老师查看：涉及自己社团的转入或转出申请
            const _ = db.command
            condition = _.or([
                { fromClub: user.clubName },
                { toClub: user.clubName }
            ])
        } else if (role === 'classTeacher' || user.role === 'classTeacher') {
            // 班主任查看：涉及自己班级的申请
            condition = { className: user.className }
        }

        // 添加状态筛选
        if (status && status !== 'all') {
            condition.status = status
        }

        // 获取总数
        const countRes = await db.collection('transfer_requests')
            .where(condition)
            .count()
        const total = countRes.total

        // 分页查询
        const skip = (page - 1) * pageSize
        const listRes = await db.collection('transfer_requests')
            .where(condition)
            .orderBy('createTime', 'desc')
            .skip(skip)
            .limit(pageSize)
            .get()

        return {
            success: true,
            data: listRes.data,
            pagination: {
                page,
                pageSize,
                total,
                hasMore: skip + listRes.data.length < total
            }
        }
    } catch (error) {
        console.error('获取转社团申请列表失败:', error)
        return {
            success: false,
            message: '获取申请列表失败',
            data: [],
            pagination: { page: 1, pageSize, total: 0, hasMore: false }
        }
    }
}

/**
 * 确认申请（老师间确认）
 */
async function handleConfirm(event, wxContext) {
    const { requestId } = event
    const openid = wxContext.OPENID

    try {
        // 查询用户信息
        const userRes = await db.collection('users')
            .where({ _openid: openid, status: 'approved' })
            .field({ _id: true, userName: true, role: true, clubName: true })
            .get()

        if (userRes.data.length === 0) {
            return { success: false, message: '用户未找到' }
        }

        const user = userRes.data[0]

        if (user.role !== 'teacher') {
            return { success: false, message: '只有社团老师可以确认申请' }
        }

        // 查询申请信息
        const requestRes = await db.collection('transfer_requests')
            .doc(requestId)
            .get()

        if (!requestRes.data) {
            return { success: false, message: '申请不存在' }
        }

        const request = requestRes.data
        const updateData = { updateTime: db.serverDate() }

        // 判断是转出老师还是转入老师
        if (request.fromClub === user.clubName) {
            // 转出老师确认
            if (request.fromTeacherConfirmed) {
                return { success: false, message: '您已确认过该申请' }
            }
            updateData.fromTeacherConfirmed = true
        } else if (request.toClub === user.clubName) {
            // 转入老师确认
            if (request.toTeacherConfirmed) {
                return { success: false, message: '您已确认过该申请' }
            }
            updateData.toTeacherConfirmed = true
        } else {
            return { success: false, message: '该申请与您的社团无关' }
        }

        // 检查是否双方老师都已确认
        const bothConfirmed = (request.fromTeacherConfirmed || updateData.fromTeacherConfirmed) &&
                            (request.toTeacherConfirmed || updateData.toTeacherConfirmed)

        if (bothConfirmed) {
            // 双方都确认，进入班主任审批阶段
            updateData.status = 'pending_classTeacher'
        }

        // 更新申请
        await db.collection('transfer_requests').doc(requestId).update({ data: updateData })

        // 发送通知
        if (bothConfirmed) {
            await sendTransferNotification(
                request.studentId,
                request.studentName,
                request.fromClub,
                request.toClub,
                'pending_classTeacher',
                null,
                request.className
            )
        }

        return {
            success: true,
            message: bothConfirmed ? '申请已进入班主任审批阶段' : '确认成功，等待另一方确认'
        }
    } catch (error) {
        console.error('确认申请失败:', error)
        return { success: false, message: '确认申请失败' }
    }
}

/**
 * 审批通过（班主任）
 */
async function handleApprove(event, wxContext) {
    const { requestId } = event
    const openid = wxContext.OPENID

    try {
        // 查询班主任信息
        const userRes = await db.collection('users')
            .where({ _openid: openid, role: 'classTeacher', status: 'approved' })
            .field({ _id: true, userName: true, className: true })
            .get()

        if (userRes.data.length === 0) {
            return { success: false, message: '只有班主任可以审批申请' }
        }

        const classTeacher = userRes.data[0]

        // 查询申请信息
        const requestRes = await db.collection('transfer_requests')
            .doc(requestId)
            .get()

        if (!requestRes.data) {
            return { success: false, message: '申请不存在' }
        }

        const request = requestRes.data

        // 验证班级是否匹配
        if (request.className !== classTeacher.className) {
            return { success: false, message: '该学生不在您的班级' }
        }

        // 状态机验证：检查是否可以流转到 approved 状态
        if (!canTransition(request.status, TRANSFER_STATUS.APPROVED)) {
            if (isTerminalState(request.status)) {
                return { success: false, message: '该申请已处于终态，无法操作' }
            }
            return { success: false, message: `当前状态(${request.status})无法直接审批通过` }
        }

        // 更新申请状态
        await db.collection('transfer_requests').doc(requestId).update({
            data: {
                status: 'approved',
                approvedBy: classTeacher._id,
                approvedByName: classTeacher.userName,
                approvedTime: db.serverDate(),
                updateTime: db.serverDate()
            }
        })

        // 更新学生的社团归属
        await db.collection('students')
            .where({ _id: request.studentId })
            .update({
                data: {
                    clubName: request.toClub,
                    updateTime: db.serverDate()
                }
            })

        // 发送通知
        await sendTransferNotification(
            request.studentId,
            request.studentName,
            request.fromClub,
            request.toClub,
            'approved',
            null,
            request.className
        )

        return {
            success: true,
            message: '审批通过，学生社团已更新'
        }
    } catch (error) {
        console.error('审批申请失败:', error)
        return { success: false, message: '审批申请失败' }
    }
}

/**
 * 拒绝申请
 * @param {Object} event - 请求参数
 * @param {string} event.requestId - 申请ID
 * @param {string} event.reason - 拒绝原因
 * @param {Object} wxContext - 微信上下文
 * @returns {Promise<Object>} 拒绝结果
 */
async function handleReject(event, wxContext) {
    const { requestId, reason } = event
    const openid = wxContext.OPENID

    if (!reason) {
        return { success: false, message: '请提供拒绝原因' }
    }

    try {
        // 查询用户信息
        const userRes = await db.collection('users')
            .where({ _openid: openid, status: 'approved' })
            .field({ _id: true, userName: true, role: true, clubName: true, className: true })
            .get()

        if (userRes.data.length === 0) {
            return { success: false, message: '用户未找到' }
        }

        const user = userRes.data[0]

        // 查询申请信息
        const requestRes = await db.collection('transfer_requests')
            .doc(requestId)
            .get()

        if (!requestRes.data) {
            return { success: false, message: '申请不存在' }
        }

        const request = requestRes.data

        // 状态机验证：检查是否可以流转到 rejected 状态
        if (!canTransition(request.status, TRANSFER_STATUS.REJECTED)) {
            if (isTerminalState(request.status)) {
                return { success: false, message: '该申请已处于终态，无法操作' }
            }
            return { success: false, message: `当前状态(${request.status})无法拒绝` }
        }

        // 验证权限
        let canRejectPermission = false
        if (user.role === 'teacher') {
            canRejectPermission = request.fromClub === user.clubName || request.toClub === user.clubName
        } else if (user.role === 'classTeacher') {
            canRejectPermission = request.className === user.className
        }

        if (!canRejectPermission) {
            return { success: false, message: '无权限拒绝该申请' }
        }

        // 更新申请状态
        await db.collection('transfer_requests').doc(requestId).update({
            data: {
                status: 'rejected',
                rejectedBy: user._id,
                rejectedByName: user.userName,
                rejectReason: reason,
                rejectedTime: db.serverDate(),
                updateTime: db.serverDate()
            }
        })

        // 发送通知
        await sendTransferNotification(
            request.studentId,
            request.studentName,
            request.fromClub,
            request.toClub,
            'rejected',
            null,
            request.className,
            reason
        )

        return {
            success: true,
            message: '已拒绝申请'
        }
    } catch (error) {
        console.error('拒绝申请失败:', error)
        return { success: false, message: '拒绝申请失败' }
    }
}

/**
 * 发送转社团通知
 * @param {string} studentId - 学生ID
 * @param {string} studentName - 学生姓名
 * @param {string} fromClub - 原社团
 * @param {string} toClub - 目标社团
 * @param {string} action - 动作类型
 * @param {string|null} initiatorType - 发起人类型
 * @param {string} [className] - 班级名称
 * @param {string} [reason] - 原因
 * @returns {Promise<void>}
 */
async function sendTransferNotification(studentId, studentName, fromClub, toClub, action, initiatorType, className, reason) {
    try {
        // 根据不同动作发送不同通知
        if (action === 'created') {
            // 通知转出和转入老师
            const teacherConditions = [
                { role: 'teacher', clubName: fromClub, status: 'approved' },
                { role: 'teacher', clubName: toClub, status: 'approved' }
            ]

            for (const condition of teacherConditions) {
                const teachersRes = await db.collection('users').where(condition).field({ _openid: true }).get()
                for (const teacher of teachersRes.data) {
                    if (!teacher._openid) continue
                    await db.collection('notifications').add({
                        data: {
                            type: 'transfer_request',
                            recipientId: teacher._openid,
                            title: '转社团申请',
                            content: `学生 ${studentName} 申请从 ${fromClub} 转到 ${toClub}，请及时处理`,
                            data: { studentId, studentName, fromClub, toClub },
                            read: false,
                            createTime: db.serverDate()
                        }
                    })
                }
            }
        } else if (action === 'pending_classTeacher') {
            // 通知班主任
            const classTeachersRes = await db.collection('users')
                .where({ role: 'classTeacher', className, status: 'approved' })
                .field({ _openid: true })
                .get()

            for (const classTeacher of classTeachersRes.data) {
                if (!classTeacher._openid) continue
                await db.collection('notifications').add({
                    data: {
                        type: 'transfer_request',
                        recipientId: classTeacher._openid,
                        title: '转社团审批',
                        content: `学生 ${studentName} 的转社团申请（${fromClub} → ${toClub}）需要您审批`,
                        data: { studentId, studentName, fromClub, toClub },
                        read: false,
                        createTime: db.serverDate()
                    }
                })
            }
        } else if (action === 'approved' || action === 'rejected') {
            // 通知班主任和相关老师
            const title = action === 'approved' ? '转社团申请已通过' : '转社团申请被拒绝'
            const content = action === 'approved'
                ? `学生 ${studentName} 的转社团申请已通过，已从 ${fromClub} 转到 ${toClub}`
                : `学生 ${studentName} 的转社团申请被拒绝。原因：${reason}`

            // 通知班主任
            const classTeachersRes = await db.collection('users')
                .where({ role: 'classTeacher', className, status: 'approved' })
                .field({ _openid: true })
                .get()

            for (const classTeacher of classTeachersRes.data) {
                if (!classTeacher._openid) continue
                await db.collection('notifications').add({
                    data: {
                        type: 'transfer_result',
                        recipientId: classTeacher._openid,
                        title,
                        content,
                        data: { studentId, studentName, fromClub, toClub, action, reason: reason || '' },
                        read: false,
                        createTime: db.serverDate()
                    }
                })
            }

            // 通知相关老师
            const teacherConditions = [
                { role: 'teacher', clubName: fromClub, status: 'approved' },
                { role: 'teacher', clubName: toClub, status: 'approved' }
            ]

            for (const condition of teacherConditions) {
                const teachersRes = await db.collection('users').where(condition).field({ _openid: true }).get()
                for (const teacher of teachersRes.data) {
                    if (!teacher._openid) continue
                    await db.collection('notifications').add({
                        data: {
                            type: 'transfer_result',
                            recipientId: teacher._openid,
                            title,
                            content,
                            data: { studentId, studentName, fromClub, toClub, action, reason: reason || '' },
                            read: false,
                            createTime: db.serverDate()
                        }
                    })
                }
            }
        }
    } catch (error) {
        console.error('发送转社团通知失败:', error)
    }
}
