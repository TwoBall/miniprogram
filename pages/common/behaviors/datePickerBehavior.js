// input: 日期选择器交互事件
// output: 日期选择器状态管理和事件处理
// pos: 分包层 > 公共模块 > Behavior

const dateUtil = require('../../../utils/date')

/**
 * 日期选择器 Behavior
 * 提供日期选择器的通用状态和方法
 *
 * 使用方式：
 * 1. 引入: const datePickerBehavior = require('../../common/behaviors/datePickerBehavior')
 * 2. 混入: behaviors: [datePickerBehavior]
 * 3. 调用: this.initDate() 初始化日期
 * 4. 重写: onDateChange(dateStr) 处理日期变化
 */
module.exports = Behavior({
  data: {
    selectedDate: '',
    selectedDateTimestamp: new Date().getTime(),
    minDate: new Date(2020, 0, 1).getTime(),
    maxDate: new Date().getTime(),
    showDatePicker: false
  },

  methods: {
    /**
     * 初始化日期为今天
     */
    initDate() {
      this.setData({
        selectedDate: dateUtil.getCurrentDate(),
        selectedDateTimestamp: new Date().getTime()
      })
    },

    /**
     * 显示日期选择器
     */
    showDatePickerPopup() {
      this.setData({ showDatePicker: true })
    },

    /**
     * 关闭日期选择器
     */
    onDatePickerClose() {
      this.setData({ showDatePicker: false })
    },

    /**
     * 日期选择确认
     * @param {Object} e - 事件对象，e.detail 为时间戳
     */
    onDatePickerConfirm(e) {
      const dateStr = dateUtil.formatDate(e.detail)

      this.setData({
        selectedDate: dateStr,
        selectedDateTimestamp: e.detail,
        showDatePicker: false
      })

      // 调用子类的日期变化处理方法
      if (typeof this.onDateChange === 'function') {
        this.onDateChange(dateStr)
      }
    }
  }
})
