/**
 * 通用排序工具函数
 * 提供中文拼音排序支持
 */

/**
 * 中文拼音排序比较器
 * @param {string} a - 字符串a
 * @param {string} b - 字符串b
 * @returns {number} 比较结果
 */
const zhCompare = (a, b) => {
  return (a || '').localeCompare(b || '', 'zh-CN')
}

/**
 * 中文拼音 + 数字自然排序比较器
 * 例如: "1班" < "2班" < "10班"
 * @param {string} a - 字符串a
 * @param {string} b - 字符串b
 * @returns {number} 比较结果
 */
const zhNumericCompare = (a, b) => {
  return (a || '').localeCompare(b || '', 'zh-CN', { numeric: true })
}

/**
 * 按班级+姓名排序学生列表
 * @param {Array} students - 学生数组
 * @returns {Array} 排序后的学生数组
 */
const sortStudentsByClassAndName = (students) => {
  return students.sort((a, b) => {
    const classCompare = zhNumericCompare(a.className, b.className)
    if (classCompare !== 0) return classCompare
    return zhCompare(a.studentName, b.studentName)
  })
}

/**
 * 按姓名排序学生列表
 * @param {Array} students - 学生数组
 * @returns {Array} 排序后的学生数组
 */
const sortStudentsByName = (students) => {
  return students.sort((a, b) => zhCompare(a.studentName, b.studentName))
}

/**
 * 排序选项列表（学部/班级/社团等）
 * @param {Array} options - 选项数组
 * @returns {Array} 排序后的选项数组
 */
const sortOptions = (options) => {
  return options.sort((a, b) => zhNumericCompare(a, b))
}

module.exports = {
  zhCompare,
  zhNumericCompare,
  sortStudentsByClassAndName,
  sortStudentsByName,
  sortOptions
}
