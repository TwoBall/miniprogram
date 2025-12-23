/**
 * 权限检查工具
 * 抽取各页面重复的 checkAuth() 方法
 */
const storage = require('./storage')

/**
 * 获取当前用户信息
 * @returns {Object|null} 用户信息对象，未登录返回 null
 */
function getUserInfo() {
    return storage.get(storage.STORAGE_KEYS.USER_INFO)
}

/**
 * 检查是否已登录
 * @returns {boolean} 是否已登录
 */
function isLoggedIn() {
    const userInfo = getUserInfo()
    return !!userInfo
}

/**
 * 检查用户角色权限
 * 如果不符合要求，自动跳转到登录页
 * @param {string} requiredRole - 需要的角色，如 'teacher', 'classTeacher', 'leader', 'admin'
 * @param {Object} options - 选项配置
 * @param {boolean} options.redirect - 权限不足时是否跳转，默认 true
 * @param {string} options.redirectUrl - 跳转地址，默认 '/pages/login/login'
 * @returns {Object|null} 符合权限返回用户信息，否则返回 null
 */
function checkRole(requiredRole, options = {}) {
    const {
        redirect = true,
        redirectUrl = '/pages/login/login'
    } = options

    const userInfo = getUserInfo()

    if (!userInfo || userInfo.role !== requiredRole) {
        if (redirect) {
            wx.reLaunch({ url: redirectUrl })
        }
        return null
    }

    return userInfo
}

/**
 * 检查用户是否拥有多个角色中的任意一个
 * @param {string[]} allowedRoles - 允许的角色数组
 * @param {Object} options - 选项配置
 * @returns {Object|null} 符合权限返回用户信息，否则返回 null
 */
function checkRoles(allowedRoles, options = {}) {
    const {
        redirect = true,
        redirectUrl = '/pages/login/login'
    } = options

    const userInfo = getUserInfo()

    if (!userInfo || !allowedRoles.includes(userInfo.role)) {
        if (redirect) {
            wx.reLaunch({ url: redirectUrl })
        }
        return null
    }

    return userInfo
}

/**
 * 获取用户所有已注册的角色
 * @returns {Array} 角色数组
 */
function getAllUserRoles() {
    return storage.get(storage.STORAGE_KEYS.ALL_USER_ROLES) || []
}

module.exports = {
    getUserInfo,
    isLoggedIn,
    checkRole,
    checkRoles,
    getAllUserRoles
}
