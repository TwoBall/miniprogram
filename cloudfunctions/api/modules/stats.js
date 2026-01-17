/**
 * @file 统计聚合模块
 * @module api/modules/stats
 * @description 处理跨模块的批量统计数据获取，减少前端 API 调用次数
 */
const { verifyAdmin, USER_STATUS, success, fail, unauthorized, query } = require('../common')

/**
 * 前置钩子 - 权限验证
 */
async function beforeAction(action, data, ctx) {
    const { openid } = ctx

    if (!openid) {
        return unauthorized('未授权访问')
    }

    return null
}

// ========== 辅助函数 ==========

/**
 * 格式化日期为 YYYY-MM-DD
 */
function formatDate(date) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

/**
 * 获取考勤统计（内部函数）
 */
async function getAttendanceStats(db, startDate, endDate) {
    const _ = db.command
    const $ = db.command.aggregate

    try {
        const result = await db.collection('attendance_records').aggregate()
            .match({
                date: _.gte(startDate).and(_.lte(endDate))
            })
            .unwind('$records')
            .group({
                _id: null,
                total: $.sum(1),
                present: $.sum($.cond({
                    if: $.eq(['$records.status', 'present']),
                    then: 1,
                    else: 0
                })),
                late: $.sum($.cond({
                    if: $.eq(['$records.status', 'late']),
                    then: 1,
                    else: 0
                }))
            })
            .end()

        if (result.list.length === 0) {
            return { total: 0, rate: 0 }
        }

        const data = result.list[0]
        const attendCount = data.present + data.late
        return {
            total: data.total,
            rate: data.total > 0 ? Math.round(attendCount / data.total * 100) : 0
        }
    } catch (error) {
        console.error('获取考勤统计失败:', error)
        return { total: 0, rate: 0 }
    }
}

// ========== 批量统计接口 ==========

/**
 * 获取数据中心统计数据（批量接口）
 * 合并用户统计、学生统计、社团统计、考勤统计
 * 优化：将原来6次调用减少为1次
 */
async function handleGetDataCenterStats(event, ctx) {
    const { db, openid } = ctx
    const _ = db.command
    const $ = db.command.aggregate

    // 验证管理员权限
    const admin = await verifyAdmin(db, openid)
    if (!admin) {
        return unauthorized('无权执行此操作')
    }

    try {
        const now = new Date()
        const today = formatDate(now)
        const weekAgo = formatDate(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000))
        const monthAgo = formatDate(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000))

        // 并行执行所有统计查询
        const [
            // 用户统计
            userTotal,
            userByRole,
            userByStatus,
            userBound,
            // 学生统计（同时用于社团统计，避免重复查询）
            studentTotal,
            studentByDept,
            studentByGender,
            clubAgg,
            // 考勤统计（今日、本周、本月）
            todayAtt,
            weekAtt,
            monthAtt
        ] = await Promise.all([
            // 用户统计查询
            db.collection('users').where({ deleted: _.neq(true) }).count(),
            db.collection('users').aggregate()
                .match({ deleted: _.neq(true) })
                .group({ _id: '$role', count: $.sum(1) })
                .end(),
            db.collection('users').aggregate()
                .match({ deleted: _.neq(true) })
                .group({ _id: '$status', count: $.sum(1) })
                .end(),
            db.collection('users').where({
                deleted: _.neq(true),
                _openid: _.and(_.exists(true), _.neq(null), _.neq(''))
            }).count(),

            // 学生统计查询
            db.collection('students').count(),
            db.collection('students').aggregate()
                .group({ _id: '$department', count: $.sum(1) })
                .end(),
            db.collection('students').aggregate()
                .group({ _id: '$gender', count: $.sum(1) })
                .end(),
            db.collection('students').aggregate()
                .group({ _id: '$clubName', count: $.sum(1) })
                .end(),

            // 考勤统计查询
            getAttendanceStats(db, today, today),
            getAttendanceStats(db, weekAgo, today),
            getAttendanceStats(db, monthAgo, today)
        ])

        // 格式化用户统计
        const userStats = {
            total: userTotal.total,
            byRole: {
                teacher: 0,
                classTeacher: 0,
                leader: 0,
                admin: 0
            },
            byStatus: {
                [USER_STATUS.APPROVED]: 0,
                [USER_STATUS.PENDING]: 0,
                [USER_STATUS.REJECTED]: 0
            },
            bound: userBound.total,
            unbound: userTotal.total - userBound.total
        }
        userByRole.list.forEach(item => {
            if (item._id && userStats.byRole.hasOwnProperty(item._id)) {
                userStats.byRole[item._id] = item.count
            }
        })
        userByStatus.list.forEach(item => {
            if (item._id) {
                userStats.byStatus[item._id] = item.count
            }
        })

        // 格式化学生统计
        const studentStats = {
            total: studentTotal.total,
            byDepartment: {},
            byGender: {}
        }
        studentByDept.list.forEach(item => {
            if (item._id) {
                studentStats.byDepartment[item._id] = item.count
            }
        })
        studentByGender.list.forEach(item => {
            if (item._id) {
                studentStats.byGender[item._id] = item.count
            }
        })

        // 格式化社团统计
        const clubStats = {
            total: clubAgg.list.filter(c => c._id).length,
            list: clubAgg.list
                .filter(c => c._id)
                .map(c => ({ name: c._id, count: c.count }))
                .sort((a, b) => b.count - a.count)
        }

        // 格式化考勤统计
        const attendanceStats = {
            todayTotal: todayAtt.total,
            todayRate: todayAtt.rate,
            weekTotal: weekAtt.total,
            weekRate: weekAtt.rate,
            monthTotal: monthAtt.total,
            monthRate: monthAtt.rate
        }

        return success({
            userStats,
            studentStats,
            clubStats,
            attendanceStats
        })
    } catch (error) {
        console.error('获取数据中心统计失败:', error)
        return fail('获取统计数据失败')
    }
}

