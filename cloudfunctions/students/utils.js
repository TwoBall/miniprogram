// input: 数据库集合、查询条件、字段选择、排序规则
// output: 查询结果数组、验证结果
// pos: 云函数层 > students > 公共工具模块

/**
 * 云数据库单次查询最大限制
 */
const MAX_LIMIT = 100

/**
 * 用户角色枚举
 */
const ROLES = {
  ADMIN: 'admin',
  TEACHER: 'teacher',
  CLASS_TEACHER: 'classTeacher',
  LEADER: 'leader'
}

/**
 * 用户状态枚举
 */
const USER_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected'
}

/**
 * 考勤状态枚举
 */
const ATTENDANCE_STATUS = {
  PRESENT: 'present',
  ABSENT: 'absent'
}

/**
 * 获取所有数据的辅助函数
 * 突破云数据库单次查询100条的限制
 */
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

/**
 * 获取所有数据的辅助函数（支持排序）
 */
async function getAllDataSorted(collection, condition, fields = null, orderBy = null) {
  const countResult = await collection.where(condition).count()
  const total = countResult.total

  if (total === 0) return []

  let query = collection.where(condition)
  if (fields) query = query.field(fields)

  if (orderBy) {
    for (const [field, order] of Object.entries(orderBy)) {
      query = query.orderBy(field, order === 1 ? 'asc' : 'desc')
    }
  }

  if (total <= MAX_LIMIT) {
    const res = await query.get()
    return res.data
  }

  const batchTimes = Math.ceil(total / MAX_LIMIT)
  const allData = []
  for (let i = 0; i < batchTimes; i++) {
    const res = await query.skip(i * MAX_LIMIT).limit(MAX_LIMIT).get()
    allData.push(...res.data)
  }

  return allData
}

/**
 * 通用分页查询函数
 */
async function paginate(collection, condition, options = {}) {
  const {
    page = 1,
    pageSize = 20,
    orderField = 'createTime',
    orderDirection = 'desc',
    fields = null
  } = options

  const countRes = await collection.where(condition).count()
  const total = countRes.total

  const skip = (page - 1) * pageSize

  let query = collection.where(condition)
    .orderBy(orderField, orderDirection)
    .skip(skip)
    .limit(pageSize)

  if (fields) query = query.field(fields)

  const result = await query.get()

  return {
    data: result.data,
    pagination: {
      page,
      pageSize,
      total,
      hasMore: skip + result.data.length < total
    }
  }
}

/**
 * 验证管理员权限
 */
async function verifyAdmin(db, openid, fields = { _id: true, userName: true }) {
  const res = await db.collection('users')
    .where({
      _openid: openid,
      role: ROLES.ADMIN,
      status: USER_STATUS.APPROVED
    })
    .field(fields)
    .get()

  return res.data.length > 0 ? res.data[0] : null
}

/**
 * 验证用户身份
 */
async function verifyUser(db, openid, role = null, fields = null) {
  const condition = {
    _openid: openid,
    status: USER_STATUS.APPROVED
  }

  if (role) {
    condition.role = role
  }

  let query = db.collection('users').where(condition)
  if (fields) {
    query = query.field(fields)
  }

  const res = await query.get()
  return res.data.length > 0 ? res.data[0] : null
}

/**
 * 验证用户是否有指定角色之一
 */
async function verifyUserRoles(db, openid, roles, fields = null) {
  const _ = db.command

  const condition = {
    _openid: openid,
    status: USER_STATUS.APPROVED,
    role: _.in(roles)
  }

  let query = db.collection('users').where(condition)
  if (fields) {
    query = query.field(fields)
  }

  const res = await query.get()
  return res.data.length > 0 ? res.data[0] : null
}

// ========== 排序工具函数 ==========

/**
 * 中文拼音排序比较器
 */
const zhCompare = (a, b) => {
  return (a || '').localeCompare(b || '', 'zh-CN')
}

/**
 * 中文拼音 + 数字自然排序比较器
 */
const zhNumericCompare = (a, b) => {
  return (a || '').localeCompare(b || '', 'zh-CN', { numeric: true })
}

/**
 * 按班级+姓名排序学生列表
 */
const sortStudentsByClassAndName = (students) => {
  return students.sort((a, b) => {
    const classCompare = zhNumericCompare(a.className, b.className)
    if (classCompare !== 0) return classCompare
    return zhCompare(a.studentName, b.studentName)
  })
}

/**
 * 按姓名排序学生列表
 */
const sortStudentsByName = (students) => {
  return students.sort((a, b) => zhCompare(a.studentName, b.studentName))
}

/**
 * 排序选项列表（学部/班级/社团等）
 */
const sortOptions = (options) => {
  return options.sort((a, b) => zhNumericCompare(a, b))
}

module.exports = {
  MAX_LIMIT,
  ROLES,
  USER_STATUS,
  ATTENDANCE_STATUS,
  getAllData,
  getAllDataSorted,
  paginate,
  verifyAdmin,
  verifyUser,
  verifyUserRoles,
  // 排序工具
  zhCompare,
  zhNumericCompare,
  sortStudentsByClassAndName,
  sortStudentsByName,
  sortOptions
}
