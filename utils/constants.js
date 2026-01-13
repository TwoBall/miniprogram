/**
 * @file 前端常量定义
 * @module utils/constants
 * @description 统一管理状态映射、类型定义等常量，避免各页面重复定义
 */

// ========== 考勤状态 ==========

/**
 * 考勤状态映射
 */
const ATTENDANCE_STATUS = {
    present: { text: '正常', type: 'success', color: '#38a169' },
    absent: { text: '缺勤', type: 'danger', color: '#c53030' },
    late: { text: '迟到', type: 'warning', color: '#dd6b20' }
}

/**
 * 获取考勤状态文本
 * @param {string} status - 状态值
 * @returns {string} 状态文本
 */
function getAttendanceStatusText(status) {
    return ATTENDANCE_STATUS[status]?.text || status
}

/**
 * 获取考勤状态类型（用于样式类名）
 * @param {string} status - 状态值
 * @returns {string} 状态类型
 */
function getAttendanceStatusType(status) {
    return ATTENDANCE_STATUS[status]?.type || 'default'
}

// ========== 用户状态 ==========

/**
 * 用户审批状态映射
 */
const USER_STATUS = {
    pending: { text: '待审批', type: 'warning', class: 'pending' },
    approved: { text: '已通过', type: 'success', class: 'success' },
    rejected: { text: '已拒绝', type: 'danger', class: 'error' }
}

/**
 * 获取用户状态文本
 * @param {string} status - 状态值
 * @returns {string} 状态文本
 */
function getUserStatusText(status) {
    return USER_STATUS[status]?.text || status
}

// ========== 转社团状态 ==========

/**
 * 转社团申请状态映射
 */
const TRANSFER_STATUS = {
    pending_teacher: { text: '等待老师确认', type: 'warning' },
    pending_classTeacher: { text: '等待班主任审批', type: 'primary' },
    approved: { text: '已通过', type: 'success' },
    rejected: { text: '已拒绝', type: 'danger' }
}

/**
 * 获取转社团状态文本
 * @param {string} status - 状态值
 * @returns {string} 状态文本
 */
function getTransferStatusText(status) {
    return TRANSFER_STATUS[status]?.text || status
}

// ========== 通知类型 ==========

/**
 * 通知类型映射
 */
const NOTIFICATION_TYPE = {
    absence_warning: { text: '缺勤提醒', icon: 'warning-o' },
    attendance_update: { text: '考勤修改', icon: 'edit' },
    transfer_request: { text: '转社团申请', icon: 'exchange' },
    transfer_result: { text: '转社团结果', icon: 'checked' },
    register_result: { text: '注册审批', icon: 'user-o' },
    system: { text: '系统通知', icon: 'info-o' }
}

/**
 * 获取通知类型文本
 * @param {string} type - 类型值
 * @returns {string} 类型文本
 */
function getNotificationTypeText(type) {
    return NOTIFICATION_TYPE[type]?.text || '系统通知'
}

// ========== 导出类型 ==========

/**
 * 导出类型映射
 */
const EXPORT_TYPE = {
    attendance: { text: '考勤明细', icon: 'records' },
    summary: { text: '考勤汇总', icon: 'chart-trending-o' },
    students: { text: '学生名单', icon: 'friends-o' }
}

/**
 * 获取导出类型文本
 * @param {string} type - 类型值
 * @returns {string} 类型文本
 */
function getExportTypeText(type) {
    return EXPORT_TYPE[type]?.text || type
}

// ========== 角色定义 ==========

/**
 * 用户角色映射
 */
const ROLES = {
    admin: { text: '管理员', color: '#805ad5' },
    teacher: { text: '社团老师', color: '#2c5282' },
    classTeacher: { text: '班主任', color: '#38a169' },
    leader: { text: '学部领导', color: '#d69e2e' }
}

/**
 * 获取角色文本
 * @param {string} role - 角色值
 * @returns {string} 角色文本
 */
function getRoleText(role) {
    return ROLES[role]?.text || role
}

// ========== 通用状态获取函数 ==========

/**
 * 通用状态获取函数
 * @param {string} category - 状态类别 (attendance/user/transfer/notification/export/role)
 * @param {string} value - 状态值
 * @returns {Object} 状态对象 { text, type, ... }
 */
function getStatus(category, value) {
    const categoryMap = {
        attendance: ATTENDANCE_STATUS,
        user: USER_STATUS,
        transfer: TRANSFER_STATUS,
        notification: NOTIFICATION_TYPE,
        export: EXPORT_TYPE,
        role: ROLES
    }
    return categoryMap[category]?.[value] || { text: value, type: 'default' }
}

module.exports = {
    // 常量
    ATTENDANCE_STATUS,
    USER_STATUS,
    TRANSFER_STATUS,
    NOTIFICATION_TYPE,
    EXPORT_TYPE,
    ROLES,

    // 快捷函数
    getAttendanceStatusText,
    getAttendanceStatusType,
    getUserStatusText,
    getTransferStatusText,
    getNotificationTypeText,
    getExportTypeText,
    getRoleText,

    // 通用函数
    getStatus
}
