// input: 日期选择器交互事件
// output: 日期选择器状态管理和事件处理
// pos: 主包 > behaviors > 日期选择器通用行为

const dateUtil = require('../utils/date')

/**
 * 日期选择器 Behavior（使用原生 picker-view）
 * 提供日期选择器的通用状态和方法
 *
 * 使用方式：
 * 1. 引入: const datePickerBehavior = require('../../../behaviors/datePickerBehavior')
 * 2. 混入: behaviors: [datePickerBehavior]
 * 3. 调用: this.initDate() 初始化日期
 * 4. 重写: onDateChange(dateStr, dateType) 处理日期变化
 * 
 * 多日期选择器支持：
 * - 调用 this.showDatePickerPopup('start') 或 this.showDatePickerPopup('end')
 * - onDateChange 回调中通过 dateType 区分
 */

// 生成年份数组（2020年到今年）
function generateYears() {
  const currentYear = new Date().getFullYear()
  const years = []
  for (let i = 2020; i <= currentYear; i++) {
    years.push(i)
  }
  return years
}

// 生成月份数组（1-12）
function generateMonths() {
  const months = []
  for (let i = 1; i <= 12; i++) {
    months.push(i)
  }
  return months
}

// 生成日期数组（根据年月动态生成）
function generateDays(year, month) {
  const daysInMonth = new Date(year, month, 0).getDate()
  const days = []
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i)
  }
  return days
}

// 根据日期字符串计算 picker 索引
function getDatePickerValue(dateStr, years) {
  if (!dateStr) {
    const now = new Date()
    return [years.indexOf(now.getFullYear()), now.getMonth(), now.getDate() - 1]
  }
  const [year, month, day] = dateStr.split('-').map(Number)
  const yearIndex = years.indexOf(year)
  return [yearIndex >= 0 ? yearIndex : 0, month - 1, day - 1]
}

module.exports = Behavior({
  data: {
    selectedDate: '',
    showDatePicker: false,
    years: generateYears(),
    months: generateMonths(),
    days: generateDays(new Date().getFullYear(), new Date().getMonth() + 1),
    datePickerValue: [0, 0, 0],
    _tempDateValue: [0, 0, 0],
    _currentDateType: '' // 用于多日期选择器场景
  },

  methods: {
    /**
     * 初始化日期为今天
     */
    initDate() {
      const now = new Date()
      const year = now.getFullYear()
      const month = now.getMonth() + 1
      const day = now.getDate()

      const years = generateYears()
      const yearIndex = years.indexOf(year)
      const monthIndex = month - 1
      const dayIndex = day - 1

      this.setData({
        selectedDate: dateUtil.getCurrentDate(),
        years,
        months: generateMonths(),
        days: generateDays(year, month),
        datePickerValue: [yearIndex, monthIndex, dayIndex],
        _tempDateValue: [yearIndex, monthIndex, dayIndex]
      })
    },

    /**
     * 初始化日期选择器数据（不设置 selectedDate）
     */
    initDatePicker() {
      const years = generateYears()
      const now = new Date()
      this.setData({
        years,
        months: generateMonths(),
        days: generateDays(now.getFullYear(), now.getMonth() + 1)
      })
    },

    /**
     * 显示日期选择器
     * @param {string} dateType - 可选，日期类型标识（如 'start', 'end'）
     * @param {string} currentDate - 可选，当前已选日期
     */
    showDatePickerPopup(dateType, currentDate) {
      const { years } = this.data
      const pickerValue = getDatePickerValue(currentDate, years)
      const year = years[pickerValue[0]]
      const month = pickerValue[1] + 1

      this.setData({
        showDatePicker: true,
        _currentDateType: dateType || '',
        datePickerValue: pickerValue,
        _tempDateValue: pickerValue,
        days: generateDays(year, month)
      })
    },

    /**
     * 关闭日期选择器
     */
    onDatePickerClose() {
      this.setData({ showDatePicker: false })
    },

    /**
     * picker-view 滚动变化
     */
    onDatePickerChange(e) {
      const val = e.detail.value
      const { years, months } = this.data
      const year = years[val[0]]
      const month = months[val[1]]
      const days = generateDays(year, month)

      // 调整日期索引，防止越界
      let dayIndex = val[2]
      if (dayIndex >= days.length) {
        dayIndex = days.length - 1
      }

      this.setData({
        days,
        _tempDateValue: [val[0], val[1], dayIndex]
      })
    },

    /**
     * 原生日期选择确认
     */
    onNativeDateConfirm() {
      const { years, months, days, _tempDateValue, _currentDateType } = this.data
      const year = years[_tempDateValue[0]]
      const month = months[_tempDateValue[1]]
      const day = days[_tempDateValue[2]] || 1

      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

      // 单日期选择器场景更新 selectedDate
      if (!_currentDateType) {
        this.setData({
          selectedDate: dateStr,
          datePickerValue: _tempDateValue,
          showDatePicker: false
        })
      } else {
        this.setData({ showDatePicker: false })
      }

      // 调用子类的日期变化处理方法
      if (typeof this.onDateChange === 'function') {
        this.onDateChange(dateStr, _currentDateType)
      }
    }
  }
})
