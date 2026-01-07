/**
 * @file 统计相关处理器
 * @module cloudfunctions/attendance/handlers/statistics
 */

const { getAllData, ATTENDANCE_STATUS, sortStudentsByName } = require('../../../common')

/**
 * 按班级获取考勤情况
 * @param {Object} event - 请求参数
 * @param {Object} ctx - 上下文
 * @returns {Promise<Object>} 班级考勤数据
 */
async function handleGetByClass(event, ctx) {
    const { className, date } = event
    const { db } = ctx

    try {
        const [studentsRaw, attendanceRecords, feedbacks] = await Promise.all([
            getAllData(db.collection('students'), { className }, { _id: true, studentName: true, gender: true, clubName: true, classTeacher: true, classTeacherPhone: true }),
            getAllData(db.collection('attendance_records'), { date }, { records: true, date: true, time: true }),
            getAllData(db.collection('feedbacks'), { className, date }, { studentId: true, feedback: true })
        ])

        const students = sortStudentsByName(studentsRaw)

        const feedbackMap = {}
        feedbacks.forEach(f => {
            feedbackMap[f.studentId] = f.feedback
        })

        const studentMap = {}
        students.forEach(s => {
            studentMap[s._id] = {
                ...s,
                todayStatus: null,
                attendanceTime: '',
                feedback: feedbackMap[s._id] || ''
            }
        })

        attendanceRecords.forEach(record => {
            record.records.forEach(r => {
                if (studentMap[r.studentId]) {
                    studentMap[r.studentId].todayStatus = r.status
                    studentMap[r.studentId].attendanceTime = `${record.date} ${record.time}`
                }
            })
        })

        const result = sortStudentsByName(students.map(s => studentMap[s._id]))

        return {
            success: true,
            data: {
                students: result,
                totalStudents: students.length,
                joinedClubs: result.filter(s => s.clubName).length,
                presentToday: result.filter(s => s.todayStatus === ATTENDANCE_STATUS.PRESENT).length,
                absentToday: result.filter(s => s.todayStatus === ATTENDANCE_STATUS.ABSENT).length
            }
        }
    } catch (error) {
        console.error('获取班级考勤失败:', error)
        return { success: false, message: '获取数据失败', data: { students: [], totalStudents: 0, joinedClubs: 0, presentToday: 0, absentToday: 0 } }
    }
}

/**
 * 按学部获取考勤统计
 * @param {Object} event - 请求参数
 * @param {Object} ctx - 上下文
 * @returns {Promise<Object>} 学部考勤数据
 */
async function handleGetByDepartment(event, ctx) {
    const { department, date } = event
    const { db } = ctx

    try {
        const students = await getAllData(db.collection('students'), { department }, { _id: true, className: true })

        const allDayRecords = await getAllData(db.collection('attendance_records'), { date }, { records: true, departments: true })

        const attendanceRecords = allDayRecords.filter(record => {
            if (!record.departments) return false
            if (Array.isArray(record.departments)) {
                return record.departments.includes(department)
            }
            if (typeof record.departments === 'string') {
                return record.departments === department
            }
            return false
        })

        const classMap = {}
        students.forEach(s => {
            if (!classMap[s.className]) {
                classMap[s.className] = { className: s.className, totalStudents: 0, present: 0, absent: 0 }
            }
            classMap[s.className].totalStudents++
        })

        const studentAttendance = {}
        attendanceRecords.forEach(record => {
            record.records.forEach(r => {
                studentAttendance[r.studentId] = r.status
            })
        })

        students.forEach(s => {
            const status = studentAttendance[s._id]
            if (status === ATTENDANCE_STATUS.PRESENT) classMap[s.className].present++
            else if (status === ATTENDANCE_STATUS.ABSENT) classMap[s.className].absent++
        })

        const classes = Object.values(classMap).map(cls => ({
            ...cls,
            attendanceRate: cls.totalStudents > 0 ? Math.round((cls.present / cls.totalStudents) * 100) : 0
        }))

        return {
            success: true,
            data: {
                classes,
                totalClasses: classes.length,
                totalStudents: students.length,
                presentToday: classes.reduce((sum, cls) => sum + cls.present, 0),
                absentToday: classes.reduce((sum, cls) => sum + cls.absent, 0)
            }
        }
    } catch (error) {
        console.error('获取学部考勤失败:', error)
        return { success: false, message: '获取数据失败', data: { classes: [], totalClasses: 0, totalStudents: 0, presentToday: 0, absentToday: 0 } }
    }
}

/**
 * 获取考勤统计数据（指定日期范围）
 * @param {Object} event - 请求参数
 * @param {Object} ctx - 上下文
 * @returns {Promise<Object>} 统计结果
 */
async function handleGetStatistics(event, ctx) {
    const { startDate, endDate } = event
    const { db } = ctx
    const _ = db.command

    try {
        const records = await getAllData(
            db.collection('attendance_records'),
            { date: _.gte(startDate).and(_.lte(endDate)) },
            { records: true }
        )

        let totalPresent = 0
        let totalStudents = 0

        records.forEach(record => {
            if (record.records && Array.isArray(record.records)) {
                totalStudents += record.records.length
                totalPresent += record.records.filter(s => s.status === ATTENDANCE_STATUS.PRESENT).length
            }
        })

        const rate = totalStudents > 0 ? ((totalPresent / totalStudents) * 100).toFixed(1) : 0

        return {
            success: true,
            data: {
                total: records.length,
                rate: parseFloat(rate)
            }
        }
    } catch (error) {
        console.error('获取考勤统计失败:', error)
        return { success: false, message: '获取考勤统计失败', data: { total: 0, rate: 0 } }
    }
}

module.exports = {
    handleGetByClass,
    handleGetByDepartment,
    handleGetStatistics
}
