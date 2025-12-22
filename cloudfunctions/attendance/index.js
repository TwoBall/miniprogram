/**
 * 云函数 - 考勤管理
 * 处理点名记录的提交、查询和统计
 */
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const MAX_LIMIT = 100

/**
 * 获取所有数据的辅助函数
 * 突破云数据库单次查询100条的限制
 */
async function getAllData(collection, condition, fields = null) {
    const countResult = await collection.where(condition).count()
    const total = countResult.total

    if (total === 0) return []

    let query = collection.where(condition)
    if (fields) query = query.field(fields)

    if (total <= MAX_LIMIT) {
        const res = await query.get()
        return res.data
    }

    const batchTimes = Math.ceil(total / MAX_LIMIT)
    const tasks = []
    for (let i = 0; i < batchTimes; i++) {
        tasks.push(query.skip(i * MAX_LIMIT).limit(MAX_LIMIT).get())
    }

    const results = await Promise.all(tasks)
    return results.flatMap(res => res.data)
}

/**
 * 云函数入口
 * @param {Object} event - 请求参数
 * @param {string} event.action - 操作类型
 */
exports.main = async (event, context) => {
    const { action } = event

    const handlers = {
        submit: handleSubmit,
        getHistory: handleGetHistory,
        getDetail: handleGetDetail,
        getByClass: handleGetByClass,
        getByDepartment: handleGetByDepartment,
        checkTodaySubmissions: handleCheckTodaySubmissions,
        updateRecords: handleUpdateRecords
    }

    const handler = handlers[action]
    if (!handler) {
        return { success: false, message: '无效的操作类型' }
    }

    return handler(event)
}

/**
 * 检查今日是否已有点名记录
 */
async function handleCheckTodaySubmissions(event) {
    const { clubName, date } = event
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
 * 支持覆盖模式和新增模式
 */
async function handleSubmit(event) {
    const { clubName, teacherId, teacherName, date, time, records, mode } = event

    try {
        // 如果是覆盖模式，先删除当天的旧记录
        if (mode === 'cover') {
            await db.collection('attendance_records')
                .where({ clubName, date })
                .remove()
        }

        const result = await db.collection('attendance_records').add({
            data: { clubName, teacherId, teacherName, date, time, records, createTime: db.serverDate() }
        })

        return { success: true, data: { _id: result._id } }
    } catch (error) {
        console.error('提交点名记录失败:', error)
        return { success: false, message: '提交失败' }
    }
}

/**
 * 获取教师的历史点名记录
 */
async function handleGetHistory(event) {
    const { teacherId } = event

    try {
        const recordsRes = await db.collection('attendance_records')
            .where({ teacherId })
            .orderBy('createTime', 'desc')
            .limit(50)
            .field({ _id: true, date: true, time: true, clubName: true, records: true })
            .get()

        const records = recordsRes.data.map(record => ({
            _id: record._id,
            date: record.date,
            time: record.time,
            clubName: record.clubName,
            totalCount: record.records.length,
            presentCount: record.records.filter(r => r.status === 'present').length,
            absentCount: record.records.filter(r => r.status === 'absent').length
        }))

        return { success: true, data: records }
    } catch (error) {
        console.error('获取历史记录失败:', error)
        return { success: false, message: '获取历史记录失败', data: [] }
    }
}

/**
 * 获取单条点名记录的详情
 * 包含学生反馈信息
 */
async function handleGetDetail(event) {
    const { recordId } = event

    try {
        const recordRes = await db.collection('attendance_records').doc(recordId).get()
        const record = recordRes.data

        // 获取该记录中所有学生的反馈信息
        const studentIds = record.records.map(r => r.studentId)
        const feedbackRes = await getAllData(
            db.collection('feedbacks'),
            {
                date: record.date,
                studentId: db.command.in(studentIds)
            }
        )

        // 将反馈信息合并到记录中
        const feedbackMap = {}
        feedbackRes.forEach(f => {
            feedbackMap[f.studentId] = f.feedback
        })

        record.records = record.records.map(r => ({
            ...r,
            feedback: feedbackMap[r.studentId] || ''
        }))

        return { success: true, data: record }
    } catch (error) {
        console.error('获取记录详情失败:', error)
        return { success: false, message: '获取记录详情失败' }
    }
}

/**
 * 按班级获取考勤情况
 * 返回班级学生列表及当日考勤状态
 */
async function handleGetByClass(event) {
    const { className, date } = event

    try {
        // 并行查询学生、考勤记录、反馈信息
        const [students, attendanceRecords, feedbacks] = await Promise.all([
            getAllData(db.collection('students'), { className }, { _id: true, name: true, gender: true, clubName: true, classTeacher: true, classTeacherPhone: true }),
            getAllData(db.collection('attendance_records'), { date }, { records: true, date: true, time: true }),
            getAllData(db.collection('feedbacks'), { className, date }, { studentId: true, feedback: true })
        ])

        // 构建反馈映射
        const feedbackMap = {}
        feedbacks.forEach(f => {
            feedbackMap[f.studentId] = f.feedback
        })

        // 构建学生考勤状态
        const studentMap = {}
        students.forEach(s => {
            studentMap[s._id] = {
                ...s,
                todayStatus: null,
                attendanceTime: '',
                feedback: feedbackMap[s._id] || '' // 添加反馈信息
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

        const result = Object.values(studentMap)

        return {
            success: true,
            data: {
                students: result,
                totalStudents: students.length,
                joinedClubs: result.filter(s => s.clubName).length,
                presentToday: result.filter(s => s.todayStatus === 'present').length,
                absentToday: result.filter(s => s.todayStatus === 'absent').length
            }
        }
    } catch (error) {
        console.error('获取班级考勤失败:', error)
        return { success: false, message: '获取数据失败', data: { students: [], totalStudents: 0, joinedClubs: 0, presentToday: 0, absentToday: 0 } }
    }
}

/**
 * 按学部获取考勤统计
 * 返回学部下各班级的考勤汇总
 */
async function handleGetByDepartment(event) {
    const { department, date } = event

    try {
        // 并行查询
        const [students, attendanceRecords] = await Promise.all([
            getAllData(db.collection('students'), { department }, { _id: true, className: true }),
            getAllData(db.collection('attendance_records'), { date }, { records: true })
        ])

        // 按班级统计
        const classMap = {}
        students.forEach(s => {
            if (!classMap[s.className]) {
                classMap[s.className] = { className: s.className, totalStudents: 0, present: 0, absent: 0 }
            }
            classMap[s.className].totalStudents++
        })

        // 统计考勤
        const studentAttendance = {}
        attendanceRecords.forEach(record => {
            record.records.forEach(r => {
                studentAttendance[r.studentId] = r.status
            })
        })

        students.forEach(s => {
            const status = studentAttendance[s._id]
            if (status === 'present') classMap[s.className].present++
            else if (status === 'absent') classMap[s.className].absent++
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
 * 更新点名记录（修改学生状态）
 */
async function handleUpdateRecords(event) {
    const { recordId, records } = event

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
