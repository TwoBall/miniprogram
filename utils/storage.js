/**
 * 本地存储封装
 * 统一管理 Storage key，避免硬编码
 */

/**
 * Storage Key 常量
 * 所有存储键名应在此定义，避免硬编码
 */
const STORAGE_KEYS = {
    /** 当前用户信息 */
    USER_INFO: 'userInfo',
    /** 用户所有已注册的角色 */
    ALL_USER_ROLES: 'allUserRoles',
    /** 筛选选项缓存（学部、班级、社团列表） */
    FILTER_OPTIONS: 'filterOptions',
    /** 筛选选项缓存时间戳 */
    FILTER_OPTIONS_TIME: 'filterOptionsTime',
    /** 学生列表缓存 */
    STUDENTS_LIST: 'studentsList',
    /** 学生列表缓存时间戳 */
    STUDENTS_LIST_TIME: 'studentsListTime',
    /** 历史记录缓存 */
    HISTORY_RECORDS: 'historyRecords',
    /** 历史记录缓存时间戳 */
    HISTORY_RECORDS_TIME: 'historyRecordsTime',
    /** 考勤数据缓存前缀 */
    ATTENDANCE_DATA: 'attendanceData',
    /** 考勤数据缓存时间戳前缀 */
    ATTENDANCE_DATA_TIME: 'attendanceDataTime',
    /** 最后刷新时间（用于防抖） */
    LAST_REFRESH_TIME: 'lastRefreshTime'
}

/**
 * 缓存有效期（毫秒）
 */
const CACHE_DURATION = {
    /** 5分钟 */
    FIVE_MINUTES: 5 * 60 * 1000,
    /** 1小时 */
    ONE_HOUR: 60 * 60 * 1000,
    /** 1天 */
    ONE_DAY: 24 * 60 * 60 * 1000
}

/**
 * 获取存储值
 * @param {string} key - 存储键名
 * @returns {*} 存储的值，不存在返回 null
 */
function get(key) {
    try {
        return wx.getStorageSync(key) || null
    } catch (error) {
        console.error(`读取存储失败 [${key}]:`, error)
        return null
    }
}

/**
 * 设置存储值
 * @param {string} key - 存储键名
 * @param {*} value - 要存储的值
 * @returns {boolean} 是否成功
 */
function set(key, value) {
    try {
        wx.setStorageSync(key, value)
        return true
    } catch (error) {
        console.error(`写入存储失败 [${key}]:`, error)
        return false
    }
}

/**
 * 删除存储值
 * @param {string} key - 存储键名
 * @returns {boolean} 是否成功
 */
function remove(key) {
    try {
        wx.removeStorageSync(key)
        return true
    } catch (error) {
        console.error(`删除存储失败 [${key}]:`, error)
        return false
    }
}

/**
 * 清空所有存储
 * @returns {boolean} 是否成功
 */
function clear() {
    try {
        wx.clearStorageSync()
        return true
    } catch (error) {
        console.error('清空存储失败:', error)
        return false
    }
}

/**
 * 获取带缓存的数据
 * @param {string} key - 存储键名
 * @param {string} timeKey - 时间戳键名
 * @param {number} duration - 有效期（毫秒）
 * @returns {*} 缓存的值，过期或不存在返回 null
 */
function getWithCache(key, timeKey, duration = CACHE_DURATION.ONE_HOUR) {
    const data = get(key)
    const time = get(timeKey)

    if (!data || !time) {
        return null
    }

    const now = Date.now()
    if (now - time > duration) {
        // 缓存过期，清除
        remove(key)
        remove(timeKey)
        return null
    }

    return data
}

/**
 * 设置带缓存的数据
 * @param {string} key - 存储键名
 * @param {string} timeKey - 时间戳键名
 * @param {*} value - 要存储的值
 * @returns {boolean} 是否成功
 */
function setWithCache(key, timeKey, value) {
    const success1 = set(key, value)
    const success2 = set(timeKey, Date.now())
    return success1 && success2
}

module.exports = {
    STORAGE_KEYS,
    CACHE_DURATION,
    get,
    set,
    remove,
    clear,
    getWithCache,
    setWithCache
}
