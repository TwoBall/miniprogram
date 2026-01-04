/**
 * @file 本地存储封装
 * @module utils/storage
 * @description 统一管理 Storage key，避免硬编码
 */

/**
 * Storage Key 常量
 * @enum {string}
 */
const STORAGE_KEYS = {
  USER_INFO: 'userInfo',
  ALL_USER_ROLES: 'allUserRoles',
  FILTER_OPTIONS: 'filterOptions',
  FILTER_OPTIONS_TIME: 'filterOptionsTime',
  HISTORY_RECORDS: 'historyRecords',
  HISTORY_RECORDS_TIME: 'historyRecordsTime',
  ATTENDANCE_DATA: 'attendanceData',
  ATTENDANCE_DATA_TIME: 'attendanceDataTime',
  LAST_REFRESH_TIME: 'lastRefreshTime'
}

/**
 * 缓存有效期（毫秒）
 * @enum {number}
 */
const CACHE_DURATION = {
  TWO_MINUTES: 2 * 60 * 1000,
  FIVE_MINUTES: 5 * 60 * 1000,
  TEN_MINUTES: 10 * 60 * 1000,
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
 * 获取带缓存的数据
 * @param {string} key - 存储键名
 * @param {string} timeKey - 时间戳键名
 * @param {number} [duration=CACHE_DURATION.FIVE_MINUTES] - 有效期（毫秒）
 * @returns {*} 缓存的值，过期或不存在返回 null
 */
function getWithCache(key, timeKey, duration = CACHE_DURATION.FIVE_MINUTES) {
  const data = get(key)
  const time = get(timeKey)

  if (!data || !time) {
    return null
  }

  const now = Date.now()
  if (now - time > duration) {
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

/**
 * 获取当前用户信息
 * @returns {Object|null} 用户信息对象
 */
function getUserInfo() {
  return get(STORAGE_KEYS.USER_INFO)
}

/**
 * 设置当前用户信息
 * @param {Object} userInfo - 用户信息对象
 * @returns {boolean} 是否成功
 */
function setUserInfo(userInfo) {
  return set(STORAGE_KEYS.USER_INFO, userInfo)
}

/**
 * 清除用户信息
 * @returns {boolean} 是否成功
 */
function clearUserInfo() {
  return remove(STORAGE_KEYS.USER_INFO)
}

module.exports = {
  STORAGE_KEYS,
  CACHE_DURATION,
  get,
  set,
  getWithCache,
  setWithCache,
  getUserInfo,
  setUserInfo,
  clearUserInfo
}
