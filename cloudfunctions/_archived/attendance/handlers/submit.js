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
} = require('../common')
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
    const { recordId, records } = event
    const { db } = ctx

    if (!recordId || !records) {
        return { success: false, message: '参数错误' }
    }

    try {
        const result = await db.collection('attendance_records').doc(recordId).update({
            data: {
                records,
                updateTime: db.serverDate()
            }
        })

        if (result.stats.updated > 0) {
            return { success: true, message: '更新成功' }
        } else {
            return { success: false, message: '记录不存在或无变更' }
        }
    } catch (error) {
        console.error('更新点名记录失败:', error)
        return { success: false, message: '更新失败' }
    }
}

module.exports = {
    handleCheckTodaySubmissions,
    handleSubmit,
    handleUpdateRecords
}
