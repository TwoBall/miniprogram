/**
 * @file 系统配置模块
 * @module api/modules/system
 * @description 处理系统配置的读取和更新
 */
const { verifyUserRoles, ROLES, success, fail, unauthorized } = require('../common')

/**
 * 前置钩子 - 权限验证
 */
async function beforeAction(action, data, ctx) {
    const { openid } = ctx

    if (!openid) {
        return unauthorized('未授权访问')
    }

    return null
}

// ========== 处理函数 ==========

/**
 * 获取系统配置
 */
async function handleGetConfig(event, ctx) {
    const { configId } = event
    const { db } = ctx

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
 */
async function handleSetConfig(event, ctx) {
    const { configId, data: configData } = event
    const { db, openid } = ctx

    if (!configId || !configData) {
        return fail('缺少必要参数')
    }

    const admin = await verifyUserRoles(db, openid, [ROLES.ADMIN])
    if (!admin) {
        return unauthorized('无权执行此操作')
    }

    try {
        await db.collection('system_config').doc(configId).set({
            data: {
                _id: configId,
                data: configData,
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

// 导出模块
module.exports = {
    beforeAction,
    handlers: {
        getConfig: handleGetConfig,
        setConfig: handleSetConfig
    }
}
