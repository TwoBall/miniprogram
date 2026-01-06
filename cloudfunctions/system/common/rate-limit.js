// input: 用户标识、操作类型、限频配置
// output: 是否允许操作、剩余次数、提示信息
// pos: 云函数层 > common > 限频工具

/**
 * 简单频率限制工具
 * 基于云数据库实现的用户级别限频
 */
const RATE_LIMITS_COLLECTION = 'rate_limits'

/**
 * 检查频率限制
 * @param {Object} db - 数据库实例
 * @param {string} openid - 用户标识
 * @param {string} action - 操作类型
 * @param {Object} options - 配置选项
 * @param {number} options.maxCalls - 时间窗口内最大调用次数，默认10
 * @param {number} options.windowMs - 时间窗口（毫秒），默认60000
 * @returns {Promise<{allowed: boolean, remaining: number, message?: string}>}
 */
async function checkRateLimit(db, openid, action, options = {}) {
  const { maxCalls = 10, windowMs = 60000 } = options
  const key = `${openid}_${action}`
  const now = Date.now()
  const windowStart = now - windowMs
  const _ = db.command

  try {
    // 查询时间窗口内的调用记录
    const countResult = await db.collection(RATE_LIMITS_COLLECTION)
      .where({
        key,
        timestamp: _.gte(windowStart)
      })
      .count()

    const currentCount = countResult.total

    if (currentCount >= maxCalls) {
      return {
        allowed: false,
        remaining: 0,
        message: `操作过于频繁，请${Math.ceil(windowMs / 1000)}秒后再试`
      }
    }

    // 记录本次调用
    await db.collection(RATE_LIMITS_COLLECTION).add({
      data: {
        key,
        openid,
        action,
        timestamp: now,
        _createTime: db.serverDate()
      }
    })

    return {
      allowed: true,
      remaining: maxCalls - currentCount - 1
    }
  } catch (error) {
    console.error('限频检查失败:', error)
    // 失败时放行，避免阻塞正常业务
    return { allowed: true, remaining: -1 }
  }
}

/**
 * 清理过期的限频记录（建议通过定时触发器定期执行）
 * @param {Object} db - 数据库实例
 * @param {number} beforeTimestamp - 清理此时间戳之前的记录
 */
async function cleanupExpiredRecords(db, beforeTimestamp) {
  const _ = db.command
  try {
    const result = await db.collection(RATE_LIMITS_COLLECTION)
      .where({
        timestamp: _.lt(beforeTimestamp)
      })
      .remove()
    console.log(`清理过期记录: ${result.stats.removed} 条`)
    return result.stats.removed
  } catch (error) {
    console.error('清理过期记录失败:', error)
    return 0
  }
}

// 预设的限频配置
const RATE_LIMIT_CONFIGS = {
  // 注册操作：每分钟最多1次
  register: { maxCalls: 1, windowMs: 60000 },
  // 审批操作：每分钟最多10次
  approve: { maxCalls: 10, windowMs: 60000 },
  // 提交反馈：每分钟最多5次
  feedback: { maxCalls: 5, windowMs: 60000 },
  // 转社团申请：每分钟最多3次
  transfer: { maxCalls: 3, windowMs: 60000 },
  // 提交点名：每分钟最多10次
  attendance: { maxCalls: 10, windowMs: 60000 },
  // 默认配置
  default: { maxCalls: 30, windowMs: 60000 }
}

module.exports = {
  checkRateLimit,
  cleanupExpiredRecords,
  RATE_LIMIT_CONFIGS,
  RATE_LIMITS_COLLECTION
}
