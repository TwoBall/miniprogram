/**
 * @file 学生管理模块
 * @module api/modules/students
 * @description 提供按社团、班级、学部查询学生的接口
 */
const {
    getAllData,
    sortStudentsByClassAndName,
    sortStudentsByName,
    sortOptions,
    success,
    fail,
    unauthorized,
    verifyUser
} = require('../common')

/**
 * 前置钩子 - 权限验证
 */
async function beforeAction(action, data, ctx) {
    const { db, openid } = ctx

    // getFilterOptions 不需要用户验证（注册页面需要使用）
    if (action === 'getFilterOptions') {
        return null
    }

    // 其他操作需要验证用户是否为已审批用户
    const user = await verifyUser(db, openid)
    if (!user) {
        return unauthorized()
    }

    return null
}

// ========== 处理函数 ==========

/**
 * 获取筛选选项
 */
async function handleGetFilterOptions(event, ctx) {
    const { db } = ctx

    try {
        const $ = db.command.aggregate

        const [deptRes, classRes, clubRes, classDeptRes] = await Promise.all([
            db.collection('students').aggregate().group({ _id: '$department' }).limit(1000).end(),
            db.collection('students').aggregate().group({ _id: '$className' }).limit(1000).end(),
            db.collection('students').aggregate().group({ _id: '$clubName' }).limit(1000).end(),
            db.collection('students').aggregate().group({
                _id: '$className',
                department: $.first('$department')
            }).limit(1000).end()
        ])

        const departments = sortOptions(deptRes.list.map(d => d._id).filter(Boolean))
        const classes = sortOptions(classRes.list.map(c => c._id).filter(Boolean))
        const clubs = sortOptions(clubRes.list.map(c => c._id).filter(Boolean))

        const classDeptMap = {}
        classDeptRes.list.forEach(item => {
            if (item._id && item.department) {
                classDeptMap[item._id] = item.department
            }
        })

        return success({ departments, classes, clubs, classDeptMap })
    } catch (error) {
        console.error('获取选项失败:', error)
        return fail('获取选项失败')
    }
}

/**
 * 按社团获取学生列表
 */
async function handleGetByClub(event, ctx) {
    const { clubName } = event
    const { db } = ctx

    try {
        const students = await getAllData(
            db.collection('students'),
            { clubName },
            { _id: true, studentName: true, department: true, className: true, gender: true, clubName: true, classTeacher: true, classTeacherPhone: true }
        )

        return success(sortStudentsByClassAndName(students))
    } catch (error) {
        console.error('获取社团学生失败:', error)
        return fail('获取社团学生失败')
    }
}

/**
 * 按班级获取学生列表
 */
async function handleGetByClass(event, ctx) {
    const { className } = event
    const { db } = ctx

    try {
        const students = await getAllData(
            db.collection('students'),
            { className },
            { _id: true, studentName: true, department: true, className: true, gender: true, clubName: true, classTeacher: true, classTeacherPhone: true }
        )

        return success(sortStudentsByName(students))
    } catch (error) {
        console.error('获取班级学生失败:', error)
        return fail('获取班级学生失败')
    }
}

/**
 * 按学部获取学生列表
 */
async function handleGetByDepartment(event, ctx) {
    const { department } = event
    const { db } = ctx

    try {
        const students = await getAllData(
            db.collection('students'),
            { department },
            { _id: true, studentName: true, department: true, className: true, gender: true, clubName: true }
        )

        return success(students)
    } catch (error) {
        console.error('获取学部学生失败:', error)
        return fail('获取学部学生失败')
    }
}

/**
 * 根据ID获取单个学生详情
 */
async function handleGetById(event, ctx) {
    const { studentId } = event
    const { db } = ctx

    if (!studentId) {
        return fail('缺少学生ID')
    }

    try {
        const result = await db.collection('students').doc(studentId).get()
        return success(result.data)
    } catch (error) {
        console.error('获取学生详情失败:', error)
        return fail('获取学生详情失败')
    }
}

/**
 * 获取所有学生列表
 */
