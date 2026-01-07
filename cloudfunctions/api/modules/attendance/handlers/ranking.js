/**
 * @file 排行相关处理器
 * @module cloudfunctions/attendance/handlers/ranking
 */

const { getAllData, ATTENDANCE_STATUS } = require('../../../common')

/**
 * 获取社团学生出勤率排行
 * @param {Object} event - 请求参数
 * @param {Object} ctx - 上下文
 * @returns {Promise<Object>} 排行数据
 */
async function handleGetClubRank(event, ctx) {
    const { clubName, months = 3 } = event
    const { db } = ctx
    const _ = db.command

    try {
        const startDate = new Date()
        startDate.setMonth(startDate.getMonth() - months)
        const startDateStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-01`

        const [students, attendanceRecords] = await Promise.all([
            getAllData(
                db.collection('students'),
                { clubName },
                { _id: true, studentName: true, className: true }
            ),
            getAllData(
                db.collection('attendance_records'),
                { clubName, date: _.gte(startDateStr) },
                { records: true }
            )
        ])

        const studentStats = {}
        students.forEach(s => {
            studentStats[s._id] = {
                studentName: s.studentName,
                className: s.className,
                present: 0,
                total: 0,
                rate: 0
            }
        })

        attendanceRecords.forEach(record => {
            record.records.forEach(r => {
                if (studentStats[r.studentId]) {
                    studentStats[r.studentId].total++
                    if (r.status === ATTENDANCE_STATUS.PRESENT) {
                        studentStats[r.studentId].present++
                    }
                }
            })
        })

        const rankList = Object.values(studentStats)
            .map(item => ({
                ...item,
                rate: item.total > 0 ? parseFloat(((item.present / item.total) * 100).toFixed(1)) : 0
            }))
            .filter(item => item.total > 0)
            .sort((a, b) => {
                if (b.rate !== a.rate) return b.rate - a.rate
                return b.total - a.total
            })

        return { success: true, data: rankList }
    } catch (error) {
        console.error('获取社团排行失败:', error)
        return { success: false, message: '获取排行失败', data: [] }
    }
}

/**
 * 获取班级学生出勤率排名（按所有社团汇总）
 * @param {Object} event - 请求参数
 * @param {Object} ctx - 上下文
 * @returns {Promise<Object>} 排行数据
 */
async function handleGetClassRank(event, ctx) {
    const { className, months = 3 } = event
    const { db } = ctx
    const _ = db.command

    try {
        const startDate = new Date()
        startDate.setMonth(startDate.getMonth() - months)
        const startDateStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-01`

        const students = await getAllData(
            db.collection('students'),
            { className },
            { _id: true, studentName: true, clubName: true }
        )

        if (students.length === 0) {
            return { success: true, data: [] }
        }

        const clubNames = [...new Set(students.map(s => s.clubName).filter(Boolean))]
        const attendanceRecords = await getAllData(
            db.collection('attendance_records'),
            { clubName: _.in(clubNames), date: _.gte(startDateStr) },
            { records: true }
        )

        const studentStats = {}
        students.forEach(s => {
            studentStats[s._id] = {
                studentName: s.studentName,
                clubName: s.clubName || '未分配',
                present: 0,
                total: 0,
                rate: 0
            }
        })

        attendanceRecords.forEach(record => {
            record.records.forEach(r => {
                if (studentStats[r.studentId]) {
                    studentStats[r.studentId].total++
                    if (r.status === ATTENDANCE_STATUS.PRESENT) {
                        studentStats[r.studentId].present++
                    }
                }
            })
        })

        const rankList = Object.values(studentStats)
            .map(item => ({
                ...item,
                rate: item.total > 0 ? parseFloat(((item.present / item.total) * 100).toFixed(1)) : 0
            }))
            .filter(item => item.total > 0)
            .sort((a, b) => {
                if (b.rate !== a.rate) return b.rate - a.rate
                return b.total - a.total
            })

        return { success: true, data: rankList }
    } catch (error) {
        console.error('获取班级排行失败:', error)
        return { success: false, message: '获取排行失败', data: [] }
    }
}

/**
 * 获取学部班级出勤率排名
 * @param {Object} event - 请求参数
 * @param {Object} ctx - 上下文
 * @returns {Promise<Object>} 班级排名数据
 */
async function handleGetDepartmentClassRanking(event, ctx) {
    const { department } = event
    const { db } = ctx
    const _ = db.command

    try {
        const now = new Date()
        const startDate = event.startDate || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
        const endDate = event.endDate || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-31`

        const students = await getAllData(
            db.collection('students'),
            { department },
            { _id: true, className: true }
        )

        const studentClassMap = {}
        students.forEach(s => {
            studentClassMap[s._id] = s.className
        })

        const records = await getAllData(
            db.collection('attendance_records'),
            { date: _.gte(startDate).and(_.lte(endDate)) },
            { records: true }
        )

        const classStats = {}
        students.forEach(s => {
            if (s.className && !classStats[s.className]) {
                classStats[s.className] = { total: 0, present: 0 }
            }
        })

        records.forEach(record => {
            record.records.forEach(r => {
                const className = studentClassMap[r.studentId]
                if (className && classStats[className]) {
                    classStats[className].total++
                    if (r.status === ATTENDANCE_STATUS.PRESENT) {
                        classStats[className].present++
                    }
                }
            })
        })

        const ranking = Object.entries(classStats)
            .map(([name, stats]) => ({
                className: name,
                total: stats.total,
                present: stats.present,
                rate: stats.total > 0 ? parseFloat(((stats.present / stats.total) * 100).toFixed(1)) : 0
            }))
            .filter(item => item.total > 0)
            .sort((a, b) => {
                if (b.rate !== a.rate) return b.rate - a.rate
                return b.total - a.total
            })

        return { success: true, data: ranking }
    } catch (error) {
        console.error('获取学部班级排行失败:', error)
        return { success: false, message: '获取排行失败', data: [] }
    }
}

module.exports = {
    handleGetClubRank,
    handleGetClassRank,
    handleGetDepartmentClassRanking
}
