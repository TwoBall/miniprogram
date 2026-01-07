/**
 * @file 转社团管理模块
 * @module api/modules/transfer
 * @description 处理学生转社团的申请、审批和确认流程
 */
const {
    ROLES,
    USER_STATUS,
    success,
    successWithPagination,
    fail,
    unauthorized,
    badRequest,
    verifyUser,
    checkRateLimit,
    RATE_LIMIT_CONFIGS
} = require('../common')

// ========== 状态机定义 ==========
const TRANSFER_STATUS = {
    PENDING_TEACHER: 'pending_teacher',
    PENDING_CLASS_TEACHER: 'pending_classTeacher',
    APPROVED: 'approved',
    REJECTED: 'rejected'
}

const STATE_TRANSITIONS = {
    [TRANSFER_STATUS.PENDING_TEACHER]: [TRANSFER_STATUS.PENDING_CLASS_TEACHER, TRANSFER_STATUS.REJECTED],
    [TRANSFER_STATUS.PENDING_CLASS_TEACHER]: [TRANSFER_STATUS.APPROVED, TRANSFER_STATUS.REJECTED],
    [TRANSFER_STATUS.APPROVED]: [],
    [TRANSFER_STATUS.REJECTED]: []
}

function canTransition(currentStatus, newStatus) {
    const validNextStates = STATE_TRANSITIONS[currentStatus]
    if (!validNextStates) return false
    return validNextStates.includes(newStatus)
}

function isTerminalState(status) {
    return status === TRANSFER_STATUS.APPROVED || status === TRANSFER_STATUS.REJECTED
}

// ========== 处理函数 ==========

/**
 * 创建转社团申请
 */
async function handleCreate(event, ctx) {
    const { studentId, studentName, className, fromClub, toClub, initiatorType, reason } = event
    const { db, openid } = ctx

    if (!studentId || !fromClub || !toClub || !initiatorType) {
        return badRequest('参数错误')
    }

    if (fromClub === toClub) {
        return fail('目标社团不能与当前社团相同')
    }

    try {
        const rateCheck = await checkRateLimit(db, openid, 'transfer', RATE_LIMIT_CONFIGS.transfer)
        if (!rateCheck.allowed) {
            return fail(rateCheck.message || '操作过于频繁，请稍后再试')
        }

        const initiator = await verifyUser(db, openid, null, { clubName: true, className: true })
        if (!initiator) {
            return unauthorized('无权限发起申请')
        }

        // 检查是否有进行中的申请
        const existingRes = await db.collection('transfer_requests')
            .where({
                studentId,
                status: db.command.in(['pending_teacher', 'pending_classTeacher'])
            })
            .get()

        if (existingRes.data.length > 0) {
            return fail('该学生已有进行中的转社团申请')
        }

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
                status: 'pending_teacher',
                fromTeacherConfirmed: initiatorType === 'fromTeacher',
                toTeacherConfirmed: initiatorType === 'toTeacher',
                classTeacherConfirmed: initiatorType === 'classTeacher',
                createTime: db.serverDate(),
                updateTime: db.serverDate()
            }
        })

        await sendTransferNotification(db, studentId, studentName, fromClub, toClub, 'created', initiatorType)

        return success({ _id: result._id }, '转社团申请已提交')
    } catch (error) {
        console.error('创建转社团申请失败:', error)
        return fail('创建申请失败')
    }
}

/**
 * 获取转社团申请列表
 */
async function handleGetList(event, ctx) {
    const { role, page = 1, pageSize = 20, status } = event
    const { db, openid } = ctx

    try {
        const user = await verifyUser(db, openid, null, { clubName: true, className: true })
        if (!user) {
            return fail('用户未找到')
        }

        let condition = {}
        const _ = db.command

        if (role === ROLES.TEACHER || user.role === ROLES.TEACHER) {
            condition = _.or([
                { fromClub: user.clubName },
                { toClub: user.clubName }
            ])
        } else if (role === ROLES.CLASS_TEACHER || user.role === ROLES.CLASS_TEACHER) {
            condition = { className: user.className }
        }

        if (status && status !== 'all') {
            condition.status = status
        }

        const countRes = await db.collection('transfer_requests').where(condition).count()
        const total = countRes.total

        const skip = (page - 1) * pageSize
        const listRes = await db.collection('transfer_requests')
            .where(condition)
            .orderBy('createTime', 'desc')
            .skip(skip)
            .limit(pageSize)
            .get()

        return successWithPagination(listRes.data, { page, pageSize, total, hasMore: skip + listRes.data.length < total })
    } catch (error) {
        console.error('获取转社团申请列表失败:', error)
        return fail('获取申请列表失败')
    }
}

/**
 * 确认申请（老师间确认）
 */
