/**
 * 云函数 - 数据库字段迁移
 * 将 students 表的 name 改为 studentName
 * 将 users 表的 name 改为 userName
 *
 * 警告：此脚本会修改数据库，请在执行前备份数据！
 * 使用方法：在微信开发者工具的云开发控制台手动调用
 */
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const MAX_LIMIT = 100

/**
 * 获取所有数据的辅助函数
 */
async function getAllData(collectionName) {
  try {
    const collection = db.collection(collectionName)
    const countResult = await collection.count()
    const total = countResult.total

    if (total === 0) return []

    if (total <= MAX_LIMIT) {
      const res = await collection.get()
      return res.data || []
    }

    const batchTimes = Math.ceil(total / MAX_LIMIT)
    const tasks = []
    for (let i = 0; i < batchTimes; i++) {
      tasks.push(collection.skip(i * MAX_LIMIT).limit(MAX_LIMIT).get())
    }

    const results = await Promise.all(tasks)
    return results.flatMap(res => res.data || [])
  } catch (error) {
    console.error('getAllData error:', error)
    return []
  }
}

/**
 * 云函数入口
 */
exports.main = async (event, context) => {
  const { action, confirmToken } = event

  // 安全检查：需要确认令牌
  if (confirmToken !== 'CONFIRM_MIGRATE_2025') {
    return {
      success: false,
      message: '请提供正确的确认令牌。这是一个危险操作，请确保已备份数据！',
      usage: '调用时需要传入 { action: "migrate", confirmToken: "CONFIRM_MIGRATE_2025" }'
    }
  }

  const handlers = {
    migrate: handleMigrate,
    rollback: handleRollback,
    check: handleCheck
  }

  const handler = handlers[action]
  if (!handler) {
    return { success: false, message: '无效的操作类型。支持: migrate, rollback, check' }
  }

  return handler(event)
}

/**
 * 检查当前字段状态
 */
async function handleCheck() {
  try {
    // 检查 students 表
    const students = await db.collection('students').limit(1).get()
    const studentSample = students.data[0] || {}
    const studentsHasName = 'name' in studentSample
    const studentsHasStudentName = 'studentName' in studentSample

    // 检查 users 表
    const users = await db.collection('users').limit(1).get()
    const userSample = users.data[0] || {}
    const usersHasName = 'name' in userSample
    const usersHasUserName = 'userName' in userSample

    return {
      success: true,
      message: '字段检查完成',
      data: {
        students: {
          hasName: studentsHasName,
          hasStudentName: studentsHasStudentName,
          needsMigration: studentsHasName && !studentsHasStudentName,
          sample: studentSample
        },
        users: {
          hasName: usersHasName,
          hasUserName: usersHasUserName,
          needsMigration: usersHasName && !usersHasUserName,
          sample: userSample
        }
      }
    }
  } catch (error) {
    console.error('检查字段失败:', error)
    return { success: false, message: '检查失败: ' + error.message }
  }
}

/**
 * 执行迁移
 */
async function handleMigrate() {
  const results = {
    students: { success: 0, failed: 0, errors: [] },
    users: { success: 0, failed: 0, errors: [] }
  }

  try {
    // 迁移 students 表：name -> studentName
    console.log('开始迁移 students 表...')
    const students = await getAllData('students')
    console.log(`找到 ${students.length} 条学生记录`)

    for (const student of students) {
      try {
        if (student.name && !student.studentName) {
          await db.collection('students').doc(student._id).update({
            data: {
              studentName: student.name
            }
          })
          results.students.success++
        }
      } catch (error) {
        console.error(`迁移学生 ${student._id} 失败:`, error)
        results.students.failed++
        results.students.errors.push({ _id: student._id, error: error.message })
      }
    }

    // 迁移 users 表：name -> userName
    console.log('开始迁移 users 表...')
    const users = await getAllData('users')
    console.log(`找到 ${users.length} 条用户记录`)

    for (const user of users) {
      try {
        if (user.name && !user.userName) {
          await db.collection('users').doc(user._id).update({
            data: {
              userName: user.name
            }
          })
          results.users.success++
        }
      } catch (error) {
        console.error(`迁移用户 ${user._id} 失败:`, error)
        results.users.failed++
        results.users.errors.push({ _id: user._id, error: error.message })
      }
    }

    return {
      success: true,
      message: '迁移完成',
      data: results,
      note: '注意：旧字段 name 仍然保留，请在确认无误后使用 rollback 清理（如果需要回滚）或手动删除旧字段'
    }
  } catch (error) {
    console.error('迁移失败:', error)
    return {
      success: false,
      message: '迁移失败: ' + error.message,
      data: results
    }
  }
}

/**
 * 回滚迁移（从 studentName/userName 复制回 name）
 */
async function handleRollback() {
  const results = {
    students: { success: 0, failed: 0, errors: [] },
    users: { success: 0, failed: 0, errors: [] }
  }

  try {
    // 回滚 students 表：studentName -> name
    console.log('开始回滚 students 表...')
    const students = await getAllData('students')

    for (const student of students) {
      try {
        if (student.studentName) {
          await db.collection('students').doc(student._id).update({
            data: {
              name: student.studentName
            }
          })
          results.students.success++
        }
      } catch (error) {
        console.error(`回滚学生 ${student._id} 失败:`, error)
        results.students.failed++
        results.students.errors.push({ _id: student._id, error: error.message })
      }
    }

    // 回滚 users 表：userName -> name
    console.log('开始回滚 users 表...')
    const users = await getAllData('users')

    for (const user of users) {
      try {
        if (user.userName) {
          await db.collection('users').doc(user._id).update({
            data: {
              name: user.userName
            }
          })
          results.users.success++
        }
      } catch (error) {
        console.error(`回滚用户 ${user._id} 失败:`, error)
        results.users.failed++
        results.users.errors.push({ _id: user._id, error: error.message })
      }
    }

    return {
      success: true,
      message: '回滚完成',
      data: results
    }
  } catch (error) {
    console.error('回滚失败:', error)
    return {
      success: false,
      message: '回滚失败: ' + error.message,
      data: results
    }
  }
}
