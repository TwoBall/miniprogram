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

module.exports = {
  getAllData,
  getAllDataSorted,
  paginate,
  MAX_LIMIT
}