async function handleConfirm(event, ctx) {
    const { requestId } = event
    const { db, openid } = ctx

    try {
        const user = await verifyUser(db, openid, ROLES.TEACHER, { clubName: true })
        if (!user) {
            return fail('只有社团老师可以确认申请')
        }

        const requestRes = await db.collection('transfer_requests').doc(requestId).get()
        if (!requestRes.data) {
            return fail('申请不存在')
        }

        const request = requestRes.data
        const updateData = { updateTime: db.serverDate() }

        if (request.fromClub === user.clubName) {
            if (request.fromTeacherConfirmed) {
                return fail('您已确认过该申请')
            }
            updateData.fromTeacherConfirmed = true
        } else if (request.toClub === user.clubName) {
            if (request.toTeacherConfirmed) {
                return fail('您已确认过该申请')
            }
            updateData.toTeacherConfirmed = true
        } else {
            return fail('该申请与您的社团无关')
        }

        const bothConfirmed = (request.fromTeacherConfirmed || updateData.fromTeacherConfirmed) &&
                            (request.toTeacherConfirmed || updateData.toTeacherConfirmed)

        if (bothConfirmed) {
            updateData.status = 'pending_classTeacher'
        }

        await db.collection('transfer_requests').doc(requestId).update({ data: updateData })

        if (bothConfirmed) {
            await sendTransferNotification(db, request.studentId, request.studentName, request.fromClub, request.toClub, 'pending_classTeacher', null, request.className)
        }

        return success(null, bothConfirmed ? '申请已进入班主任审批阶段' : '确认成功，等待另一方确认')
    } catch (error) {
        console.error('确认申请失败:', error)
        return fail('确认申请失败')
    }
}

/**
 * 审批通过（班主任）
 */
async function handleApprove(event, ctx) {
    const { requestId } = event
    const { db, openid } = ctx

    try {
        const classTeacher = await verifyUser(db, openid, ROLES.CLASS_TEACHER, { className: true })
        if (!classTeacher) {
            return fail('只有班主任可以审批申请')
        }

        const requestRes = await db.collection('transfer_requests').doc(requestId).get()
        if (!requestRes.data) {
            return fail('申请不存在')
        }

        const request = requestRes.data

        if (request.className !== classTeacher.className) {
            return fail('该学生不在您的班级')
        }

        if (!canTransition(request.status, TRANSFER_STATUS.APPROVED)) {
            if (isTerminalState(request.status)) {
                return fail('该申请已处于终态，无法操作')
            }
            return fail(`当前状态(${request.status})无法直接审批通过`)
        }

        await db.collection('transfer_requests').doc(requestId).update({
            data: {
                status: USER_STATUS.APPROVED,
                approvedBy: classTeacher._id,
                approvedByName: classTeacher.userName,
                approvedTime: db.serverDate(),
                updateTime: db.serverDate()
            }
        })

        await db.collection('students')
            .where({ _id: request.studentId })
            .update({
                data: {
                    clubName: request.toClub,
                    updateTime: db.serverDate()
                }
            })

        await sendTransferNotification(db, request.studentId, request.studentName, request.fromClub, request.toClub, 'approved', null, request.className)

        return success(null, '审批通过，学生社团已更新')
    } catch (error) {
        console.error('审批申请失败:', error)
        return fail('审批申请失败')
    }
}

/**
 * 拒绝申请
 */
async function handleReject(event, ctx) {
    const { requestId, reason } = event
    const { db, openid } = ctx

    if (!reason) {
        return badRequest('请提供拒绝原因')
    }

    try {
        const user = await verifyUser(db, openid, null, { clubName: true, className: true })
        if (!user) {
            return fail('用户未找到')
        }

        const requestRes = await db.collection('transfer_requests').doc(requestId).get()
        if (!requestRes.data) {
            return fail('申请不存在')
        }

        const request = requestRes.data

        if (!canTransition(request.status, TRANSFER_STATUS.REJECTED)) {
            if (isTerminalState(request.status)) {
                return fail('该申请已处于终态，无法操作')
            }
            return fail(`当前状态(${request.status})无法拒绝`)
        }

        let canRejectPermission = false
        if (user.role === ROLES.TEACHER) {
            canRejectPermission = request.fromClub === user.clubName || request.toClub === user.clubName
        } else if (user.role === ROLES.CLASS_TEACHER) {
            canRejectPermission = request.className === user.className
        }

        if (!canRejectPermission) {
            return unauthorized('无权限拒绝该申请')
        }

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

        await sendTransferNotification(db, request.studentId, request.studentName, request.fromClub, request.toClub, 'rejected', null, request.className, reason)

        return success(null, '已拒绝申请')
    } catch (error) {
        console.error('拒绝申请失败:', error)
        return fail('拒绝申请失败')
    }
}

/**
 * 发送转社团通知
 */
async function sendTransferNotification(db, studentId, studentName, fromClub, toClub, action, initiatorType, className, reason) {
    try {
        if (action === 'created') {
            const teacherConditions = [
                { role: ROLES.TEACHER, clubName: fromClub, status: USER_STATUS.APPROVED },
                { role: ROLES.TEACHER, clubName: toClub, status: USER_STATUS.APPROVED }
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
            const classTeachersRes = await db.collection('users')
                .where({ role: ROLES.CLASS_TEACHER, className, status: USER_STATUS.APPROVED })
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
            const title = action === 'approved' ? '转社团申请已通过' : '转社团申请被拒绝'
            const content = action === 'approved'
                ? `学生 ${studentName} 的转社团申请已通过，已从 ${fromClub} 转到 ${toClub}`
                : `学生 ${studentName} 的转社团申请被拒绝。原因：${reason}`

            const classTeachersRes = await db.collection('users')
                .where({ role: ROLES.CLASS_TEACHER, className, status: USER_STATUS.APPROVED })
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

            const teacherConditions = [
                { role: ROLES.TEACHER, clubName: fromClub, status: USER_STATUS.APPROVED },
                { role: ROLES.TEACHER, clubName: toClub, status: USER_STATUS.APPROVED }
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

// 导出模块
module.exports = {
    handlers: {
        create: handleCreate,
        getList: handleGetList,
        confirm: handleConfirm,
        approve: handleApprove,
        reject: handleReject
    }
}
