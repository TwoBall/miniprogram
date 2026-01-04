/**
 * @file 日期格式化工具
 * @module utils/date
 * @description 抽取各页面重复的日期处理逻辑
 */

/**
 * 格式化日期为 YYYY-MM-DD
 * @param {Date|string|number} [date] - 日期对象、时间戳或日期字符串
 * @returns {string} 格式化后的日期字符串
 */
function formatDate(date) {
  const d = date ? new Date(date) : new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 格式化时间为 HH:mm
 * @param {Date|string|number} [date] - 日期对象、时间戳或日期字符串
 * @returns {string} 格式化后的时间字符串
 */
function formatTime(date) {
  const d = date ? new Date(date) : new Date()
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

/**
 * 获取当前日期字符串
 * @returns {string} 当前日期（YYYY-MM-DD）
 */
function getCurrentDate() {
  return formatDate(new Date())
}

/**
 * 获取当前时间字符串
 * @returns {string} 当前时间（HH:mm）
 */
function getCurrentTime() {
  return formatTime(new Date())
}

/**
 * 获取星期几
 * @param {Date|string|number} [date] - 日期对象、时间戳或日期字符串
 * @returns {number} 星期几（0-6，0表示周日）
 */
function getDayOfWeek(date) {
  const d = date ? new Date(date) : new Date()
  return d.getDay()
}

/**
 * 获取星期几的中文名
 * @param {Date|string|number} [date] - 日期对象、时间戳或日期字符串
 * @returns {string} 星期几的中文名（如"周一"）
 */
function getDayOfWeekName(date) {
  const dayNames = ['日', '一', '二', '三', '四', '五', '六']
  return `周${dayNames[getDayOfWeek(date)]}`
}

/**
 * 格式化相对时间
 * @param {Date|string|number} time - 日期对象、时间戳或日期字符串
 * @returns {string} 相对时间字符串（如"刚刚"、"5分钟前"、"昨天 14:30"）
 */
function formatRelativeTime(time) {
  if (!time) return ''

  const date = new Date(time)
  const now = new Date()
  const diff = now - date

  if (diff < 60000) {
    return '刚刚'
  }

  if (diff < 3600000) {
    return `${Math.floor(diff / 60000)}分钟前`
  }

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (date >= today) {
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    return `今天 ${hours}:${minutes}`
  }

  const yesterday = new Date(today - 86400000)
  if (date >= yesterday) {
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    return `昨天 ${hours}:${minutes}`
  }

  if (date.getFullYear() === now.getFullYear()) {
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    return `${month}-${day} ${hours}:${minutes}`
  }

  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  return `${year}-${month}-${day}`
}

module.exports = {
  formatDate,
  formatTime,
  getCurrentDate,
  getCurrentTime,
  getDayOfWeek,
  getDayOfWeekName,
  formatRelativeTime
}
