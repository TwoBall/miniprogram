/**
 * @file 学生数据管理云函数 - 提供按社团、班级、学部查询学生的接口
 * @module cloudfunctions/students
 */
const cloud = require('wx-server-sdk')
const {
  getAllData,
  sortStudentsByClassAndName,
  sortStudentsByName,
  sortOptions,
  success,
  fail,
  unauthorized
} = require('./common')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

/**
 * 云函数入口
 * @param {Object} event - 请求参数
 * @param {string} event.action - 操作类型: getByClub/getByClass/getByDepartment/getFilterOptions/getStatistics/getAll/getById
 * @param {Object} context - 云函数上下文
 * @returns {Promise<Object>} 返回结果
 */
exports.main = async (event, context) => {
    const { action } = event
    const wxContext = cloud.getWXContext()
    const openid = wxContext.OPENID

    // 基本身份验证
    if (!openid) {
        return { success: false, message: '未授权访问' }
    }

    // 验证用户是否为已审批的角色
    const userCheck = await db.collection('users')
        .where({
            _openid: openid,
            status: 'approved'
        })
        .count()
    if (userCheck.total === 0) {
        return { success: false, message: '无权访问学生数据' }
    }

    const handlers = {
        getByClub: handleGetByClub,
        getByClass: handleGetByClass,
        getByDepartment: handleGetByDepartment,
        getFilterOptions: handleGetFilterOptions,
        getStatistics: handleGetStatistics,
        getAll: handleGetAll,
        getById: handleGetById
    }

    const handler = handlers[action]
    if (!handler) {
        return { success: false, message: '无效的操作类型' }
    }

    return handler(event, openid)
}

/**
 * 获取筛选选项
 * @description 使用聚合查询获取唯一值，避免加载全部学生数据。返回所有学部、班级、社团列表及班级与学部的映射关系
 * @param {Object} event - 请求参数
 * @returns {Promise<Object>} 包含 departments/classes/clubs/classDeptMap 的结果
 */
async function handleGetFilterOptions(event) {
    try {
        const $ = db.command.aggregate

        // 使用聚合查询获取唯一值（性能优化：避免加载全部1300+学生）
        const [deptRes, classRes, clubRes, classDeptRes] = await Promise.all([
            // 获取所有学部（添加limit防止默认20条限制）
            db.collection('students').aggregate()
                .group({ _id: '$department' })
                .limit(1000)
                .end(),
            // 获取所有班级（添加limit防止默认20条限制）
            db.collection('students').aggregate()
                .group({ _id: '$className' })
                .limit(1000)
                .end(),
            // 获取所有社团（添加limit防止默认20条限制）
            db.collection('students').aggregate()
                .group({ _id: '$clubName' })
                .limit(1000)
                .end(),
            // 获取班级-学部映射关系（添加limit防止默认20条限制）
            db.collection('students').aggregate()
                .group({
                    _id: '$className',
                    department: $.first('$department')
                })
                .limit(1000)
                .end()
        ])

        // 提取唯一值并按中文拼音排序
        const departments = sortOptions(deptRes.list.map(d => d._id).filter(Boolean))
        const classes = sortOptions(classRes.list.map(c => c._id).filter(Boolean))
        const clubs = sortOptions(clubRes.list.map(c => c._id).filter(Boolean))

        // 构建班级与学部的对应关系
        const classDeptMap = {}
        classDeptRes.list.forEach(item => {
            if (item._id && item.department) {
                classDeptMap[item._id] = item.department
            }
        })

        return {
            success: true,
            data: { departments, classes, clubs, classDeptMap }
        }
    } catch (error) {
        console.error('获取选项失败:', error)
        return { success: false, message: '获取选项失败' }
    }
}

/**
 * 按社团获取学生列表
 * @param {Object} event - 请求参数
 * @param {string} event.clubName - 社团名称
 * @returns {Promise<Object>} 学生列表
 */
async function handleGetByClub(event) {
    const { clubName } = event

    try {
        const students = await getAllData(
            db.collection('students'),
            { clubName },
            { _id: true, studentName: true, department: true, className: true, gender: true, clubName: true, classTeacher: true, classTeacherPhone: true }
        )

        // 按班级+姓名中文拼音排序
        return { success: true, data: sortStudentsByClassAndName(students) }
    } catch (error) {
        console.error('获取社团学生失败:', error)
        return { success: false, message: '获取社团学生失败', data: [] }
    }
}

