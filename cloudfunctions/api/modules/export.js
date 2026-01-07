/**
 * @file 数据导出模块
 * @module api/modules/export
 * @description 支持导出考勤明细、汇总统计、学生名单
 */
const cloud = require('wx-server-sdk')
const xlsx = require('xlsx')
const {
    getAllData,
    verifyUserRoles,
    ROLES,
    success,
    fail,
    unauthorized,
    badRequest
} = require('../common')

// ========== 辅助函数 ==========

/**
 * 格式化日期时间
 */
function formatDateTime(timestamp) {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    const offset = 8 * 60 * 60 * 1000
    const chinaTime = new Date(date.getTime() + offset)

    const year = chinaTime.getUTCFullYear()
    const month = String(chinaTime.getUTCMonth() + 1).padStart(2, '0')
    const day = String(chinaTime.getUTCDate()).padStart(2, '0')
    const hour = String(chinaTime.getUTCHours()).padStart(2, '0')
    const minute = String(chinaTime.getUTCMinutes()).padStart(2, '0')
    return `${year}-${month}-${day} ${hour}:${minute}`
}

/**
 * 保存导出记录
 */
async function saveExportRecord(db, openid, exportType, fileName, fileID, recordCount, filters) {
    try {
        await db.collection('export_records').add({
            data: {
                _openid: openid,
                exportType,
                fileName,
                fileID,
                recordCount,
                filters,
                createTime: db.serverDate()
            }
        })
    } catch (error) {
        console.error('保存导出记录失败:', error)
    }
}

// ========== 处理函数 ==========

/**
 * 导出考勤明细
 */
async function handleAttendance(event, ctx) {
    const { startDate, endDate, department, clubName, className } = event
    const { db, openid } = ctx
    const _ = db.command

    try {
        let condition = {}
        if (startDate && endDate) {
            condition.date = _.gte(startDate).and(_.lte(endDate))
        }
        if (department) condition.departments = department
        if (clubName) condition.clubName = clubName

        const records = await getAllData(db.collection('attendance_records'), condition)

        const exportData = []
        if (records && Array.isArray(records)) {
            records.forEach(record => {
                if (record && record.records && Array.isArray(record.records)) {
                    record.records.forEach(student => {
                        if (className && student.className !== className) return

                        exportData.push({
                            '日期': record.date,
                            '社团': record.clubName,
                            '学生姓名': student.studentName,
                            '班级': student.className,
                            '学部': record.department || '',
                            '状态': student.status === 'present' ? '出勤' : '缺勤',
                            '点名老师': record.teacherName,
                            '点名时间': formatDateTime(record.createTime)
                        })
                    })
                }
            })
        }

        if (exportData.length === 0) {
            return fail('没有符合条件的数据')
        }

        const workbook = xlsx.utils.book_new()
        const worksheet = xlsx.utils.json_to_sheet(exportData)

        worksheet['!cols'] = [
            { wch: 12 }, { wch: 20 }, { wch: 10 }, { wch: 12 },
            { wch: 10 }, { wch: 8 }, { wch: 10 }, { wch: 20 }
        ]

        xlsx.utils.book_append_sheet(workbook, worksheet, '考勤明细')
        const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' })

        const fileName = `attendance_detail_${Date.now()}.xlsx`
        const result = await cloud.uploadFile({
            cloudPath: `exports/${fileName}`,
            fileContent: buffer
        })

        const { fileList } = await cloud.getTempFileURL({
            fileList: [result.fileID]
        })

        await saveExportRecord(db, openid, 'attendance', fileName, result.fileID, exportData.length, {
            startDate, endDate, department, clubName, className
        })

        return success({
            fileID: result.fileID,
            tempFileURL: fileList[0].tempFileURL,
            fileName,
            recordCount: exportData.length
        })
    } catch (error) {
        console.error('导出考勤明细失败:', error)
        return fail('导出失败：' + error.message)
    }
}

/**
 * 导出汇总统计
 */
async function handleSummary(event, ctx) {
    const { startDate, endDate, department, clubName, className } = event
    const { db, openid } = ctx
    const _ = db.command

    try {
        let condition = {}
        if (startDate && endDate) {
            condition.date = _.gte(startDate).and(_.lte(endDate))
        }
        if (department) condition.departments = department
        if (clubName) condition.clubName = clubName

        const records = await getAllData(db.collection('attendance_records'), condition)

        const studentStats = {}
        if (records && Array.isArray(records)) {
            records.forEach(record => {
                if (record && record.records && Array.isArray(record.records)) {
                    record.records.forEach(student => {
                        if (className && student.className !== className) return

                        const key = student.studentId
                        if (!studentStats[key]) {
                            studentStats[key] = {
                                studentId: student.studentId,
                                studentName: student.studentName,
                                className: student.className,
                                clubName: record.clubName,
                                total: 0,
                                present: 0,
                                absent: 0
                            }
                        }
                        studentStats[key].total++
                        if (student.status === 'present') {
                            studentStats[key].present++
                        } else {
                            studentStats[key].absent++
                        }
                    })
                }
            })
        }

        const exportData = Object.values(studentStats).map(stat => ({
            '学生姓名': stat.studentName,
            '班级': stat.className,
            '社团': stat.clubName,
            '应到次数': stat.total,
            '出勤次数': stat.present,
            '缺勤次数': stat.absent,
            '出勤率': stat.total > 0 ? ((stat.present / stat.total * 100).toFixed(1) + '%') : '0%'
        }))

        if (exportData.length === 0) {
            return fail('没有符合条件的数据')
        }

        exportData.sort((a, b) => {
            const rateA = parseFloat(a['出勤率'])
            const rateB = parseFloat(b['出勤率'])
            return rateB - rateA
        })

        const workbook = xlsx.utils.book_new()
        const worksheet = xlsx.utils.json_to_sheet(exportData)

        worksheet['!cols'] = [
            { wch: 10 }, { wch: 12 }, { wch: 20 },
            { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }
        ]

        xlsx.utils.book_append_sheet(workbook, worksheet, '考勤汇总')
        const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' })

        const fileName = `attendance_summary_${Date.now()}.xlsx`
        const result = await cloud.uploadFile({
            cloudPath: `exports/${fileName}`,
            fileContent: buffer
        })

        const { fileList } = await cloud.getTempFileURL({
            fileList: [result.fileID]
        })

        await saveExportRecord(db, openid, 'summary', fileName, result.fileID, exportData.length, {
            startDate, endDate, department, clubName, className
        })

        return success({
            fileID: result.fileID,
            tempFileURL: fileList[0].tempFileURL,
            fileName,
            recordCount: exportData.length
        })
    } catch (error) {
        console.error('导出汇总统计失败:', error)
        return fail('导出失败：' + error.message)
    }
}

