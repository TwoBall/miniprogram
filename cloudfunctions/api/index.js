/**
 * @file 统一 API 云函数入口
 * @module cloudfunctions/api
 * @description 通过 module + action 路由分发到各业务模块，减少冷启动
 */
const cloud = require('wx-server-sdk')
const { fail, badRequest } = require('./common')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

// 模块懒加载缓存
const moduleCache = {}

/**
 * 获取模块（懒加载 + 缓存）
 * @param {string} moduleName - 模块名称
 * @returns {Object|null} 模块导出对象
 */
function getModule(moduleName) {
    if (moduleCache[moduleName]) {
        return moduleCache[moduleName]
    }

    try {
        const mod = require(`./modules/${moduleName}`)
        moduleCache[moduleName] = mod
        return mod
    } catch (error) {
        console.error(`模块加载失败: ${moduleName}`, error)
        return null
    }
}

// 支持的模块列表
const SUPPORTED_MODULES = [
    'user',         // 用户管理
    'students',     // 学生管理
    'attendance',   // 考勤管理
    'notification', // 通知管理
    'transfer',     // 转社团管理
    'export',       // 数据导出
    'system',       // 系统配置
    'feedback'      // 反馈提交
]

/**
 * 云函数入口
 * @param {Object} event - 请求参数
 * @param {string} event.module - 模块名称
 * @param {string} event.action - 操作类型
 * @param {Object} context - 云函数上下文
 * @returns {Promise<Object>} 返回结果
 */
exports.main = async (event, context) => {
    const { module: moduleName, action, ...data } = event
    const wxContext = cloud.getWXContext()
    const startTime = Date.now()

    // 参数验证
    if (!moduleName) {
        return badRequest('缺少 module 参数')
    }

    if (!action) {
        return badRequest('缺少 action 参数')
    }

    // 验证模块是否支持
    if (!SUPPORTED_MODULES.includes(moduleName)) {
        return fail(`不支持的模块: ${moduleName}`, 404)
    }

    // 加载模块
    const mod = getModule(moduleName)
    if (!mod) {
        return fail(`模块加载失败: ${moduleName}`, 500)
    }

    // 获取处理函数
    const handler = mod.handlers?.[action]
    if (!handler) {
        return fail(`无效的操作: ${moduleName}.${action}`, 404)
    }

    // 构建上下文
    const db = cloud.database()
    const ctx = {
        db,
        cloud,
        openid: wxContext.OPENID,
        wxContext,
        moduleName,
        action
    }

    try {
        // 执行模块前置钩子（权限验证等）
        if (mod.beforeAction) {
            const beforeResult = await mod.beforeAction(action, data, ctx)
            if (beforeResult && !beforeResult.success) {
                return beforeResult
            }
        }

        // 执行处理函数
        const result = await handler({ action, ...data }, ctx)

        // 记录执行时间（仅开发环境）
        const duration = Date.now() - startTime
        if (duration > 3000) {
            console.warn(`[慢请求] ${moduleName}.${action} 耗时 ${duration}ms`)
        }

        return result
    } catch (error) {
        console.error(`[${moduleName}.${action}] 执行失败:`, error)
        return fail(`操作失败: ${error.message}`, 500)
    }
}