/**
 * 获取管理员首页统计数据（批量接口）
 * 合并用户统计、社团数量、今日考勤
 * 优化：将原来3次调用减少为1次
 */
async function handleGetHomeStats(event, ctx) {
    const { db, openid } = ctx
    const _ = db.command
    const $ = db.command.aggregate

    // 验证管理员权限
    const admin = await verifyAdmin(db, openid)
    if (!admin) {
        return unauthorized('无权执行此操作')
    }

    try {
        const today = formatDate(new Date())

        // 并行执行所有查询
        const [
            userTotal,
            userPending,
            clubAgg,
            todayAtt
        ] = await Promise.all([
            // 用户总数
            db.collection('users').where({ deleted: _.neq(true) }).count(),
            // 待审批用户数
            db.collection('users').where({
                deleted: _.neq(true),
                status: USER_STATUS.PENDING
            }).count(),
            // 社团数量（去重）
            db.collection('students').aggregate()
                .group({ _id: '$clubName' })
                .end(),
            // 今日考勤
            getAttendanceStats(db, today, today)
        ])

        return success({
            totalUsers: userTotal.total,
            pendingUsers: userPending.total,
            totalClubs: clubAgg.list.filter(c => c._id).length,
            todayAttendance: todayAtt.total
        })
    } catch (error) {
        console.error('获取首页统计失败:', error)
        return fail('获取统计数据失败')
    }
}

// ========== 领导看板批量接口 ==========

/**
 * 获取领导看板统计数据（批量接口）
 * 合并学部考勤数据 + 缺勤预警
 * 优化：将原来2次调用减少为1次
 */
