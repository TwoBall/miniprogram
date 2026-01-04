/**
 * @file 通知消息管理云函数 - 处理站内通知的创建、查询、标记已读等操作
 * @module cloudfunctions/notification
 */
const cloud = require('wx-server-sdk')
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
 * @param {Object} event - 请求参数
 * @param {string} event.action - 操作类型: create/getList/markRead/getUnreadCount
 * @param {Object} context - 云函数上下文
 * @returns {Promise<Object>} 返回结果
 */
exports.main = async (event, context) => {
    const { action } = event
    const wxContext = cloud.getWXContext()
    const openid = wxContext.OPENID

    // 基本身份验证
    if (!openid) {
        return { success: false, message: '未授权访问' }
    }

    // 验证用户是否为已审批用户
    const userCheck = await db.collection('users')
        .where({
            _openid: openid,
            status: 'approved'
        })
        .count()
    if (userCheck.total === 0) {
        return { success: false, message: '无权访问通知' }
    }

    // 创建通知需要特定角色权限
    if (action === 'create') {
        const roleCheck = await db.collection('users')
            .where({
                _openid: openid,
                role: _.in(['teacher', 'classTeacher', 'leader', 'admin']),
                status: 'approved'
            })
            .count()
        if (roleCheck.total === 0) {
            return { success: false, message: '无权创建通知' }
        }
    }

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
 * @param {Object} event - 请求参数
 * @param {string} event.type - 通知类型
 * @param {string} event.recipientId - 接收人ID
 * @param {string} event.title - 通知标题
 * @param {string} event.content - 通知内容
 * @param {Object} [event.data] - 附加数据
 * @param {Object} wxContext - 微信上下文
 * @returns {Promise<Object>} 创建结果
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
 * @description 支持分页和已读/未读筛选
 * @param {Object} event - 请求参数
 * @param {string} [event.recipientId] - 接收人ID
 * @param {boolean} [event.read] - 已读状态筛选
 * @param {number} [event.page=1] - 页码
 * @param {number} [event.pageSize=20] - 每页数量
 * @param {Object} wxContext - 微信上下文
 * @returns {Promise<Object>} 分页的通知列表
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
 * @param {Object} event - 请求参数
 * @param {string} [event.notificationId] - 单个通知ID
 * @param {Array<string>} [event.notificationIds] - 批量通知ID数组
 * @param {Object} wxContext - 微信上下文
 * @returns {Promise<Object>} 标记结果
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
 * @param {Object} event - 请求参数
 * @param {string} [event.recipientId] - 接收人ID
 * @param {Object} wxContext - 微信上下文
 * @returns {Promise<Object>} 未读数量
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
