const profileBehavior = require('../../../behaviors/profileBehavior')

Page({
  behaviors: [profileBehavior],

  data: {
    role: 'teacher',
    tabIndex: 1  // 表示"我的"是第二个 Tab
  },

  onShow() {
    // 刷新用户信息
    this.loadProfileData()
  }
})