async function handleGetDashboardStats(event, ctx) {
    const { db } = ctx
    const { department, date } = event
    const _ = db.command
    const $ = db.command.aggregate

    if (!department) {
        return fail('缺少学部参数')
    }

    if (!date) {
        return fail('缺少日期参数')
    }

    try {
        // 获取当前月份用于缺勤预警查询
        const now = new Date()
        const year = now.getFullYear()
        const month = String(now.getMonth() + 1).padStart(2, '0')
        const currentMonth = `${year}-${month}`

        // 并行执行：学部学生列表 + 当日考勤记录 + 缺勤预警
        const [students, attendanceRecords, warningsResult] = await Promise.all([
            // 获取学部下所有学生（使用 query 统一查询方法）
            query(db.collection('students'), {
                where: { department },
                field: { _id: true, studentName: true, className: true, clubName: true }
            }),

            // 获取当日该学部的考勤记录（通过 departments 数组过滤）
            query(db.collection('attendance_records'), {
                where: {
                    date,
                    departments: department  // 只查询包含该学部的考勤记录
                }
            }),

            // 获取缺勤预警（本月缺勤>=3次的学生）
            db.collection('attendance_records').aggregate()
                .match({
                    date: _.gte(`${currentMonth}-01`).and(_.lte(`${currentMonth}-31`))
                })
                .unwind('$records')
                .match({
                    'records.status': 'absent'
                })
                .group({
                    _id: '$records.studentId',
                    absenceCount: $.sum(1),
                    studentName: $.first('$records.studentName'),
                    className: $.first('$records.className'),
                    clubName: $.first('$records.clubName')
                })
                .match({
                    absenceCount: _.gte(3)
                })
                .sort({ absenceCount: -1 })
                .end()
        ])

        // 按班级统计学生
        const classMap = {}
        students.forEach(student => {
            const className = student.className
            if (!classMap[className]) {
                classMap[className] = {
                    className,
                    totalStudents: 0,
                    present: 0,
                    absent: 0
                }
            }
            classMap[className].totalStudents++
        })

        // 统计当日考勤情况
        let totalPresent = 0
        let totalAbsent = 0

        // 构建该学部学生ID集合，用于精确过滤
        const departmentStudentIds = new Set(students.map(s => s._id))
        const studentClassMap = {}
        students.forEach(s => {
            studentClassMap[s._id] = s.className
        })

        attendanceRecords.forEach(record => {
            if (!record.records) return
            record.records.forEach(r => {
                // 只统计该学部的学生（一条考勤记录可能包含多个学部的学生）
                if (!departmentStudentIds.has(r.studentId)) return

                const className = r.className || studentClassMap[r.studentId]
                if (!className || !classMap[className]) return

                if (r.status === 'present' || r.status === 'late') {
                    classMap[className].present++
                    totalPresent++
                } else if (r.status === 'absent') {
                    classMap[className].absent++
                    totalAbsent++
                }
            })
        })

        // 转换为数组，并计算出勤率
        const classes = Object.values(classMap).map(c => {
            const total = c.present + c.absent
            return {
                ...c,
                attendanceRate: total > 0 ? Math.round(c.present / total * 100) : 0
            }
        })

        // 过滤缺勤预警：只保留本学部的学生（复用已有的 departmentStudentIds）
        const warnings = (warningsResult.list || []).filter(w => {
            // 需要检查学生是否属于该学部
            return departmentStudentIds.has(w._id)
        }).map(w => ({
            studentId: w._id,
            studentName: w.studentName,
            className: w.className,
            clubName: w.clubName,
            absenceCount: w.absenceCount
        }))

        return success({
            // 考勤数据
            classes,
            totalClasses: classes.length,
            totalStudents: students.length,
            presentToday: totalPresent,
            absentToday: totalAbsent,
            // 缺勤预警
            absenceWarnings: warnings,
            warningCount: warnings.length
        })
    } catch (error) {
        console.error('获取领导看板统计失败:', error)
        return fail('获取统计数据失败')
    }
}

// ========== 班主任概览批量接口 ==========

/**
 * 获取班主任概览统计数据（批量接口）
 * 合并班级学生列表 + 当日考勤
 * 优化：将原来2次调用减少为1次
 */
