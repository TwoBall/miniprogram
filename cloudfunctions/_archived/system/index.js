/**
 * @file 系统配置云函数
 * @module cloudfunctions/system
 * @description 处理系统配置的读取和更新
 */
const cloud = require('wx-server-sdk')
const { verifyUserRoles, ROLES, success, fail, unauthorized } = require('./common')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

/**
 * 云函数入口
 * @param {Object} event - 请求参数
 * @param {string} event.action - 操作类型: getConfig/setConfig
 * @param {Object} context - 云函数上下文
 * @returns {Promise<Object>} 返回结果
 */
exports.main = async (event, context) => {
    const { action } = event
    const wxContext = cloud.getWXContext()
    const openid = wxContext.OPENID

    if (!openid) {
        return unauthorized('未授权访问')
    }

    const handlers = {
        getConfig: handleGetConfig,
        setConfig: handleSetConfig
    }

    const handler = handlers[action]
    if (!handler) {
        return fail('无效的操作类型')
    }

    return handler(event, openid)
}

/**
 * 获取系统配置
 * @param {Object} event - 请求参数
 * @param {string} event.configId - 配置ID
 * @returns {Promise<Object>} 配置数据
 */
async function handleGetConfig(event) {
    const { configId } = event

    if (!configId) {
        return fail('缺少配置ID')
    }

    try {
        const result = await db.collection('system_config').doc(configId).get()
        return success(result.data?.data || null)
    } catch (error) {
        if (error.errCode === -1) {
            return success(null)
        }
        console.error('获取配置失败:', error)
        return fail('获取配置失败')
    }
}

/**
 * 设置系统配置（仅管理员）
 * @param {Object} event - 请求参数
 * @param {string} event.configId - 配置ID
 * @param {Object} event.data - 配置数据
 * @param {string} openid - 用户openid
 * @returns {Promise<Object>} 操作结果
 */
async function handleSetConfig(event, openid) {
    const { configId, data } = event

    if (!configId || !data) {
        return fail('缺少必要参数')
    }

    // 验证管理员权限
    const admin = await verifyUserRoles(db, openid, [ROLES.ADMIN])
    if (!admin) {
        return unauthorized('无权执行此操作')
    }

    try {
        await db.collection('system_config').doc(configId).set({
            data: {
                _id: configId,
                data,
                updateTime: db.serverDate(),
                updatedBy: openid
            }
        })
        return success({ updated: true })
    } catch (error) {
        console.error('设置配置失败:', error)
        return fail('设置配置失败')
    }
}
