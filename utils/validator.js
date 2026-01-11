/**
 * @file 输入校验工具
 * @module utils/validator
 * @description 提供通用的输入校验函数，用于前端和云函数
 */

/**
 * 校验规则
 */
const RULES = {
  userName: {
    minLength: 2,
    maxLength: 20,
    pattern: /^[\u4e00-\u9fa5a-zA-Z\s]+$/,
    message: '姓名应为2-20个字符，仅支持中文、英文'
  },
  className: {
    minLength: 2,
    maxLength: 50,
    pattern: /^[\u4e00-\u9fa5a-zA-Z0-9\s\-]+$/,
    message: '班级名称应为2-50个字符'
  },
  clubName: {
    minLength: 2,
    maxLength: 50,
    pattern: /^[\u4e00-\u9fa5a-zA-Z0-9\s\-]+$/,
    message: '社团名称应为2-50个字符'
  },
  department: {
    minLength: 2,
    maxLength: 50,
    pattern: /^[\u4e00-\u9fa5a-zA-Z0-9\s\-]+$/,
    message: '学部名称应为2-50个字符'
  },
  feedback: {
    maxLength: 500,
    message: '反馈内容不能超过500个字符'
  },
  date: {
    pattern: /^\d{4}-\d{2}-\d{2}$/,
    message: '日期格式应为 YYYY-MM-DD'
  },
  time: {
    pattern: /^\d{2}:\d{2}$/,
    message: '时间格式应为 HH:MM'
  }
}

/**
 * 校验单个字段
 * @param {string} value - 要校验的值
 * @param {string} fieldName - 字段名称（对应 RULES 中的 key）
 * @returns {{ valid: boolean, message?: string }}
 */
function validateField(value, fieldName) {
  const rule = RULES[fieldName]
  if (!rule) {
    return { valid: true }
  }

  // 空值检查
  if (value === undefined || value === null || value === '') {
    return { valid: true } // 空值由 required 检查处理
  }

  const strValue = String(value).trim()

  // 长度检查
  if (rule.minLength && strValue.length < rule.minLength) {
    return { valid: false, message: rule.message || `长度不能少于${rule.minLength}个字符` }
  }
  if (rule.maxLength && strValue.length > rule.maxLength) {
    return { valid: false, message: rule.message || `长度不能超过${rule.maxLength}个字符` }
  }

  // 正则检查
  if (rule.pattern && !rule.pattern.test(strValue)) {
    return { valid: false, message: rule.message || '格式不正确' }
  }

  return { valid: true }
}

/**
 * 校验必填字段
 * @param {*} value - 要校验的值
 * @param {string} fieldLabel - 字段显示名称
 * @returns {{ valid: boolean, message?: string }}
 */
function validateRequired(value, fieldLabel) {
  if (value === undefined || value === null || value === '' ||
        (typeof value === 'string' && value.trim() === '')) {
    return { valid: false, message: `${fieldLabel}不能为空` }
  }
  return { valid: true }
}

/**
 * 批量校验
 * @param {Object} data - 要校验的数据对象
 * @param {Array<Object>} rules - 校验规则数组
 * @returns {{ valid: boolean, errors: Array<string> }}
 * @example
 * validate(data, [
 *   { field: 'userName', label: '姓名', required: true },
 *   { field: 'className', label: '班级' }
 * ])
 */
function validate(data, rules) {
  const errors = []

  for (const rule of rules) {
    const value = data[rule.field]

    // 必填检查
    if (rule.required) {
      const requiredResult = validateRequired(value, rule.label || rule.field)
      if (!requiredResult.valid) {
        errors.push(requiredResult.message)
        continue
      }
    }

    // 格式检查
    const fieldResult = validateField(value, rule.field)
    if (!fieldResult.valid) {
      errors.push(fieldResult.message)
    }
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * 清理用户输入（去除首尾空格、过滤危险字符）
 * @param {string} value - 原始输入
 * @returns {string} 清理后的值
 */
function sanitize(value) {
  if (typeof value !== 'string') {
    return value
  }
  return value
    .trim()
    .replace(/[<>]/g, '') // 移除尖括号防止XSS
    .replace(/[\x00-\x1f]/g, '') // 移除控制字符
}

/**
 * 批量清理对象中的字符串字段
 * @param {Object} data - 原始数据对象
 * @param {Array<string>} fields - 要清理的字段名
 * @returns {Object} 清理后的数据对象
 */
function sanitizeObject(data, fields) {
  const result = { ...data }
  for (const field of fields) {
    if (result[field] !== undefined) {
      result[field] = sanitize(result[field])
    }
  }
  return result
}

module.exports = {
  RULES,
  validateField,
  validateRequired,
  validate,
  sanitize,
  sanitizeObject
}
