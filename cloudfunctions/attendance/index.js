/**
 * @file 考勤管理云函数入口
 * @module cloudfunctions/attendance
 * @description 处理点名记录的提交、查询和统计
 */
const cloud = require('wx-server-sdk')
const { ROLES, verifyUserRoles, unauthorized } = require('./common')

// 导入各模块 handlers
const submitHandlers = require('./handlers/submit')
const queryHandlers = require('./handlers/query')
const statisticsHandlers = require('./handlers/statistics')
const rankingHandlers = require('./handlers/ranking')
const warningHandlers = require('./handlers/warning')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 合并所有 handlers
const handlers = {
    // 提交相关
    checkTodaySubmissions: submitHandlers.handleCheckTodaySubmissions,
    submit: submitHandlers.handleSubmit,
    updateRecords: submitHandlers.handleUpdateRecords,
    // 查询相关
    getHistory: queryHandlers.handleGetHistory,
    getDetail: queryHandlers.handleGetDetail,
    getByStudent: queryHandlers.handleGetByStudent,
    // 统计相关
    getByClass: statisticsHandlers.handleGetByClass,
    getByDepartment: statisticsHandlers.handleGetByDepartment,
    getStatistics: statisticsHandlers.handleGetStatistics,
    // 排行相关
    getClubRank: rankingHandlers.handleGetClubRank,
    getClassRank: rankingHandlers.handleGetClassRank,
    getDepartmentClassRanking: rankingHandlers.handleGetDepartmentClassRanking,
    // 预警相关
    getAbsenceWarnings: warningHandlers.handleGetAbsenceWarnings
}

// 需要验证身份的操作
const authRequiredActions = ['submit', 'updateRecords']

/**
 * 云函数入口
 * @param {Object} event - 请求参数
 * @param {string} event.action - 操作类型
 * @param {Object} context - 云函数上下文
 * @returns {Promise<Object>} 返回结果
 */
exports.main = async (event, context) => {
    const { action } = event
    const wxContext = cloud.getWXContext()
    const openid = wxContext.OPENID

    // 基本身份验证
    if (!openid) {
        return unauthorized('未授权访问')
    }

    // 敏感操作需要验证教师身份
    if (authRequiredActions.includes(action)) {
        const user = await verifyUserRoles(db, openid, [ROLES.TEACHER, ROLES.ADMIN])
        if (!user) {
            return unauthorized('无权执行此操作')
        }
    }

    const handler = handlers[action]
    if (!handler) {
        return { success: false, message: '无效的操作类型' }
    }

    // 构建上下文对象传递给 handler
    const ctx = { db, openid, wxContext }
    return handler(event, ctx)
}
