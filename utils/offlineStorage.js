// input: 离线考勤数据、同步操作
// output: 离线队列管理、同步结果
// pos: 工具层 > 离线存储

/**
 * 离线存储工具
 * 提供离线数据暂存和在线同步功能
 *
 * 使用场景：
 * - 网络不稳定时暂存考勤数据
 * - 恢复网络后自动同步
 */

const OFFLINE_QUEUE_KEY = 'offline_attendance_queue'
const OFFLINE_SYNC_STATUS_KEY = 'offline_sync_status'

/**
 * 离线考勤数据暂存
 */
const offlineStorage = {
  /**
   * 添加离线记录
   * @param {Object} record - 考勤记录数据
   * @returns {string} - 离线记录 ID
   */
  addOfflineRecord(record) {
    const queue = this.getQueue()
    const offlineId = `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    queue.push({
      ...record,
      _offlineId: offlineId,
      _createdAt: new Date().toISOString(),
      _synced: false
    })

    wx.setStorageSync(OFFLINE_QUEUE_KEY, queue)
    console.log(`[OfflineStorage] 添加离线记录: ${offlineId}`)

    return offlineId
  },

  /**
   * 获取离线队列
   * @returns {Array}
   */
  getQueue() {
    try {
      return wx.getStorageSync(OFFLINE_QUEUE_KEY) || []
    } catch (error) {
      console.error('[OfflineStorage] 获取队列失败:', error)
      return []
    }
  },

  /**
   * 获取待同步记录数量
   * @returns {number}
   */
  getPendingCount() {
    const queue = this.getQueue()
    return queue.filter(r => !r._synced).length
  },

  /**
   * 检查是否有待同步数据
   * @returns {boolean}
   */
  hasPendingData() {
    return this.getPendingCount() > 0
  },

  /**
   * 同步离线数据
   * @param {Function} syncFn - 同步函数，接收单条记录，返回 Promise
   * @returns {Promise<{synced: number, failed: number, remaining: number}>}
   *
   * @example
   * const result = await offlineStorage.syncOfflineData(async (record) => {
   *   return await wx.cloud.callFunction({
   *     name: 'attendance',
   *     data: { action: 'submit', ...record }
   *   })
   * })
   */
  async syncOfflineData(syncFn) {
    const queue = this.getQueue()
    const pendingRecords = queue.filter(r => !r._synced)

    if (pendingRecords.length === 0) {
      return { synced: 0, failed: 0, remaining: 0 }
    }

    console.log(`[OfflineStorage] 开始同步 ${pendingRecords.length} 条离线记录`)

    const results = []
    for (const record of pendingRecords) {
      try {
        // 移除离线标记字段
        const { _offlineId, _createdAt, _synced, ...data } = record

        const response = await syncFn(data)

        if (response && response.result && response.result.success) {
          results.push({ success: true, id: _offlineId })
          // 标记为已同步
          this._markAsSynced(_offlineId)
        } else {
          results.push({ success: false, id: _offlineId, error: response })
        }
      } catch (error) {
        console.error(`[OfflineStorage] 同步失败: ${record._offlineId}`, error)
        results.push({ success: false, id: record._offlineId, error })
      }
    }

    // 清理已同步的记录
    this._cleanupSyncedRecords()

    const synced = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length
    const remaining = this.getPendingCount()

    console.log(`[OfflineStorage] 同步完成: 成功 ${synced}, 失败 ${failed}, 剩余 ${remaining}`)

    return { synced, failed, remaining }
  },

  /**
   * 标记记录为已同步
   * @private
   */
  _markAsSynced(offlineId) {
    const queue = this.getQueue()
    const index = queue.findIndex(r => r._offlineId === offlineId)

    if (index !== -1) {
      queue[index]._synced = true
      queue[index]._syncedAt = new Date().toISOString()
      wx.setStorageSync(OFFLINE_QUEUE_KEY, queue)
    }
  },

  /**
   * 清理已同步的记录
   * @private
   */
  _cleanupSyncedRecords() {
    const queue = this.getQueue()
    const pendingRecords = queue.filter(r => !r._synced)
    wx.setStorageSync(OFFLINE_QUEUE_KEY, pendingRecords)
  },

  /**
   * 删除指定离线记录
   * @param {string} offlineId - 离线记录 ID
   * @returns {boolean}
   */
  removeRecord(offlineId) {
    const queue = this.getQueue()
    const newQueue = queue.filter(r => r._offlineId !== offlineId)

    if (newQueue.length < queue.length) {
      wx.setStorageSync(OFFLINE_QUEUE_KEY, newQueue)
      return true
    }
    return false
  },

  /**
   * 清空所有离线队列
   */
  clearQueue() {
    wx.removeStorageSync(OFFLINE_QUEUE_KEY)
    console.log('[OfflineStorage] 队列已清空')
  },

  /**
   * 获取同步状态
   * @returns {Object}
   */
  getSyncStatus() {
    try {
      return wx.getStorageSync(OFFLINE_SYNC_STATUS_KEY) || {
        lastSyncTime: null,
        lastSyncResult: null
      }
    } catch (error) {
      return { lastSyncTime: null, lastSyncResult: null }
    }
  },

  /**
   * 更新同步状态
   * @param {Object} result - 同步结果
   */
  updateSyncStatus(result) {
    const status = {
      lastSyncTime: new Date().toISOString(),
      lastSyncResult: result
    }
    wx.setStorageSync(OFFLINE_SYNC_STATUS_KEY, status)
  }
}

/**
 * 通用数据缓存工具
 */
const dataCache = {
  /**
   * 设置缓存数据
   * @param {string} key - 缓存键
   * @param {any} data - 缓存数据
   * @param {number} expireMs - 过期时间（毫秒），默认 10 分钟
   */
  set(key, data, expireMs = 10 * 60 * 1000) {
    const cacheData = {
      data,
      expireAt: Date.now() + expireMs,
      createdAt: Date.now()
    }
    wx.setStorageSync(`cache_${key}`, cacheData)
  },

  /**
   * 获取缓存数据
   * @param {string} key - 缓存键
   * @returns {any|null} - 缓存数据或 null（已过期或不存在）
   */
  get(key) {
    try {
      const cacheData = wx.getStorageSync(`cache_${key}`)
      if (!cacheData) return null

      if (Date.now() > cacheData.expireAt) {
        // 已过期，清除缓存
        this.remove(key)
        return null
      }

      return cacheData.data
    } catch (error) {
      return null
    }
  },

  /**
   * 移除缓存
   * @param {string} key - 缓存键
   */
  remove(key) {
    wx.removeStorageSync(`cache_${key}`)
  },

  /**
   * 检查缓存是否有效
   * @param {string} key - 缓存键
   * @returns {boolean}
   */
  isValid(key) {
    return this.get(key) !== null
  }
}

module.exports = {
  offlineStorage,
  dataCache,
  OFFLINE_QUEUE_KEY,
  OFFLINE_SYNC_STATUS_KEY
}
