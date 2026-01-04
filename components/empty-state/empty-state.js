/**
 * @file 空状态组件
 * @module components/empty-state/empty-state
 */
Component({
  properties: {
    /**
     * 预设类型
     */
    type: {
      type: String,
      value: 'default'
    },
    /**
     * 自定义图片
     */
    image: {
      type: String,
      value: ''
    },
    /**
     * 图片大小
     */
    imageSize: {
      type: String,
      value: '240rpx'
    },
    /**
     * 标题
     */
    title: {
      type: String,
      value: ''
    },
    /**
     * 描述文字
     */
    description: {
      type: String,
      value: ''
    },
    /**
     * 按钮文字
     */
    buttonText: {
      type: String,
      value: ''
    },
    /**
     * 按钮类型
     */
    buttonType: {
      type: String,
      value: 'primary'
    }
  },

  data: {
    presets: {
      default: {
        icon: 'info-o',
        title: '暂无数据',
        description: ''
      },
      students: {
        icon: 'friends-o',
        title: '暂无学生',
        description: '当前社团还没有学生加入'
      },
      attendance: {
        icon: 'notes-o',
        title: '暂无点名记录',
        description: '还没有进行过点名'
      },
      approval: {
        icon: 'todo-list-o',
        title: '暂无待审批',
        description: '所有申请都已处理完毕'
      },
      notification: {
        icon: 'bell',
        title: '暂无通知',
        description: '没有新的通知消息'
      },
      search: {
        icon: 'search',
        title: '搜索无结果',
        description: '换个关键词试试吧'
      },
      network: {
        icon: 'warning-o',
        title: '网络异常',
        description: '请检查网络连接后重试'
      },
      history: {
        icon: 'underway-o',
        title: '暂无历史记录',
        description: '还没有操作记录'
      },
      transfer: {
        icon: 'exchange',
        title: '暂无转社团申请',
        description: '没有待处理的转社团请求'
      },
      warning: {
        icon: 'warning-o',
        title: '暂无预警学生',
        description: '所有学生出勤情况良好'
      }
    },
    currentConfig: {
      icon: 'info-o',
      title: '暂无数据',
      description: ''
    }
  },

  lifetimes: {
    /** 组件挂载 */
    attached() {
      this.updateConfig()
    }
  },

  observers: {
    'type, title, description, image': function() {
      this.updateConfig()
    }
  },

  methods: {
    /**
     * 更新当前配置
     */
    updateConfig() {
      const { type, title, description, image } = this.data
      const preset = this.data.presets[type] || this.data.presets.default

      this.setData({
        currentConfig: {
          icon: preset.icon,
          title: title || preset.title,
          description: description || preset.description,
          image: image
        }
      })
    },

    /**
     * 按钮点击事件
     */
    onActionTap() {
      this.triggerEvent('action')
    }
  }
})