async function handleGetClassOverviewStats(event, ctx) {
    const { db } = ctx
    const { className, date } = event
    const _ = db.command

    if (!className) {
        return fail('缺少班级参数')
    }

    if (!date) {
        return fail('缺少日期参数')
    }

    try {
        // 并行查询：班级学生 + 当日考勤记录（使用 query 统一查询方法）
        const [students, attendanceRecords] = await Promise.all([
            query(db.collection('students'), {
                where: { className },
                field: { _id: true, studentName: true, className: true, clubName: true, department: true, gender: true }
            }),
            query(db.collection('attendance_records'), {
                where: { date }
            })
        ])

        // 构建学生ID到考勤状态的映射
        const studentAttendanceMap = {}
        attendanceRecords.forEach(record => {
            if (!record.records) return
            record.records.forEach(r => {
                if (!studentAttendanceMap[r.studentId]) {
                    studentAttendanceMap[r.studentId] = {
                        status: r.status,
                        clubName: record.clubName
                    }
                }
            })
        })

        // 统计数据
        let presentCount = 0
        let absentCount = 0
        const clubSet = new Set()

        // 为每个学生添加今日考勤状态
        const studentsWithStatus = students.map(student => {
            const attendance = studentAttendanceMap[student._id]
            if (student.clubName) clubSet.add(student.clubName)

            if (attendance) {
                if (attendance.status === 'present' || attendance.status === 'late') {
                    presentCount++
                } else if (attendance.status === 'absent') {
                    absentCount++
                }
            }

            return {
                ...student,
                todayStatus: attendance?.status || null,
                attendanceClub: attendance?.clubName || null
            }
        })

        // 按状态排序：缺勤优先显示
        studentsWithStatus.sort((a, b) => {
            const statusOrder = { 'absent': 0, 'late': 1, 'present': 2, null: 3 }
            return (statusOrder[a.todayStatus] ?? 3) - (statusOrder[b.todayStatus] ?? 3)
        })

        return success({
            students: studentsWithStatus,
            totalStudents: students.length,
            joinedClubs: clubSet.size,
            presentToday: presentCount,
            absentToday: absentCount
        })
    } catch (error) {
        console.error('获取班主任概览统计失败:', error)
        return fail('获取统计数据失败')
    }
}

// ========== 教师首页批量接口 ==========

/**
 * 获取教师首页统计数据（批量接口）
 * 合并社团学生列表 + 今日点名状态
 * 优化：将原来2次调用减少为1次
 */
async function handleGetTeacherHomeStats(event, ctx) {
    const { db } = ctx
    const { clubName, date } = event
    const _ = db.command

    if (!clubName) {
        return fail('缺少社团参数')
    }

    try {
        const queryDate = date || formatDate(new Date())

        // 并行查询：社团学生 + 今日考勤记录（使用 query 统一查询方法）
        const [students, todayRecords] = await Promise.all([
            query(db.collection('students'), {
                where: { clubName },
                field: { _id: true, studentName: true, className: true, department: true }
            }),
            query(db.collection('attendance_records'), {
                where: { clubName, date: queryDate },
                orderBy: { createTime: 'desc' },
                limit: 1
            })
        ])

        const todayRecord = todayRecords[0] || null

        // 统计今日考勤
        let presentCount = 0
        let absentCount = 0
        let hasSubmittedToday = false

        if (todayRecord && todayRecord.records) {
            hasSubmittedToday = true
            todayRecord.records.forEach(r => {
                if (r.status === 'present' || r.status === 'late') {
                    presentCount++
                } else if (r.status === 'absent') {
                    absentCount++
                }
            })
        }

        // 按学部统计学生分布
        const deptStats = {}
        students.forEach(s => {
            const dept = s.department || '未分配'
            deptStats[dept] = (deptStats[dept] || 0) + 1
        })

        return success({
            totalStudents: students.length,
            hasSubmittedToday,
            todayStats: {
                present: presentCount,
                absent: absentCount,
                total: presentCount + absentCount
            },
            departmentDistribution: Object.entries(deptStats)
                .map(([name, count]) => ({ name, count }))
                .sort((a, b) => b.count - a.count),
            lastSubmitTime: todayRecord?.createTime || null
        })
    } catch (error) {
        console.error('获取教师首页统计失败:', error)
        return fail('获取统计数据失败')
    }
}

// 导出模块
module.exports = {
    beforeAction,
    handlers: {
        getDataCenterStats: handleGetDataCenterStats,
        getHomeStats: handleGetHomeStats,
        getDashboardStats: handleGetDashboardStats,
        getClassOverviewStats: handleGetClassOverviewStats,
        getTeacherHomeStats: handleGetTeacherHomeStats
    }
}
