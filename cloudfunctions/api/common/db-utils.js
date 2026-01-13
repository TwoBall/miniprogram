// input: 数据库集合、查询条件、字段选择、排序规则
// output: 查询结果数组
// pos: 云函数层 > 公共模块 > 数据库工具

const { MAX_LIMIT } = require('./constants')

/**
 * 获取所有数据的辅助函数
 * 突破云数据库单次查询100条的限制
 * @param {Object} collection - 数据库集合对象
 * @param {Object} condition - 查询条件
 * @param {Object|null} fields - 返回字段，可选
 * @returns {Promise<Array>} 查询结果数组
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
 * 突破云数据库单次查询100条的限制
 * @param {Object} collection - 数据库集合对象
 * @param {Object} condition - 查询条件
 * @param {Object|null} fields - 返回字段，可选
 * @param {Object|null} orderBy - 排序规则，如 { className: 1, name: 1 }，1为升序，-1为降序
 * @returns {Promise<Array>} 查询结果数组
 */
async function getAllDataSorted(collection, condition, fields = null, orderBy = null) {
  const countResult = await collection.where(condition).count()
  const total = countResult.total

  if (total === 0) return []

  let query = collection.where(condition)
  if (fields) query = query.field(fields)

  // 添加排序
  if (orderBy) {
    for (const [field, order] of Object.entries(orderBy)) {
      query = query.orderBy(field, order === 1 ? 'asc' : 'desc')
    }
  }

  if (total <= MAX_LIMIT) {
    const res = await query.get()
    return res.data
  }

  // 分批查询时按顺序执行，保证排序稳定性
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
 * @param {Object} collection - 数据库集合对象
 * @param {Object} condition - 查询条件
 * @param {Object} options - 分页选项
 * @param {number} options.page - 页码，从1开始
 * @param {number} options.pageSize - 每页数量
 * @param {string} options.orderField - 排序字段，默认 'createTime'
 * @param {string} options.orderDirection - 排序方向，'asc' 或 'desc'，默认 'desc'
 * @param {Object|null} options.fields - 返回字段，可选
 * @returns {Promise<Object>} 包含 data 和 pagination 的对象
 */
async function paginate(collection, condition, options = {}) {
  const {
    page = 1,
    pageSize = 20,
    orderField = 'createTime',
    orderDirection = 'desc',
    fields = null
  } = options

  // 获取总数
  const countRes = await collection.where(condition).count()
  const total = countRes.total

  // 计算跳过的记录数
  const skip = (page - 1) * pageSize

  // 构建查询
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
 * 获取系统配置
 * @param {Object} db - 数据库实例
 * @param {string} configId - 配置ID
 * @returns {Promise<Object|null>} 配置数据
 */
async function getSystemConfig(db, configId) {
  try {
    const result = await db.collection('system_config').doc(configId).get()
    return result.data?.data || null
  } catch (error) {
    // 配置不存在时返回 null
    if (error.errCode === -1) {
      return null
    }
    throw error
  }
}

/**
 * 设置系统配置
 * @param {Object} db - 数据库实例
 * @param {string} configId - 配置ID
 * @param {Object} data - 配置数据
 * @returns {Promise<boolean>} 是否成功
 */
async function setSystemConfig(db, configId, data) {
  try {
    await db.collection('system_config').doc(configId).set({
      data: {
        _id: configId,
        data,
        updateTime: db.serverDate()
      }
    })
    return true
  } catch (error) {
    console.error('设置系统配置失败:', error)
    return false
  }
}

/**
 * 统一查询方法
 * 自动处理20条限制问题，支持分页、排序、字段选择
 *
 * @param {Object} collection - 数据库集合对象
 * @param {Object} options - 查询选项
 * @param {Object} options.where - 查询条件（必须）
 * @param {Object|null} options.field - 返回字段（可选）
 * @param {Object|null} options.orderBy - 排序规则，如 { date: 'desc', name: 'asc' }（可选）
 * @param {number|null} options.limit - 限制返回数量（可选，不设置则返回全部）
 * @param {number|null} options.skip - 跳过记录数（可选，配合 limit 使用）
 * @param {boolean} options.fetchAll - 是否获取全部数据，默认 true（可选）
 * @returns {Promise<Array>} 查询结果数组
 *
 * @example
 * // 获取全部数据
 * const students = await query(db.collection('students'), {
 *   where: { className: '一年级1班' },
 *   field: { _id: true, studentName: true },
 *   orderBy: { studentName: 'asc' }
 * })
 *
 * // 获取分页数据
 * const records = await query(db.collection('attendance_records'), {
 *   where: { clubName: '篮球社' },
 *   orderBy: { date: 'desc' },
 *   limit: 20,
 *   skip: 0
 * })
 *
 * // 获取单条最新记录
 * const [latest] = await query(db.collection('attendance_records'), {
 *   where: { clubName: '篮球社', date: '2025-01-13' },
 *   orderBy: { createTime: 'desc' },
 *   limit: 1
 * })
 */
async function query(collection, options = {}) {
  const {
    where = {},
    field = null,
    orderBy = null,
    limit = null,
    skip = null,
    fetchAll = true
  } = options

  // 如果设置了 limit，直接使用普通查询（不需要处理20条限制）
  if (limit !== null) {
    let q = collection.where(where)
    if (field) q = q.field(field)
    if (orderBy) {
      for (const [f, dir] of Object.entries(orderBy)) {
        q = q.orderBy(f, dir)
      }
    }
    if (skip !== null) q = q.skip(skip)
    q = q.limit(limit)
    const res = await q.get()
    return res.data
  }

  // 不设置 limit，根据 fetchAll 决定是否获取全部
  if (!fetchAll) {
    // 不获取全部时，使用默认限制（20条）
    let q = collection.where(where)
    if (field) q = q.field(field)
    if (orderBy) {
      for (const [f, dir] of Object.entries(orderBy)) {
        q = q.orderBy(f, dir)
      }
    }
    const res = await q.get()
    return res.data
  }

  // 获取全部数据，突破20条限制
  const countResult = await collection.where(where).count()
  const total = countResult.total

  if (total === 0) return []

  let q = collection.where(where)
  if (field) q = q.field(field)
  if (orderBy) {
    for (const [f, dir] of Object.entries(orderBy)) {
      q = q.orderBy(f, dir)
    }
  }

  if (total <= MAX_LIMIT) {
    const res = await q.get()
    return res.data
  }

  // 分批查询
  const batchTimes = Math.ceil(total / MAX_LIMIT)

  // 有排序时顺序执行，保证排序稳定性
  if (orderBy) {
    const allData = []
    for (let i = 0; i < batchTimes; i++) {
      const res = await q.skip(i * MAX_LIMIT).limit(MAX_LIMIT).get()
      allData.push(...res.data)
    }
    return allData
  }

  // 无排序时并行执行，提高性能
  const tasks = []
  for (let i = 0; i < batchTimes; i++) {
    tasks.push(q.skip(i * MAX_LIMIT).limit(MAX_LIMIT).get())
  }
  const results = await Promise.all(tasks)
  return results.flatMap(res => res.data)
}

/**
 * 统一分页查询方法
 * 返回数据和分页信息
 *
 * @param {Object} collection - 数据库集合对象
 * @param {Object} options - 查询选项
 * @param {Object} options.where - 查询条件（必须）
 * @param {number} options.page - 页码，从1开始（默认1）
 * @param {number} options.pageSize - 每页数量（默认20）
 * @param {Object|null} options.field - 返回字段（可选）
 * @param {Object|null} options.orderBy - 排序规则（可选，默认 { createTime: 'desc' }）
 * @returns {Promise<Object>} { data: Array, pagination: { page, pageSize, total, hasMore } }
 *
 * @example
 * const result = await queryPage(db.collection('attendance_records'), {
 *   where: { clubName: '篮球社' },
 *   page: 1,
 *   pageSize: 20,
 *   orderBy: { date: 'desc' }
 * })
 * console.log(result.data, result.pagination)
 */
async function queryPage(collection, options = {}) {
  const {
    where = {},
    page = 1,
    pageSize = 20,
    field = null,
    orderBy = { createTime: 'desc' }
  } = options

  // 获取总数
  const countRes = await collection.where(where).count()
  const total = countRes.total

  // 计算跳过的记录数
  const skip = (page - 1) * pageSize

  // 构建查询
  let q = collection.where(where)
  if (orderBy) {
    for (const [f, dir] of Object.entries(orderBy)) {
      q = q.orderBy(f, dir)
    }
  }
  q = q.skip(skip).limit(pageSize)
  if (field) q = q.field(field)

  const result = await q.get()

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
 * 获取单条记录
 *
 * @param {Object} collection - 数据库集合对象
 * @param {string} id - 文档ID
 * @returns {Promise<Object|null>} 文档数据或null
 *
 * @example
 * const student = await queryOne(db.collection('students'), 'student_id_123')
 */
async function queryOne(collection, id) {
  try {
    const result = await collection.doc(id).get()
    return result.data || null
  } catch (error) {
    if (error.errCode === -1) {
      return null
    }
    throw error
  }
}

module.exports = {
  // 新版统一查询方法（推荐）
  query,
  queryPage,
  queryOne,

  // 兼容旧版方法
  getAllData,
  getAllDataSorted,
  paginate,

  // 系统配置
  getSystemConfig,
  setSystemConfig,

  // 常量
  MAX_LIMIT
}
