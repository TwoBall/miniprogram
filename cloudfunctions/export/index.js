/**
 * 云函数 - 数据导出
 * 支持导出考勤明细、汇总统计、学生名单
 */
const cloud = require('wx-server-sdk')
const xlsx = require('xlsx')
const {
  getAllData,
  ROLES,
  success,
  successWithPagination,
  fail,
  unauthorized,
  badRequest
} = require('./common')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

/**
 * 云函数入口
 */
exports.main = async (event, context) => {
  const { action } = event
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  // 基本身份验证
  if (!openid) {
    return { success: false, message: '未授权访问' }
  }

  // 验证用户是否有导出权限（教师、班主任、领导、管理员）
  const userCheck = await db.collection('users')
    .where({
      _openid: openid,
      role: _.in(['teacher', 'classTeacher', 'leader', 'admin']),
      status: 'approved'
    })
    .count()
  if (userCheck.total === 0) {
    return { success: false, message: '无权执行导出操作' }
  }

  const handlers = {
    attendance: exportAttendance,
    summary: exportSummary,
    students: exportStudents,
    getHistory: getExportHistory,
    getDownloadUrl: getDownloadUrl,
    deleteRecord: deleteExportRecord
  }

  const handler = handlers[action]
  if (!handler) {
    return { success: false, message: '无效的操作类型' }
  }

  return handler(event, openid)
}

/**
 * 保存导出记录到数据库
 */
