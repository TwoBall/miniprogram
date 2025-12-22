// 云函数入口文件 - 学生数据统一接口
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command
const MAX_LIMIT = 100

// 获取所有数据的辅助函数（突破100条限制）
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

// 云函数入口函数
exports.main = async (event, context) => {
    const { action } = event

    const handlers = {
        getByClub: handleGetByClub,
        getByClass: handleGetByClass,
        getByDepartment: handleGetByDepartment,
        getFilterOptions: handleGetFilterOptions
    }

    const handler = handlers[action]
    if (!handler) {
        return { success: false, message: '无效的操作类型' }
    }

    return handler(event)
}

// ========== 获取筛选选项 (学部/班级/社团) ==========
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

        return {
            success: true,
            data: { departments, classes, clubs }
        }
    } catch (error) {
        console.error('获取选项失败:', error)
        return { success: false, message: '获取选项失败' }
    }
}

// ========== 按社团获取学生 ==========
async function handleGetByClub(event) {
    const { clubName } = event
    console.log('Querying students for club:', clubName)

    try {
        const students = await getAllData(
            db.collection('students'),
            { clubName },
            { _id: true, name: true, department: true, className: true, gender: true, clubName: true, classTeacher: true, classTeacherPhone: true }
        )

        return { success: true, data: students }
    } catch (error) {
        console.error('获取社团学生失败:', error)
        return { success: false, message: '获取社团学生失败', data: [] }
    }
}

// ========== 按班级获取学生 ==========
async function handleGetByClass(event) {
    const { className } = event

    try {
        const students = await getAllData(
            db.collection('students'),
            { className },
            { _id: true, name: true, department: true, className: true, gender: true, clubName: true, classTeacher: true, classTeacherPhone: true }
        )

        return { success: true, data: students }
    } catch (error) {
        console.error('获取班级学生失败:', error)
        return { success: false, message: '获取班级学生失败', data: [] }
    }
}

// ========== 按学部获取学生 ==========
async function handleGetByDepartment(event) {
    const { department } = event

    try {
        const students = await getAllData(
            db.collection('students'),
            { department },
            { _id: true, name: true, department: true, className: true, gender: true, clubName: true }
        )

        return { success: true, data: students }
    } catch (error) {
        console.error('获取学部学生失败:', error)
        return { success: false, message: '获取学部学生失败', data: [] }
    }
}
