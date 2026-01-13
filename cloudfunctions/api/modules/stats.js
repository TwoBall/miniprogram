/**
 * @file 统计聚合模块
 * @module api/modules/stats
 * @description 处理跨模块的批量统计数据获取，减少前端 API 调用次数
 */
const { verifyAdmin, USER_STATUS, success, fail, unauthorized } = require('../common')

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

// 导出模块
module.exports = {
    beforeAction,
    handlers: {
        getDataCenterStats: handleGetDataCenterStats,
        getHomeStats: handleGetHomeStats
    }
}
