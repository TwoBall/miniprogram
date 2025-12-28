/**
 * 懒加载图片组件
 * 使用 IntersectionObserver 实现视口内懒加载，支持占位图、加载动画、错误处理
 *
 * 功能特性：
 * - 视口懒加载：仅当图片进入视口时才开始加载
 * - 占位图：加载前显示占位图
 * - 加载动画：加载完成后淡入显示
 * - 错误处理：加载失败显示默认图片
 * - 支持圆形和方形
 *
 * 使用示例：
 * <lazy-image
 *   src="{{item.avatar}}"
 *   placeholder="/images/avatar-placeholder.png"
 *   width="160rpx"
 *   height="160rpx"
 *   round="{{true}}"
 *   bind:load="onImageLoad"
 *   bind:error="onImageError"
 * />
 */
Component({
  properties: {
    // 图片源地址
    src: {
      type: String,
      value: ''
    },
    // 占位图地址
    placeholder: {
      type: String,
      value: '/images/placeholder.png'
    },
    // 加载失败时显示的图片
    errorImage: {
      type: String,
      value: '/images/image-error.png'
    },
    // 图片宽度
    width: {
      type: String,
      value: '100%'
    },
    // 图片高度
    height: {
      type: String,
      value: '100%'
    },
    // 是否显示为圆形
    round: {
      type: Boolean,
      value: false
    },
    // 图片填充模式
    mode: {
      type: String,
      value: 'aspectFill'
    },
    // 是否启用懒加载（进入视口才加载）
    lazyLoad: {
      type: Boolean,
      value: true
    },
    // 触发加载的视口偏移量（提前加载）
    threshold: {
      type: Number,
      value: 100
    },
    // 是否显示加载中状态
    showLoading: {
      type: Boolean,
      value: true
    }
  },

  data: {
    // 当前显示的图片地址
    currentSrc: '',
    // 加载状态：pending | loading | loaded | error
    status: 'pending',
    // 是否已进入视口
    inView: false
  },

  lifetimes: {
    attached() {
      if (this.data.lazyLoad) {
        this._createObserver()
      } else {
        // 不启用懒加载，直接加载图片
        this._loadImage()
      }
    },

    detached() {
      this._destroyObserver()
    }
  },

  observers: {
    'src': function(newSrc) {
      if (newSrc && this.data.inView) {
        // 如果已在视口内，src 变化时重新加载
        this._loadImage()
      } else if (newSrc && !this.data.lazyLoad) {
        // 非懒加载模式，直接加载
        this._loadImage()
      }
    }
  },

  methods: {
    /**
     * 创建 IntersectionObserver
     * @private
     */
    _createObserver() {
      this._observer = this.createIntersectionObserver({
        thresholds: [0],
        observeAll: false
      })

      this._observer
        .relativeToViewport({ bottom: this.data.threshold, top: this.data.threshold })
        .observe('.lazy-image-wrapper', (res) => {
          if (res.intersectionRatio > 0 && !this.data.inView) {
            this.setData({ inView: true })
            this._loadImage()
            // 加载后可以断开观察
            this._destroyObserver()
          }
        })
    },

    /**
     * 销毁 IntersectionObserver
     * @private
     */
    _destroyObserver() {
      if (this._observer) {
        this._observer.disconnect()
        this._observer = null
      }
    },

    /**
     * 开始加载图片
     * @private
     */
    _loadImage() {
      const { src } = this.data
      if (!src) {
        this.setData({ status: 'error' })
        return
      }

      this.setData({
        status: 'loading',
        currentSrc: src
      })
    },

    /**
     * 图片加载成功
     */
    onLoad(e) {
      this.setData({ status: 'loaded' })
      this.triggerEvent('load', e.detail)
    },

    /**
     * 图片加载失败
     */
    onError(e) {
      this.setData({
        status: 'error',
        currentSrc: this.data.errorImage
      })
      this.triggerEvent('error', e.detail)
    },

    /**
     * 点击图片
     */
    onClick(e) {
      this.triggerEvent('click', e)
    },

    /**
     * 预览图片
     */
    preview() {
      if (this.data.status === 'loaded' && this.data.src) {
        wx.previewImage({
          urls: [this.data.src],
          current: this.data.src
        })
      }
    }
  }
})