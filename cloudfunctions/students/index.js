/**
 * 云函数 - 学生数据管理
 * 提供按社团、班级、学部查询学生的接口
 */
const cloud = require('wx-server-sdk')
const { getAllData, getAllDataSorted } = require('./utils')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

/**
 * 云函数入口
 * @param {Object} event - 请求参数
 * @param {string} event.action - 操作类型
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
        getAll: handleGetAll
    }

    const handler = handlers[action]
    if (!handler) {
        return { success: false, message: '无效的操作类型' }
    }

    return handler(event, openid)
}

/**
 * 获取筛选选项
 * 返回所有学部、班级、社团列表及班级与学部的映射关系
 */
async function handleGetFilterOptions(event) {
    try {
        // 获取所有学生数据中的唯一值
        const allStudents = await getAllData(
            db.collection('students'),
            {},
            { department: true, className: true, clubName: true }
        )

        // 提取唯一值
        const departments = [...new Set(allStudents.map(s => s.department).filter(v => v))].sort()
        const classes = [...new Set(allStudents.map(s => s.className).filter(v => v))].sort()
        const clubs = [...new Set(allStudents.map(s => s.clubName).filter(v => v))].sort()

        // 构建班级与学部的对应关系（根据学生数据）
        const classDeptMap = {}
        allStudents.forEach(s => {
            if (s.className && s.department) {
                classDeptMap[s.className] = s.department
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
 */
async function handleGetByClub(event) {
    const { clubName } = event

    try {
        const students = await getAllDataSorted(
            db.collection('students'),
            { clubName },
            { _id: true, studentName: true, department: true, className: true, gender: true, clubName: true, classTeacher: true, classTeacherPhone: true },
            { className: 1, studentName: 1 }  // 按班级、姓名排序
        )

        return { success: true, data: students }
    } catch (error) {
        console.error('获取社团学生失败:', error)
        return { success: false, message: '获取社团学生失败', data: [] }
    }
}

/**
 * 按班级获取学生列表
 */
async function handleGetByClass(event) {
    const { className } = event

    try {
        const students = await getAllDataSorted(
            db.collection('students'),
            { className },
            { _id: true, studentName: true, department: true, className: true, gender: true, clubName: true, classTeacher: true, classTeacherPhone: true },
            { studentName: 1 }  // 按姓名排序
        )

        return { success: true, data: students }
    } catch (error) {
        console.error('获取班级学生失败:', error)
        return { success: false, message: '获取班级学生失败', data: [] }
    }
}

/**
 * 按学部获取学生列表
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
 * 获取所有学生列表
 * 用于管理员数据统计
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
