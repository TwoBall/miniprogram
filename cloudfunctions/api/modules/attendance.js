/**
 * @file 考勤管理模块
 * @module api/modules/attendance
 * @description 处理点名记录的提交、查询和统计（复用原 attendance 云函数的 handlers）
 */
const { ROLES, verifyUserRoles, unauthorized } = require('../common')

// 复用原 attendance 云函数的 handlers
// 注意：需要将原 handlers 复制到 api/modules/attendance/ 目录
const submitHandlers = require('./attendance/handlers/submit')
const queryHandlers = require('./attendance/handlers/query')
const statisticsHandlers = require('./attendance/handlers/statistics')
const rankingHandlers = require('./attendance/handlers/ranking')
const warningHandlers = require('./attendance/handlers/warning')

// 需要验证身份的操作
const authRequiredActions = ['submit', 'updateRecords']

/**
 * 前置钩子 - 权限验证
 */
async function beforeAction(action, data, ctx) {
    const { db, openid } = ctx

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

    return null
}

// 导出模块
module.exports = {
    beforeAction,
    handlers: {
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
}
