/**
 * @file 日期工具模块
 * @module common/date-utils
 * @description 提供日期格式化、日期范围计算等通用功能
 */

/**
 * 格式化日期为 YYYY-MM-DD
 * @param {Date} date - 日期对象
 * @returns {string} 格式化后的日期字符串
 */
function formatDate(date) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

/**
 * 格式化日期时间为 YYYY-MM-DD HH:mm（北京时间）
 * @param {Date|number} timestamp - 日期对象或时间戳
 * @returns {string} 格式化后的日期时间字符串
 */
function formatDateTime(timestamp) {
    if (!timestamp) return ''
    const date = typeof timestamp === 'number' ? new Date(timestamp) : timestamp

    // 转换为北京时间 (UTC+8)
    const chinaTime = new Date(date.getTime() + 8 * 60 * 60 * 1000)
    const year = chinaTime.getUTCFullYear()
    const month = String(chinaTime.getUTCMonth() + 1).padStart(2, '0')
    const day = String(chinaTime.getUTCDate()).padStart(2, '0')
    const hour = String(chinaTime.getUTCHours()).padStart(2, '0')
    const minute = String(chinaTime.getUTCMinutes()).padStart(2, '0')

    return `${year}-${month}-${day} ${hour}:${minute}`
}

/**
 * 获取今天的日期字符串
 * @returns {string} YYYY-MM-DD 格式
 */
function getToday() {
    return formatDate(new Date())
}

/**
 * 获取当前月份
 * @returns {string} YYYY-MM 格式
 */
function getCurrentMonth() {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    return `${year}-${month}`
}

/**
 * 获取当前月份的日期范围
 * @returns {Object} { startDate, endDate }
 */
function getCurrentMonthRange() {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    return {
        startDate: `${year}-${month}-01`,
        endDate: `${year}-${month}-31`
    }
}

/**
 * 获取指定天数前的日期范围
 * @param {number} days - 天数
 * @returns {Object} { startDate, endDate }
 */
function getDateRange(days) {
    const now = new Date()
    const end = formatDate(now)
    const start = formatDate(new Date(now.getTime() - days * 24 * 60 * 60 * 1000))
    return { startDate: start, endDate: end }
}

/**
 * 获取指定月份前的日期范围（从该月1号开始）
 * @param {number} months - 月数，默认1
 * @returns {Object} { startDate, endDate }
 */
function getMonthsAgoRange(months = 1) {
    const now = new Date()
    const startDate = new Date(now)
    startDate.setMonth(startDate.getMonth() - months)

    const startStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-01`
    const endStr = formatDate(now)

    return { startDate: startStr, endDate: endStr }
}

/**
 * 常用日期范围快捷方式
 */
const DATE_RANGES = {
    /** 今天 */
    TODAY: () => {
        const today = getToday()
        return { startDate: today, endDate: today }
    },
    /** 最近7天 */
    LAST_7_DAYS: () => getDateRange(7),
    /** 最近30天 */
    LAST_30_DAYS: () => getDateRange(30),
    /** 本月 */
    THIS_MONTH: () => getCurrentMonthRange()
}

module.exports = {
    formatDate,
    formatDateTime,
    getToday,
    getCurrentMonth,
    getCurrentMonthRange,
    getDateRange,
    getMonthsAgoRange,
    DATE_RANGES
}
