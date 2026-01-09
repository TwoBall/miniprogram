// input: 日期选择器交互事件
// output: 日期选择器状态管理和事件处理
// pos: 主包 > behaviors > 日期选择器通用行为

const dateUtil = require('../utils/date')

/**
 * 日期选择器 Behavior（使用 van-calendar）
 * 提供日期选择器的通用状态和方法
 *
 * 使用方式：
 * 1. 引入: const datePickerBehavior = require('../../../behaviors/datePickerBehavior')
 * 2. 混入: behaviors: [datePickerBehavior]
 * 3. 调用: this.initDate() 初始化日期
 * 4. 重写: onDateChange(dateStr, dateType) 处理日期变化
 *
 * 单日期选择：
 * - 调用 this.showCalendar() 显示日历
 * - 选择后自动更新 selectedDate
 *
 * 多日期选择器支持：
 * - 调用 this.showCalendar('start') 或 this.showCalendar('end')
 * - onDateChange 回调中通过 dateType 区分
 *
 * 日期范围选择：
 * - 设置 calendarType: 'range' 后调用 this.showCalendar()
 * - 选择后通过 onRangeConfirm 回调返回 [startDate, endDate]
 */

/**
 * 格式化日期为 YYYY-MM-DD 字符串
 * @param {Date} date - 日期对象
 * @returns {string} 格式化的日期字符串
 */
function formatDateStr(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

module.exports = Behavior({
  data: {
    selectedDate: '',
    showCalendar: false,
    calendarType: 'single', // 'single' | 'range'
    calendarMinDate: new Date(2020, 0, 1).getTime(),
    calendarMaxDate: new Date().getTime(),
    calendarDefaultDate: null,
    _currentDateType: '' // 用于多日期选择器场景
  },

  methods: {
    /**
     * 初始化日期为今天
     */
    initDate() {
      const today = dateUtil.getCurrentDate()
      this.setData({
        selectedDate: today,
        calendarDefaultDate: new Date().getTime(),
        calendarMaxDate: new Date().getTime()
      })
    },

    /**
     * 初始化日期选择器数据（不设置 selectedDate）
     */
    initDatePicker() {
      this.setData({
        calendarMaxDate: new Date().getTime()
      })
    },

    /**
     * 显示日历选择器
     * @param {string|Object} dateTypeOrEvent - 可选，日期类型标识（如 'start', 'end'）或事件对象
     * @param {string} currentDate - 可选，当前已选日期（YYYY-MM-DD 格式）
     */
    showDatePickerPopup(dateTypeOrEvent, currentDate) {
      // 处理 bindtap 直接调用的情况，第一个参数是事件对象
      const dateType = (typeof dateTypeOrEvent === 'string') ? dateTypeOrEvent : ''

      let defaultDate = null
      if (currentDate) {
        const [year, month, day] = currentDate.split('-').map(Number)
        defaultDate = new Date(year, month - 1, day).getTime()
      } else if (this.data.selectedDate) {
        const [year, month, day] = this.data.selectedDate.split('-').map(Number)
        defaultDate = new Date(year, month - 1, day).getTime()
      } else {
        defaultDate = new Date().getTime()
      }

      this.setData({
        showCalendar: true,
        _currentDateType: dateType,
        calendarDefaultDate: defaultDate
      })
    },

    /**
     * 关闭日历选择器
     */
    onCalendarClose() {
      this.setData({ showCalendar: false })
    },

    /**
     * 日期选择器关闭（兼容旧方法名）
     */
    onDatePickerClose() {
      this.onCalendarClose()
    },

    /**
     * 日历选择确认（单日期模式）
     * @param {Object} e - 事件对象
     */
    onCalendarConfirm(e) {
      const date = e.detail
      const { _currentDateType } = this.data

      // 处理单日期模式
      if (!Array.isArray(date)) {
        const dateStr = formatDateStr(date)

        // 单日期选择器场景更新 selectedDate
        if (!_currentDateType) {
          this.setData({
            selectedDate: dateStr,
            showCalendar: false
          }, () => {
            // 在 setData 回调中调用，确保 selectedDate 已更新
            if (typeof this.onDateChange === 'function') {
              this.onDateChange(dateStr, _currentDateType)
            }
          })
        } else {
          this.setData({ showCalendar: false })
          // 多日期选择器场景，直接调用
          if (typeof this.onDateChange === 'function') {
            this.onDateChange(dateStr, _currentDateType)
          }
        }
      } else {
        // 处理日期范围模式
        const startDate = formatDateStr(date[0])
        const endDate = formatDateStr(date[1])

        this.setData({ showCalendar: false })

        // 调用子类的范围日期确认方法
        if (typeof this.onRangeConfirm === 'function') {
          this.onRangeConfirm(startDate, endDate)
        }
      }
    }
  }
})
