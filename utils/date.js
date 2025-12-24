/**
 * 日期格式化工具
 * 抽取各页面重复的日期处理逻辑
 */

/**
 * 格式化日期为 YYYY-MM-DD
 * @param {Date|string|number} date - 日期对象、时间戳或日期字符串
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
 * @param {Date|string|number} date - 日期对象、时间戳或日期字符串
 * @returns {string} 格式化后的时间字符串
 */
function formatTime(date) {
  const d = date ? new Date(date) : new Date()
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

/**
 * 获取当前日期字符串 YYYY-MM-DD
 * @returns {string} 当前日期
 */
function getCurrentDate() {
  return formatDate(new Date())
}

/**
 * 获取当前时间字符串 HH:mm
 * @returns {string} 当前时间
 */
function getCurrentTime() {
  return formatTime(new Date())
}

/**
 * 获取星期几
 * @param {Date|string|number} date - 日期对象、时间戳或日期字符串
 * @returns {number} 星期几（0-6，0表示周日）
 */
function getDayOfWeek(date) {
  const d = date ? new Date(date) : new Date()
  return d.getDay()
}

/**
 * 获取星期几的中文名
 * @param {Date|string|number} date - 日期对象、时间戳或日期字符串
 * @returns {string} 星期几的中文名
 */
function getDayOfWeekName(date) {
  const dayNames = ['日', '一', '二', '三', '四', '五', '六']
  return `周${dayNames[getDayOfWeek(date)]}`
}

module.exports = {
  formatDate,
  formatTime,
  getCurrentDate,
  getCurrentTime,
  getDayOfWeek,
  getDayOfWeekName
}
