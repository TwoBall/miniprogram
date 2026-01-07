/**
 * @file 输入校验工具（云函数版）
 * @module cloudfunctions/common/validator
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

function validateField(value, fieldName) {
    const rule = RULES[fieldName]
    if (!rule) return { valid: true }
    if (value === undefined || value === null || value === '') return { valid: true }

    const strValue = String(value).trim()

    if (rule.minLength && strValue.length < rule.minLength) {
        return { valid: false, message: rule.message }
    }
    if (rule.maxLength && strValue.length > rule.maxLength) {
        return { valid: false, message: rule.message }
    }
    if (rule.pattern && !rule.pattern.test(strValue)) {
        return { valid: false, message: rule.message }
    }

    return { valid: true }
}

function validateRequired(value, fieldLabel) {
    if (value === undefined || value === null || value === '' || 
        (typeof value === 'string' && value.trim() === '')) {
        return { valid: false, message: `${fieldLabel}不能为空` }
    }
    return { valid: true }
}

function validate(data, rules) {
    const errors = []

    for (const rule of rules) {
        const value = data[rule.field]

        if (rule.required) {
            const requiredResult = validateRequired(value, rule.label || rule.field)
            if (!requiredResult.valid) {
                errors.push(requiredResult.message)
                continue
            }
        }

        const fieldResult = validateField(value, rule.field)
        if (!fieldResult.valid) {
            errors.push(fieldResult.message)
        }
    }

    return { valid: errors.length === 0, errors }
}

function sanitize(value) {
    if (typeof value !== 'string') return value
    return value.trim().replace(/[<>]/g, '').replace(/[\x00-\x1f]/g, '')
}

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