async function handleGetAll(event, ctx) {
    const { db } = ctx

    try {
        const students = await getAllData(
            db.collection('students'),
            {},
            { _id: true, studentName: true, department: true, className: true, gender: true, clubName: true }
        )

        return success(students)
    } catch (error) {
        console.error('获取所有学生失败:', error)
        return fail('获取所有学生失败')
    }
}

/**
 * 获取学生统计数据
 */
async function handleGetStatistics(event, ctx) {
    const { db } = ctx

    try {
        const $ = db.command.aggregate

        const [totalRes, genderRes, deptRes, clubRes] = await Promise.all([
            db.collection('students').count(),
            db.collection('students').aggregate().group({ _id: '$gender', count: $.sum(1) }).limit(1000).end(),
            db.collection('students').aggregate().group({ _id: '$department', count: $.sum(1) }).limit(1000).end(),
            db.collection('students').aggregate().group({ _id: '$clubName', count: $.sum(1) }).limit(1000).end()
        ])

        const genderStats = {}
        genderRes.list.forEach(item => {
            if (item._id) {
                genderStats[item._id] = item.count
            }
        })

        const deptStats = deptRes.list
            .filter(item => item._id)
            .map(item => ({ name: item._id, count: item.count }))
            .sort((a, b) => b.count - a.count)

        const clubStats = clubRes.list
            .filter(item => item._id)
            .map(item => ({ name: item._id, count: item.count }))
            .sort((a, b) => b.count - a.count)

        return success({
            total: totalRes.total,
            genderStats,
            deptStats,
            clubStats
        })
    } catch (error) {
        console.error('获取统计数据失败:', error)
        return fail('获取统计数据失败')
    }
}

/**
 * 获取学生详情及考勤历史（批量接口）
 * 合并 getById + attendance/getByStudent
 * 优化：将原来2次调用减少为1次
 */
async function handleGetStudentWithAttendance(event, ctx) {
    const { studentId } = event
    const { db } = ctx

    if (!studentId) {
        return fail('缺少学生ID')
    }

    try {
        // 并行查询：学生信息 + 考勤记录
        const [studentResult, attendanceResult] = await Promise.all([
            db.collection('students').doc(studentId).get(),
            db.collection('attendance_records')
                .where({
                    'records.studentId': studentId
                })
                .orderBy('date', 'desc')
                .limit(100)
                .get()
        ])

        const student = studentResult.data
        const records = attendanceResult.data || []

        // 计算统计数据并预处理每条记录的学生状态
        let presentCount = 0
        let absentCount = 0
        let lateCount = 0

        const processedRecords = records.map(record => {
            const studentRecord = record.records.find(s => s.studentId === studentId)

            if (studentRecord) {
                switch (studentRecord.status) {
                    case 'present':
                        presentCount++
                        break
                    case 'absent':
                        absentCount++
                        break
                    case 'late':
                        lateCount++
                        break
                }
            }

            return {
                _id: record._id,
                date: record.date,
                clubName: record.clubName,
                teacherName: record.teacherName,
                studentStatus: studentRecord?.status || 'unknown',
                studentNote: studentRecord?.note || ''
            }
        })

        const totalRecords = records.length
        const attendanceRate = totalRecords > 0
            ? Math.round(((presentCount + lateCount) / totalRecords) * 100)
            : 0

        return success({
            student,
            attendanceHistory: processedRecords,
            stats: {
                totalRecords,
                presentCount,
                absentCount,
                lateCount,
                attendanceRate
            }
        })
    } catch (error) {
        console.error('获取学生详情及考勤失败:', error)
        return fail('获取学生详情失败')
    }
}

// 导出模块
module.exports = {
    beforeAction,
    handlers: {
        getFilterOptions: handleGetFilterOptions,
        getByClub: handleGetByClub,
        getByClass: handleGetByClass,
        getByDepartment: handleGetByDepartment,
        getById: handleGetById,
        getAll: handleGetAll,
        getStatistics: handleGetStatistics,
        getStudentWithAttendance: handleGetStudentWithAttendance
    }
}