/**
 * 按班级获取学生列表
 * @param {Object} event - 请求参数
 * @param {string} event.className - 班级名称
 * @returns {Promise<Object>} 学生列表
 */
async function handleGetByClass(event) {
    const { className } = event

    try {
        const students = await getAllData(
            db.collection('students'),
            { className },
            { _id: true, studentName: true, department: true, className: true, gender: true, clubName: true, classTeacher: true, classTeacherPhone: true }
        )

        // 按姓名中文拼音排序
        return { success: true, data: sortStudentsByName(students) }
    } catch (error) {
        console.error('获取班级学生失败:', error)
        return { success: false, message: '获取班级学生失败', data: [] }
    }
}

/**
 * 按学部获取学生列表
 * @param {Object} event - 请求参数
 * @param {string} event.department - 学部名称
 * @returns {Promise<Object>} 学生列表
 */
async function handleGetByDepartment(event) {
    const { department } = event

    try {
        const students = await getAllData(
            db.collection('students'),
            { department },
            { _id: true, studentName: true, department: true, className: true, gender: true, clubName: true }
        )

        return { success: true, data: students }
    } catch (error) {
        console.error('获取学部学生失败:', error)
        return { success: false, message: '获取学部学生失败', data: [] }
    }
}

/**
 * 根据ID获取单个学生详情
 * @param {Object} event - 请求参数
 * @param {string} event.studentId - 学生ID
 * @returns {Promise<Object>} 学生详情
 */
async function handleGetById(event) {
    const { studentId } = event

    if (!studentId) {
        return { success: false, message: '缺少学生ID' }
    }

    try {
        const result = await db.collection('students').doc(studentId).get()
        return { success: true, data: result.data }
    } catch (error) {
        console.error('获取学生详情失败:', error)
        return { success: false, message: '获取学生详情失败' }
    }
}

/**
 * 获取所有学生列表
 * @description 用于管理员数据统计
 * @param {Object} event - 请求参数
 * @returns {Promise<Object>} 所有学生列表
 */
async function handleGetAll(event) {
    try {
        const students = await getAllData(
            db.collection('students'),
            {},
            { _id: true, studentName: true, department: true, className: true, gender: true, clubName: true }
        )

        return { success: true, data: students }
    } catch (error) {
        console.error('获取所有学生失败:', error)
        return { success: false, message: '获取所有学生失败', data: [] }
    }
}

/**
 * 获取学生统计数据
 * @description 使用聚合查询在云端完成统计，避免传输大量原始数据。用于数据中心页面
 * @param {Object} event - 请求参数
 * @returns {Promise<Object>} 统计结果，包含 total/genderStats/deptStats/clubStats
 */
async function handleGetStatistics(event) {
    try {
        const $ = db.command.aggregate

        // 并行执行多个聚合查询
        const [totalRes, genderRes, deptRes, clubRes] = await Promise.all([
            // 总人数
            db.collection('students').count(),
            // 按性别统计（添加limit防止默认20条限制）
            db.collection('students').aggregate()
                .group({
                    _id: '$gender',
                    count: $.sum(1)
                })
                .limit(1000)
                .end(),
            // 按学部统计（添加limit防止默认20条限制）
            db.collection('students').aggregate()
                .group({
                    _id: '$department',
                    count: $.sum(1)
                })
                .limit(1000)
                .end(),
            // 按社团统计（添加limit防止默认20条限制）
            db.collection('students').aggregate()
                .group({
                    _id: '$clubName',
                    count: $.sum(1)
                })
                .limit(1000)
                .end()
        ])

        // 格式化性别统计
        const genderStats = {}
        genderRes.list.forEach(item => {
            if (item._id) {
                genderStats[item._id] = item.count
            }
        })

        // 格式化学部统计（按人数降序排序）
        const deptStats = deptRes.list
            .filter(item => item._id)
            .map(item => ({ name: item._id, count: item.count }))
            .sort((a, b) => b.count - a.count)

        // 格式化社团统计（按人数降序排序）
        const clubStats = clubRes.list
            .filter(item => item._id)
            .map(item => ({ name: item._id, count: item.count }))
            .sort((a, b) => b.count - a.count)

        return {
            success: true,
            data: {
                total: totalRes.total,
                genderStats,
                deptStats,
                clubStats
            }
        }
    } catch (error) {
        console.error('获取统计数据失败:', error)
        return { success: false, message: '获取统计数据失败' }
    }
}
