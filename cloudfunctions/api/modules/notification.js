/**
 * @file 通知管理模块
 * @module api/modules/notification
 * @description 处理站内通知的创建、查询、标记已读等操作
 */
const {
    getAllData,
    ROLES,
    success,
    successWithPagination,
    fail,
    unauthorized,
    badRequest,
    verifyUser,
    verifyUserRoles
} = require('../common')

/**
 * 前置钩子 - 权限验证
 */
async function beforeAction(action, data, ctx) {
    const { db, openid } = ctx

    if (!openid) {
        return unauthorized('未授权访问')
    }

    // 验证用户是否为已审批用户
    const isApproved = await verifyUser(db, openid)
    if (!isApproved) {
        return unauthorized('无权访问通知')
    }

    // 创建通知需要特定角色权限
    if (action === 'create') {
        const hasRole = await verifyUserRoles(db, openid, [ROLES.TEACHER, ROLES.CLASS_TEACHER, ROLES.LEADER, ROLES.ADMIN])
        if (!hasRole) {
            return unauthorized('无权创建通知')
        }
    }

    return null
}

// ========== 处理函数 ==========

/**
 * 创建通知
 */
async function handleCreate(event, ctx) {
    const { type, recipientId, title, content, data: extraData = {} } = event
    const { db } = ctx

    if (!type || !recipientId || !title || !content) {
        return badRequest('参数错误')
    }

    try {
        const result = await db.collection('notifications').add({
            data: {
                type,
                recipientId,
                title,
                content,
                data: extraData,
                read: false,
                createTime: db.serverDate()
            }
        })

        return success({ _id: result._id })
    } catch (error) {
        console.error('创建通知失败:', error)
        return fail('创建通知失败')
    }
}

/**
 * 获取通知列表（同时返回未读数量）
 */
async function handleGetList(event, ctx) {
    const { recipientId, read, page = 1, pageSize = 20 } = event
    const { db, openid } = ctx
    const targetId = recipientId || openid

    try {
        const condition = { recipientId: targetId }
        if (read !== undefined) {
            condition.read = read
        }

        // 并行查询：总数、列表、未读数
        const [countRes, listRes, unreadRes] = await Promise.all([
            db.collection('notifications').where(condition).count(),
            db.collection('notifications')
                .where(condition)
                .orderBy('createTime', 'desc')
                .skip((page - 1) * pageSize)
                .limit(pageSize)
                .get(),
            db.collection('notifications')
                .where({ recipientId: targetId, read: false })
                .count()
        ])

        const total = countRes.total

        return successWithPagination(listRes.data, {
            page,
            pageSize,
            total,
            hasMore: (page - 1) * pageSize + listRes.data.length < total,
            unreadCount: unreadRes.total
        })
    } catch (error) {
        console.error('获取通知列表失败:', error)
        return fail('获取通知列表失败')
    }
}

/**
 * 标记通知为已读
 */
async function handleMarkRead(event, ctx) {
    const { notificationId, notificationIds } = event
    const { db, openid } = ctx
    const _ = db.command

    try {
        if (notificationIds && Array.isArray(notificationIds)) {
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

            return success(null, `已标记 ${result.stats.updated} 条通知为已读`)
        } else if (notificationId) {
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
                return success(null, '已标记为已读')
            } else {
                return fail('通知不存在或无权限')
            }
        } else {
            return badRequest('参数错误')
        }
    } catch (error) {
        console.error('标记已读失败:', error)
        return fail('标记已读失败')
    }
}

/**
 * 获取未读通知数量
 */
async function handleGetUnreadCount(event, ctx) {
    const { recipientId } = event
    const { db, openid } = ctx
    const targetId = recipientId || openid

    try {
        const countRes = await db.collection('notifications')
            .where({
                recipientId: targetId,
                read: false
            })
            .count()

        return success({ count: countRes.total })
    } catch (error) {
        console.error('获取未读数失败:', error)
        return fail('获取未读数失败')
    }
}

// 导出模块
module.exports = {
    beforeAction,
    handlers: {
        create: handleCreate,
        getList: handleGetList,
        markRead: handleMarkRead,
        getUnreadCount: handleGetUnreadCount
    }
}
