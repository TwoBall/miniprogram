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
 * 检查缺勤情况并发送通知
 */
async function checkAbsenceAndNotify(records, clubName, date) {
    try {
        // 筛选出缺勤的学生
        const absentRecords = records.filter(r => r.status === 'absent')

        if (absentRecords.length === 0) return

        // 批量获取缺勤学生的班主任信息
        const studentIds = absentRecords.map(r => r.studentId)
        const _ = db.command

        // 查询学生信息（获取班级、姓名）
        const studentsRes = await db.collection('students')
            .where({ _id: _.in(studentIds) })
            .get()

        // 按班级分组
        const classCounts = {}
        studentsRes.data.forEach(student => {
            const className = student.className
            if (!classCounts[className]) {
                classCounts[className] = []
            }
            classCounts[className].push(student)
        })

        // 为每个班级的班主任创建通知
        for (const [className, students] of Object.entries(classCounts)) {
            // 查询班主任
            const teachersRes = await db.collection('users')
                .where({
                    role: 'classTeacher',
                    className: className,
                    status: 'approved'
                })
                .get()

            if (teachersRes.data.length === 0) continue

            const classTeacher = teachersRes.data[0]
            const studentNames = students.map(s => s.name).join('、')

            // 创建缺勤提醒通知
            await db.collection('notifications').add({
                data: {
                    type: 'absence_warning',
                    recipientId: classTeacher._openid,
                    title: `${clubName} 缺勤提醒`,
                    content: `您班有 ${students.length} 名学生在 ${date} 的 ${clubName} 社团活动中缺勤：${studentNames}`,
                    data: {
                        clubName,
                        date,
                        className,
                        studentIds: students.map(s => s._id),
                        studentNames
                    },
                    read: false,
                    createTime: db.serverDate()
                }
            })
        }
    } catch (error) {
        console.error('创建缺勤通知失败:', error)
        // 不影响主流程，只记录错误
    }
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
        updateRecords: handleUpdateRecords,
        getClubRank: handleGetClubRank,
        getClubRanking: handleGetClubRanking,
        getByStudent: handleGetByStudent,
        getAbsenceWarnings: handleGetAbsenceWarnings
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

        // 检查缺勤情况并发送通知
        await checkAbsenceAndNotify(records, clubName, date)

        return { success: true, data: { _id: result._id } }
    } catch (error) {
        console.error('提交点名记录失败:', error)
        return { success: false, message: '提交失败' }
    }
}

/**
 * 获取教师的历史点名记录（支持分页）
 * @param {string} teacherId - 教师ID
 * @param {number} page - 页码，从1开始，默认1
 * @param {number} pageSize - 每页数量，默认20
 */
