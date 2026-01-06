/**
 * @file 定时清理过期限频记录
 * @module cloudfunctions/cleanupRateLimits
 * @description 每小时清理一次过期的限频记录，防止 rate_limits 集合无限增长
 */
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

/**
 * 批量删除过期记录
 * @param {number} beforeTimestamp - 清理此时间戳之前的记录
 * @returns {Promise<number>} 删除的记录数
 */
async function cleanupExpiredRecords(beforeTimestamp) {
    let totalRemoved = 0
    const MAX_LIMIT = 100

    try {
        // 循环删除，因为云数据库单次删除有数量限制
        while (true) {
            const result = await db.collection('rate_limits')
                .where({
                    timestamp: _.lt(beforeTimestamp)
                })
                .limit(MAX_LIMIT)
                .get()

            if (result.data.length === 0) {
                break
            }

            const ids = result.data.map(r => r._id)
            
            // 批量删除
            for (const id of ids) {
                await db.collection('rate_limits').doc(id).remove()
                totalRemoved++
            }

            // 如果返回数量少于限制，说明已经没有更多数据
            if (result.data.length < MAX_LIMIT) {
                break
            }
        }
    } catch (error) {
        console.error('清理过期限频记录失败:', error)
    }

    return totalRemoved
}

/**
 * 云函数入口
 * @param {Object} event - 请求参数（定时触发器调用时为空）
 * @param {Object} context - 云函数上下文
 * @returns {Promise<Object>} 执行结果
 */
exports.main = async (event, context) => {
    // 清理 1 小时前的记录
    const beforeTimestamp = Date.now() - 60 * 60 * 1000
    const removed = await cleanupExpiredRecords(beforeTimestamp)

    console.log(`[定时清理] 已清理 ${removed} 条过期限频记录`)

    return {
        success: true,
        removed,
        cleanedBefore: new Date(beforeTimestamp).toISOString()
    }
}
