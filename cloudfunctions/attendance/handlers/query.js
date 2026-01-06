/**
 * @file 查询相关处理器
 * @module cloudfunctions/attendance/handlers/query
 */

const { getAllData, ATTENDANCE_STATUS, sortStudentsByName } = require('../common')

/**
 * 获取教师的历史点名记录（支持分页）
 * @param {Object} event - 请求参数
 * @param {Object} ctx - 上下文
 * @returns {Promise<Object>} 分页的历史记录
 */
async function handleGetHistory(event, ctx) {
    const { teacherId, clubName, page = 1, pageSize = 20 } = event
    const { db } = ctx

    try {
        let queryClubName = clubName
        if (!queryClubName && teacherId) {
            const userRes = await db.collection('users').doc(teacherId).get()
            if (userRes.data && userRes.data.clubName) {
                queryClubName = userRes.data.clubName
            }
        }

        const whereCondition = queryClubName ? { clubName: queryClubName } : { teacherId }

        const countRes = await db.collection('attendance_records')
            .where(whereCondition)
            .count()
        const total = countRes.total

        const skip = (page - 1) * pageSize

        const recordsRes = await db.collection('attendance_records')
            .where(whereCondition)
            .orderBy('createTime', 'desc')
            .skip(skip)
            .limit(pageSize)
            .field({ _id: true, date: true, time: true, clubName: true, records: true, teacherName: true })
            .get()

        const records = recordsRes.data.map(record => ({
            _id: record._id,
            date: record.date,
            time: record.time,
            clubName: record.clubName,
            teacherName: record.teacherName,
            totalCount: record.records.length,
            presentCount: record.records.filter(r => r.status === ATTENDANCE_STATUS.PRESENT).length,
            absentCount: record.records.filter(r => r.status === ATTENDANCE_STATUS.ABSENT).length
        }))

        return {
            success: true,
            data: records,
            pagination: {
                page,
                pageSize,
                total,
                hasMore: skip + records.length < total
            }
        }
    } catch (error) {
        console.error('获取历史记录失败:', error)
        return { success: false, message: '获取历史记录失败', data: [], pagination: { page: 1, pageSize, total: 0, hasMore: false } }
    }
}

/**
 * 获取单条点名记录的详情（包含反馈信息）
 * @param {Object} event - 请求参数
 * @param {Object} ctx - 上下文
 * @returns {Promise<Object>} 记录详情
 */
async function handleGetDetail(event, ctx) {
    const { recordId } = event
    const { db } = ctx

    try {
        const recordRes = await db.collection('attendance_records').doc(recordId).get()
        const record = recordRes.data

        const studentIds = record.records.map(r => r.studentId)
        const feedbackRes = await getAllData(
            db.collection('feedbacks'),
            {
                date: record.date,
                studentId: db.command.in(studentIds)
            }
        )

        const feedbackMap = {}
        feedbackRes.forEach(f => {
            feedbackMap[f.studentId] = f.feedback
        })

        record.records = record.records.map(r => ({
            ...r,
            feedback: feedbackMap[r.studentId] || ''
        }))

        record.records.sort((a, b) => {
            const classCompare = (a.className || '').localeCompare(b.className || '', 'zh-CN', { numeric: true })
            if (classCompare !== 0) return classCompare
            return (a.studentName || '').localeCompare(b.studentName || '', 'zh-CN')
        })

        return { success: true, data: record }
    } catch (error) {
        console.error('获取记录详情失败:', error)
        return { success: false, message: '获取记录详情失败' }
    }
}

/**
 * 按学生ID获取考勤记录（支持分页）
 * @param {Object} event - 请求参数
 * @param {Object} ctx - 上下文
 * @returns {Promise<Object>} 分页的考勤记录
 */
async function handleGetByStudent(event, ctx) {
    const { studentId, page = 1, pageSize = 20 } = event
    const { db } = ctx

    try {
        const condition = { 'records.studentId': studentId }

        const countRes = await db.collection('attendance_records')
            .where(condition)
            .count()
        const total = countRes.total

        const skip = (page - 1) * pageSize
        const result = await db.collection('attendance_records')
            .where(condition)
            .orderBy('date', 'desc')
            .skip(skip)
            .limit(pageSize)
            .field({ _id: true, date: true, clubName: true, records: true, createTime: true })
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
        console.error('获取学生考勤记录失败:', error)
        return { success: false, message: '获取考勤记录失败', data: [] }
    }
}

module.exports = {
    handleGetHistory,
    handleGetDetail,
    handleGetByStudent
}