async function handleGetHistory(event) {
    const { teacherId, page = 1, pageSize = 20 } = event

    try {
        // 先获取总数
        const countRes = await db.collection('attendance_records')
            .where({ teacherId })
            .count()
        const total = countRes.total

        // 计算跳过的记录数
        const skip = (page - 1) * pageSize

        const recordsRes = await db.collection('attendance_records')
            .where({ teacherId })
            .orderBy('createTime', 'desc')
            .skip(skip)
            .limit(pageSize)
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

/**
 * 获取社团学生出勤率排行
 * 返回社团所有学生的出勤统计，按出勤率排序
 */
async function handleGetClubRank(event) {
    const { clubName } = event

    try {
        // 并行查询学生列表和所有考勤记录
        const [students, attendanceRecords] = await Promise.all([
            getAllData(
                db.collection('students'),
                { clubName },
                { _id: true, name: true, className: true }
            ),
            getAllData(
                db.collection('attendance_records'),
                { clubName },
                { records: true }
            )
        ])

        // 统计每个学生的出勤情况
        const studentStats = {}
        students.forEach(s => {
            studentStats[s._id] = {
                name: s.name,
                className: s.className,
                present: 0,
                total: 0,
                rate: 0
            }
        })

        // 遍历所有考勤记录，累计出勤次数
        attendanceRecords.forEach(record => {
            record.records.forEach(r => {
                if (studentStats[r.studentId]) {
                    studentStats[r.studentId].total++
                    if (r.status === 'present') {
                        studentStats[r.studentId].present++
                    }
                }
            })
        })

        // 计算出勤率并转换为数组
        const rankList = Object.values(studentStats)
            .map(item => ({
                ...item,
                rate: item.total > 0 ? parseFloat(((item.present / item.total) * 100).toFixed(1)) : 0
            }))
            .filter(item => item.total > 0) // 过滤掉没有考勤记录的学生
            .sort((a, b) => {
                // 先按出勤率降序，再按总次数降序
                if (b.rate !== a.rate) return b.rate - a.rate
                return b.total - a.total
            })

        return {
            success: true,
            data: rankList
        }
    } catch (error) {
        console.error('获取社团排行失败:', error)
        return { success: false, message: '获取排行失败', data: [] }
    }
}

/**
 * 获取学部社团出勤率排名
 * 返回学部所有社团的出勤统计，按出勤率排序
 */
async function handleGetClubRanking(event) {
    const { department } = event
    const _ = db.command

    try {
        // 获取本月考勤记录（如果未指定日期范围）
        const now = new Date()
        const startDate = event.startDate || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
        const endDate = event.endDate || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-31`

        // 获取学部所有学生（获取社团信息）
        const students = await getAllData(
            db.collection('students'),
            { department },
            { _id: true, clubName: true }
        )

        // 获取指定时间范围内的考勤记录
        const records = await getAllData(
            db.collection('attendance_records'),
            {
                date: _.gte(startDate).and(_.lte(endDate))
            },
            { records: true, clubName: true }
        )

        // 按社团统计出勤率
        const clubStats = {}

        // 初始化社团统计数据
        students.forEach(s => {
            if (s.clubName && !clubStats[s.clubName]) {
                clubStats[s.clubName] = { total: 0, present: 0 }
            }
        })

        // 统计考勤数据
        records.forEach(record => {
            if (record.clubName && clubStats[record.clubName] !== undefined) {
                record.records.forEach(r => {
                    clubStats[record.clubName].total++
                    if (r.status === 'present') {
                        clubStats[record.clubName].present++
                    }
                })
            }
        })

        // 计算出勤率并排序
        const ranking = Object.entries(clubStats)
            .map(([name, stats]) => ({
                clubName: name,
                total: stats.total,
                present: stats.present,
                rate: stats.total > 0 ? parseFloat(((stats.present / stats.total) * 100).toFixed(1)) : 0
            }))
            .sort((a, b) => {
                // 先按出勤率降序，再按总次数降序
                if (b.rate !== a.rate) return b.rate - a.rate
                return b.total - a.total
            })

        return { success: true, data: ranking }
    } catch (error) {
        console.error('获取学部社团排行失败:', error)
        return { success: false, message: '获取排行失败', data: [] }
    }
}

/**
 * 按学生ID获取考勤记录
 */
async function handleGetByStudent(event) {
    const { studentId } = event

    try {
        // 查询包含该学生的所有考勤记录
        const allRecords = await getAllData(
            db.collection('attendance_records'),
            {},
            { _id: true, date: true, clubName: true, students: true, createTime: true }
        )

        // 筛选出包含该学生的记录
        const studentRecords = allRecords
            .filter(record => record.students.some(s => s.studentId === studentId))
            .sort((a, b) => {
                // 按日期降序排序
                return b.date.localeCompare(a.date)
            })

        return { success: true, data: studentRecords }
    } catch (error) {
        console.error('获取学生考勤记录失败:', error)
        return { success: false, message: '获取考勤记录失败', data: [] }
    }
}

/**
 * 获取缺勤预警列表
 * 统计指定月份缺勤>=3次的学生
 */
async function handleGetAbsenceWarnings(event) {
    const { month, department, className, clubName } = event
    const _ = db.command

    try {
        // 计算月份范围
        const startDate = `${month}-01`
        const endDate = `${month}-31`

        // 查询该月所有考勤记录
        let condition = {
            date: _.gte(startDate).and(_.lte(endDate))
        }
        if (department) condition.department = department
        if (clubName) condition.clubName = clubName

        const records = await getAllData(
            db.collection('attendance_records'),
            condition,
            { students: true, clubName: true, date: true }
        )

        // 统计每个学生的缺勤次数
        const absenceCount = {}
        records.forEach(record => {
            record.students.forEach(s => {
                if (s.status === 'absent') {
                    const key = s.studentId
                    if (!absenceCount[key]) {
                        absenceCount[key] = {
                            studentId: s.studentId,
                            name: s.name,
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