async function saveExportRecord(openid, exportType, fileName, fileID, recordCount, filters) {
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

/**
 * 获取导出历史记录
 */
async function getExportHistory(event, openid) {
  const { page = 1, pageSize = 20 } = event

  try {
    // 获取总数
    const countRes = await db.collection('export_records')
      .where({ _openid: openid })
      .count()
    const total = countRes.total

    // 分页查询
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
    return { success: false, message: '获取导出历史失败' }
  }
}

/**
 * 重新获取下载链接
 */
async function getDownloadUrl(event, openid) {
  const { fileID } = event

  if (!fileID) {
    return { success: false, message: '缺少文件ID' }
  }

  try {
    // 验证文件属于当前用户
    const recordCheck = await db.collection('export_records')
      .where({ _openid: openid, fileID })
      .count()

    if (recordCheck.total === 0) {
      return { success: false, message: '无权访问该文件' }
    }

    // 获取临时链接
    const { fileList } = await cloud.getTempFileURL({
      fileList: [fileID]
    })

    if (fileList[0].status !== 0) {
      return { success: false, message: '文件已过期或不存在' }
    }

    return {
      success: true,
      data: {
        tempFileURL: fileList[0].tempFileURL
      }
    }
  } catch (error) {
    console.error('获取下载链接失败:', error)
    return { success: false, message: '获取下载链接失败' }
  }
}

/**
 * 删除导出记录（同时删除云存储文件）
 */
async function deleteExportRecord(event, openid) {
  const { recordId, fileID } = event

  if (!recordId) {
    return { success: false, message: '缺少记录ID' }
  }

  try {
    // 验证记录属于当前用户
    const record = await db.collection('export_records').doc(recordId).get()
    if (!record.data || record.data._openid !== openid) {
      return { success: false, message: '无权删除该记录' }
    }

    // 删除云存储文件
    if (fileID) {
      try {
        await cloud.deleteFile({ fileList: [fileID] })
      } catch (e) {
        console.log('文件可能已被删除:', e)
      }
    }

    // 删除数据库记录
    await db.collection('export_records').doc(recordId).remove()

    return { success: true, message: '删除成功' }
  } catch (error) {
    console.error('删除导出记录失败:', error)
    return { success: false, message: '删除失败' }
  }
}

/**
 * 导出考勤明细
 */
async function exportAttendance(event, openid) {
  const { startDate, endDate, department, clubName, className } = event

  try {
    // 构建查询条件
    let condition = {}
    if (startDate && endDate) {
      condition.date = _.gte(startDate).and(_.lte(endDate))
    }
    // departments 是数组，使用数组包含查询
    if (department) condition.departments = department
    if (clubName) condition.clubName = clubName

    // 获取考勤记录
    const records = await getAllData(db.collection('attendance_records'), condition)

    // 转换为导出格式
    const exportData = []
    if (records && Array.isArray(records)) {
      records.forEach(record => {
        if (record && record.records && Array.isArray(record.records)) {
          record.records.forEach(student => {
            // 如果指定了班级，只导出该班级学生
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
      return { success: false, message: '没有符合条件的数据' }
    }

    // 生成 Excel
    const workbook = xlsx.utils.book_new()
    const worksheet = xlsx.utils.json_to_sheet(exportData)

    // 设置列宽
    worksheet['!cols'] = [
      { wch: 12 }, // 日期
      { wch: 20 }, // 社团
      { wch: 10 }, // 学生姓名
      { wch: 12 }, // 班级
      { wch: 10 }, // 学部
      { wch: 8 },  // 状态
      { wch: 10 }, // 点名老师
      { wch: 20 }  // 点名时间
    ]

    xlsx.utils.book_append_sheet(workbook, worksheet, '考勤明细')

    // 生成 buffer
    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' })

    // 上传到云存储
    const fileName = `attendance_detail_${Date.now()}.xlsx`
    const result = await cloud.uploadFile({
      cloudPath: `exports/${fileName}`,
      fileContent: buffer
    })

    // 获取临时链接
    const { fileList } = await cloud.getTempFileURL({
      fileList: [result.fileID]
    })

    // 保存导出记录
    await saveExportRecord(openid, 'attendance', fileName, result.fileID, exportData.length, {
      startDate, endDate, department, clubName, className
    })

    return {
      success: true,
      data: {
        fileID: result.fileID,
        tempFileURL: fileList[0].tempFileURL,
        fileName,
        recordCount: exportData.length
      }
    }
  } catch (error) {
    console.error('导出考勤明细失败:', error)
    return { success: false, message: '导出失败：' + error.message }
  }
}

/**
 * 导出汇总统计
 */
async function exportSummary(event, openid) {
  const { startDate, endDate, department, clubName, className } = event

  try {
    // 构建查询条件
    let condition = {}
    if (startDate && endDate) {
      condition.date = _.gte(startDate).and(_.lte(endDate))
    }
    // departments 是数组，使用数组包含查询
    if (department) condition.departments = department
    if (clubName) condition.clubName = clubName

    // 获取考勤记录
    const records = await getAllData(db.collection('attendance_records'), condition)

    // 统计每个学生的考勤情况
    const studentStats = {}
    if (records && Array.isArray(records)) {
      records.forEach(record => {
        if (record && record.records && Array.isArray(record.records)) {
          record.records.forEach(student => {
            // 如果指定了班级，只统计该班级学生
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

    // 转换为导出格式
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
      return { success: false, message: '没有符合条件的数据' }
    }

    // 按出勤率排序
    exportData.sort((a, b) => {
      const rateA = parseFloat(a['出勤率'])
      const rateB = parseFloat(b['出勤率'])
      return rateB - rateA
    })

    // 生成 Excel
    const workbook = xlsx.utils.book_new()
    const worksheet = xlsx.utils.json_to_sheet(exportData)

    // 设置列宽
    worksheet['!cols'] = [
      { wch: 10 }, // 学生姓名
      { wch: 12 }, // 班级
      { wch: 20 }, // 社团
      { wch: 10 }, // 应到次数
      { wch: 10 }, // 出勤次数
      { wch: 10 }, // 缺勤次数
      { wch: 10 }  // 出勤率
    ]

    xlsx.utils.book_append_sheet(workbook, worksheet, '考勤汇总')

    // 生成 buffer
    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' })

    // 上传到云存储
    const fileName = `attendance_summary_${Date.now()}.xlsx`
    const result = await cloud.uploadFile({
      cloudPath: `exports/${fileName}`,
      fileContent: buffer
    })

    // 获取临时链接
    const { fileList } = await cloud.getTempFileURL({
      fileList: [result.fileID]
    })

    // 保存导出记录
    await saveExportRecord(openid, 'summary', fileName, result.fileID, exportData.length, {
      startDate, endDate, department, clubName, className
    })

    return {
      success: true,
      data: {
        fileID: result.fileID,
        tempFileURL: fileList[0].tempFileURL,
        fileName,
        recordCount: exportData.length
      }
    }
  } catch (error) {
    console.error('导出汇总统计失败:', error)
    return { success: false, message: '导出失败：' + error.message }
  }
}

/**
 * 导出学生名单
 */
async function exportStudents(event, openid) {
  const { department, clubName, className } = event

  try {
    // 构建查询条件
    let condition = {}
    if (department) condition.department = department
    if (clubName) condition.clubName = clubName
    if (className) condition.className = className

    // 获取学生数据
    const students = await getAllData(db.collection('students'), condition)

    if (students.length === 0) {
      return { success: false, message: '没有符合条件的学生' }
    }

    // 转换为导出格式
    const exportData = students.map(student => ({
      '学号': student.studentId,
      '姓名': student.studentName,
      '班级': student.className,
      '学部': student.department || '',
      '社团': student.clubName || '',
      '性别': student.gender || '',
      '联系方式': student.contact || ''
    }))

    // 生成 Excel
    const workbook = xlsx.utils.book_new()
    const worksheet = xlsx.utils.json_to_sheet(exportData)

    // 设置列宽
    worksheet['!cols'] = [
      { wch: 12 }, // 学号
      { wch: 10 }, // 姓名
      { wch: 12 }, // 班级
      { wch: 10 }, // 学部
      { wch: 20 }, // 社团
      { wch: 6 },  // 性别
      { wch: 15 }  // 联系方式
    ]

    xlsx.utils.book_append_sheet(workbook, worksheet, '学生名单')

    // 生成 buffer
    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' })

    // 上传到云存储
    const fileName = `students_${Date.now()}.xlsx`
    const result = await cloud.uploadFile({
      cloudPath: `exports/${fileName}`,
      fileContent: buffer
    })

    // 获取临时链接
    const { fileList } = await cloud.getTempFileURL({
      fileList: [result.fileID]
    })

    // 保存导出记录
    await saveExportRecord(openid, 'students', fileName, result.fileID, exportData.length, {
      department, clubName, className
    })

    return {
      success: true,
      data: {
        fileID: result.fileID,
        tempFileURL: fileList[0].tempFileURL,
        fileName,
        recordCount: exportData.length
      }
    }
  } catch (error) {
    console.error('导出学生名单失败:', error)
    return { success: false, message: '导出失败：' + error.message }
  }
}

/**
 * 格式化日期时间
 */
function formatDateTime(timestamp) {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  // 转换为东八区时间（北京时间 UTC+8）
  const offset = 8 * 60 * 60 * 1000 // 8小时的毫秒数
  const chinaTime = new Date(date.getTime() + offset)

  const year = chinaTime.getUTCFullYear()
  const month = String(chinaTime.getUTCMonth() + 1).padStart(2, '0')
  const day = String(chinaTime.getUTCDate()).padStart(2, '0')
  const hour = String(chinaTime.getUTCHours()).padStart(2, '0')
  const minute = String(chinaTime.getUTCMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${minute}`
}
