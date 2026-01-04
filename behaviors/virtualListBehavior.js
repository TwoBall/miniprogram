// input: 完整列表数据、每项高度、容器高度
// output: 虚拟列表数据、滚动偏移量
// pos: 主包 > behaviors > 虚拟列表通用行为

/**
 * 虚拟列表 Behavior
 * 用于优化超长列表的渲染性能，仅渲染可视区域内的项目
 *
 * 使用方式：
 * 1. 引入: const virtualListBehavior = require('../../../behaviors/virtualListBehavior')
 * 2. 混入: behaviors: [virtualListBehavior]
 * 3. 初始化: this.initVirtualList(fullList, { itemHeight: 80 })
 * 4. 绑定滚动: <scroll-view bindscroll="onVirtualScroll">
 *
 * 在 WXML 中使用：
 * <scroll-view scroll-y bindscroll="onVirtualScroll" style="height: 100vh;">
 *   <view style="height: {{totalHeight}}px; position: relative;">
 *     <view style="transform: translateY({{offsetY}}px);">
 *       <view wx:for="{{virtualList}}" wx:key="_id">{{item.name}}</view>
 *     </view>
 *   </view>
 * </scroll-view>
 */
module.exports = Behavior({
  options: {
    pureDataPattern: /^_/
  },
  data: {
    // 当前渲染的虚拟列表
    virtualList: [],
    // 完整数据列表 (纯数据字段)
    _fullList: [],
    // 每项高度（rpx 会自动转换）
    itemHeight: 80,
    // 可见项数
    visibleCount: 15,
    // 起始索引
    startIndex: 0,
    // 偏移量
    offsetY: 0,
    // 总高度
    totalHeight: 0,
    // 缓冲区大小（前后各多渲染几项）
    bufferSize: 5
  },

  methods: {
    /**
     * 初始化虚拟列表
     * @param {Array} list - 完整数据列表
     * @param {Object} options - 配置选项
     * @param {number} options.itemHeight - 每项高度（px），默认 80
     * @param {number} options.containerHeight - 容器高度（px），不传则使用屏幕高度
     * @param {number} options.bufferSize - 缓冲区大小，默认 5
     */
    initVirtualList(list, options = {}) {
      const {
        itemHeight = 80,
        containerHeight,
        bufferSize = 5
      } = options

      // 获取容器高度
        let height = containerHeight
        if (!height) {
          const systemInfo = wx.getSystemInfoSync()
          height = systemInfo.windowHeight
        }
  
        // 计算可见项数
        const visibleCount = Math.ceil(height / itemHeight) + bufferSize * 2
        const totalHeight = list.length * itemHeight
  
        this.setData({
          _fullList: list,
          itemHeight,
          visibleCount,
          bufferSize,
          totalHeight,
          virtualList: list.slice(0, visibleCount),
          startIndex: 0,
          offsetY: 0
        })
      },
  
      /**
       * 更新完整列表数据
       * @param {Array} list - 新的完整数据列表
       */
      updateFullList(list) {
        const { itemHeight, startIndex, visibleCount } = this.data
        const totalHeight = list.length * itemHeight
        const safeStart = Math.min(startIndex, Math.max(0, list.length - visibleCount))
        const safeEnd = Math.min(list.length, safeStart + visibleCount)
  
        this.setData({
          _fullList: list,
          totalHeight,
          startIndex: safeStart,
          virtualList: list.slice(safeStart, safeEnd),
          offsetY: safeStart * itemHeight
        })
      },
  
      /**
       * 滚动事件处理
       * @param {Object} e - 滚动事件对象
       */
      onVirtualScroll(e) {
        const scrollTop = e.detail.scrollTop
        const { _fullList, itemHeight, visibleCount, bufferSize, startIndex } = this.data
  
        // 计算新的起始索引
        const newStartIndex = Math.floor(scrollTop / itemHeight)
        const safeStart = Math.max(0, newStartIndex - bufferSize)
        const safeEnd = Math.min(_fullList.length, newStartIndex + visibleCount + bufferSize)
  
        // 只有当起始索引变化超过缓冲区的一半时才更新，减少 setData 调用
        if (Math.abs(safeStart - startIndex) >= Math.floor(bufferSize / 2)) {
          this.setData({
            startIndex: safeStart,
            virtualList: _fullList.slice(safeStart, safeEnd),
            offsetY: safeStart * itemHeight
          })
        }
      },
  
      /**
       * 滚动到指定索引
       * @param {number} index - 目标索引
       * @returns {number} - 滚动位置
       */
      scrollToIndex(index) {
        const { itemHeight, _fullList } = this.data
        const safeIndex = Math.max(0, Math.min(index, _fullList.length - 1))
        return safeIndex * itemHeight
      },
  
      /**
       * 获取指定索引在完整列表中的数据
       * @param {number} index - 索引
       * @returns {Object|null}
       */
      getItemByIndex(index) {
        const { _fullList } = this.data
        if (index >= 0 && index < _fullList.length) {
          return _fullList[index]
        }
        return null
      },
  
      /**
       * 重置虚拟列表状态
       */
      resetVirtualList() {
        this.setData({
          virtualList: [],
          _fullList: [],
          startIndex: 0,
          offsetY: 0,
          totalHeight: 0
        })
      }
  }
})
