/**
 * @file 预警相关处理器
 * @module cloudfunctions/attendance/handlers/warning
 */

const { getAllData, ATTENDANCE_STATUS } = require('../../../common')

/**
 * 获取缺勤预警列表
 * @description 统计指定月份缺勤>=3次的学生
 * @param {Object} event - 请求参数
 * @param {Object} ctx - 上下文
 * @returns {Promise<Object>} 缺勤预警学生列表
 */
async function handleGetAbsenceWarnings(event, ctx) {
    const { month, department, className, clubName } = event
    const { db } = ctx
    const _ = db.command

    try {
        const startDate = `${month}-01`
        const endDate = `${month}-31`

        let condition = {
            date: _.gte(startDate).and(_.lte(endDate))
        }
        if (clubName) condition.clubName = clubName

        let records = await getAllData(
            db.collection('attendance_records'),
            condition,
            { records: true, clubName: true, date: true, departments: true }
        )

        // 如果指定了学部，在内存中过滤
        if (department) {
            records = records.filter(record => {
                if (!record.departments) return false
                if (Array.isArray(record.departments)) {
                    return record.departments.includes(department)
                }
                return record.departments === department
            })
        }

        // 统计每个学生的缺勤次数
        const absenceCount = {}
        records.forEach(record => {
            record.records.forEach(s => {
                if (s.status === ATTENDANCE_STATUS.ABSENT) {
                    const key = s.studentId
                    if (!absenceCount[key]) {
                        absenceCount[key] = {
                            studentId: s.studentId,
                            studentName: s.studentName,
                            className: s.className,
                            clubName: record.clubName,
                            count: 0,
                            dates: []
                        }
                    }
                    absenceCount[key].count++
                    absenceCount[key].dates.push(record.date)
                }
            })
        })

        // 筛选>=3次的学生
        let warnings = Object.values(absenceCount)
            .filter(s => s.count >= 3)
            .sort((a, b) => b.count - a.count)

        // 如果指定班级，再过滤
        if (className) {
            warnings = warnings.filter(s => s.className === className)
        }

        return { success: true, data: warnings }
    } catch (error) {
        console.error('获取缺勤预警列表失败:', error)
        return { success: false, message: '获取预警列表失败', data: [] }
    }
}

module.exports = {
    handleGetAbsenceWarnings
}
