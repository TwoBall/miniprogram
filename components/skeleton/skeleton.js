/**
 * @file 骨架屏组件
 * @module components/skeleton/skeleton
 */
Component({
  properties: {
    /**
     * 骨架屏类型
     */
    type: {
      type: String,
      value: 'card'
    },
    /**
     * 显示的骨架项数量
     */
    count: {
      type: Number,
      value: 3
    },
    /**
     * 是否显示动画效果
     */
    animate: {
      type: Boolean,
      value: true
    },
    /**
     * 是否显示头像占位
     */
    avatar: {
      type: Boolean,
      value: true
    },
    /**
     * 头像形状（round/square）
     */
    avatarShape: {
      type: String,
      value: 'round'
    },
    /**
     * 内容行数
     */
    row: {
      type: Number,
      value: 3
    }
  },

  data: {
    items: []
  },

  lifetimes: {
    /** 组件挂载 */
    attached() {
      this.updateItems()
    }
  },

  observers: {
    'count': function() {
      this.updateItems()
    }
  },

  methods: {
    /**
     * 更新骨架项数组
     */
    updateItems() {
      const items = []
      for (let i = 0; i < this.data.count; i++) {
        items.push(i)
      }
      this.setData({ items })
    }
  }
})
