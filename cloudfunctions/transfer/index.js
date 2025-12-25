/**
 * 云函数 - 转社团申请管理
 * 处理学生转社团的申请、审批和确认流程
 */
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

/**
 * 云函数入口
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
 */
async function handleGetList(event, wxContext) {
    const { role, page = 1, pageSize = 20, status } = event
    const openid = wxContext.OPENID

    try {
        // 查询当前用户信息
        const userRes = await db.collection('users')
            .where({ _openid: openid, status: 'approved' })
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

        // 验证状态
        if (request.status !== 'pending_classTeacher') {
            return { success: false, message: '该申请当前无法审批' }
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

        // 验证权限
        let canReject = false
        if (user.role === 'teacher') {
            canReject = request.fromClub === user.clubName || request.toClub === user.clubName
        } else if (user.role === 'classTeacher') {
            canReject = request.className === user.className
        }

        if (!canReject) {
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
                const teachersRes = await db.collection('users').where(condition).get()
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
                const teachersRes = await db.collection('users').where(condition).get()
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
