/**
 * 云函数 - 考勤管理
 * 处理点名记录的提交、查询和统计
 */
const cloud = require('wx-server-sdk')
const {
  getAllData,
  paginate,
  sortStudentsByName,
  ROLES,
  success,
  successWithPagination,
  fail,
  unauthorized,
  badRequest
} = require('./common')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

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

            const studentNames = students.map(s => s.studentName).join('、')

            // 遍历所有班主任发送通知
            for (const classTeacher of teachersRes.data) {
                if (!classTeacher._openid) continue

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
    const wxContext = cloud.getWXContext()
    const openid = wxContext.OPENID

    // 需要验证身份的操作
    const authRequiredActions = ['submit', 'updateRecords']
    // 需要验证教师/管理员身份的操作
    const teacherActions = ['submit', 'updateRecords', 'getHistory', 'getDetail']

    // 基本身份验证
    if (!openid) {
        return { success: false, message: '未授权访问' }
    }

    // 敏感操作需要验证教师身份
    if (authRequiredActions.includes(action)) {
        const userCheck = await db.collection('users')
            .where({
                _openid: openid,
                role: db.command.in(['teacher', 'admin']),
                status: 'approved'
            })
            .count()
        if (userCheck.total === 0) {
            return { success: false, message: '无权执行此操作' }
        }
    }

    const handlers = {
        submit: handleSubmit,
        getHistory: handleGetHistory,
        getDetail: handleGetDetail,
        getByClass: handleGetByClass,
        getByDepartment: handleGetByDepartment,
        checkTodaySubmissions: handleCheckTodaySubmissions,
        updateRecords: handleUpdateRecords,
        getClubRank: handleGetClubRank,
        getClassRank: handleGetClassRank,
        getDepartmentClassRanking: handleGetDepartmentClassRanking,
        getByStudent: handleGetByStudent,
        getAbsenceWarnings: handleGetAbsenceWarnings,
        getStatistics: handleGetStatistics
    }

    const handler = handlers[action]
    if (!handler) {
        return { success: false, message: '无效的操作类型' }
    }

    return handler(event, openid)
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
        // 从学生记录中提取所有不重复的学部
        const departments = [...new Set(
            records
                .map(r => r.department)
                .filter(d => d) // 过滤掉空值
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
        await checkAbsenceAndNotify(records, clubName, date)

        return { success: true, data: { _id: result._id } }
    } catch (error) {
        console.error('提交点名记录失败:', error)
        return { success: false, message: '提交失败' }
    }
}

/**
 * 获取教师的历史点名记录（支持分页）
 * @param {string} teacherId - 教师ID（用于获取社团信息）
 * @param {string} clubName - 社团名称（可选，优先使用）
 * @param {number} page - 页码，从1开始，默认1
 * @param {number} pageSize - 每页数量，默认20
 */
async function handleGetHistory(event) {
    const { teacherId, clubName, page = 1, pageSize = 20 } = event

    try {
        // 如果没有传clubName，先通过teacherId查询用户的社团
        let queryClubName = clubName
        if (!queryClubName && teacherId) {
            const userRes = await db.collection('users').doc(teacherId).get()
            if (userRes.data && userRes.data.clubName) {
                queryClubName = userRes.data.clubName
            }
        }

        // 如果还是没有获取到clubName，则只查询该教师的记录（兼容处理）
        const whereCondition = queryClubName ? { clubName: queryClubName } : { teacherId }

        // 先获取总数
        const countRes = await db.collection('attendance_records')
            .where(whereCondition)
            .count()
        const total = countRes.total

        // 计算跳过的记录数
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

        // 按班级+姓名排序，保证显示顺序一致
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
 * 按班级获取考勤情况
 * 返回班级学生列表及当日考勤状态
 */
async function handleGetByClass(event) {
    const { className, date } = event

    try {
        // 并行查询学生、考勤记录、反馈信息
        const [studentsRaw, attendanceRecords, feedbacks] = await Promise.all([
            getAllData(db.collection('students'), { className }, { _id: true, studentName: true, gender: true, clubName: true, classTeacher: true, classTeacherPhone: true }),
            getAllData(db.collection('attendance_records'), { date }, { records: true, date: true, time: true }),
            getAllData(db.collection('feedbacks'), { className, date }, { studentId: true, feedback: true })
        ])

        // 按姓名中文拼音排序
        const students = sortStudentsByName(studentsRaw)

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

        // 按姓名中文拼音排序返回
        const result = sortStudentsByName(students.map(s => studentMap[s._id]))

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
        // 获取该学部所有学生（用于统计总人数和确认班级）
        const students = await getAllData(db.collection('students'), { department }, { _id: true, className: true })

        // 获取当天所有考勤记录
        // 策略调整：先拉取当天所有记录，在内存中过滤，以应对 departments 字段可能是数组也可能是字符串的情况，
        // 以及避免云数据库数组查询的潜在兼容性问题。
        const allDayRecords = await getAllData(db.collection('attendance_records'), { date }, { records: true, departments: true })

        // 内存过滤：筛选出包含当前学部的记录
        const attendanceRecords = allDayRecords.filter(record => {
            if (!record.departments) return false
            
            // 情况1: departments 是数组 (["职教一部", "职教二部"])
            if (Array.isArray(record.departments)) {
                return record.departments.includes(department)
            }
            
            // 情况2: departments 是字符串 ("职教一部")
            if (typeof record.departments === 'string') {
                return record.departments === department
            }

            return false
        })

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
 * 默认统计最近3个月数据以优化性能
 */
async function handleGetClubRank(event) {
    const { clubName, months = 3 } = event
    const _ = db.command

    try {
        // 计算时间范围（默认最近3个月）
        const startDate = new Date()
        startDate.setMonth(startDate.getMonth() - months)
        const startDateStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-01`

        // 并行查询学生列表和时间范围内的考勤记录
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

        // 统计每个学生的出勤情况
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
 * 获取班级学生出勤率排名（按所有社团汇总）
 * 返回班级所有学生的出勤统计，按出勤率排序
 * 默认统计最近3个月数据以优化性能
 */
async function handleGetClassRank(event) {
    const { className, months = 3 } = event
    const _ = db.command

    try {
        // 计算时间范围（默认最近3个月）
        const startDate = new Date()
        startDate.setMonth(startDate.getMonth() - months)
        const startDateStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-01`

        // 获取班级所有学生
        const students = await getAllData(
            db.collection('students'),
            { className },
            { _id: true, studentName: true, clubName: true }
        )

        if (students.length === 0) {
            return { success: true, data: [] }
        }

        // 获取学生所在社团的时间范围内考勤记录
        const clubNames = [...new Set(students.map(s => s.clubName).filter(Boolean))]
        const attendanceRecords = await getAllData(
            db.collection('attendance_records'),
            { clubName: _.in(clubNames), date: _.gte(startDateStr) },
            { records: true }
        )

        // 统计每个学生的出勤情况
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
            .filter(item => item.total > 0)
            .sort((a, b) => {
                if (b.rate !== a.rate) return b.rate - a.rate
                return b.total - a.total
            })

        return {
            success: true,
            data: rankList
        }
    } catch (error) {
        console.error('获取班级排行失败:', error)
        return { success: false, message: '获取排行失败', data: [] }
    }
}

/**
 * 获取学部班级出勤率排名
 * 返回学部所有班级的出勤统计，按出勤率排序
 */
async function handleGetDepartmentClassRanking(event) {
    const { department } = event
    const _ = db.command

    try {
        // 获取本月考勤记录（如果未指定日期范围）
        const now = new Date()
        const startDate = event.startDate || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
        const endDate = event.endDate || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-31`

        // 获取学部所有学生（获取班级信息）
        const students = await getAllData(
            db.collection('students'),
            { department },
            { _id: true, className: true }
        )

        // 建立学生ID到班级的映射
        const studentClassMap = {}
        students.forEach(s => {
            studentClassMap[s._id] = s.className
        })

        // 获取指定时间范围内的考勤记录
        const records = await getAllData(
            db.collection('attendance_records'),
            {
                date: _.gte(startDate).and(_.lte(endDate))
            },
            { records: true }
        )

        // 按班级统计出勤率
        const classStats = {}

        // 初始化班级统计数据
        students.forEach(s => {
            if (s.className && !classStats[s.className]) {
                classStats[s.className] = { total: 0, present: 0 }
            }
        })

        // 统计考勤数据（按学生所属班级归类）
        records.forEach(record => {
            record.records.forEach(r => {
                const className = studentClassMap[r.studentId]
                if (className && classStats[className]) {
                    classStats[className].total++
                    if (r.status === 'present') {
                        classStats[className].present++
                    }
                }
            })
        })

        // 计算出勤率并排序
        const ranking = Object.entries(classStats)
            .map(([name, stats]) => ({
                className: name,
                total: stats.total,
                present: stats.present,
                rate: stats.total > 0 ? parseFloat(((stats.present / stats.total) * 100).toFixed(1)) : 0
            }))
            .filter(item => item.total > 0) // 过滤没有考勤记录的班级
            .sort((a, b) => {
                // 先按出勤率降序，再按总次数降序
                if (b.rate !== a.rate) return b.rate - a.rate
                return b.total - a.total
            })

        return { success: true, data: ranking }
    } catch (error) {
        console.error('获取学部班级排行失败:', error)
        return { success: false, message: '获取排行失败', data: [] }
    }
}

/**
 * 按学生ID获取考勤记录
 * 支持分页，优化性能避免加载全部记录
 */
async function handleGetByStudent(event) {
    const { studentId, page = 1, pageSize = 20 } = event
    const _ = db.command

    try {
        // 使用数据库查询条件筛选包含该学生的记录
        const condition = {
            'records.studentId': studentId
        }

        // 获取总数
        const countRes = await db.collection('attendance_records')
            .where(condition)
            .count()
        const total = countRes.total

        // 分页查询
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
        // 策略调整：先按时间范围和社团（如果有）查询，然后在内存中过滤学部
        // 这样可以兼容 departments 为数组或字符串的情况
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
                if (s.status === 'absent') {
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

/**
 * 获取考勤统计数据
 * 统计指定日期范围内的考勤记录总数和出勤率
 */
async function handleGetStatistics(event) {
    const { startDate, endDate } = event
    const _ = db.command

    try {
        const records = await getAllData(
            db.collection('attendance_records'),
            {
                date: _.gte(startDate).and(_.lte(endDate))
            },
            { records: true }
        )

        let totalPresent = 0
        let totalStudents = 0

        records.forEach(record => {
            if (record.records && Array.isArray(record.records)) {
                totalStudents += record.records.length
                totalPresent += record.records.filter(s => s.status === 'present').length
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
