/**
 * @file 系统配置工具
 * @module utils/config
 * @description 从云数据库读取系统配置，支持本地缓存
 */

const storage = require('./storage')
const request = require('./request')

const CONFIG_CACHE_KEY = 'system_config_schedule'
const CONFIG_CACHE_TIME_KEY = 'system_config_schedule_time'
const CONFIG_CACHE_DURATION = 30 * 60 * 1000 // 30分钟

/**
 * 默认排课规则（当数据库无配置时使用）
 */
const DEFAULT_SCHEDULE_CONFIG = {
    rules: [
        { dayOfWeek: 2, departments: ['职教一部', '职教二部'], name: '周二' },
        { dayOfWeek: 4, departments: ['医药护理部'], name: '周四' }
    ],
    noClassMessage: '今天是{dayName}，无上课任务'
}

/**
 * 获取排课配置
 * @param {boolean} forceRefresh - 是否强制刷新
 * @returns {Promise<Object>} 排课配置
 */
async function getScheduleConfig(forceRefresh = false) {
    // 尝试从缓存读取
    if (!forceRefresh) {
        const cached = storage.getWithCache(
            CONFIG_CACHE_KEY,
            CONFIG_CACHE_TIME_KEY,
            CONFIG_CACHE_DURATION
        )
        if (cached) return cached
    }

    try {
        // 从云函数获取配置
        const result = await request.callCloudSilent('system', {
            action: 'getConfig',
            configId: 'schedule_config'
        })

        if (result && result.success && result.data) {
            const config = result.data
            // 存入缓存
            storage.setWithCache(CONFIG_CACHE_KEY, CONFIG_CACHE_TIME_KEY, config)
            return config
        }
    } catch (error) {
        console.error('获取排课配置失败，使用默认配置:', error)
    }

    // 返回默认配置
    return DEFAULT_SCHEDULE_CONFIG
}

/**
 * 根据星期获取当天应点名的学部
 * @param {number} dayOfWeek - 星期几（0-6，0为周日）
 * @param {Array<string>} availableDepts - 可用学部列表
 * @returns {Promise<Object>} { isClassDay, departments, noClassMessage }
 */
async function getTodaySchedule(dayOfWeek, availableDepts) {
    const config = await getScheduleConfig()
    const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    const dayName = dayNames[dayOfWeek]

    // 查找匹配的规则
    const rule = config.rules.find(r => r.dayOfWeek === dayOfWeek)

    if (!rule) {
        return {
            isClassDay: false,
            departments: [],
            noClassMessage: config.noClassMessage.replace('{dayName}', dayName)
        }
    }

    // 过滤出当前社团包含的学部
    const matchedDepts = availableDepts.filter(d => rule.departments.includes(d))

    if (matchedDepts.length === 0) {
        return {
            isClassDay: false,
            departments: [],
            noClassMessage: '当前社团暂无对应学部的学生'
        }
    }

    return {
        isClassDay: true,
        departments: matchedDepts,
        noClassMessage: ''
    }
}

/**
 * 清除配置缓存
 */
function clearConfigCache() {
    storage.set(CONFIG_CACHE_KEY, null)
    storage.set(CONFIG_CACHE_TIME_KEY, null)
}

module.exports = {
    DEFAULT_SCHEDULE_CONFIG,
    getScheduleConfig,
    getTodaySchedule,
    clearConfigCache
}