/**
 * 导出学生名单
 */
async function handleStudents(event, ctx) {
    const { department, clubName, className } = event
    const { db, openid } = ctx

    try {
        let condition = {}
        if (department) condition.department = department
        if (clubName) condition.clubName = clubName
        if (className) condition.className = className

        const students = await getAllData(db.collection('students'), condition)

        if (students.length === 0) {
            return fail('没有符合条件的学生')
        }

        const exportData = students.map(student => ({
            '学号': student.studentId,
            '姓名': student.studentName,
            '班级': student.className,
            '学部': student.department || '',
            '社团': student.clubName || '',
            '性别': student.gender || '',
            '联系方式': student.contact || ''
        }))

        const workbook = xlsx.utils.book_new()
        const worksheet = xlsx.utils.json_to_sheet(exportData)

        worksheet['!cols'] = [
            { wch: 12 }, { wch: 10 }, { wch: 12 },
            { wch: 10 }, { wch: 20 }, { wch: 6 }, { wch: 15 }
        ]

        xlsx.utils.book_append_sheet(workbook, worksheet, '学生名单')
        const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' })

        const fileName = `students_${Date.now()}.xlsx`
        const result = await cloud.uploadFile({
            cloudPath: `exports/${fileName}`,
            fileContent: buffer
        })

        const { fileList } = await cloud.getTempFileURL({
            fileList: [result.fileID]
        })

        await saveExportRecord(db, openid, 'students', fileName, result.fileID, exportData.length, {
            department, clubName, className
        })

        return success({
            fileID: result.fileID,
            tempFileURL: fileList[0].tempFileURL,
            fileName,
            recordCount: exportData.length
        })
    } catch (error) {
        console.error('导出学生名单失败:', error)
        return fail('导出失败：' + error.message)
    }
}

/**
 * 获取导出历史记录
 */
async function handleGetHistory(event, ctx) {
    const { page = 1, pageSize = 20 } = event
    const { db, openid } = ctx

    try {
        const countRes = await db.collection('export_records')
            .where({ _openid: openid })
            .count()
        const total = countRes.total

        const skip = (page - 1) * pageSize
        const result = await db.collection('export_records')
            .where({ _openid: openid })
            .orderBy('createTime', 'desc')
            .skip(skip)
            .limit(pageSize)
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
        console.error('获取导出历史失败:', error)
        return fail('获取导出历史失败')
    }
}

/**
 * 获取下载链接
 */
async function handleGetDownloadUrl(event, ctx) {
    const { fileID } = event
    const { db, openid } = ctx

    if (!fileID) {
        return badRequest('缺少文件ID')
    }

    try {
        const recordCheck = await db.collection('export_records')
            .where({ _openid: openid, fileID })
            .count()

        if (recordCheck.total === 0) {
            return fail('无权访问该文件')
        }

        const { fileList } = await cloud.getTempFileURL({
            fileList: [fileID]
        })

        if (fileList[0].status !== 0) {
            return fail('文件已过期或不存在')
        }

        return success({
            tempFileURL: fileList[0].tempFileURL
        })
    } catch (error) {
        console.error('获取下载链接失败:', error)
        return fail('获取下载链接失败')
    }
}

/**
 * 删除导出记录
 */
async function handleDeleteRecord(event, ctx) {
    const { recordId, fileID } = event
    const { db, openid } = ctx

    if (!recordId) {
        return badRequest('缺少记录ID')
    }

    try {
        const record = await db.collection('export_records').doc(recordId).get()
        if (!record.data || record.data._openid !== openid) {
            return fail('无权删除该记录')
        }

        if (fileID) {
            try {
                await cloud.deleteFile({ fileList: [fileID] })
            } catch (e) {
                console.log('文件可能已被删除:', e)
            }
        }

        await db.collection('export_records').doc(recordId).remove()

        return success(null, '删除成功')
    } catch (error) {
        console.error('删除导出记录失败:', error)
        return fail('删除失败')
    }
}

// ========== 权限验证钩子 ==========

async function beforeAction(action, event, ctx) {
    const { db, openid } = ctx

    // 验证用户是否有导出权限
    const user = await verifyUserRoles(db, openid, [ROLES.TEACHER, ROLES.CLASS_TEACHER, ROLES.LEADER, ROLES.ADMIN])
    if (!user) {
        return unauthorized('无权执行导出操作')
    }
    return null
}

// 导出模块
module.exports = {
    handlers: {
        attendance: handleAttendance,
        summary: handleSummary,
        students: handleStudents,
        getHistory: handleGetHistory,
        getDownloadUrl: handleGetDownloadUrl,
        deleteRecord: handleDeleteRecord
    },
    beforeAction
}
