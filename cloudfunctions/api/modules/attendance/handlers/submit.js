/**
 * @file 提交相关处理器
 * @module cloudfunctions/attendance/handlers/submit
 */

const {
    ROLES,
    ATTENDANCE_STATUS,
    verifyUser,
    checkRateLimit,
    RATE_LIMIT_CONFIGS
} = require('../../../common')
const { checkAbsenceAndNotify } = require('../services/notification')

/**
 * 检查今日是否已有点名记录
 * @param {Object} event - 请求参数
 * @param {string} event.clubName - 社团名称
 * @param {string} event.date - 日期
 * @param {Object} ctx - 上下文
 * @returns {Promise<Object>} 包含记录数量的结果
 */
async function handleCheckTodaySubmissions(event, ctx) {
    const { clubName, date } = event
    const { db } = ctx

    try {
        const countRes = await db.collection('attendance_records')
            .where({ clubName, date })
            .count()

        return { success: true, count: countRes.total }
    } catch (error) {
        console.error('检查记录失败:', error)
        return { success: false, message: '检查记录失败', count: 0 }
    }
}

/**
 * 提交点名记录
 * @description 支持覆盖模式和新增模式
 * @param {Object} event - 请求参数
 * @param {Object} ctx - 上下文
 * @returns {Promise<Object>} 提交结果
 */
async function handleSubmit(event, ctx) {
    const { clubName, date, time, records, mode, preferredRole } = event
    const { db, openid } = ctx

    try {
        // 限频检查
        const rateCheck = await checkRateLimit(db, openid, 'attendance', RATE_LIMIT_CONFIGS.attendance)
        if (!rateCheck.allowed) {
            return { success: false, message: rateCheck.message }
        }

        // 从云端获取教师信息，支持指定优先角色
        const allowedRoles = [ROLES.TEACHER, ROLES.ADMIN]
        const rolePriority = preferredRole && allowedRoles.includes(preferredRole)
            ? [preferredRole, ...allowedRoles.filter(r => r !== preferredRole)]
            : allowedRoles

        let teacher = null
        for (const role of rolePriority) {
            teacher = await verifyUser(db, openid, role, { _id: true, userName: true, clubName: true })
            if (teacher) break
        }

        if (!teacher) {
            return { success: false, message: '无权执行此操作' }
        }

        const teacherId = teacher._id
        const teacherName = teacher.userName

        // 从学生记录中提取所有不重复的学部
        const departments = [...new Set(
            records.map(r => r.department).filter(d => d)
        )]

        // 如果是覆盖模式，先删除当天的旧记录
        if (mode === 'cover') {
            await db.collection('attendance_records')
                .where({ clubName, date })
                .remove()
        }

        const result = await db.collection('attendance_records').add({
            data: { clubName, departments, teacherId, teacherName, date, time, records, createTime: db.serverDate() }
        })

        // 检查缺勤情况并发送通知
        await checkAbsenceAndNotify(db, records, clubName, date)

        return { success: true, data: { _id: result._id } }
    } catch (error) {
        console.error('提交点名记录失败:', error)
        return { success: false, message: '提交失败' }
    }
}

/**
 * 更新点名记录（修改学生状态）
 * @param {Object} event - 请求参数
 * @param {Object} ctx - 上下文
 * @returns {Promise<Object>} 更新结果
 */
async function handleUpdateRecords(event, ctx) {
    const { recordId, records, changes } = event
    const { db, openid } = ctx

    if (!recordId || !records) {
        return { success: false, message: '参数错误' }
    }

    try {
        // 获取原记录信息（用于通知）
        const originalRecord = await db.collection('attendance_records').doc(recordId).get()
        if (!originalRecord.data) {
            return { success: false, message: '记录不存在' }
        }

        const { clubName, date } = originalRecord.data

        // 获取修改者信息
        const userRes = await db.collection('users')
            .where({ _openid: openid })
            .field({ userName: true })
            .get()
        const modifierName = userRes.data[0]?.userName || '未知'

        const result = await db.collection('attendance_records').doc(recordId).update({
            data: {
                records,
                updateTime: db.serverDate(),
                lastModifiedBy: openid,
                lastModifierName: modifierName
            }
        })

        if (result.stats.updated > 0) {
            // 如果有变更信息，发送通知给班主任
            if (changes && changes.length > 0) {
                await notifyStatusChanges(db, changes, clubName, date, modifierName)
            }
            return { success: true, message: '更新成功' }
        } else {
            return { success: false, message: '记录不存在或无变更' }
        }
    } catch (error) {
        console.error('更新点名记录失败:', error)
        return { success: false, message: '更新失败' }
    }
}

/**
 * 通知班主任考勤状态变更
 * @param {Object} db - 数据库实例
 * @param {Array} changes - 变更列表 [{studentId, studentName, className, oldStatus, newStatus}]
 * @param {string} clubName - 社团名称
 * @param {string} date - 日期
 * @param {string} modifierName - 修改者姓名
 */
async function notifyStatusChanges(db, changes, clubName, date, modifierName) {
    try {
        const _ = db.command

        // 按班级分组
        const changesByClass = {}
        changes.forEach(change => {
            if (!changesByClass[change.className]) {
                changesByClass[change.className] = []
            }
            changesByClass[change.className].push(change)
        })

        const classNames = Object.keys(changesByClass)
        if (classNames.length === 0) return

        // 查询班主任
        const teachersRes = await db.collection('users')
            .where({
                role: 'classTeacher',
                className: _.in(classNames),
                status: 'approved'
            })
            .field({ _openid: true, className: true })
            .get()

        const teachersByClass = {}
        teachersRes.data.forEach(t => {
            if (!t._openid) return
            if (!teachersByClass[t.className]) {
                teachersByClass[t.className] = []
            }
            teachersByClass[t.className].push(t)
        })

        // 创建通知
        const notifications = []
        for (const [className, classChanges] of Object.entries(changesByClass)) {
            const teachers = teachersByClass[className] || []
            if (teachers.length === 0) continue

            // 生成变更描述
            const changeDescriptions = classChanges.map(c => {
                const oldLabel = c.oldStatus === 'present' ? '到课' : '缺课'
                const newLabel = c.newStatus === 'present' ? '到课' : '缺课'
                return `${c.studentName}：${oldLabel}→${newLabel}`
            }).join('；')

            for (const teacher of teachers) {
                notifications.push({
                    type: 'attendance_update',
                    recipientId: teacher._openid,
                    title: `${clubName} 考勤修改`,
                    content: `${modifierName} 修改了 ${date} 的考勤记录：${changeDescriptions}`,
                    data: {
                        clubName,
                        date,
                        className,
                        changes: classChanges,
                        modifierName
                    },
                    read: false,
                    createTime: db.serverDate()
                })
            }
        }

        // 批量写入通知
        if (notifications.length > 0) {
            await Promise.all(notifications.map(n => db.collection('notifications').add({ data: n })))
        }
    } catch (error) {
        console.error('发送考勤变更通知失败:', error)
    }
}

module.exports = {
    handleCheckTodaySubmissions,
    handleSubmit,
    handleUpdateRecords
}
