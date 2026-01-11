// input: 表单提交事件
// output: 表单状态管理和提交反馈
// pos: 主包 > behaviors > 表单反馈通用行为

import Dialog from '@vant/weapp/dialog/dialog'

/**
 * 表单反馈 Behavior
 * 提供表单提交状态管理、震动反馈和错误处理
 *
 * 使用方式：
 * 1. 引入: const formFeedbackBehavior = require('../../../behaviors/formFeedbackBehavior')
 * 2. 混入: behaviors: [formFeedbackBehavior]
 * 3. 调用: await this.submitForm(async () => { return result })
 *
 * 在 WXML 中使用：
 * <van-button loading="{{formSubmitting}}" bind:click="onSubmit">提交</van-button>
 * <view class="error-tip" wx:if="{{formErrors.name}}">{{formErrors.name}}</view>
 */
module.exports = Behavior({
  data: {
    // 表单是否正在提交
    formSubmitting: false,
    // 字段级错误信息
    formErrors: {},
    // 表单是否有修改（用于离开提示）
    formDirty: false
  },

  methods: {
    /**
     * 标记表单已修改
     * 在输入框 bindinput 中调用
     */
    markFormDirty() {
      if (!this.data.formDirty) {
        this.setData({ formDirty: true })
      }
    },

    /**
     * 重置表单状态
     */
    resetFormState() {
      this.setData({
        formSubmitting: false,
        formErrors: {},
        formDirty: false
      })
    },

    /**
     * 设置字段错误
     * @param {string} field - 字段名
     * @param {string} message - 错误信息
     */
    setFieldError(field, message) {
      this.setData({
        [`formErrors.${field}`]: message
      })
    },

    /**
     * 清除字段错误
     * @param {string} field - 字段名，不传则清除所有错误
     */
    clearFieldError(field) {
      if (field) {
        this.setData({
          [`formErrors.${field}`]: ''
        })
      } else {
        this.setData({ formErrors: {} })
      }
    },

    /**
     * 批量设置错误
     * @param {Object} errors - 错误对象 { field: message }
     */
    setFormErrors(errors) {
      const updates = {}
      Object.keys(errors).forEach(field => {
        updates[`formErrors.${field}`] = errors[field]
      })
      this.setData(updates)
    },

    /**
     * 验证必填字段
     * @param {Object} data - 表单数据
     * @param {Array} requiredFields - 必填字段配置 [{ field: 'name', label: '姓名' }]
     * @returns {boolean} - 是否验证通过
     */
    validateRequired(data, requiredFields) {
      const errors = {}
      let hasError = false

      requiredFields.forEach(({ field, label }) => {
        const value = data[field]
        if (value === undefined || value === null || value === '' ||
            (Array.isArray(value) && value.length === 0)) {
          errors[field] = `请输入${label}`
          hasError = true
        }
      })

      if (hasError) {
        this.setFormErrors(errors)
        // 震动提示
        this.vibrateOnError()
      }

      return !hasError
    },

    /**
     * 提交表单的包装函数
     * 自动处理加载状态、成功/失败反馈
     *
     * @param {Function} submitFn - 实际的提交函数，需返回 { success: boolean, message?: string }
     * @param {Object} options - 配置选项
     * @param {string} options.successMessage - 成功提示，默认"提交成功"
     * @param {string} options.errorMessage - 失败提示，默认使用返回的 message
     * @param {boolean} options.vibrate - 是否震动反馈，默认 true
     * @param {boolean} options.showToast - 是否显示 Toast，默认 true
     * @param {Function} options.onSuccess - 成功回调
     * @param {Function} options.onError - 失败回调
     * @returns {Promise<Object>} - 提交结果
     */
    async submitForm(submitFn, options = {}) {
      const {
        successMessage = '提交成功',
        errorMessage = '',
        vibrate = true,
        showToast = true,
        onSuccess,
        onError
      } = options

      // 防止重复提交
      if (this.data.formSubmitting) {
        return { success: false, message: '正在提交中' }
      }

      this.setData({ formSubmitting: true })
      this.clearFieldError()

      try {
        const result = await submitFn()

        if (result && result.success) {
          // 成功反馈
          if (vibrate) {
            this.vibrateOnSuccess()
          }
          if (showToast) {
            wx.showToast({
              title: successMessage,
              icon: 'success'
            })
          }
          // 重置表单修改状态
          this.setData({ formDirty: false })
          // 成功回调
          if (typeof onSuccess === 'function') {
            onSuccess(result)
          }
        } else {
          // 失败反馈
          const msg = errorMessage || (result && result.message) || '提交失败'
          if (vibrate) {
            this.vibrateOnError()
          }
          if (showToast) {
            wx.showToast({
              title: msg,
              icon: 'none'
            })
          }
          // 失败回调
          if (typeof onError === 'function') {
            onError(result)
          }
        }

        return result
      } catch (error) {
        console.error('[formFeedbackBehavior] submitForm error:', error)
        const msg = errorMessage || error.message || '提交失败'
        if (vibrate) {
          this.vibrateOnError()
        }
        if (showToast) {
          wx.showToast({
            title: msg,
            icon: 'none'
          })
        }
        if (typeof onError === 'function') {
          onError({ success: false, error })
        }
        return { success: false, error }
      } finally {
        this.setData({ formSubmitting: false })
      }
    },

    /**
     * 成功时震动反馈
     */
    vibrateOnSuccess() {
      wx.vibrateShort({
        type: 'medium'
      })
    },

    /**
     * 错误时震动反馈
     */
    vibrateOnError() {
      wx.vibrateShort({
        type: 'heavy'
      })
    },

    /**
     * 页面离开前检查
     * 在 onUnload 或 navigateBack 前调用
     * @returns {Promise<boolean>} - 是否允许离开
     */
    async checkBeforeLeave() {
      if (!this.data.formDirty) {
        return true
      }

      try {
        await Dialog.confirm({
          title: '提示',
          message: '表单内容未保存，确定要离开吗？',
          confirmButtonText: '离开',
          cancelButtonText: '取消'
        })
        return true
      } catch (e) {
        return false
      }
    }
  }
})
