/**
 * 云函数 - 通知消息管理
 * 处理站内通知的创建、查询、标记已读等操作
 */
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const MAX_LIMIT = 100

/**
 * 获取所有数据的辅助函数
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
 * 云函数入口
 */
exports.main = async (event, context) => {
    const { action } = event
    const wxContext = cloud.getWXContext()

    const handlers = {
        create: handleCreate,
        getList: handleGetList,
        markRead: handleMarkRead,
        getUnreadCount: handleGetUnreadCount
    }

    const handler = handlers[action]
    if (!handler) {
        return { success: false, message: '无效的操作类型' }
    }

    return handler(event, wxContext)
}

/**
 * 创建通知
 */
async function handleCreate(event, wxContext) {
    const { type, recipientId, title, content, data = {} } = event

    if (!type || !recipientId || !title || !content) {
        return { success: false, message: '参数错误' }
    }

    try {
        const result = await db.collection('notifications').add({
            data: {
                type,
                recipientId,
                title,
                content,
                data,
                read: false,
                createTime: db.serverDate()
            }
        })

        return { success: true, data: { _id: result._id } }
    } catch (error) {
        console.error('创建通知失败:', error)
        return { success: false, message: '创建通知失败' }
    }
}

/**
 * 获取通知列表
 * 支持分页和已读/未读筛选
 */
async function handleGetList(event, wxContext) {
    const { recipientId, read, page = 1, pageSize = 20 } = event
    const openid = recipientId || wxContext.OPENID

    try {
        // 构建查询条件
        const condition = { recipientId: openid }
        if (read !== undefined) {
            condition.read = read
        }

        // 获取总数
        const countRes = await db.collection('notifications')
            .where(condition)
            .count()
        const total = countRes.total

        // 分页查询
        const skip = (page - 1) * pageSize
        const listRes = await db.collection('notifications')
            .where(condition)
            .orderBy('createTime', 'desc')
            .skip(skip)
            .limit(pageSize)
            .get()

        return {
            success: true,
            data: listRes.data,
            pagination: {
                page,
                pageSize,
                total,
                hasMore: skip + listRes.data.length < total
            }
        }
    } catch (error) {
        console.error('获取通知列表失败:', error)
        return {
            success: false,
            message: '获取通知列表失败',
            data: [],
            pagination: { page: 1, pageSize, total: 0, hasMore: false }
        }
    }
}

/**
 * 标记通知为已读
 */
async function handleMarkRead(event, wxContext) {
    const { notificationId, notificationIds } = event
    const openid = wxContext.OPENID

    try {
        // 批量标记或单个标记
        if (notificationIds && Array.isArray(notificationIds)) {
            // 批量标记
            const _ = db.command
            const result = await db.collection('notifications')
                .where({
                    _id: _.in(notificationIds),
                    recipientId: openid
                })
                .update({
                    data: {
                        read: true,
                        readTime: db.serverDate()
                    }
                })

            return {
                success: true,
                message: `已标记 ${result.stats.updated} 条通知为已读`
            }
        } else if (notificationId) {
            // 单个标记
            const result = await db.collection('notifications')
                .where({
                    _id: notificationId,
                    recipientId: openid
                })
                .update({
                    data: {
                        read: true,
                        readTime: db.serverDate()
                    }
                })

            if (result.stats.updated > 0) {
                return { success: true, message: '已标记为已读' }
            } else {
                return { success: false, message: '通知不存在或无权限' }
            }
        } else {
            return { success: false, message: '参数错误' }
        }
    } catch (error) {
        console.error('标记已读失败:', error)
        return { success: false, message: '标记已读失败' }
    }
}

/**
 * 获取未读通知数量
 */
async function handleGetUnreadCount(event, wxContext) {
    const { recipientId } = event
    const openid = recipientId || wxContext.OPENID

    try {
        const countRes = await db.collection('notifications')
            .where({
                recipientId: openid,
                read: false
            })
            .count()

        return {
            success: true,
            data: { count: countRes.total }
        }
    } catch (error) {
        console.error('获取未读数失败:', error)
        return {
            success: false,
            message: '获取未读数失败',
            data: { count: 0 }
        }
    }
}
